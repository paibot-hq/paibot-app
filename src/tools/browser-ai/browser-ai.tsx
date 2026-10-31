"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import styles from "./browser-ai.module.css";
import { FEATURED, MODELS, makers, overall, plan, reasons, splitThinking, type FileProgress, type Gpu, type ModelId, type ModelInfo } from "./models";
import type { ChatMessage, WorkerRequest, WorkerResponse } from "./llm.worker";
import { deleteStored, scanStored, type Stored } from "./storage";
import StoredModels from "./stored-models";
import { createLlmWorker } from "./worker.client";

type Phase = "checking" | "idle" | "loading" | "ready" | "answering" | "failed";
// reasoning: the answer comes from a model that thinks first, so the text before </think> is not shown.
type Turn = { role: "user" | "assistant"; content: string; speed?: number; done?: boolean; reasoning?: boolean };

// The models write Markdown; **bold** is the part that shows most, so it is drawn and the rest is left as text.
const withBold = (text: string) => text.split(/\*\*(.+?)\*\*/g).map((part, index) => index % 2 ? <strong key={index}>{part}</strong> : part);

// More GPU memory than this (in MB) is more than many computers and phones have.
const HEAVY_MB = 4500;

// WebGPU when the browser has a usable adapter, else (null) the CPU through WebAssembly.
async function detectGpu(): Promise<Gpu> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> } }).gpu;
  try {
    const adapter = await gpu?.requestAdapter();
    if (adapter) return { f16: adapter.features.has("shader-f16") };
  } catch { /* falls back to the CPU */ }
  return null;
}

export default function BrowserAi() {
  const t = useTranslations("App.browserAi");
  const locale = useLocale();
  // undefined while it is being checked.
  const [gpu, setGpu] = useState<Gpu>();
  const [modelId, setModelId] = useState<ModelId>("qwen3-0.6b");
  // The model in the worker, which the chat goes on using after another one is picked until that one is loaded.
  const [loadedId, setLoadedId] = useState<ModelId>();
  const loadingId = useRef<ModelId>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [files, setFiles] = useState<Record<string, FileProgress>>({});
  const [ratio, setRatio] = useState<number>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  // What the browser has saved (undefined until it has been looked at), and whether a deletion is under way.
  const [stored, setStored] = useState<Stored>();
  const [deleting, setDeleting] = useState(false);
  const worker = useRef<Worker>(null);
  const log = useRef<HTMLDivElement>(null);
  const model = MODELS.find(m => m.id === modelId)!;
  const planFor = (m: ModelInfo) => gpu === undefined ? undefined : plan(m, gpu);
  const chosen = planFor(model);
  const loadedModel = MODELS.find(m => m.id === loadedId);

  const refreshStored = () => scanStored().then(setStored, () => setStored({}));

  useEffect(() => {
    let alive = true;
    refreshStored();
    detectGpu().then(found => {
      if (!alive) return;
      setGpu(found);
      setPhase("idle");
    });
    return () => {
      alive = false;
      worker.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [turns]);

  const send = (request: WorkerRequest) => worker.current?.postMessage(request);

  const onMessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    if (message.type === "ratio") setRatio(message.ratio);
    else if (message.type === "progress") setFiles(current => ({ ...current, [message.file]: { loaded: message.loaded, total: message.total } }));
    else if (message.type === "ready") {
      setLoadedId(loadingId.current!);
      setPhase("ready");
      refreshStored();
    }
    else if (message.type === "token") setTurns(current => [...current.slice(0, -1), { ...current.at(-1)!, content: current.at(-1)!.content + message.text }]);
    else if (message.type === "done") {
      setTurns(current => [...current.slice(0, -1), { ...current.at(-1)!, done: true, speed: message.seconds > 0 ? message.tokens / message.seconds : undefined }]);
      setPhase("ready");
    } else {
      setError(message.message);
      setPhase(current => current === "answering" ? "ready" : "failed");
      refreshStored();
    }
  };

  const load = () => {
    if (!chosen) return;
    worker.current?.terminate();
    worker.current = createLlmWorker();
    worker.current.addEventListener("message", onMessage);
    loadingId.current = model.id;
    setLoadedId(undefined);
    setFiles({});
    setRatio(undefined);
    setTurns([]);
    setError("");
    setPhase("loading");
    send({ type: "load", load: chosen.load });
  };

  // Deleting the model in use stops it too: the worker would otherwise go on with what it read.
  const remove = async (owner?: ModelId | "other") => {
    if (owner === undefined || owner === loadedId) {
      worker.current?.terminate();
      worker.current = null;
      setLoadedId(undefined);
      setPhase("idle");
    }
    setDeleting(true);
    try {
      await deleteStored(owner);
    } finally {
      await refreshStored();
      setDeleting(false);
    }
  };

  const ask = (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || phase !== "ready") return;
    const history: ChatMessage[] = [
      { role: "system", content: t("systemPrompt") },
      ...turns.map(turn => ({ role: turn.role, content: turn.role === "user" ? turn.content : splitThinking(turn.content, turn.reasoning).answer })),
      { role: "user", content: question },
    ];
    setTurns(current => [...current, { role: "user", content: question }, { role: "assistant", content: "", reasoning: loadedModel ? reasons(loadedModel) : false }]);
    setDraft("");
    setError("");
    setPhase("answering");
    send({ type: "generate", messages: history });
  };

  const bubble = (turn: Turn) => {
    const { answer, thinking } = splitThinking(turn.content, turn.reasoning);
    if (answer) return withBold(answer);
    if (turn.done) return t("noAnswer");
    return thinking ? <span className={styles.thinking}>{t("thinking")}</span> : "…";
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) ask(event);
  };

  // WebLLM gives only a share of the whole, which the known size turns into megabytes.
  const progress = ratio === undefined ? overall(files) : { ratio, loaded: ratio * (chosen?.sizeMB ?? 0) * 1e6, total: (chosen?.sizeMB ?? 0) * 1e6 };
  const loaded = phase === "ready" || phase === "answering";
  const picking = phase === "loading" || phase === "answering";

  return (
    <ToolLayout title={t("title")}>
      <p className={styles.intro}>{t("intro")}</p>

      <section className={styles.setup} aria-label={t("modelLabel")}>
        <p className={styles.device} data-ai="device">
          {gpu === undefined ? t("device.checking") : t(`device.${gpu ? "webgpu" : "wasm"}`)}
        </p>
        <div className={styles.models} role="group" aria-label={t("modelLabel")}>
          {FEATURED.map(id => MODELS.find(m => m.id === id)!).map(m => {
            const usable = planFor(m);
            return (
              <button key={m.id} type="button" className={styles.model} aria-pressed={m.id === modelId} disabled={gpu !== undefined && !usable || picking} onClick={() => setModelId(m.id)}>
                <strong>{m.name}</strong>
                <span>{gpu === undefined ? "" : usable ? t("size", { mb: usable.sizeMB }) : t("gpuOnly")}</span>
              </button>
            );
          })}
        </div>
        <label className={styles.more}>
          <span>{t("moreModels", { count: MODELS.length - FEATURED.length })}</span>
          <select value={FEATURED.includes(modelId) ? "" : modelId} disabled={picking} onChange={event => event.target.value && setModelId(event.target.value)}>
            <option value="">{t("pickModel")}</option>
            {makers().map(maker => (
              <optgroup key={maker} label={maker}>
                {MODELS.filter(m => m.maker === maker && !FEATURED.includes(m.id)).map(m => {
                  const usable = planFor(m);
                  return <option key={m.id} value={m.id} disabled={gpu !== undefined && !usable}>{m.name} · {usable ? t("size", { mb: usable.sizeMB }) : gpu === undefined ? "" : t("gpuOnly")}</option>;
                })}
              </optgroup>
            ))}
          </select>
        </label>
        <p className={styles.modelInfo} data-ai="model-info">
          {t("modelInfo", { name: model.name, maker: model.maker })}
          {model.engine === "webllm" && <> · {t("gpuMemory", { gb: (model.vramMB / 1000).toFixed(1) })}</>}
          {reasons(model) && <> · {t("reasonsNote")}</>}
          {model.engine === "webllm" && model.english && locale !== "en" && <> · {t("englishNote")}</>}
        </p>
        {model.engine === "webllm" && model.vramMB > HEAVY_MB && <p className={styles.heavy}>{t("heavy")}</p>}
        {phase !== "loading" && modelId !== loadedId && (
          <button type="button" className={styles.load} disabled={!chosen || phase === "answering"} onClick={load}>
            {t("load", { mb: chosen?.sizeMB ?? 0 })}
          </button>
        )}
        {phase === "loading" && (
          <div className={styles.progress} role="status">
            <div className={styles.track}><div className={styles.bar} style={{ width: `${progress.ratio * 100}%` }} /></div>
            <span>{progress.ratio < 1 ? t("downloading", { done: Math.round(progress.loaded / 1e6), total: Math.round(progress.total / 1e6) }) : t("preparing")}</span>
          </div>
        )}
        {loaded && loadedModel && <p className={styles.ready} data-ai="ready">{t("ready", { name: loadedModel.name })}</p>}
        <p className={styles.note}>{t("cacheNote")}</p>
      </section>

      {error && <p className={styles.error} role="alert">{t("error", { message: error })}</p>}

      <div className={styles.chat}>
        <div className={styles.log} ref={log} aria-live="polite" data-ai="log">
          {turns.length === 0 && <p className={styles.empty}>{loaded ? t("emptyReady") : t("empty")}</p>}
          {turns.map((turn, index) => (
            <div key={index} className={styles.turn} data-role={turn.role}>
              <p className={styles.bubble}>{turn.role === "user" ? turn.content : bubble(turn)}</p>
              {turn.speed !== undefined && <span className={styles.speed}>{t("speed", { speed: turn.speed.toFixed(1) })}</span>}
            </div>
          ))}
        </div>
        <form className={styles.form} onSubmit={ask}>
          <textarea
            className={styles.input}
            aria-label={t("inputLabel")}
            placeholder={loaded ? t("placeholder") : t("placeholderWait")}
            value={draft}
            rows={2}
            disabled={!loaded}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className={styles.actions}>
            {phase === "answering"
              ? <button type="button" className={styles.secondary} onClick={() => send({ type: "stop" })}>{t("stop")}</button>
              : <button type="submit" className={styles.send} disabled={phase !== "ready" || !draft.trim()}>{t("send")}</button>}
            <button type="button" className={styles.secondary} disabled={phase === "answering" || turns.length === 0} onClick={() => setTurns([])}>{t("clear")}</button>
          </div>
        </form>
      </div>
      <p className={styles.note}>{t("caution")}</p>
      <StoredModels stored={stored} disabled={deleting || phase === "loading" || phase === "answering"} onDelete={remove} />
    </ToolLayout>
  );
}

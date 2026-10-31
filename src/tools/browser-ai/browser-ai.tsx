"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import styles from "./browser-ai.module.css";
import { MODELS, overall, runsOn, visibleText, type Device, type FileProgress, type ModelId } from "./models";
import type { ChatMessage, WorkerRequest, WorkerResponse } from "./llm.worker";
import { createLlmWorker } from "./worker.client";

type Phase = "checking" | "idle" | "loading" | "ready" | "answering" | "failed";
type Turn = { role: "user" | "assistant"; content: string; speed?: number };

// WebGPU when the browser has a usable adapter, else the CPU through WebAssembly.
async function detectDevice(): Promise<Device> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  try {
    if (gpu && await gpu.requestAdapter()) return "webgpu";
  } catch { /* falls back to the CPU */ }
  return "wasm";
}

export default function BrowserAi() {
  const t = useTranslations("App.browserAi");
  const [device, setDevice] = useState<Device>();
  const [modelId, setModelId] = useState<ModelId>("qwen3-0.6b");
  // The model in the worker, which the chat goes on using after another one is picked until that one is loaded.
  const [loadedId, setLoadedId] = useState<ModelId>();
  const loadingId = useRef<ModelId>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [files, setFiles] = useState<Record<string, FileProgress>>({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const worker = useRef<Worker>(null);
  const log = useRef<HTMLDivElement>(null);
  const model = MODELS.find(m => m.id === modelId)!;

  useEffect(() => {
    let alive = true;
    detectDevice().then(found => {
      if (!alive) return;
      setDevice(found);
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
    if (message.type === "progress") setFiles(current => ({ ...current, [message.file]: { loaded: message.loaded, total: message.total } }));
    else if (message.type === "ready") {
      setLoadedId(loadingId.current!);
      setPhase("ready");
    }
    else if (message.type === "token") setTurns(current => [...current.slice(0, -1), { ...current.at(-1)!, content: current.at(-1)!.content + message.text }]);
    else if (message.type === "done") {
      setTurns(current => [...current.slice(0, -1), { ...current.at(-1)!, speed: message.seconds > 0 ? message.tokens / message.seconds : undefined }]);
      setPhase("ready");
    } else {
      setError(message.message);
      setPhase(current => current === "answering" ? "ready" : "failed");
    }
  };

  const load = () => {
    if (!device || !runsOn(model, device)) return;
    worker.current?.terminate();
    worker.current = createLlmWorker();
    worker.current.addEventListener("message", onMessage);
    loadingId.current = model.id;
    setLoadedId(undefined);
    setFiles({});
    setTurns([]);
    setError("");
    setPhase("loading");
    send({ type: "load", repo: model.repo, dtype: model.dtype[device]!, device });
  };

  const ask = (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || phase !== "ready") return;
    const history: ChatMessage[] = [
      { role: "system", content: t("systemPrompt") },
      ...turns.map(turn => ({ role: turn.role, content: visibleText(turn.content) })),
      { role: "user", content: question },
    ];
    setTurns(current => [...current, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setDraft("");
    setError("");
    setPhase("answering");
    send({ type: "generate", messages: history });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) ask(event);
  };

  const progress = overall(files);
  const loaded = phase === "ready" || phase === "answering";
  const loadedModel = MODELS.find(m => m.id === loadedId);

  return (
    <ToolLayout title={t("title")}>
      <p className={styles.intro}>{t("intro")}</p>

      <section className={styles.setup} aria-label={t("modelLabel")}>
        <p className={styles.device} data-ai="device">
          {device ? t(`device.${device}`) : t("device.checking")}
        </p>
        <div className={styles.models} role="group" aria-label={t("modelLabel")}>
          {MODELS.map(m => {
            const usable = !device || runsOn(m, device);
            return (
              <button key={m.id} type="button" className={styles.model} aria-pressed={m.id === modelId} disabled={!usable || phase === "loading" || phase === "answering"} onClick={() => setModelId(m.id)}>
                <strong>{m.name}</strong>
                <span>{usable && device ? t("size", { mb: m.sizeMB[device]! }) : t("gpuOnly")}</span>
              </button>
            );
          })}
        </div>
        {phase !== "loading" && modelId !== loadedId && (
          <button type="button" className={styles.load} disabled={phase === "checking" || phase === "answering"} onClick={load}>
            {t("load", { mb: device ? model.sizeMB[device] ?? 0 : 0 })}
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
              <p className={styles.bubble}>{turn.role === "assistant" ? visibleText(turn.content) || "…" : turn.content}</p>
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
    </ToolLayout>
  );
}

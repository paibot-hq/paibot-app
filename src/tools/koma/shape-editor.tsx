import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import styles from "./koma.module.css";
import { MAX_HEIGHT, MAX_RADIUS, PRESETS, PRESET_NAMES, profileFromStroke, scoresOf, type Profile } from "./shape";

// The drawing box is 2 * MAX_RADIUS wide (the axis down the middle) and MAX_HEIGHT high, drawn at this many pixels to the unit.
const SCALE = 20;
const WIDTH = 2 * MAX_RADIUS * SCALE;
const HEIGHT = MAX_HEIGHT * SCALE;
const STATS = ["weight", "stamina", "agility", "power", "stable"] as const;

function paint(canvas: HTMLCanvasElement, profile: Profile, stroke: { x: number; y: number }[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const css = getComputedStyle(canvas);
  const color = (name: string) => css.getPropertyValue(name).trim();
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.lineWidth = 1;
  context.strokeStyle = color("--line");
  for (let unit = 4; unit < MAX_HEIGHT; unit += 4) { context.beginPath(); context.moveTo(0, unit * SCALE); context.lineTo(WIDTH, unit * SCALE); context.stroke(); }
  for (let unit = 4; unit < MAX_RADIUS; unit += 4) for (const side of [-1, 1]) { context.beginPath(); context.moveTo(WIDTH / 2 + side * unit * SCALE, 0); context.lineTo(WIDTH / 2 + side * unit * SCALE, HEIGHT); context.stroke(); }
  // The axis it turns around.
  context.setLineDash([6, 6]);
  context.strokeStyle = color("--muted");
  context.beginPath(); context.moveTo(WIDTH / 2, 0); context.lineTo(WIDTH / 2, HEIGHT); context.stroke();
  context.setLineDash([]);
  // The solid: the profile on both sides of the axis.
  const at = (side: number, level: number) => [WIDTH / 2 + side * profile[level]! * SCALE, HEIGHT - (level / (profile.length - 1)) * HEIGHT] as const;
  context.beginPath();
  profile.forEach((_, level) => { const [x, y] = at(1, level); if (level) context.lineTo(x, y); else context.moveTo(x, y); });
  for (let level = profile.length - 1; level >= 0; level--) { const [x, y] = at(-1, level); context.lineTo(x, y); }
  context.closePath();
  context.globalAlpha = 0.35;
  context.fillStyle = color("--accent");
  context.fill();
  context.globalAlpha = 1;
  context.lineWidth = 2.5;
  context.strokeStyle = color("--accent");
  context.stroke();
  if (stroke.length > 1) {
    context.lineWidth = 1.5;
    context.strokeStyle = color("--text");
    context.beginPath();
    stroke.forEach((point, i) => {
      const x = WIDTH / 2 + point.x * MAX_RADIUS * SCALE, y = HEIGHT - point.y * HEIGHT;
      if (i) context.lineTo(x, y); else context.moveTo(x, y);
    });
    context.stroke();
  }
}

type Props = { profile: Profile; disabled: boolean; onChange: (profile: Profile) => void };

// Draw one side of the top's cross-section: the stroke is the outline, the tip at the bottom; the other side mirrors it.
export default function ShapeEditor({ profile, disabled, onChange }: Props) {
  const t = useTranslations("App.koma");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokeRef = useRef<{ x: number; y: number }[] | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const shown = draft ?? profile;

  useEffect(() => {
    if (canvasRef.current) paint(canvasRef.current, shown, strokeRef.current ?? []);
  }, [shown]);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const u = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const v = 1 - (event.clientY - rect.top) / rect.height;
    return { x: Math.min(Math.abs(u), 1), y: Math.min(Math.max(v, 0), 1) };
  };
  const extend = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = strokeRef.current;
    if (!stroke) return;
    stroke.push(point(event));
    setDraft(profileFromStroke(stroke));
    if (canvasRef.current) paint(canvasRef.current, profileFromStroke(stroke) ?? profile, stroke);
  };
  const finish = () => {
    const stroke = strokeRef.current;
    strokeRef.current = null;
    const next = stroke ? profileFromStroke(stroke) : null;
    setDraft(null);
    if (next) onChange(next);
  };

  const scores = scoresOf(shown);
  return (
    <section className={styles["editor"]} aria-labelledby="koma-shape">
      <h2 id="koma-shape" className={styles["editorTitle"]}>{t("shapeTitle")}</h2>
      <p className={styles["editorHint"]}>{t("shapeHint")}</p>
      <canvas
        ref={canvasRef}
        className={styles["pad"]}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={t("shapeLabel")}
        data-koma="shape-pad"
        data-disabled={disabled || undefined}
        onPointerDown={event => {
          if (disabled) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          strokeRef.current = [point(event)];
        }}
        onPointerMove={extend}
        onPointerUp={finish}
        onPointerCancel={() => { strokeRef.current = null; setDraft(null); }}
      />
      <div className={styles["presets"]} role="group" aria-label={t("presetsLabel")}>
        {PRESET_NAMES.map(name => (
          <button key={name} type="button" disabled={disabled} onClick={() => onChange([...PRESETS[name]])}>{t(`presets.${name}`)}</button>
        ))}
      </div>
      <dl className={styles["stats"]} data-koma="stats">
        {STATS.map(stat => (
          <div key={stat} data-stat={stat} data-value={scores[stat]}>
            <dt>{t(`stats.${stat}`)}</dt>
            <dd><span className={styles["track"]}><span className={styles["fill"]} style={{ width: `${scores[stat]}%` }} /></span></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

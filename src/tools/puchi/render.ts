import { centerOf, type Bubble, type Scene } from "./engine";

const easeOutBack = (x: number) => { const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

function bubbleFill(context: CanvasRenderingContext2D, bubble: Bubble, x: number, y: number, r: number, time: number): CanvasGradient | string {
  if (bubble.kind === "rainbow" && "createConicGradient" in context) {
    const gradient = context.createConicGradient(time * 2, x, y);
    for (let i = 0; i <= 6; i++) gradient.addColorStop(i / 6, `hsl(${(i * 60 + time * 120) % 360} 90% 62%)`);
    return gradient;
  }
  const gradient = context.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  if (bubble.kind === "gold") {
    gradient.addColorStop(0, "#fff7c9"); gradient.addColorStop(0.4, "#ffd54a"); gradient.addColorStop(1, "#e09b00");
  } else if (bubble.kind === "rainbow") {
    gradient.addColorStop(0, "#fff"); gradient.addColorStop(1, `hsl(${(time * 120) % 360} 90% 62%)`);
  } else {
    gradient.addColorStop(0, "rgba(255,255,255,.96)"); gradient.addColorStop(0.35, "rgba(214,235,255,.82)"); gradient.addColorStop(1, "rgba(128,176,236,.9)");
  }
  return gradient;
}

export function drawFrame(context: CanvasRenderingContext2D, scene: Scene) {
  const { width, height, time, sheet } = scene;
  const { layout } = sheet;
  context.save();
  context.clearRect(0, 0, width, height);
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#b6d3f6"); background.addColorStop(1, "#9fc3ef");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  if (scene.shake > 0) context.translate((Math.random() - 0.5) * 7 * scene.shake, (Math.random() - 0.5) * 7 * scene.shake);

  sheet.bubbles.forEach((bubble, index) => {
    const { x, y } = centerOf(layout, index);
    const base = layout.cell * 0.44;
    const age = time - bubble.born;
    if (age < 0) return;
    const popped = bubble.popped && time >= bubble.popAt;
    if (popped) {
      const since = time - bubble.popAt;
      const squash = 1 + 0.22 * Math.max(0, 1 - since / 0.12);
      context.beginPath();
      context.arc(x, y, base * 0.9 * squash, 0, Math.PI * 2);
      context.fillStyle = "rgba(96,140,200,.28)";
      context.fill();
      context.beginPath();
      context.arc(x, y, base * 0.62, Math.PI * 0.15, Math.PI * 0.85);
      context.strokeStyle = "rgba(255,255,255,.45)";
      context.lineWidth = 2;
      context.stroke();
      return;
    }
    // A bubble that is about to be set off by a neighbour trembles.
    const tremble = bubble.popped ? 1 + 0.07 * Math.sin(time * 70) : 1;
    const r = base * (age < 0.3 ? easeOutBack(Math.min(1, age / 0.3)) : 1) * tremble;
    context.beginPath();
    context.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    context.fillStyle = bubbleFill(context, bubble, x, y, r, time);
    context.fill();
    context.lineWidth = 1.5;
    context.strokeStyle = bubble.kind === "gold" ? "#b87400" : "rgba(70,120,200,.55)";
    context.stroke();
    context.beginPath();
    context.ellipse(x - r * 0.33, y - r * 0.4, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,.85)";
    context.fill();
  });

  for (const ring of scene.rings) {
    const k = ring.age / ring.life;
    context.beginPath();
    context.arc(ring.x, ring.y, ring.size * (0.3 + k * 0.7), 0, Math.PI * 2);
    context.strokeStyle = `hsl(${ring.hue} 90% 96% / ${1 - k})`;
    context.lineWidth = 3 * (1 - k) + 0.5;
    context.stroke();
  }
  for (const p of scene.particles) {
    const k = 1 - p.age / p.life;
    context.beginPath();
    context.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
    context.fillStyle = `hsl(${p.hue} 95% 62% / ${Math.min(1, k * 1.5)})`;
    context.fill();
  }
  if (scene.milestone && !scene.calm) {
    const age = time - scene.milestone.at;
    if (age < 1) {
      const scale = 1 + 0.5 * Math.max(0, 1 - age * 5);
      context.save();
      context.translate(width / 2, height * 0.42);
      context.scale(scale, scale);
      context.globalAlpha = Math.min(1, (1 - age) * 2);
      context.textAlign = "center";
      context.font = "800 56px system-ui, sans-serif";
      context.lineWidth = 8;
      context.strokeStyle = "rgba(20,60,120,.55)";
      context.fillStyle = "#fff";
      const text = `${scene.milestone.value} COMBO!`;
      context.strokeText(text, 0, 0);
      context.fillText(text, 0, 0);
      context.restore();
    }
  }
  if (scene.flash > 0) {
    context.fillStyle = `rgba(255,255,255,${scene.flash * 0.45})`;
    context.fillRect(-10, -10, width + 20, height + 20);
  }
  context.restore();
}

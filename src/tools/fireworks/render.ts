import { HORIZON, type Scene } from "./engine";

// What stands behind the fireworks: stars, a moon, a town on the far shore and the water in front. Everything is
// kept as fractions of the sky so the picture stays the same when the page is resized.
type Landscape = { stars: [number, number, number, number][]; blocks: { x: number; w: number; h: number; lights: [number, number][] }[] };

function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

export function makeLandscape(): Landscape {
  const rng = seeded(20261005);
  const stars: Landscape["stars"] = [];
  for (let i = 0; i < 90; i++) stars.push([rng(), rng() * 0.62, 0.4 + rng() * 0.9, 0.25 + rng() * 0.6]);
  const blocks: Landscape["blocks"] = [];
  let x = -0.01;
  while (x < 1) {
    const w = 0.025 + rng() * 0.05;
    const h = 0.02 + rng() * 0.055 + (rng() < 0.12 ? 0.05 : 0);
    const lights: [number, number][] = [];
    const count = Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) lights.push([rng(), rng()]);
    blocks.push({ x, w, h, lights });
    x += w;
  }
  return { stars, blocks };
}

const LANDSCAPE = makeLandscape();

function drawBackdrop(context: CanvasRenderingContext2D, scene: Scene) {
  const { width, height } = scene;
  const horizon = height * HORIZON;
  const sky = context.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#02030a");
  sky.addColorStop(0.6, "#080e26");
  sky.addColorStop(1, "#18244e");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  for (const [fx, fy, size, alpha] of LANDSCAPE.stars) {
    context.fillStyle = `rgba(220, 230, 255, ${alpha})`;
    context.fillRect(fx * width, fy * height, size, size);
  }
  const moon = context.createRadialGradient(width * 0.86, height * 0.14, 0, width * 0.86, height * 0.14, 34);
  moon.addColorStop(0, "rgba(255, 246, 214, 0.9)");
  moon.addColorStop(0.25, "rgba(255, 240, 200, 0.5)");
  moon.addColorStop(1, "rgba(255, 240, 200, 0)");
  context.fillStyle = moon;
  context.fillRect(width * 0.86 - 40, height * 0.14 - 40, 80, 80);
}

function drawSmoke(context: CanvasRenderingContext2D, scene: Scene) {
  for (const puff of scene.smoke) {
    const age = puff.maxLife - puff.life;
    // It thickens in the first second and thins out over the rest.
    const body = Math.min(1, age / 1.2) * Math.min(1, puff.life / (puff.maxLife * 0.6));
    // Soft at the edge, so the puffs blend into clouds.
    const cloud = context.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r);
    cloud.addColorStop(0, `rgba(105, 115, 150, ${0.11 * body})`);
    cloud.addColorStop(0.55, `rgba(105, 115, 150, ${0.06 * body})`);
    cloud.addColorStop(1, "rgba(105, 115, 150, 0)");
    context.fillStyle = cloud;
    context.beginPath();
    context.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
    context.fill();
  }
}

function drawTown(context: CanvasRenderingContext2D, scene: Scene) {
  const { width, height } = scene;
  const horizon = height * HORIZON;
  context.fillStyle = "#04060f";
  for (const block of LANDSCAPE.blocks) context.fillRect(block.x * width, horizon - block.h * height, block.w * width + 1, block.h * height + 1);
  for (const block of LANDSCAPE.blocks) {
    for (const [lx, ly] of block.lights) {
      context.fillStyle = "rgba(255, 214, 140, 0.55)";
      context.fillRect((block.x + block.w * (0.15 + lx * 0.7)) * width, horizon - block.h * height * (0.15 + ly * 0.7), 1.4, 1.4);
    }
  }
  const water = context.createLinearGradient(0, horizon, 0, height);
  water.addColorStop(0, "#0c1535");
  water.addColorStop(1, "#04060f");
  context.fillStyle = water;
  context.fillRect(0, horizon, width, height - horizon);
  context.fillStyle = "rgba(150, 175, 230, 0.05)";
  for (let y = horizon + 5; y < height; y += 7) context.fillRect(width * 0.05 * ((y * 13) % 7), y, width * (0.2 + ((y * 7) % 5) * 0.1), 1);
}

function drawLights(context: CanvasRenderingContext2D, scene: Scene, shimmer: boolean) {
  const sway = (y: number) => (shimmer ? Math.sin(scene.time * 7 + y * 0.35) * 1.6 : 0);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const shell of scene.shells) {
    const trail = shell.trail;
    if (trail.length >= 4) {
      context.strokeStyle = "rgba(255, 224, 160, 0.55)";
      context.lineWidth = 1.6;
      context.beginPath();
      context.moveTo(trail[0] + sway(trail[1]), trail[1]);
      for (let i = 2; i < trail.length; i += 2) context.lineTo(trail[i] + sway(trail[i + 1]), trail[i + 1]);
      context.stroke();
    }
    context.fillStyle = "rgba(255, 244, 214, 0.95)";
    context.beginPath();
    context.arc(shell.x + sway(shell.y), shell.y, 2.2, 0, Math.PI * 2);
    context.fill();
  }
  for (const spark of scene.sparks) {
    const fade = Math.min(1, spark.life / (spark.maxLife * 0.45));
    // A star starts white-hot and settles into its colour.
    const heat = Math.min(1, Math.max(0, (spark.life / spark.maxLife - 0.8) / 0.2));
    const lightness = 58 + 32 * heat;
    const flicker = spark.twinkle && Math.random() < 0.2 ? 0.3 : 1;
    const alpha = fade * flicker;
    if (spark.history.length >= 4) {
      context.strokeStyle = `hsla(${spark.hue}, ${spark.sat}%, ${lightness - 6}%, ${alpha * 0.55})`;
      context.lineWidth = Math.max(0.8, spark.size * 0.75);
      context.beginPath();
      context.moveTo(spark.history[0] + sway(spark.history[1]), spark.history[1]);
      for (let i = 2; i < spark.history.length; i += 2) context.lineTo(spark.history[i] + sway(spark.history[i + 1]), spark.history[i + 1]);
      context.lineTo(spark.x + sway(spark.y), spark.y);
      context.stroke();
    }
    const x = spark.x + sway(spark.y);
    context.fillStyle = `hsla(${spark.hue}, ${spark.sat}%, ${lightness}%, ${alpha * 0.14})`;
    context.beginPath();
    context.arc(x, spark.y, spark.size * 3.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `hsla(${spark.hue}, ${Math.max(0, spark.sat - 40 * heat)}%, ${lightness}%, ${alpha})`;
    context.beginPath();
    context.arc(x, spark.y, spark.size, 0, Math.PI * 2);
    context.fill();
  }
}

function drawFlashes(context: CanvasRenderingContext2D, scene: Scene) {
  for (const flash of scene.flashes) {
    const strength = flash.strength * Math.pow(flash.life / flash.maxLife, 1.6);
    const glow = context.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.r);
    glow.addColorStop(0, `hsla(${flash.hue}, ${flash.sat}%, 72%, ${strength})`);
    glow.addColorStop(0.4, `hsla(${flash.hue}, ${flash.sat}%, 60%, ${strength * 0.35})`);
    glow.addColorStop(1, `hsla(${flash.hue}, ${flash.sat}%, 55%, 0)`);
    context.fillStyle = glow;
    context.fillRect(flash.x - flash.r, flash.y - flash.r, flash.r * 2, flash.r * 2);
  }
}

export type View = { reflect: boolean };

// One frame: the sky and the smoke, the town and the water, then the light of the fireworks over them (added up, so
// overlapping stars glow brighter), and last their reflection in the water.
export function drawFrame(context: CanvasRenderingContext2D, scene: Scene, view: View) {
  const { width, height } = scene;
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  drawBackdrop(context, scene);
  drawSmoke(context, scene);
  drawTown(context, scene);
  context.globalCompositeOperation = "lighter";
  drawFlashes(context, scene);
  drawLights(context, scene, false);
  if (view.reflect) {
    const horizon = height * HORIZON;
    context.save();
    context.beginPath();
    context.rect(0, horizon, width, height - horizon);
    context.clip();
    context.translate(0, horizon * 2);
    context.scale(1, -1);
    context.globalAlpha = 0.3;
    drawLights(context, scene, true);
    context.restore();
  }
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
}

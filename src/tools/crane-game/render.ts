import { CHUTE_RIGHT, CLAW_TIP, clawSegments, FLOOR_Y, HEIGHT, kindOf, RAIL_Y, WALL_TOP, WIDTH, type Scene } from './engine';

// Draws the machine in the world's units (360 x 480); the page scales the context to the canvas.
export function drawFrame(context: CanvasRenderingContext2D, scene: Scene, dark: boolean) {
  const c = context;
  c.clearRect(0, 0, WIDTH, HEIGHT);
  // Inside the machine.
  const back = c.createLinearGradient(0, 0, 0, HEIGHT);
  back.addColorStop(0, dark ? '#1d2a44' : '#e9f2ff');
  back.addColorStop(1, dark ? '#2a2140' : '#fde9f3');
  c.fillStyle = back;
  c.fillRect(0, 0, WIDTH, HEIGHT);

  // The chute: an opening in the floor on the left, with an arrow down.
  c.fillStyle = dark ? '#0d1220' : '#3b4660';
  c.fillRect(0, FLOOR_Y, CHUTE_RIGHT, HEIGHT - FLOOR_Y);
  c.fillStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(59,70,96,.08)';
  c.fillRect(0, WALL_TOP, CHUTE_RIGHT, FLOOR_Y - WALL_TOP);
  c.strokeStyle = 'rgba(255,255,255,.75)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(CHUTE_RIGHT / 2, FLOOR_Y + 8); c.lineTo(CHUTE_RIGHT / 2, FLOOR_Y + 26);
  c.moveTo(CHUTE_RIGHT / 2 - 8, FLOOR_Y + 18); c.lineTo(CHUTE_RIGHT / 2, FLOOR_Y + 27); c.lineTo(CHUTE_RIGHT / 2 + 8, FLOOR_Y + 18);
  c.stroke();
  // The pit's floor and the wall between it and the chute.
  c.fillStyle = dark ? '#4a3a6a' : '#c9b6e4';
  c.fillRect(CHUTE_RIGHT, FLOOR_Y, WIDTH - CHUTE_RIGHT, HEIGHT - FLOOR_Y);
  c.fillStyle = dark ? '#8a9bc4' : '#7d8db5';
  roundRect(c, CHUTE_RIGHT - 4, WALL_TOP - 4, 8, FLOOR_Y - WALL_TOP + 4, 4);
  c.fill();

  // Where the claw would come down, while aiming.
  if (scene.phase === 'moving' || scene.phase === 'aimed' || scene.phase === 'ready') {
    c.save();
    c.setLineDash([4, 6]);
    c.strokeStyle = dark ? 'rgba(255,255,255,.25)' : 'rgba(40,60,110,.22)';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(scene.claw.x, scene.claw.y + CLAW_TIP); c.lineTo(scene.claw.x, FLOOR_Y); c.stroke();
    c.restore();
  }

  // The prizes, turned as they have rolled.
  for (const prize of scene.prizes) drawPrize(c, prize.kind, prize.x, prize.y, prize.r, prize.angle);

  // The rail, the carriage and the cable.
  const railY = RAIL_Y - 26;
  c.fillStyle = dark ? '#9aa6c4' : '#6b7896';
  c.fillRect(8, railY - 3, WIDTH - 16, 6);
  c.fillStyle = dark ? '#c9d2ea' : '#4a5672';
  roundRect(c, scene.claw.x - 16, railY - 7, 32, 12, 4); c.fill();
  c.strokeStyle = dark ? '#c9d2ea' : '#4a5672';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(scene.claw.x, railY + 5); c.lineTo(scene.claw.x, scene.claw.y); c.stroke();
  drawClaw(c, scene, dark);

  // The glass in front: a faint shine.
  const shine = c.createLinearGradient(0, 0, WIDTH, HEIGHT);
  shine.addColorStop(0, 'rgba(255,255,255,.16)');
  shine.addColorStop(0.35, 'rgba(255,255,255,0)');
  c.fillStyle = shine;
  c.fillRect(0, 0, WIDTH, HEIGHT);
}

// The claw: drawn from the very pieces the physics uses (engine.ts's clawSegments), so that what is seen is what touches.
function drawClaw(c: CanvasRenderingContext2D, scene: Scene, dark: boolean) {
  const [hub, ...arms] = clawSegments(scene.claw);
  c.strokeStyle = dark ? '#f1d27a' : '#c99a2e';
  c.lineCap = 'round';
  for (const piece of arms) {
    c.lineWidth = piece.r * 2;
    c.beginPath(); c.moveTo(piece.ax, piece.ay); c.lineTo(piece.bx, piece.by); c.stroke();
  }
  c.fillStyle = dark ? '#f1d27a' : '#d9a93a';
  roundRect(c, hub.ax - hub.r, scene.claw.y - 4, hub.bx - hub.ax + hub.r * 2, hub.r * 2 + 4, 5); c.fill();
}

// A soft toy: a round body in its colour with a mark on it; rare ones shine.
export function drawPrize(c: CanvasRenderingContext2D, kindId: string, x: number, y: number, r: number, angle = 0) {
  const kind = kindOf(kindId);
  if (kind.rare) {
    const glow = c.createRadialGradient(x, y, r * 0.6, x, y, r * 1.5);
    glow.addColorStop(0, 'rgba(255,240,150,.7)');
    glow.addColorStop(1, 'rgba(255,240,150,0)');
    c.fillStyle = glow;
    c.beginPath(); c.arc(x, y, r * 1.5, 0, Math.PI * 2); c.fill();
  }
  const body = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r);
  body.addColorStop(0, lighten(kind.color));
  body.addColorStop(1, kind.color);
  c.fillStyle = body;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.18)';
  c.lineWidth = 1.5;
  c.stroke();
  c.save();
  c.translate(x, y); c.rotate(angle);
  c.fillStyle = '#fff';
  c.font = `700 ${Math.round(r * 1.05)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(kind.glyph, 0, r * 0.06);
  c.restore();
}

function lighten(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * 0.45);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// Drawing the regions (browser only): a mosaic, a blur or a black patch in the shape of each region, on a canvas that shows the picture at `scale`
// of its own size (1 for the file that is saved). Each region is made on a layer of its own, cut to its shape, and put on the picture.
import { cellSize, regionBox, type Region } from "./mosaic.ts";

const canvas = (width: number, height: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
};

// A part of the source at a smaller size, by halving again and again (one big step would pick single pixels instead of averaging them).
function shrink(source: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, tw: number, th: number): HTMLCanvasElement {
  let current: CanvasImageSource = source;
  let cx = sx, cy = sy, cw = sw, ch = sh;
  while (cw / 2 >= tw && ch / 2 >= th) {
    const half = canvas(cw / 2, ch / 2);
    const context = half.getContext("2d")!;
    context.imageSmoothingQuality = "high";
    context.drawImage(current, cx, cy, cw, ch, 0, 0, half.width, half.height);
    current = half; cx = 0; cy = 0; cw = half.width; ch = half.height;
  }
  const out = canvas(tw, th);
  const context = out.getContext("2d")!;
  context.imageSmoothingQuality = "high";
  context.drawImage(current, cx, cy, cw, ch, 0, 0, out.width, out.height);
  return out;
}

export function paintRegion(target: CanvasRenderingContext2D, source: CanvasImageSource, region: Region, imageWidth: number, imageHeight: number, scale: number): void {
  const box = regionBox(region, imageWidth, imageHeight);
  if (box.width === 0 || box.height === 0) return;
  const x = Math.floor(box.x * scale), y = Math.floor(box.y * scale);
  const width = Math.max(1, Math.ceil((box.x + box.width) * scale) - x), height = Math.max(1, Math.ceil((box.y + box.height) * scale) - y);
  const layer = canvas(width, height);
  const context = layer.getContext("2d")!;
  if (region.effect === "black") {
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
  } else {
    const cell = Math.max(1, cellSize(region, imageWidth, imageHeight) * scale);
    const small = shrink(source, box.x, box.y, box.width, box.height, Math.max(1, Math.ceil(width / cell)), Math.max(1, Math.ceil(height / cell)));
    // A mosaic keeps the cells square-edged; a blur lets them run into each other.
    context.imageSmoothingEnabled = region.effect === "blur";
    context.imageSmoothingQuality = "high";
    context.drawImage(small, 0, 0, small.width, small.height, 0, 0, width, height);
  }
  // Cut to the region's shape.
  if (region.shape !== "rect") {
    context.globalCompositeOperation = "destination-in";
    context.fillStyle = "#000";
    context.strokeStyle = "#000";
    if (region.shape === "ellipse") {
      context.beginPath();
      context.ellipse(((region.a.x + region.b.x) / 2) * scale - x, ((region.a.y + region.b.y) / 2) * scale - y, (Math.abs(region.a.x - region.b.x) / 2) * scale, (Math.abs(region.a.y - region.b.y) / 2) * scale, 0, 0, Math.PI * 2);
      context.fill();
    } else if (region.shape === "pen") {
      context.lineWidth = region.width * scale;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      region.points.forEach((p, i) => (i === 0 ? context.moveTo(p.x * scale - x, p.y * scale - y) : context.lineTo(p.x * scale - x, p.y * scale - y)));
      // A single point is a dot.
      if (region.points.length === 1) context.lineTo(region.points[0].x * scale - x + 0.01, region.points[0].y * scale - y);
      context.stroke();
    }
  }
  target.drawImage(layer, x, y);
}

// The picture with every region on it, at `scale`.
export function paintAll(target: CanvasRenderingContext2D, source: CanvasImageSource, regions: readonly Region[], imageWidth: number, imageHeight: number, scale: number): void {
  target.imageSmoothingQuality = "high";
  target.drawImage(source, 0, 0, Math.round(imageWidth * scale), Math.round(imageHeight * scale));
  for (const region of regions) paintRegion(target, source, region, imageWidth, imageHeight, scale);
}

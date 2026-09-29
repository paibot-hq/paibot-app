// A one-page PDF holding a single JPEG image stretched over the page, written
// by hand so the card maker needs no PDF library. PDF can embed JPEG data as
// is (DCTDecode); only the object byte offsets in the xref table need care.

const MM_TO_PT = 72 / 25.4;

export function imagePdf(jpeg: Uint8Array, pixels: { width: number; height: number }, pageMm: { width: number; height: number }): Uint8Array<ArrayBuffer> {
  const width = (pageMm.width * MM_TO_PT).toFixed(2);
  const height = (pageMm.height * MM_TO_PT).toFixed(2);
  const draw = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (body: string, stream?: Uint8Array) => {
    offsets.push(length);
    push(`${offsets.length} 0 obj\n${body}\n`);
    if (stream) {
      push("stream\n");
      push(stream);
      push("\nendstream\n");
    }
    push("endobj\n");
  };

  // The binary comment line marks the file as binary for transfer tools.
  push("%PDF-1.4\n%âãÏÓ\n");
  object("<< /Type /Catalog /Pages 2 0 R >>");
  object("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  object(`<< /Type /XObject /Subtype /Image /Width ${pixels.width} /Height ${pixels.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  object(`<< /Length ${draw.length} >>`, encoder.encode(draw));

  const xref = length;
  push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets) push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const pdf = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    pdf.set(part, at);
    at += part.length;
  }
  return pdf;
}

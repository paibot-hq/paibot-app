// A Python error as Pyodide reports it, made to read like one from "python main.py": the frames inside Pyodide's own
// code (/lib/python3xx.zip/_pyodide/...) are left out, and the line of main.py where it happened is found.
export function cleanTraceback(message: string): { text: string; line?: number } {
  const lines = message.replace(/\s+$/, "").split("\n");
  const kept: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (/^ {2}File "/.test(line)) {
      skipping = !line.includes('File "main.py"');
      if (!skipping) kept.push(line);
      continue;
    }
    // A frame's source line and its ^^^^ marks are indented deeper than the frame.
    if (skipping && /^ {4}/.test(line)) continue;
    skipping = false;
    kept.push(line);
  }
  const matches = [...kept.join("\n").matchAll(/File "main\.py", line (\d+)/g)];
  const line = matches.length ? Number(matches[matches.length - 1][1]) : undefined;
  // Only the header is left when every frame was Pyodide's.
  const text = kept.length === 2 && kept[0].startsWith("Traceback") ? kept[1] : kept.join("\n");
  return { text, line };
}

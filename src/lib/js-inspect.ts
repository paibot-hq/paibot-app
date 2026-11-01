// How console.log shows a value in the JavaScript and TypeScript runners: close to Node's, so what is printed looks like
// what people see in a terminal ({ a: 1, b: [ 1, 2 ] }, 'quoted' strings inside objects, Map(1) { 'k' => 1 }).

export function format(args: unknown[]) {
  return args.map(value => (typeof value === "string" ? value : inspect(value))).join(" ");
}

export function inspect(value: unknown, depth = 0, seen: unknown[] = []): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string": return depth === 0 ? value : `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;
    case "number": return Object.is(value, -0) ? "-0" : String(value);
    case "bigint": return `${value}n`;
    case "undefined": return "undefined";
    case "boolean": return String(value);
    case "symbol": return value.toString();
    case "function": return `[${/^class\s/.test(Function.prototype.toString.call(value)) ? "class" : "Function"}${value.name ? `: ${value.name}` : " (anonymous)"}]`;
  }
  const object = value as object;
  if (seen.includes(object)) return "[Circular]";
  if (object instanceof Error) return object.stack && object.stack.includes(object.message) ? `${object.name}: ${object.message}` : String(object);
  if (object instanceof Date) return Number.isNaN(object.getTime()) ? "Invalid Date" : object.toISOString();
  if (object instanceof RegExp) return String(object);
  if (depth > 2) return Array.isArray(object) ? "[Array]" : "[Object]";
  const inner = (v: unknown) => inspect(v, depth + 1, [...seen, object]);
  const wrap = (open: string, parts: string[], close: string) => {
    if (parts.length === 0) return `${open}${close}`;
    const flat = `${open} ${parts.join(", ")} ${close}`;
    return flat.length <= 72 && !flat.includes("\n") ? flat : `${open}\n${parts.map(part => `  ${part.replace(/\n/g, "\n  ")}`).join(",\n")}\n${close}`;
  };
  if (Array.isArray(object)) {
    const parts = object.slice(0, 100).map(inner);
    if (object.length > 100) parts.push(`... ${object.length - 100} more items`);
    return wrap("[", parts, "]");
  }
  if (object instanceof Map) return wrap(`Map(${object.size}) {`, [...object].slice(0, 100).map(([k, v]) => `${inner(k)} => ${inner(v)}`), "}");
  if (object instanceof Set) return wrap(`Set(${object.size}) {`, [...object].slice(0, 100).map(inner), "}");
  if (ArrayBuffer.isView(object) && !(object instanceof DataView)) return wrap(`${object.constructor.name}(${(object as unknown as ArrayLike<unknown>).length}) [`, Array.from(object as unknown as ArrayLike<unknown>).slice(0, 100).map(inner), "]");
  if (object instanceof Promise) return "Promise { <pending> }";
  const name = Object.getPrototypeOf(object)?.constructor?.name;
  const key = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : inner(k));
  const parts = Object.entries(object).slice(0, 100).map(([k, v]) => `${key(k)}: ${inner(v)}`);
  return wrap(name && name !== "Object" ? `${name} {` : "{", parts, "}");
}

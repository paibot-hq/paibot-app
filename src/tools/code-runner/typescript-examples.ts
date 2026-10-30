// The TypeScript examples; their names are App.codeRunner.examples.typescript.<id> in messages/*.json.
export const EXAMPLES = [
  {
    id: "hello",
    code: `type User = {
  name: string;
  age: number;
  languages: string[];
};

const user: User = { name: "Aoi", age: 17, languages: ["TypeScript", "Python"] };

function introduce(u: User): string {
  return \`\${u.name} (\${u.age}) writes \${u.languages.join(" and ")}.\`;
}

console.log(introduce(user));
`,
  },
  {
    id: "typeError",
    code: `// A type error is shown before the code runs; the code still runs, as in the TypeScript playground.
function add(a: number, b: number): number {
  return a + b;
}

console.log(add(1, 2));
console.log(add(1, "2")); // TypeScript catches this: "2" is a string
`,
  },
  {
    id: "unions",
    code: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle": return Math.PI * shape.radius ** 2;
    case "rect": return shape.width * shape.height;
    case "triangle": return (shape.base * shape.height) / 2;
  }
}

const shapes: Shape[] = [
  { kind: "circle", radius: 1 },
  { kind: "rect", width: 3, height: 4 },
  { kind: "triangle", base: 6, height: 2 },
];
for (const s of shapes) console.log(s.kind, area(s).toFixed(2));
`,
  },
  {
    id: "generics",
    code: `function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const groups = {} as Record<K, T[]>;
  for (const item of items) (groups[key(item)] ??= []).push(item);
  return groups;
}

const words = ["apple", "avocado", "banana", "blueberry", "cherry"];
console.log(groupBy(words, w => w[0]));

class Stack<T> {
  private items: T[] = [];
  push(item: T) { this.items.push(item); return this; }
  pop(): T | undefined { return this.items.pop(); }
  get size() { return this.items.length; }
}

const stack = new Stack<number>().push(1).push(2).push(3);
console.log(stack.pop(), stack.size);
`,
  },
  {
    id: "input",
    code: `// input() reads one line of the standard input box.
const [h, w] = input()!.split(" ").map(Number);
const grid: string[] = [];
for (let i = 0; i < h; i++) grid.push(input()!);

const count = grid.join("").split("").filter(c => c === "#").length;
console.log(\`\${h}x\${w} grid, \${count} walls\`);
`,
    stdin: "3 4\n#..#\n.##.\n....\n",
  },
] as const;

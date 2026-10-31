// The JavaScript examples; their names are App.codeRunner.examples.javascript.<id> in messages/*.json.
export const EXAMPLES = [
  {
    id: "hello",
    code: `console.log("Hello, world!");

const languages = ["JavaScript", "Python", "TypeScript", "SQL"];
for (const [i, name] of languages.entries()) {
  console.log(\`\${i + 1}. \${name} (\${name.length} letters)\`);
}

console.log({ site: "PAIBOT.app", year: 2026, tags: ["free", "browser"] });
`,
  },
  {
    id: "fizzbuzz",
    code: `for (let i = 1; i <= 30; i++) {
  if (i % 15 === 0) console.log("FizzBuzz");
  else if (i % 3 === 0) console.log("Fizz");
  else if (i % 5 === 0) console.log("Buzz");
  else console.log(i);
}
`,
  },
  {
    id: "input",
    code: `// input() reads one line of the standard input box (null when there is no more).
const n = Number(input());
const numbers = input().split(" ").map(Number);
const sum = numbers.reduce((a, b) => a + b, 0);
console.log(\`\${n} numbers, sum \${sum}, average \${sum / n}\`);

// The way paiza and AtCoder read it also works:
// const lines = require("fs").readFileSync("/dev/stdin", "utf8").trim().split("\\n");
`,
    stdin: "5\n3 1 4 1 5\n",
  },
  {
    id: "arrays",
    code: `const scores = [
  { name: "Aoi", math: 82, english: 91 },
  { name: "Ren", math: 95, english: 70 },
  { name: "Mio", math: 68, english: 88 },
  { name: "Sora", math: 77, english: 77 },
];

const ranked = scores
  .map(s => ({ ...s, total: s.math + s.english }))
  .sort((a, b) => b.total - a.total);

ranked.forEach((s, i) => console.log(i + 1, s.name, s.total));
console.log(ranked.filter(s => s.math >= 80).map(s => s.name));
console.log(new Map(ranked.map(s => [s.name, s.total])));
`,
  },
  {
    id: "classes",
    code: `class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return \`\${this.name} makes a sound.\`;
  }
}

class Dog extends Animal {
  speak() {
    return \`\${this.name} barks: Woof!\`;
  }
}

const pets = [new Animal("Kitty"), new Dog("Pochi")];
for (const pet of pets) console.log(pet.speak());
console.log(pets[1]);
`,
  },
  {
    id: "async",
    code: `const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

for (let i = 3; i > 0; i--) {
  console.log(i);
  await sleep(600);
}
console.log("Go!");

const results = await Promise.all([1, 2, 3].map(async n => {
  await sleep(100 * n);
  return n * n;
}));
console.log(results);
`,
  },
  {
    id: "primes",
    code: `// The sieve of Eratosthenes: every prime below n.
function primes(n) {
  const sieve = new Uint8Array(n).fill(1);
  sieve[0] = sieve[1] = 0;
  for (let i = 2; i * i < n; i++) {
    if (!sieve[i]) continue;
    for (let j = i * i; j < n; j += i) sieve[j] = 0;
  }
  return [...sieve.keys()].filter(i => sieve[i]);
}

const start = performance.now();
const list = primes(1_000_000);
console.log(\`\${list.length} primes below 1,000,000 in \${(performance.now() - start).toFixed(1)} ms\`);
console.log(list.slice(0, 20));
`,
  },
] as const;

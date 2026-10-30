// The Python examples; their names are App.codeRunner.examples.python.<id> in messages/*.json.
export const EXAMPLES = [
  {
    id: "hello",
    code: `import sys

print("Hello, world!")
print(f"Python {sys.version.split()[0]}")

languages = ["Python", "JavaScript", "TypeScript", "SQL"]
for i, name in enumerate(languages, start=1):
    print(f"{i}. {name} ({len(name)} letters)")
`,
  },
  {
    id: "fizzbuzz",
    code: `for i in range(1, 31):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
`,
  },
  {
    id: "input",
    code: `# input() reads one line of the standard input box.
n = int(input())
numbers = list(map(int, input().split()))
print(f"{n} numbers, sum {sum(numbers)}, max {max(numbers)}, average {sum(numbers) / n}")

# Reading everything at once also works:
# import sys
# data = sys.stdin.read().split()
`,
    stdin: "5\n3 1 4 1 5\n",
  },
  {
    id: "collections",
    code: `from collections import Counter

text = "the quick brown fox jumps over the lazy dog the end"
counts = Counter(text.split())
print(counts.most_common(3))

squares = [n * n for n in range(10) if n % 2 == 0]
print(squares)

scores = {"Aoi": 82, "Ren": 95, "Mio": 68}
for name, score in sorted(scores.items(), key=lambda item: -item[1]):
    print(f"{name:<4} {score:>3} {'*' * (score // 10)}")
`,
  },
  {
    id: "classes",
    code: `from dataclasses import dataclass, field

@dataclass
class Item:
    name: str
    price: int
    quantity: int = 1

    @property
    def total(self) -> int:
        return self.price * self.quantity

@dataclass
class Cart:
    items: list[Item] = field(default_factory=list)

    def add(self, item: Item) -> "Cart":
        self.items.append(item)
        return self

    def total(self) -> int:
        return sum(item.total for item in self.items)

cart = Cart().add(Item("apple", 120, 3)).add(Item("milk", 210))
print(cart)
print("total:", cart.total())
`,
  },
  {
    id: "recursion",
    code: `from functools import cache

@cache
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print([fib(n) for n in range(15)])
print(fib(200))

def hanoi(n, source="A", target="C", spare="B"):
    if n == 0:
        return 0
    moves = hanoi(n - 1, source, spare, target)
    print(f"move disk {n} from {source} to {target}")
    return moves + 1 + hanoi(n - 1, spare, target, source)

print(hanoi(3), "moves")
`,
  },
  {
    id: "numpy",
    code: `# numpy is downloaded the first time it is imported (it takes a few seconds).
import numpy as np

a = np.arange(1, 10).reshape(3, 3)
print(a)
print("sum of each column:", a.sum(axis=0))
print("determinant:", round(np.linalg.det(a + np.eye(3)), 3))

rng = np.random.default_rng(42)
dice = rng.integers(1, 7, size=10_000)
print("mean of 10,000 dice:", dice.mean())
`,
  },
  {
    id: "error",
    code: `def average(values):
    return sum(values) / len(values)

print(average([1, 2, 3]))
print(average([]))  # ZeroDivisionError: the line is marked in red
`,
  },
] as const;

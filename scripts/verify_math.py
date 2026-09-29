#!/usr/bin/env python3
"""Re-derive every math problem's answer with SymPy.

Each unit only converts a problem into SymPy expressions: the answer derived
from what the learner sees, and the four choices. One shared check then
requires the choices to be mathematically distinct and exactly one of them,
the one at answerIndex, to equal the answer. Set rules (number ranges, exact
division, coverage) stay in scripts/validate-math-*.mjs.

Usage: uv run python scripts/verify_math.py [unit ...]
MATH_BANK_<UNIT> overrides a unit's bank file, as in the Node checkers.
"""
import ast
import json
import operator
import os
import re
import sys
from pathlib import Path

from sympy import Eq, FiniteSet, Integer, Rational, Symbol, Tuple, expand, simplify, solve, sqrt

ROOT = Path(__file__).resolve().parent.parent
x = Symbol('x')

# Expressions come from an LLM, so they are never passed to eval() or
# sympy.parse_expr (which uses eval). Only these nodes are converted; Pow is
# left out, since 9**9**9 would hang the check (formula units have their own
# parser below, which bounds exponents).
OPERATORS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv}
SYMBOLS = {'x': x}
FUNCTIONS = {'sqrt': sqrt}


def parse(text):
    def build(node):
        if isinstance(node, ast.Constant) and type(node.value) is int:
            return Integer(node.value)
        if isinstance(node, ast.BinOp) and type(node.op) in OPERATORS:
            return OPERATORS[type(node.op)](build(node.left), build(node.right))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -build(node.operand)
        if isinstance(node, ast.Name) and node.id in SYMBOLS:
            return SYMBOLS[node.id]
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in FUNCTIONS
                and len(node.args) == 1 and not node.keywords):
            return FUNCTIONS[node.func.id](build(node.args[0]))
        raise ValueError(f'unsupported syntax in {text!r}: {ast.dump(node)[:60]}')
    return build(ast.parse(text, mode='eval').body)


def arith(problem):
    return parse(problem['expression']), [Integer(c) for c in problem['choices']]


# Formula units: the grammar of src/lib/math-formula.ts, parsed here by the
# same recursive descent (not Python's ast, whose precedence differs: a
# fraction bar binds before × and ÷, so 3/5 : 2/7 is (3/5) / (2/7)). Decimals
# are exact fractions, '^' is a power with a small integer exponent, and any
# single letter is a variable.
LETTERS = {letter: Symbol(letter) for letter in 'abcdefghijklmnopqrstuvwxyz'}
FORMULA_TOKEN = re.compile(r'\s*(\d+(?:\.\d+)?|sqrt|[a-z]|[-+*/:^()])')


def parse_formula(text):
    tokens, at = [], 0
    while at < len(text):
        if text[at:].strip() == '':
            break
        match = FORMULA_TOKEN.match(text, at)
        if not match:
            raise ValueError(f'unsupported input in {text!r}')
        tokens.append(match.group(1))
        at = match.end()
    position = 0

    def peek():
        return tokens[position] if position < len(tokens) else None

    def take(expected=None):
        nonlocal position
        token = peek()
        if token is None or (expected is not None and token != expected):
            raise ValueError(f'expected {expected or "more input"} in {text!r}')
        position += 1
        return token

    def expr():
        node = term()
        while peek() in ('+', '-'):
            node = node + term() if take() == '+' else node - term()
        return node

    def term():
        node = fraction()
        while peek() in ('*', ':'):
            node = node * fraction() if take() == '*' else node / fraction()
        return node

    def fraction():
        node = unary()
        while peek() == '/':
            take()
            node = node / unary()
        return node

    def unary():
        if peek() == '-':
            take()
            return -unary()
        return power()

    def power():
        base = atom()
        if peek() == '^':
            take()
            exponent = unary()
            if not (exponent.is_Integer and abs(exponent) <= 12):
                raise ValueError(f'unsupported exponent in {text!r}')
            return base ** exponent
        return base

    def atom():
        token = take()
        if token[0].isdigit():
            return Rational(token)
        if token == 'sqrt':
            take('(')
            value = expr()
            take(')')
            return sqrt(value)
        if token in LETTERS:
            return LETTERS[token]
        if token == '(':
            value = expr()
            take(')')
            return value
        raise ValueError(f'unexpected {token!r} in {text!r}')

    value = expr()
    if position != len(tokens):
        raise ValueError(f'unexpected {tokens[position]!r} in {text!r}')
    return value


def assignments(text):
    pairs = [item.split('=') for item in text.split(',')]
    if any(len(pair) != 2 or pair[0].strip() not in LETTERS for pair in pairs):
        raise ValueError(f'expected "x = value, ..." in {text!r}')
    return {LETTERS[name.strip()]: parse_formula(value) for name, value in pairs}


def unknowns(equations):
    return sorted(set().union(*(eq.free_symbols for eq in equations)), key=lambda symbol: symbol.name)


# A solution set: the values of one unknown, or (x, y, ...) tuples in name order.
def solution_set(question):
    equations = []
    for part in question.split(';'):
        sides = part.split('=')
        if len(sides) != 2:
            raise ValueError(f'expected one "=" in {part!r}')
        equations.append(Eq(parse_formula(sides[0]), parse_formula(sides[1])))
    names = unknowns(equations)
    if len(names) == 1 and len(equations) == 1:
        return FiniteSet(*[value for value in solve(equations[0], names[0]) if value.is_real]), names
    return FiniteSet(*[Tuple(*[found[name] for name in names]) for found in solve(equations, names, dict=True)]), names


def solution_choice(text, names):
    items = text.split(',')
    if len(names) == 1:
        return FiniteSet(*[parse_formula(item) for item in items])
    found = assignments(text)
    if set(found) != set(names):
        raise ValueError(f'{text!r} does not give every unknown')
    return FiniteSet(Tuple(*[found[name] for name in names]))


def formula(problem):
    kind, question, choices = problem['kind'], problem['question'], problem['choices']
    if kind == 'calc':
        value = parse_formula(question)
        if problem.get('given'):
            value = value.subs(assignments(problem['given']))
        return value, [parse_formula(choice) for choice in choices]
    if kind == 'expand':
        parsed = [parse_formula(choice) for choice in choices]
        answer = parsed[problem['answerIndex']]
        # The keyed choice must itself be written out (x^2 + 5x + 6, not (x + 2)(x + 3)).
        if expand(answer) != answer:
            raise ValueError(f'answer {choices[problem["answerIndex"]]!r} is not expanded')
        return expand(parse_formula(question)), parsed
    if kind == 'solve':
        answer, names = solution_set(question)
        return answer, [solution_choice(choice, names) for choice in choices]
    raise ValueError(f'unknown kind {kind!r}')


def factorization(problem):
    p, q = problem['p'], problem['q']
    trinomial = x**2 + (p + q) * x + p * q
    return trinomial, [(x + a) * (x + b) for a, b in problem['choices']]


def pythagoras(problem):
    figure = problem['figure']
    points = figure['points']

    def squared(side):
        (ax, ay), (bx, by) = (points[v] for v in side)
        return Integer((ax - bx) ** 2 + (ay - by) ** 2)

    # Derived from the learner's view: the two given lengths and which side
    # is opposite the right angle, not from the unknown side's coordinates.
    hypotenuse = next(side for side in [*figure['given'], figure['unknown']] if figure['rightAngle'] not in side)
    given = [squared(side) for side in figure['given']]
    if figure['unknown'] == hypotenuse:
        answer = sqrt(sum(given))
    else:
        answer = sqrt(squared(hypotenuse) - sum(g for g, side in zip(given, figure['given']) if side != hypotenuse))
    return answer, [a * sqrt(b) for a, b in problem['choices']]


UNITS = {
    'arith': ('math-arith.json', arith),
    'signed': ('math-signed.json', arith),
    'addition': ('math-addition.json', arith),
    'multiplication': ('math-multiplication.json', arith),
    'division': ('math-division.json', arith),
    'decimal': ('math-decimal.json', formula),
    'fraction': ('math-fraction.json', formula),
    'exponents': ('math-exponents.json', formula),
    'expression': ('math-expression.json', formula),
    'linear-equation': ('math-linear-equation.json', formula),
    'simultaneous': ('math-simultaneous.json', formula),
    'expansion': ('math-expansion.json', formula),
    'sqrt': ('math-sqrt.json', formula),
    'quadratic': ('math-quadratic.json', formula),
    'factorization': ('math-factorization.json', factorization),
    'pythagoras': ('math-pythagoras.json', pythagoras),
}


def same(a, b):
    # Solution sets and tuples (formula units) compare element by element.
    if isinstance(a, (FiniteSet, Tuple)) or isinstance(b, (FiniteSet, Tuple)):
        if type(a) is not type(b) or len(a) != len(b):
            return False
        if isinstance(a, Tuple):
            return all(same(p, q) for p, q in zip(a, b))
        rest = list(b)
        for item in a:
            match = next((other for other in rest if same(item, other)), None)
            if match is None:
                return False
            rest.remove(match)
        return True
    return simplify(expand(a - b)) == 0


def verify_problem(problem, convert):
    answer, choices = convert(problem)
    if len(choices) != 4:
        return f'expected 4 choices, got {len(choices)}'
    for i in range(4):
        for j in range(i + 1, 4):
            if same(choices[i], choices[j]):
                return f'choices {i} and {j} are equal ({choices[i]})'
    matches = [i for i, choice in enumerate(choices) if same(choice, answer)]
    if matches != [problem['answerIndex']]:
        return f'answer is {answer}; matching choices {matches}, answerIndex {problem["answerIndex"]}'
    return None


def verify_bank(bank, convert):
    errors = []
    for problem in bank['problems']:
        try:
            error = verify_problem(problem, convert)
        except (ValueError, KeyError, TypeError, StopIteration, SyntaxError) as exc:
            error = f'{type(exc).__name__}: {exc}'
        if error:
            errors.append(f'{problem.get("id", "?")}: {error}')
    return errors


def main(units):
    unknown = [unit for unit in units if unit not in UNITS]
    if unknown:
        sys.exit(f'Unknown unit: {", ".join(unknown)} (expected {", ".join(UNITS)})')
    failed = False
    for unit in units or UNITS:
        file, convert = UNITS[unit]
        path = os.environ.get(f'MATH_BANK_{unit.upper().replace("-", "_")}') or ROOT / 'src' / 'data' / file
        bank = json.loads(Path(path).read_text(encoding='utf-8'))
        errors = verify_bank(bank, convert)
        for error in errors:
            print(f'FAIL {unit} {error}', file=sys.stderr)
        failed |= bool(errors)
        if not errors:
            print(f'PASS: {len(bank["problems"])} {unit} problems: answers re-derived with SymPy, one matching choice, distinct choices')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main(sys.argv[1:])

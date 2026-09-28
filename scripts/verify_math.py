#!/usr/bin/env python3
"""Re-derive every math problem's answer with SymPy.

Each unit only converts a problem into SymPy expressions: the answer derived
from what the learner sees, and the four choices. One shared check then
requires the choices to be mathematically distinct and exactly one of them,
the one at answerIndex, to equal the answer. Set rules (number ranges, exact
division, coverage) stay in scripts/check-math-*.mjs.

Usage: python3 scripts/verify_math.py [unit ...]
MATH_BANK_<UNIT> overrides a unit's bank file, as in the Node checkers.
"""
import ast
import json
import operator
import os
import sys
from pathlib import Path

from sympy import Integer, Symbol, expand, simplify, sqrt

ROOT = Path(__file__).resolve().parent.parent
x = Symbol('x')

# Expressions come from an LLM, so they are never passed to eval() or
# sympy.parse_expr (which uses eval). Only these nodes are converted; Pow is
# left out until a unit needs it, since 9**9**9 would hang the check.
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
    'factorization': ('math-factorization.json', factorization),
    'pythagoras': ('math-pythagoras.json', pythagoras),
}


def same(a, b):
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
        path = os.environ.get(f'MATH_BANK_{unit.upper()}') or ROOT / 'src' / 'data' / file
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

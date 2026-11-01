#!/usr/bin/env python3
"""Checks the math in the learning items' lessons (src/data/item-lessons.json) with SymPy.

A worked example is one of three kinds:
- "value" (the default): its steps are chains "a = b = c" whose every part equals
  the question (expanding, simplifying, calculating).
- "factor": the same, and the last part is a product of factors that cannot be
  factored further.
- "solve": the question is an equation or a system ("x + y = 5, x - y = 1"); every
  step line is an equation, a system, or the roots ("x = 2, x = -2"), with the
  same solutions as the question.
A common mistake's wrong line must be false and its right line true: an identity
"a = b", or, when the mistake has a question (an equation), its solutions.
The prose is not checked here (independent review, scripts/math-lessons.mjs)."""
import json
import sys
from pathlib import Path

from sympy import Eq, Mul, Poly, expand, simplify, solve

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_math import ROOT, parse_formula  # noqa: E402

LESSONS = ROOT / 'src' / 'data' / 'item-lessons.json'
KINDS = ('value', 'factor', 'solve')


def equal(a, b):
    return simplify(expand(parse_formula(a) - parse_formula(b))) == 0


def fully_factored(text):
    expression = parse_formula(text)
    for factor in Mul.make_args(expression):
        base = factor.base if factor.is_Pow else factor
        if base.is_number:
            continue
        poly = Poly(base)
        if poly.total_degree() > 1 and not poly.is_irreducible:
            return False
    return len(Mul.make_args(expression)) > 1 or expression.is_Pow


def equations(line):
    parts = [part.split('=') for part in line.split(',')]
    if any(len(sides) != 2 for sides in parts):
        raise ValueError(f'{line!r} is not an equation, a system or a list of roots')
    return [(parse_formula(left), parse_formula(right)) for left, right in parts]


def solutions(line, symbols):
    """The solutions of a line, as a set of tuples in the order of symbols. Roots
    ("x = 2, x = -2": the same letter alone on the left each time) are alternatives;
    anything else is a system that holds at once."""
    eqs = equations(line)
    lefts = {left for left, _ in eqs}
    if len(eqs) > 1 and len(lefts) == 1 and next(iter(lefts)).is_Symbol and len(symbols) == 1:
        return {(simplify(right),) for _, right in eqs}
    found = solve([Eq(left, right) for left, right in eqs], symbols, dict=True)
    return {tuple(simplify(answer.get(symbol, symbol)) for symbol in symbols) for answer in found}


def symbols_of(line):
    return sorted(set().union(*(left.free_symbols | right.free_symbols for left, right in equations(line))), key=str)


def verify_example(key, example):
    question, steps, kind = example['question'], example['steps'], example.get('kind', 'value')
    if kind not in KINDS:
        return [f'{key}: unknown example kind {kind!r}']
    if not 1 <= len(steps) <= 6:
        return [f'{key}: {question!r} needs 1 to 6 steps']
    errors = []
    if kind == 'solve':
        symbols = symbols_of(question)
        expected = solutions(question, symbols)
        if not expected:
            return [f'{key}: {question!r} has no solution']
        for line in steps:
            if solutions(line, symbols) != expected:
                errors.append(f'{key}: step {line!r} does not have the solutions of {question!r}')
        return errors
    for line in steps:
        for part in line.split('='):
            if not equal(part, question):
                errors.append(f'{key}: step part {part.strip()!r} does not equal {question!r}')
    last = steps[-1].split('=')[-1]
    if kind == 'factor' and not fully_factored(last):
        errors.append(f'{key}: {last.strip()!r} is not fully factored')
    return errors


def verify_mistake(key, mistake):
    errors = []
    if 'question' in mistake:
        symbols = symbols_of(mistake['question'])
        expected = solutions(mistake['question'], symbols)
        if solutions(mistake['wrong'], symbols) == expected:
            errors.append(f'{key}: the mistake {mistake["wrong"]!r} is not wrong')
        if solutions(mistake['right'], symbols) != expected:
            errors.append(f'{key}: the correction {mistake["right"]!r} is not right')
        return errors
    wrong, right = mistake['wrong'].split('='), mistake['right'].split('=')
    if len(wrong) != 2 or equal(*wrong):
        errors.append(f'{key}: the mistake {mistake["wrong"]!r} is not wrong')
    if len(right) != 2 or not equal(*right):
        errors.append(f'{key}: the correction {mistake["right"]!r} is not right')
    elif not equal(wrong[0], right[0]):
        errors.append(f'{key}: the mistake and its correction start from different expressions')
    return errors


def verify_lesson(key, lesson):
    errors = []
    for example in lesson['examples']:
        try:
            errors += verify_example(key, example)
        except Exception as error:  # noqa: BLE001 - a line the grammar cannot read is reported, not fatal
            errors.append(f'{key}: {example["question"]!r}: {error}')
    for mistake in lesson['mistakes']:
        try:
            errors += verify_mistake(key, mistake)
        except Exception as error:  # noqa: BLE001
            errors.append(f'{key}: mistake {mistake["wrong"]!r}: {error}')
    return errors


def main(keys):
    lessons = json.loads(LESSONS.read_text(encoding='utf-8'))
    wanted = {key: lesson for key, lesson in lessons.items() if not keys or key in keys}
    errors = [error for key, lesson in wanted.items() for error in verify_lesson(key, lesson)]
    for error in errors:
        print(f'FAIL: {error}')
    if errors:
        sys.exit(1)
    print(f'PASS: the examples and mistakes of {len(wanted)} lessons check out')


if __name__ == '__main__':
    main(sys.argv[1:])

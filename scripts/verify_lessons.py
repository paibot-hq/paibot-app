#!/usr/bin/env python3
"""Checks the math in the learning items' lessons (src/data/item-lessons.json) with SymPy.

A worked example's steps are chains "a = b = c" whose every part equals the
question; for a factoring item the last part must also be a product of factors
that cannot be factored further. A common mistake's wrong line must be false
and its right line true. The prose is not checked here (blind review)."""
import json
import sys
from pathlib import Path

from sympy import Mul, Poly, expand

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_math import ROOT, parse_formula  # noqa: E402

LESSONS = ROOT / 'src' / 'data' / 'item-lessons.json'
FACTORING_UNITS = ('factorization', 'factoring')


def equal(a, b):
    return expand(parse_formula(a) - parse_formula(b)) == 0


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


def verify_lesson(key, lesson):
    errors = []
    unit = key.split('/')[0]
    for example in lesson['examples']:
        question, steps = example['question'], example['steps']
        if not 1 <= len(steps) <= 6:
            errors.append(f'{key}: {question!r} needs 1 to 6 steps')
            continue
        for line in steps:
            for part in line.split('='):
                if not equal(part, question):
                    errors.append(f'{key}: step part {part.strip()!r} does not equal {question!r}')
        last = steps[-1].split('=')[-1]
        if unit in FACTORING_UNITS and not fully_factored(last):
            errors.append(f'{key}: {last.strip()!r} is not fully factored')
    for mistake in lesson['mistakes']:
        wrong, right = mistake['wrong'].split('='), mistake['right'].split('=')
        if len(wrong) != 2 or equal(*wrong):
            errors.append(f'{key}: the mistake {mistake["wrong"]!r} is not wrong')
        if len(right) != 2 or not equal(*right):
            errors.append(f'{key}: the correction {mistake["right"]!r} is not right')
        elif not equal(wrong[0], right[0]):
            errors.append(f'{key}: the mistake and its correction start from different expressions')
    return errors


def main():
    lessons = json.loads(LESSONS.read_text(encoding='utf-8'))
    errors = [error for key, lesson in lessons.items() for error in verify_lesson(key, lesson)]
    for error in errors:
        print(f'FAIL: {error}')
    if errors:
        sys.exit(1)
    print(f'PASS: the examples and mistakes of {len(lessons)} lessons check out')


if __name__ == '__main__':
    main()

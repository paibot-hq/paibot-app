#!/usr/bin/env python3
"""Broken problems that scripts/verify_math.py must reject."""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from verify_math import ROOT, UNITS, verify_bank  # noqa: E402


def bank(unit):
    return json.loads((ROOT / 'src' / 'data' / UNITS[unit][0]).read_text(encoding='utf-8'))


def rejects(unit, mutate, expected):
    broken = copy.deepcopy(bank(unit))
    mutate(broken['problems'][0])
    errors = verify_bank(broken, UNITS[unit][1])
    assert errors and expected in errors[0], f'{unit}: expected "{expected}", got {errors}'


# Every bank in src/data has a converter here.
banks = {path.name[len('math-'):-len('.json')] for path in (ROOT / 'src' / 'data').glob('math-*.json')}
assert banks == set(UNITS), f'units without a converter: {banks - set(UNITS)}, converters without a bank: {set(UNITS) - banks}'

for unit in UNITS:
    assert verify_bank(bank(unit), UNITS[unit][1]) == [], unit


def shift_answer(problem):
    problem['answerIndex'] = (problem['answerIndex'] + 1) % 4


# Units whose bank is still empty have nothing to break.
for unit in UNITS:
    if bank(unit)['problems']:
        rejects(unit, shift_answer, 'matching choices')


def swapped_factors(problem):
    p, q = problem['choices'][problem['answerIndex']]
    problem['choices'][(problem['answerIndex'] + 1) % 4] = [q, p]


rejects('factorization', swapped_factors, 'are equal')


def unsimplified_radical(problem):
    a, b = problem['choices'][problem['answerIndex']]
    problem['choices'][(problem['answerIndex'] + 1) % 4] = [1, a * a * b]


rejects('pythagoras', unsimplified_radical, 'are equal')

for expression in ["__import__('os').system('true')", '9 ** 9 ** 9', 'x.real', '1 if 1 else 2']:
    rejects('arith', lambda problem: problem.update(expression=expression), 'unsupported syntax')

rejects('arith', lambda problem: problem.update(expression='7 / 2'), 'answer is 7/2')


def wrong_choice(problem):
    problem['choices'][problem['answerIndex']] += 1000


rejects('arith', wrong_choice, 'matching choices')
rejects('signed', wrong_choice, 'matching choices')

print('PASS: verify_math rejects wrong keys, equal choices, unsafe syntax and non-integer answers')

#!/usr/bin/env python3
"""Broken lessons that scripts/verify_lessons.py must reject."""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from verify_lessons import LESSONS, verify_lesson  # noqa: E402

lessons = json.loads(LESSONS.read_text(encoding='utf-8'))
for key, lesson in lessons.items():
    assert verify_lesson(key, lesson) == [], key


def rejects(mutate, expected, key='factorization/trinomial'):
    broken = copy.deepcopy(solve if key == 'x' else lessons[key])
    mutate(broken)
    errors = verify_lesson(key, broken)
    assert errors and expected in errors[0], f'expected "{expected}", got {errors}'


rejects(lambda l: l['examples'][0].update(steps=['x^2 + 7*x + 12 = (x + 2)*(x + 6)']), 'does not equal')
rejects(lambda l: l['examples'][0].update(steps=['x^2 + 7*x + 12 = x*(x + 7) + 12']), 'not fully factored')
rejects(lambda l: l['examples'][2].update(question='2*x^2 - 50', steps=['2*x^2 - 50 = 2*(x^2 - 25)']), 'not fully factored')
rejects(lambda l: l['mistakes'][0].update(wrong='x^2 + 5*x + 6 = (x + 3)*(x + 2)'), 'is not wrong')
rejects(lambda l: l['mistakes'][0].update(right='x^2 + 5*x + 6 = (x + 1)*(x + 5)'), 'is not right')
rejects(lambda l: l['mistakes'][0].update(right='x^2 + 4*x + 3 = (x + 1)*(x + 3)'), 'different expressions')
rejects(lambda l: l['examples'][0].update(kind='simplify'), 'unknown example kind')

# Equations: every line has the question's solutions; roots are alternatives, other lines a system.
solve = {'sections': [], 'mistakes': [], 'examples': [
    {'kind': 'solve', 'question': '2*x + 3 = 7', 'steps': ['2*x = 4', 'x = 2']},
    {'kind': 'solve', 'question': 'x^2 = 9', 'steps': ['x = 3, x = -3']},
    {'kind': 'solve', 'question': 'x + y = 5, x - y = 1', 'steps': ['2*x = 6, x + y = 5', 'x = 3, y = 2']},
]}
assert verify_lesson('linear-equation/solve', solve) == [], verify_lesson('linear-equation/solve', solve)
rejects(lambda l: l['examples'][0].update(steps=['2*x = 10', 'x = 5']), 'does not have the solutions', 'x')
rejects(lambda l: l['examples'][1].update(steps=['x = 3']), 'does not have the solutions', 'x')
rejects(lambda l: l['examples'][2].update(steps=['x = 2, y = 3']), 'does not have the solutions', 'x')
rejects(lambda l: l['mistakes'].append({'question': 'x^2 = 9', 'wrong': 'x = 3, x = -3', 'right': 'x = 3, x = -3'}), 'is not wrong', 'x')
rejects(lambda l: l['mistakes'].append({'question': 'x^2 = 9', 'wrong': 'x = 3', 'right': 'x = 9, x = -9'}), 'is not right', 'x')
print('PASS: verify_lessons.py rejects broken examples, equations and mistakes')

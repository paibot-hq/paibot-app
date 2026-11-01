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
    broken = copy.deepcopy(lessons[key])
    mutate(broken)
    errors = verify_lesson(key, broken)
    assert errors and expected in errors[0], f'expected "{expected}", got {errors}'


rejects(lambda l: l['examples'][0].update(steps=['x^2 + 7*x + 12 = (x + 2)*(x + 6)']), 'does not equal')
rejects(lambda l: l['examples'][0].update(steps=['x^2 + 7*x + 12 = x*(x + 7) + 12']), 'not fully factored')
rejects(lambda l: l['examples'][2].update(question='2*x^2 - 50', steps=['2*x^2 - 50 = 2*(x^2 - 25)']), 'not fully factored')
rejects(lambda l: l['mistakes'][0].update(wrong='x^2 + 5*x + 6 = (x + 3)*(x + 2)'), 'is not wrong')
rejects(lambda l: l['mistakes'][0].update(right='x^2 + 5*x + 6 = (x + 1)*(x + 5)'), 'is not right')
rejects(lambda l: l['mistakes'][0].update(right='x^2 + 4*x + 3 = (x + 1)*(x + 3)'), 'different expressions')
print('PASS: verify_lessons.py rejects broken examples and mistakes')

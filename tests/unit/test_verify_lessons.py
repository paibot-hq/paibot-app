#!/usr/bin/env python3
"""Broken lessons that scripts/verify_lessons.py must reject."""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from verify_lessons import LESSONS, equal, verify_lesson  # noqa: E402

lessons = json.loads(LESSONS.read_text(encoding='utf-8'))
for key, lesson in lessons.items():
    assert verify_lesson(key, lesson) == [], key

# Checker regressions must not depend on examples an editor may rewrite.
factor = {'sections': [], 'examples': [
    {'kind': 'factor', 'question': 'x^2 + 7*x + 12', 'steps': ['x^2 + 7*x + 12 = (x + 3)*(x + 4)']},
    {'kind': 'factor', 'question': 'x^2 - 9', 'steps': ['x^2 - 9 = (x - 3)*(x + 3)']},
    {'kind': 'factor', 'question': '2*x^2 - 50', 'steps': ['2*x^2 - 50 = 2*(x - 5)*(x + 5)']},
], 'mistakes': [
    {'wrong': 'x^2 + 5*x + 6 = (x + 1)*(x + 6)', 'right': 'x^2 + 5*x + 6 = (x + 2)*(x + 3)'},
]}
assert verify_lesson('factor', factor) == []
assert equal('inv([[1,1],[2,3]])', '[[3,-1],[-2,1]]')
assert not equal('inv([[1,1],[2,3]])', '[[3,1],[-2,1]]')

# Prose proofs need independent review, and cannot smuggle unverified numeric
# fields into a reason example. The JavaScript checker validates their locales.
reason = {'sections': [], 'mistakes': [], 'examples': [{'kind': 'reason'}]}
assert verify_lesson('reason', reason) == []
reason['examples'][0]['question'] = '1 + 1'
assert 'unchecked formula' in verify_lesson('reason', reason)[0]


def rejects(mutate, expected, key='factorization/trinomial'):
    broken = copy.deepcopy(solve if key == 'x' else factor)
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

# Graphs: points on their curves, labels equal to the curves.
def caption(text):
    return {'ja': text, 'en': text, 'zh': text}


graph = {'sections': [{'heading': caption('g'), 'paragraphs': [caption('p')], 'figures': [{'caption': caption('c'), 'graph': {
    'view': {'x': [-4, 4], 'y': [-4, 8]},
    'curves': [{'y': 'x^2 - 2*x', 'label': 'y = x² − 2x'}, {'y': 'x - 2', 'label': 'y = x − 2'}, {'implicit': 'x^2/9 + y^2/4 = 1', 'label': '4x² + 9y² = 36'}],
    'points': [{'x': 1, 'y': -1, 'label': '(1, −1)', 'on': [0]}, {'x': 2, 'y': 0, 'label': 'A(2, 0)', 'on': [0, 1]}, {'x': 0, 'y': 2, 'on': [2]}],
}}]}], 'examples': [], 'mistakes': []}
assert verify_lesson('graph', graph) == [], verify_lesson('graph', graph)


def breaks(mutate, expected):
    broken = copy.deepcopy(graph)
    mutate(broken['sections'][0]['figures'][0]['graph'])
    errors = verify_lesson('graph', broken)
    assert errors and expected in errors[0], f'expected "{expected}", got {errors}'


breaks(lambda g: g['points'][0].update(y=0), 'is not on curves[0]')
breaks(lambda g: g['points'][1].update(on=[1, 2]), 'is not on curves[2]')
breaks(lambda g: g['curves'][0].update(label='y = x² + 2x'), 'is not the equation of curves[0]')
breaks(lambda g: g['curves'][1].update(label='y = 2x − 1'), 'is not the equation of curves[1]')
breaks(lambda g: g['curves'][2].update(label='x² + y² = 4'), 'is not the equation of curves[2]')
breaks(lambda g: g['points'][1].update(label='A(2, 1)'), 'is not at (2, 0)')
print('PASS: verify_lessons.py rejects broken examples, equations, mistakes and graphs')

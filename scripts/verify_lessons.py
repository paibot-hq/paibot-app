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
A graph in a figure: every point's `on` curves must pass through it, an equation
written as a curve's label ("y = x² − 2x") must be the curve's equation, and a point
labelled with coordinates ("A(1, 3)") must be at them.
The prose is not checked here (independent review, scripts/math-lessons.mjs)."""
import json
import re
import sys
from pathlib import Path

from sympy import Eq, Mul, Poly, Rational, Symbol, expand, simplify, solve

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


def plain(text):
    """A label as written for readers ("y = 2x + 1", "x² + y² = 4") in the formula grammar."""
    text = text.replace('−', '-').replace('×', '*').replace('·', '*').replace('÷', '/').replace('π', 'pi')
    for sup, power in {'²': '^2', '³': '^3', '⁴': '^4'}.items():
        text = text.replace(sup, power)
    text = re.sub(r'√\s*\(', 'sqrt(', text)
    text = re.sub(r'√\s*([A-Za-z0-9]+)', r'sqrt(\1)', text)
    text = re.sub(r'(\d)\s*([A-Za-z(])', r'\1*\2', text)
    text = re.sub(r'\)\s*([A-Za-z0-9(])', r')*\1', text)
    return text


def number(value):
    return Rational(str(value))


def curve_residual(curve, x, y):
    """How far a point is from a curve: 0 when it lies on it."""
    if 'y' in curve:
        return simplify(parse_formula(curve['y']).subs(Symbol('x'), x) - y)
    if 'x' in curve:
        return simplify(parse_formula(curve['x']) - x)
    left, right = curve['implicit'].split('=')
    return simplify((parse_formula(left) - parse_formula(right)).subs({Symbol('x'): x, Symbol('y'): y}))


def verify_graph(key, where, graph):
    errors = []
    curves, points = graph.get('curves', []), graph.get('points', [])
    for index, curve in enumerate(curves):
        label = curve.get('label', '')
        if '=' not in label:
            continue
        left, right = (plain(part) for part in label.split('=', 1))
        if 'y' in curve and left.strip() == 'y':
            same = equal(right, curve['y'])
        elif 'x' in curve and left.strip() == 'x':
            same = equal(right, curve['x'])
        elif 'implicit' in curve:
            # The same curve, whatever the scale of the equation ("x²/9 + y²/4 = 1" and "4x² + 9y² = 36").
            own_left, own_right = curve['implicit'].split('=')
            ratio = simplify((parse_formula(left) - parse_formula(right)) / (parse_formula(own_left) - parse_formula(own_right)))
            same = ratio.is_number and ratio != 0
        else:
            continue
        if not same:
            errors.append(f'{key} {where}: the label {label!r} is not the equation of curves[{index}]')
    for index, point in enumerate(points):
        x, y = number(point['x']), number(point['y'])
        for on in point.get('on', []):
            if curve_residual(curves[on], x, y) != 0:
                errors.append(f'{key} {where}: points[{index}] ({point["x"]}, {point["y"]}) is not on curves[{on}]')
        match = re.fullmatch(r'[A-Za-z]?\s*\(\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)', point.get('label', ''))
        if match and not (equal(plain(match.group(1)), str(x)) and equal(plain(match.group(2)), str(y))):
            errors.append(f'{key} {where}: the label {point["label"]!r} is not at ({point["x"]}, {point["y"]})')
    return errors


def verify_figures(key, lesson):
    errors = []
    figures = [(f'sections[{i}].figures[{j}]', figure) for i, section in enumerate(lesson['sections']) for j, figure in enumerate(section.get('figures', []))]
    figures += [(f'examples[{i}].figure', example['figure']) for i, example in enumerate(lesson['examples']) if 'figure' in example]
    for where, figure in figures:
        if 'graph' in figure:
            try:
                errors += verify_graph(key, where, figure['graph'])
            except Exception as error:  # noqa: BLE001
                errors.append(f'{key} {where}: {error}')
    return errors


def verify_lesson(key, lesson):
    errors = verify_figures(key, lesson)
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

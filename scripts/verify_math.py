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

from sympy import (Abs, Eq, FiniteSet, Function, I, Integer, Poly, Rational, Sum, Symbol, Tuple, binomial, cos, diff, expand,
                   ff, integrate, log, pi, rem, rsolve, simplify, sin, solve, sqrt, tan)

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
# are exact fractions; '^' takes a small integer or fraction exponent; letters
# other than i are variables, i is the imaginary unit and pi is π; functions are
# sqrt, sin, cos, tan, abs, log(x, base), C(n, k), P(n, k) and sum(term, k, from, to).
LETTERS = {letter: Symbol(letter) for letter in 'abcdefghjklmnopqrstuvwxyz'}
FUNCTIONS = {'sqrt': 1, 'sin': 1, 'cos': 1, 'tan': 1, 'abs': 1, 'log': 2, 'C': 2, 'P': 2, 'sum': 4}
FORMULA_TOKEN = re.compile(r'\s*(\d+(?:\.\d+)?|sqrt|sin|cos|tan|abs|log|sum|pi|[CP](?=\s*\()|[a-z]|[-+*/:^(),])')


def small(value, limit):
    return value.is_Integer and abs(value) <= limit


def call(name, args, text):
    if name == 'sqrt':
        return sqrt(args[0])
    if name in ('sin', 'cos', 'tan'):
        return {'sin': sin, 'cos': cos, 'tan': tan}[name](args[0])
    if name == 'abs':
        return Abs(args[0])
    if name == 'log':
        return log(args[0], args[1])
    if name in ('C', 'P'):
        n, k = args
        if not (small(n, 60) and small(k, 60) and 0 <= k <= n):
            raise ValueError(f'{name}(n, k) needs 0 <= k <= n <= 60 in {text!r}')
        return binomial(n, k) if name == 'C' else ff(n, k)
    term, index, low, high = args
    if not (index.is_Symbol and small(low, 1000) and small(high, 1000) and high - low <= 1000):
        raise ValueError(f'sum needs a letter and integer bounds at most 1000 apart in {text!r}')
    return Sum(term, (index, low, high)).doit()


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
            # Integers up to 12 and fractions like 2/3 or -1/2 (9^9^9 would hang the
            # check), or an expression in a letter such as 2^(k - 1) inside sum(...).
            if not (exponent.free_symbols or (exponent.is_Rational and abs(exponent.p) <= 12 and exponent.q <= 12)):
                raise ValueError(f'unsupported exponent in {text!r}')
            return base ** exponent
        return base

    def atom():
        token = take()
        if token[0].isdigit():
            return Rational(token)
        if token == 'pi':
            return pi
        if token == 'i':
            return I
        if token in FUNCTIONS:
            take('(')
            args = [expr()]
            while peek() == ',':
                take()
                args.append(expr())
            take(')')
            if len(args) != FUNCTIONS[token]:
                raise ValueError(f'{token} takes {FUNCTIONS[token]} argument(s) in {text!r}')
            return call(token, args, text)
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


def split_top(text, separator):
    """Splits at separator outside parentheses (like splitTop in math-formula.ts)."""
    parts, depth, start = [], 0, 0
    for index, char in enumerate(text):
        depth += (char == '(') - (char == ')')
        if char == separator and depth == 0:
            parts.append(text[start:index])
            start = index + 1
    parts.append(text[start:])
    return parts


def assignments(text):
    pairs = [item.split('=') for item in split_top(text, ',')]
    if any(len(pair) != 2 or pair[0].strip() not in LETTERS for pair in pairs):
        raise ValueError(f'expected "x = value, ..." in {text!r}')
    return {LETTERS[name.strip()]: parse_formula(value) for name, value in pairs}


def unknowns(equations):
    return sorted(set().union(*(eq.free_symbols for eq in equations)), key=lambda symbol: symbol.name)


# A solution set: the values of one unknown, or (x, y, ...) tuples in name order.
# Complex solutions count only when the choices are written with i.
def solution_set(question, complex_roots=False):
    equations = []
    for part in question.split(';'):
        sides = part.split('=')
        if len(sides) != 2:
            raise ValueError(f'expected one "=" in {part!r}')
        equations.append(Eq(parse_formula(sides[0]), parse_formula(sides[1])))
    names = unknowns(equations)
    if len(names) == 1 and len(equations) == 1:
        return FiniteSet(*[value for value in solve(equations[0], names[0]) if complex_roots or value.is_real]), names
    return FiniteSet(*[Tuple(*[found[name] for name in names]) for found in solve(equations, names, dict=True)]), names


def solution_choice(text, names):
    items = split_top(text, ',')
    if len(names) == 1:
        return FiniteSet(*[parse_formula(item) for item in items])
    found = assignments(text)
    if set(found) != set(names):
        raise ValueError(f'{text!r} does not give every unknown')
    return FiniteSet(Tuple(*[found[name] for name in names]))


def variable_of(expression):
    """The one variable of a function of x (x when there are none)."""
    symbols = sorted(expression.free_symbols, key=lambda symbol: symbol.name)
    if len(symbols) > 1:
        raise ValueError(f'expected a function of one variable: {expression}')
    return symbols[0] if symbols else LETTERS['x']


def point(problem):
    given = assignments(problem['given'] or '')
    if len(given) != 1:
        raise ValueError('expected given "x = a"')
    return next(iter(given.items()))


def bounds(problem):
    low, high = (parse_formula(part) for part in split_top(problem['bounds'], ','))
    if not (low.is_real and high.is_real and low < high):
        raise ValueError(f'bounds must be increasing real numbers: {problem["bounds"]!r}')
    return low, high


def line_choice(text):
    sides = text.split('=')
    if len(sides) != 2 or sides[0].strip() != 'y':
        raise ValueError(f'expected "y = ..." in {text!r}')
    return parse_formula(sides[1])


def area_between(curves, low, high):
    """Area enclosed by y = f and y = g (or the x-axis) over [low, high]."""
    difference = curves[0] - (curves[1] if len(curves) > 1 else 0)
    x = variable_of(difference)
    cuts = sorted(r for r in solve(difference, x) if r.is_real and low < r < high)
    edges = [low, *cuts, high]
    return sum(abs(integrate(difference, (x, a, b))) for a, b in zip(edges, edges[1:]))


def progression(problem):
    """The term (or sum of the first n terms) of the sequence the first terms start:
    at `given` (n = 10), or as an expression in n."""
    terms = [parse_formula(part) for part in split_top(problem['question'], ',')]
    if len(terms) < 3:
        raise ValueError('expected at least three first terms')
    n = LETTERS['n']
    first = terms[0]
    if problem.get('progression') == 'arithmetic':
        d = terms[1] - first
        if any(simplify(b - a - d) != 0 for a, b in zip(terms, terms[1:])):
            raise ValueError(f'{problem["question"]!r} is not arithmetic')
        general, total = first + (n - 1) * d, n * (2 * first + (n - 1) * d) / 2
    elif problem.get('progression') == 'geometric':
        if first == 0:
            raise ValueError('a geometric sequence cannot start with 0')
        r = simplify(terms[1] / first)
        if r in (0, 1) or any(simplify(b - a * r) != 0 for a, b in zip(terms, terms[1:])):
            raise ValueError(f'{problem["question"]!r} is not geometric (ratio other than 0 and 1)')
        general, total = first * r ** (n - 1), first * (r ** n - 1) / (r - 1)
    else:
        raise ValueError('progression must be "arithmetic" or "geometric"')
    value = general if problem['kind'] == 'term' else total
    if problem.get('given'):
        found = assignments(problem['given'])
        if list(found) != [n] or not (found[n].is_Integer and found[n] >= 1):
            raise ValueError('given must be "n = <positive integer>"')
        return value.subs(found)
    return value


def pair(text):
    return [parse_formula(part) for part in split_top(text, ',')]


def term_at(problem, first, rule, count):
    """The first `count` terms of a_1 = first, a_(n+1) = rule(a, n)."""
    a, n = LETTERS['a'], LETTERS['n']
    terms = [first]
    for k in range(1, count):
        terms.append(simplify(rule.subs({a: terms[-1], n: k})))
    return terms


def recurrence(problem):
    first_text, rule_text = problem['question'].split(';')
    first, rule = parse_formula(first_text), parse_formula(rule_text)
    a, n = LETTERS['a'], LETTERS['n']
    if problem.get('given'):
        found = assignments(problem['given'])
        if list(found) != [n] or not (found[n].is_Integer and 2 <= found[n] <= 15):
            raise ValueError('given must be "n = <2 to 15>"')
        return term_at(problem, first, rule, int(found[n]))[-1]
    f = Function('a')
    return rsolve(f(n + 1) - rule.subs({a: f(n)}), f(n), {f(1): first})


def distribution(problem):
    which, question = problem['which'], problem['question']
    parts = question.split(';')
    if which in ('mean', 'variance'):
        values, probs = pair(parts[0]), pair(parts[1])
        if len(values) != len(probs) or sum(probs) != 1 or any(p < 0 for p in probs):
            raise ValueError('probabilities must be non-negative and sum to 1, one per value')
        mean = sum(v * p for v, p in zip(values, probs))
        return mean if which == 'mean' else sum(p * (v - mean) ** 2 for v, p in zip(values, probs))
    if which == 'zscore':
        x, m, s = pair(parts[0])
        if s <= 0:
            raise ValueError('standard deviation must be positive')
        return (x - m) / s
    count, p = pair(parts[0])
    if not (count.is_Integer and count >= 1 and 0 < p < 1):
        raise ValueError('binomial needs an integer n >= 1 and 0 < p < 1')
    if which == 'binomialMean':
        return count * p
    if which == 'binomialVariance':
        return count * p * (1 - p)
    if which == 'binomialProb':
        (k,) = assignments(problem['given']).values()
        if not (k.is_Integer and 0 <= k <= count):
            raise ValueError('given k must be an integer from 0 to n')
        return binomial(count, k) * p ** k * (1 - p) ** (count - k)
    raise ValueError(f'unknown distribution variant {which!r}')


def circle_form(text_or_expr):
    """An equation of a circle as a monic polynomial in x and y (so equal circles compare equal)."""
    x, y = LETTERS['x'], LETTERS['y']
    if isinstance(text_or_expr, str):
        sides = text_or_expr.split('=')
        if len(sides) != 2:
            raise ValueError(f'expected an equation in {text_or_expr!r}')
        expression = expand(parse_formula(sides[0]) - parse_formula(sides[1]))
    else:
        expression = expand(text_or_expr)
    poly = Poly(expression, x, y)
    # Scale so equal curves compare equal: divide by the first non-zero coefficient.
    lead = next((poly.coeff_monomial(m) for m in (x ** 2, y ** 2, x * y, x, y, 1) if poly.coeff_monomial(m) != 0), 0)
    if lead == 0:
        raise ValueError('not a curve: the equation is 0 = 0')
    return expand(expression / lead)


def geometry(problem):
    which, parts = problem['which'], problem['question'].split(';')
    x, y = LETTERS['x'], LETTERS['y']
    if which == 'line-two-points':
        (x1, y1), (x2, y2) = pair(parts[0]), pair(parts[1])
        if x1 == x2:
            raise ValueError('the line must not be vertical')
        return (y2 - y1) / (x2 - x1) * (x - x1) + y1
    if which == 'line-slope':
        (x1, y1), m = pair(parts[0]), parse_formula(parts[1])
        return m * (x - x1) + y1
    if which in ('line-parallel', 'line-perpendicular'):
        slope, (x1, y1) = diff(parse_formula(parts[0]), x), pair(parts[1])
        if which == 'line-perpendicular':
            if slope == 0:
                raise ValueError('a horizontal line has no perpendicular of the form y = ...')
            slope = -1 / slope
        return slope * (x - x1) + y1
    if which == 'circle-center':
        (cx, cy), r = pair(parts[0]), parse_formula(parts[1])
        if not r > 0:
            raise ValueError('radius must be positive')
        return circle_form((x - cx) ** 2 + (y - cy) ** 2 - r ** 2)
    if which == 'circle-diameter':
        (x1, y1), (x2, y2) = pair(parts[0]), pair(parts[1])
        return circle_form((x - x1) * (x - x2) + (y - y1) * (y - y2))
    if which == 'locus-equidistant':
        (x1, y1), (x2, y2) = pair(parts[0]), pair(parts[1])
        if (x1, y1) == (x2, y2):
            raise ValueError('A and B must differ')
        return circle_form((x - x1) ** 2 + (y - y1) ** 2 - (x - x2) ** 2 - (y - y2) ** 2)
    if which == 'locus-ratio':
        (x1, y1), (x2, y2), (m, n) = pair(parts[0]), pair(parts[1]), pair(parts[2])
        if not (m.is_Integer and n.is_Integer and m > 0 and n > 0 and m != n):
            raise ValueError('the ratio must be two different positive integers')
        return circle_form(n ** 2 * ((x - x1) ** 2 + (y - y1) ** 2) - m ** 2 * ((x - x2) ** 2 + (y - y2) ** 2))
    if which == 'distance':
        (a, b, c), (px, py) = pair(parts[0]), pair(parts[1])
        return abs(a * px + b * py + c) / sqrt(a ** 2 + b ** 2)
    raise ValueError(f'unknown geometry variant {which!r}')


def geometry_choice(problem, text):
    which = problem['which']
    if which.startswith('line-'):
        return line_choice(text)
    if which.startswith(('circle-', 'locus-')):
        return circle_form(text)
    return parse_formula(text)


def identity_solution(problem):
    """(names, values): the constants that make the equation an identity in x."""
    left, right = problem['question'].split('=')
    x = LETTERS['x']
    difference = expand(parse_formula(left) - parse_formula(right))
    names = sorted((s for s in difference.free_symbols if s != x), key=lambda s: s.name)
    if not names:
        raise ValueError('an identity needs unknown constants')
    found = solve(Poly(difference, x).all_coeffs(), names, dict=True)
    if len(found) != 1 or set(found[0]) != set(names):
        raise ValueError(f'expected one value for each constant, found {found}')
    return names, [found[0][name] for name in names]


def inequality(problem):
    """Least value for positive numbers (arithmetic-geometric mean problems)."""
    which, question = problem['which'], problem['question']
    if which == 'product-sum':
        product = parse_formula(question)
        if not product > 0:
            raise ValueError('the product must be positive')
        return 2 * sqrt(product)
    f = parse_formula(question)
    x = variable_of(f)
    second = diff(f, x, 2)
    found = [c for c in solve(diff(f, x), x) if c.is_real and c > 0 and second.subs(x, c) > 0]
    if len(found) != 1:
        raise ValueError(f'expected exactly one positive minimum, found {found}')
    return simplify(f.subs(x, found[0])) if which == 'amgm-min' else found[0]


def induction(problem):
    """Steps of proving g(1) + ... + g(n) = f(n) by induction; the claim itself must be true."""
    which = problem['which']
    g_text, f_text = problem['question'].split(';')
    g, f = parse_formula(g_text), parse_formula(f_text)
    k, n = LETTERS['k'], LETTERS['n']
    if simplify(f.subs(n, 1) - g.subs(k, 1)) != 0:
        raise ValueError('the formula fails for n = 1')
    if simplify(f.subs(n, k) + g.subs(k, k + 1) - f.subs(n, k + 1)) != 0:
        raise ValueError('f(k) + g(k + 1) is not f(k + 1): the claim is not provable by induction')
    if which == 'base':
        return g.subs(k, 1)
    if which == 'add':
        return g.subs(k, k + 1)
    if which in ('target', 'combine'):
        return f.subs(n, k + 1)
    raise ValueError(f'unknown induction variant {which!r}')


def inference(problem):
    which, values = problem['which'], pair(problem['question'].split(';')[0])
    z = None
    if which.endswith('interval'):
        found = assignments(problem['given'])
        z = found[LETTERS['z']]
    if which == 'mean-interval':
        xbar, sigma, n = values
        margin = z * sigma / sqrt(n)
        result = Tuple(xbar - margin, xbar + margin)
    elif which == 'ratio-interval':
        p, n = values
        margin = z * sqrt(p * (1 - p) / n)
        result = Tuple(p - margin, p + margin)
    elif which == 'test-z':
        xbar, mu0, sigma, n = values
        result = (xbar - mu0) / (sigma / sqrt(n))
    else:
        raise ValueError(f'unknown inference variant {which!r}')
    parts = result if isinstance(result, Tuple) else [result]
    if not all(part.is_Rational for part in parts):
        raise ValueError(f'the answer {result} is not a clean number')
    return result


def region(problem):
    lhs, rhs, op = [part.strip() for part in problem['question'].split(';')]
    x, y = LETTERS['x'], LETTERS['y']
    difference = parse_formula(lhs) - parse_formula(rhs)
    test = {'<': lambda v: v < 0, '>': lambda v: v > 0, '<=': lambda v: v <= 0, '>=': lambda v: v >= 0}[op]
    points = [Tuple(*pair(choice)) for choice in problem['choices']]
    inside = [bool(test(difference.subs({x: px, y: py}))) for px, py in points]
    want = problem['which'] == 'in'
    hits = [point for point, flag in zip(points, inside) if flag == want]
    if len(hits) != 1:
        raise ValueError(f'exactly one point must be {"inside" if want else "outside"} the region, found {len(hits)}')
    return hits[0], points


def region_signature(text):
    """Which of a grid of points (-6 to 6 in halves) satisfy "lhs; rhs; op": 1 or 0 for each."""
    lhs, rhs, op = [part.strip() for part in text.split(';')]
    x, y = LETTERS['x'], LETTERS['y']
    difference = parse_formula(lhs) - parse_formula(rhs)
    test = {'<': lambda v: v < 0, '>': lambda v: v > 0, '<=': lambda v: v <= 0, '>=': lambda v: v >= 0}[op]
    grid = [Rational(k, 2) for k in range(-12, 13)]
    return Tuple(*[Integer(1 if test(difference.subs({x: px, y: py})) else 0) for py in grid for px in grid])


def graph(problem):
    """A graph the learner reads: the hidden question is what is drawn."""
    which, question = problem['which'], problem['question']
    x, y = LETTERS['x'], LETTERS['y']
    choices = problem['choices']
    if which == 'region':
        lhs = question.split(';')[0].strip()
        if lhs not in ('y', 'x^2 + y^2'):
            raise ValueError('a drawn region is y op g(x) or x^2 + y^2 op r')
        return region_signature(question), [region_signature(choice) for choice in choices]
    if which == 'circle':
        center, radius = question.split(';')
        (cx, cy), r = pair(center), parse_formula(radius)
        if not (cx.is_Integer and cy.is_Integer and r > 0 and abs(cx) + r <= 6 and abs(cy) + r <= 6):
            raise ValueError('the circle must have an integer center and fit in the window (-6 to 6)')
        return circle_form((x - cx) ** 2 + (y - cy) ** 2 - r ** 2), [circle_form(choice) for choice in choices]
    f = parse_formula(question)
    if f.free_symbols - {x}:
        raise ValueError('a drawn curve is a function of x')
    lattice = [X for X in range(-6, 7) if f.subs(x, X).is_Integer and abs(f.subs(x, X)) <= 6] if which != 'trig' else [0]
    if which == 'line':
        if Poly(f, x).degree() != 1 or len(lattice) < 2:
            raise ValueError('a line needs degree 1 and two lattice points in the window')
    elif which in ('parabola', 'vertex'):
        if Poly(f, x).degree() != 2:
            raise ValueError('a parabola needs degree 2')
        a, b, _ = Poly(f, x).all_coeffs()
        h = -b / (2 * a)
        k = f.subs(x, h)
        if not (h.is_Integer and k.is_Integer and abs(h) <= 5 and abs(k) <= 5):
            raise ValueError(f'the vertex ({h}, {k}) must be a lattice point in the window')
        if which == 'parabola' and len(lattice) < 3:
            raise ValueError('a parabola needs three lattice points in the window')
        if which == 'vertex':
            return Tuple(h, k), [Tuple(*pair(choice)) for choice in choices]
    elif which != 'trig':
        raise ValueError(f'unknown graph variant {which!r}')
    return f, [line_choice(choice) for choice in choices]


def _formula(problem):
    kind, question, choices = problem['kind'], problem['question'], problem['choices']
    keyed = problem['answerIndex']
    if kind == 'graph':
        return graph(problem)
    if kind == 'region':
        return region(problem)
    if kind == 'inference':
        answer = inference(problem)
        return answer, [Tuple(*pair(choice)) if isinstance(answer, Tuple) else parse_formula(choice) for choice in choices]
    if kind == 'geometry':
        return geometry(problem), [geometry_choice(problem, choice) for choice in choices]
    if kind == 'identity':
        names, values = identity_solution(problem)
        picked = []
        for choice in choices:
            found = assignments(choice)
            if set(found) != set(names):
                raise ValueError(f'{choice!r} does not give exactly {names}')
            picked.append(FiniteSet(Tuple(*[found[name] for name in names])))
        return FiniteSet(Tuple(*values)), picked
    if kind == 'solve':
        answer, names = solution_set(question, complex_roots=any(re.search(r'(?<![a-z])i(?![a-z])', choice) for choice in choices))
        return answer, [solution_choice(choice, names) for choice in choices]
    if kind == 'tangent':
        f = parse_formula(question)
        x, a = point(problem)
        return diff(f, x).subs(x, a) * (x - a) + f.subs(x, a), [line_choice(choice) for choice in choices]
    parsed = [parse_formula(choice) for choice in choices]
    if kind == 'calc':
        value = parse_formula(question)
        if problem.get('given'):
            value = value.subs(assignments(problem['given']))
        return value, parsed
    if kind == 'expand':
        # The keyed choice must itself be written out (x^2 + 5x + 6, not (x + 2)(x + 3)).
        if expand(parsed[keyed]) != parsed[keyed]:
            raise ValueError(f'answer {choices[keyed]!r} is not expanded')
        return expand(parse_formula(question)), parsed
    if kind == 'transform':
        return parse_formula(question), parsed
    if kind == 'factor':
        # The keyed choice must be a product ((x + 2)(x^2 - 2x + 4), not the expanded form).
        if not (parsed[keyed].is_Mul or parsed[keyed].is_Pow):
            raise ValueError(f'answer {choices[keyed]!r} is not factored')
        return parse_formula(question), parsed
    if kind == 'remainder':
        dividend, divisor = parse_formula(question), parse_formula(problem['divisor'])
        return rem(dividend, divisor, variable_of(dividend + divisor)), parsed
    if kind == 'derivative':
        f = parse_formula(question)
        if problem.get('given'):
            x, a = point(problem)
            return diff(f, x).subs(x, a), parsed
        return diff(f, variable_of(f)), parsed
    if kind == 'extremum':
        f = parse_formula(question)
        x = variable_of(f)
        second = diff(f, x, 2)
        sign = -1 if problem.get('which') == 'max' else 1
        found = [f.subs(x, c) for c in solve(diff(f, x), x) if c.is_real and sign * second.subs(x, c) > 0]
        if len(found) != 1:
            raise ValueError(f'expected exactly one local {problem.get("which")}, found {found}')
        return found[0], parsed
    if kind == 'integral':
        f = parse_formula(question)
        x = variable_of(f)
        if problem.get('bounds'):
            low, high = bounds(problem)
            return integrate(f, (x, low, high)), parsed
        # An antiderivative is fixed up to a constant: compare derivatives.
        return f, [diff(choice, x) for choice in parsed]
    if kind == 'area':
        low, high = bounds(problem)
        return area_between([parse_formula(part) for part in question.split(';')], low, high), parsed
    if kind in ('term', 'series'):
        return progression(problem), parsed
    if kind == 'radian':
        return parse_formula(question) * pi / 180, parsed
    if kind == 'degree':
        return simplify(parse_formula(question) * 180 / pi), parsed
    if kind == 'recurrence':
        return recurrence(problem), parsed
    if kind == 'distribution':
        return distribution(problem), parsed
    if kind == 'inequality':
        return inequality(problem), parsed
    if kind == 'induction':
        return induction(problem), parsed
    raise ValueError(f'unknown kind {kind!r}')


def formula(problem):
    answer, choices = _formula(problem)
    if problem.get('steps') is not None:
        check_steps(problem, answer)
    return answer, choices


def holds(sides, values, constants=False):
    """True when the chain a = b = c is true with the letters replaced by values.

    With constants=True, other letters (a, b, c in y = a*(x - 1)^2 + 3) may be
    unknown constants: the step holds if some values of them make it true for every x."""
    parsed = [parse_formula(side).subs(values) for side in sides]
    x = LETTERS['x']
    for a, b in zip(parsed, parsed[1:]):
        difference = expand(a - b)
        unknowns = sorted(difference.free_symbols - {x}, key=lambda s: s.name)
        if constants and unknowns and x in difference.free_symbols:
            equations = Poly(difference, x).all_coeffs()
            if not solve(equations, unknowns, dict=True):
                return False
        elif simplify(difference) != 0:
            return False
    return True


def check_steps(problem, answer):
    """Worked steps: lines that are chains "a = b = c", checked with SymPy.

    Most kinds: every part of every line equals the answer (a value, or an
    expression in n, x, ...); an indefinite integral: every part has the
    integrand as its derivative. Equation kinds: solve, every line holds for
    every solution ("x = 2, x = -2" for each root in turn); tangent, every line
    holds on the tangent line; extremum, every line holds at some critical point."""
    kind, steps = problem['kind'], problem['steps']
    if not (isinstance(steps, list) and 1 <= len(steps) <= 6 and all(isinstance(line, str) and line.strip() for line in steps)):
        raise ValueError('steps must be 1 to 6 non-empty lines')
    if kind == 'recurrence':
        return check_recurrence_steps(problem, answer, steps)
    for line in steps:
        if kind in ('region', 'inference') or (kind == 'graph' and problem['which'] in ('vertex', 'region')):
            check_numeric_chain(line)
            continue
        if kind in ('solve', 'tangent', 'extremum', 'identity') or (kind == 'inequality' and problem['which'] == 'amgm-equal') or kind == 'graph' or (kind == 'geometry' and problem['which'].startswith(('line-', 'circle-', 'locus-'))):
            check_equation_line(problem, answer, line)
            continue
        parts = line.split('=')
        if len(parts) > 1 and any(not part.strip() for part in parts):
            raise ValueError(f'empty side in step {line!r}')
        for part in parts:
            value = parse_formula(part)
            if kind == 'integral' and not problem.get('bounds'):
                ok = same(diff(value, variable_of(answer)), answer)
            else:
                ok = same(value, answer)
            if not ok:
                raise ValueError(f'step {line!r}: {part.strip()!r} is not equal to the answer {answer}')


def check_numeric_chain(line):
    """A line of plain numbers a = b = c that are all equal (a calculation written out)."""
    for item in split_top(line, ','):   # "lo = a, hi = b" lists two chains
        values = [parse_formula(part) for part in item.split('=')]
        if any(value.free_symbols for value in values):
            raise ValueError(f'step {line!r} must be numbers only')
        if any(not same(values[0], value) for value in values[1:]):
            raise ValueError(f'step {line!r} is not a true chain of equal numbers')


def check_recurrence_steps(problem, answer, steps):
    """Worked lines of a recurrence: each part is a term of the sequence (a number),
    or, for a general term, an expression equal to the answer."""
    first_text, rule_text = problem['question'].split(';')
    terms = term_at(problem, parse_formula(first_text), parse_formula(rule_text), 15)
    for line in steps:
        for part in line.split('='):
            value = parse_formula(part)
            ok = same(value, answer) if value.free_symbols else any(same(value, term) for term in terms)
            if not ok:
                raise ValueError(f'step {line!r}: {part.strip()!r} is neither a term of the sequence nor the answer')


def on_circle(sides, circle):
    """True when every step a = b is true on the circle: a - b is 0 or a constant multiple of its equation."""
    parsed = [parse_formula(side) for side in sides]
    for a, b in zip(parsed, parsed[1:]):
        difference = expand(a - b)
        if difference != 0 and not simplify(difference / circle).is_number:
            return False
    return True


def check_equation_line(problem, answer, line):
    kind = problem['kind']
    if (kind == 'geometry' and problem['which'].startswith(('circle-', 'locus-'))) or (kind == 'graph' and problem['which'] == 'circle'):
        items = split_top(line, ',')
        if not all(on_circle(item.split('='), answer) for item in items):
            raise ValueError(f'step {line!r} does not hold for the circle')
        return
    if kind == 'identity':
        names, values = identity_solution(problem)
        candidates = [dict(zip(names, values))]
        every = True
    elif kind == 'solve':
        _, names = solution_set(problem['question'], complex_roots=True)
        candidates = [dict(zip(names, value if isinstance(value, Tuple) else [value])) for value in answer]
        every = True
    elif kind == 'inequality':
        candidates = [{variable_of(parse_formula(problem['question'])): answer}]
        every = True
    elif kind in ('tangent', 'geometry', 'graph'):
        candidates = [{LETTERS['y']: answer}]
        every = True
    else:
        f = parse_formula(problem['question'])
        x = variable_of(f)
        candidates = [{x: c} for c in solve(diff(f, x), x) if c.is_real]
        every = False
    items = split_top(line, ',')
    if len(items) == 1:
        results = [holds(items[0].split('='), values, kind == 'graph') for values in candidates]
        ok = all(results) if every else any(results)
    else:
        ok = all(any(holds(item.split('='), values, kind == 'graph') for values in candidates) for item in items)
        if every:
            ok = ok and all(any(holds(item.split('='), values) for item in items) for values in candidates)
    if kind in ('tangent', 'geometry', 'graph'):
        ok = ok and all(len(item.split('=')) > 1 for item in items)
    if not ok:
        raise ValueError(f'step {line!r} does not hold for the {kind} problem')


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
    'factoring': ('math-factoring.json', formula),
    'identities': ('math-identities.json', formula),
    'polynomial-equations': ('math-polynomial-equations.json', formula),
    'complex': ('math-complex.json', formula),
    'trig': ('math-trig.json', formula),
    'exp-log': ('math-exp-log.json', formula),
    'derivative': ('math-derivative.json', formula),
    'integral': ('math-integral.json', formula),
    'sequence': ('math-sequence.json', formula),
    'coordinate-geometry': ('math-coordinate-geometry.json', formula),
    'distributions': ('math-distributions.json', formula),
    'inference': ('math-inference.json', formula),
    'data': ('math-data.json', formula),
    'unknowns': ('math-unknowns.json', formula),
    'quadratic-function': ('math-quadratic-function.json', formula),
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
    difference = a - b
    if simplify(expand(difference)) == 0:
        return True
    # Constants such as sqrt(5 + 2*sqrt(6)) = sqrt(2) + sqrt(3) that simplify() cannot show: compare to 40 digits.
    if not difference.free_symbols and difference.is_real is not False:
        return abs(difference.evalf(60)) < Rational(1, 10 ** 40)
    return False


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

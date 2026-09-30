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

from sympy import (Abs, And, Eq, FiniteSet, Function, Ge, Gt, I, Integer, Interval, Le, Lt, Matrix, Or, Poly, Rational, S, Sum, Symbol, Tuple,
                   binomial, cos, diff, divisor_count, expand, ff, gcd, integrate, isprime, lcm, log, oo, pi, rem, rsolve, simplify, sin,
                   solve, sqrt, tan)
from sympy import atan2
from sympy import arg as sympy_arg, conjugate, dsolve, exp, im as sympy_im, limit, re as sympy_re, series
from sympy.matrices.matrices import MatrixBase
from sympy.calculus.util import maximum, minimum
from sympy.solvers.inequalities import solve_univariate_inequality

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
# sqrt, sin, cos, tan, abs, log(x, base), C(n, k), P(n, k) and sum(term, k, from, to), and the
# ones listed in FUNCTIONS (exp, ln, matrices, limits, ...). [1, 2] is a vector (a column) and
# [[1, 2], [3, 4]] a matrix; oo is infinity.
LETTERS = {letter: Symbol(letter) for letter in 'abcdefghjklmnopqrstuvwxyz'}
FUNCTIONS = {
    'sqrt': (1, 1), 'sin': (1, 1), 'cos': (1, 1), 'tan': (1, 1), 'abs': (1, 1), 'log': (2, 2), 'C': (2, 2), 'P': (2, 2), 'sum': (4, 4),
    'exp': (1, 1), 'ln': (1, 1), 'det': (1, 1), 'inv': (1, 1), 'tr': (1, 1), 'rank': (1, 1), 'nullity': (1, 1), 'rref': (1, 1),
    'T': (1, 1), 'dot': (2, 2), 'cross': (2, 2), 'norm': (1, 1), 'orth': (2, 2), 'jac': (1, 1), 'eigvals': (1, 1),
    'arg': (1, 1), 'conj': (1, 1), 're': (1, 1), 'im': (1, 1), 'lim': (3, 3), 'd': (2, 3), 'taylor': (3, 3), 'vol': (3, 3),
    'arc': (3, 3), 'int2': (7, 7),
}
FORMULA_TOKEN = re.compile(r'\s*(\d+(?:\.\d+)?|sqrt|sin|cos|tan|abs|log|sum|exp|ln|det|inv|tr|rank|nullity|rref|dot|cross|norm|orth|jac|eigvals|arg|conj|re|im|lim|taylor|vol|arc|int2|oo|pi|[CPTd](?=\s*\()|[a-z]|[-+*/:^(),\[\]])')


def small(value, limit):
    return value.is_Integer and abs(value) <= limit


MATRIX_FUNCTIONS = {'det', 'inv', 'tr', 'rank', 'nullity', 'rref', 'T', 'dot', 'cross', 'norm', 'orth', 'jac', 'eigvals'}
CALCULUS_FUNCTIONS = {'lim', 'd', 'taylor', 'vol', 'arc', 'int2'}


def matrix_call(name, args, text):
    if name == 'jac':
        f = args[0]
        if not isinstance(f, MatrixBase) or f.cols != 1:
            raise ValueError(f'jac needs a list of expressions in {text!r}')
        letters = sorted(f.free_symbols, key=lambda symbol: symbol.name)
        return f.jacobian(letters)
    if not all(isinstance(arg, MatrixBase) for arg in args):
        raise ValueError(f'{name} needs a vector or matrix in {text!r}')
    a = args[0]
    if name in ('det', 'inv', 'tr', 'eigvals') and a.rows != a.cols:
        raise ValueError(f'{name} needs a square matrix in {text!r}')
    if name == 'det':
        return simplify(a.det())
    if name == 'inv':
        if a.det() == 0:
            raise ValueError(f'the matrix in {text!r} has no inverse')
        return a.inv()
    if name == 'T':
        return a.T
    if name == 'tr':
        return a.trace()
    if name == 'rank':
        return Integer(a.rank())
    if name == 'nullity':
        return Integer(a.cols - a.rank())
    if name == 'rref':
        return a.rref()[0]
    if name == 'norm':
        return simplify(sqrt(sum(component ** 2 for component in a)))
    if name == 'eigvals':
        values = []
        for value, multiplicity in a.eigenvals().items():
            if not value.is_real:
                raise ValueError(f'eigenvalues must be real in {text!r}')
            values += [value] * multiplicity
        return Matrix(sorted(values, key=lambda value: float(value)))
    b = args[1]
    if a.shape != b.shape or a.cols != 1:
        raise ValueError(f'{name} needs two vectors of the same size in {text!r}')
    if name == 'dot':
        return a.dot(b)
    if name == 'cross':
        if a.rows != 3:
            raise ValueError(f'cross needs 3-component vectors in {text!r}')
        return a.cross(b)
    if b.dot(b) == 0:
        raise ValueError(f'orth needs a nonzero second vector in {text!r}')
    return a - (a.dot(b) / b.dot(b)) * b    # orth(v, u): the part of v perpendicular to u


def calculus_call(name, args, text):
    x = LETTERS['x']
    if name == 'lim':
        f, variable, target = args
        if not variable.is_Symbol:
            raise ValueError(f'lim needs a letter in {text!r}')
        return limit(f, variable, target)
    if name == 'd':
        f, variable = args[0], args[1]
        order = args[2] if len(args) == 3 else Integer(1)
        if not (variable.is_Symbol and order.is_Integer and 1 <= order <= 4):
            raise ValueError(f'd(f, x, n) needs a letter and an order from 1 to 4 in {text!r}')
        return diff(f, variable, int(order))
    if name == 'taylor':
        f, variable, degree = args
        if not (variable.is_Symbol and degree.is_Integer and 0 <= degree <= 8):
            raise ValueError(f'taylor needs a letter and a degree from 0 to 8 in {text!r}')
        return series(f, variable, 0, int(degree) + 1).removeO()
    if name in ('vol', 'arc'):
        f, low, high = args
        if not (low.is_real and high.is_real and low < high):
            raise ValueError(f'the interval in {text!r} must be increasing')
        if name == 'vol':
            return simplify(pi * integrate(f ** 2, (x, low, high)))
        return simplify(integrate(sqrt(1 + diff(f, x) ** 2), (x, low, high)))
    f, inner, c, d, outer, a, b = args
    if not (inner.is_Symbol and outer.is_Symbol):
        raise ValueError(f'int2 needs two letters in {text!r}')
    return simplify(integrate(integrate(f, (inner, c, d)), (outer, a, b)))


def call(name, args, text):
    if name == 'sqrt':
        return sqrt(args[0])
    if name in ('sin', 'cos', 'tan'):
        return {'sin': sin, 'cos': cos, 'tan': tan}[name](args[0])
    if name == 'abs':
        return Abs(args[0])
    if name == 'exp':
        return exp(args[0])
    if name == 'ln':
        return log(args[0])
    if name in ('arg', 'conj', 're', 'im'):
        return {'arg': sympy_arg, 'conj': conjugate, 're': sympy_re, 'im': sympy_im}[name](args[0])
    if name == 'log':
        return log(args[0], args[1])
    if name in ('C', 'P'):
        n, k = args
        if not (small(n, 60) and small(k, 60) and 0 <= k <= n):
            raise ValueError(f'{name}(n, k) needs 0 <= k <= n <= 60 in {text!r}')
        return binomial(n, k) if name == 'C' else ff(n, k)
    if name in MATRIX_FUNCTIONS:
        return matrix_call(name, args, text)
    if name in CALCULUS_FUNCTIONS:
        return calculus_call(name, args, text)
    term, index, low, high = args
    if index.is_Symbol and small(low, 1000) and high == oo:
        return Sum(term, (index, low, oo)).doit()
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
            if not (exponent.free_symbols or (exponent.is_Rational and abs(exponent.p) <= 200 and exponent.q <= 12)):
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
        if token == 'oo':
            return oo
        if token == '[':
            items = [expr()]
            while peek() == ',':
                take()
                items.append(expr())
            take(']')
            if all(isinstance(item, MatrixBase) for item in items):
                # a list of columns written as rows: [[1, 2], [3, 4]]
                if len({item.rows for item in items}) != 1 or any(item.cols != 1 for item in items):
                    raise ValueError(f'the rows of a matrix must have the same length in {text!r}')
                return Matrix([list(item) for item in items])
            if any(isinstance(item, MatrixBase) for item in items):
                raise ValueError(f'a list holds numbers or lists, not both in {text!r}')
            return Matrix(items)
        if token in FUNCTIONS:
            take('(')
            args = [expr()]
            while peek() == ',':
                take()
                args.append(expr())
            take(')')
            fewest, most = FUNCTIONS[token]
            if not fewest <= len(args) <= most:
                raise ValueError(f'{token} takes {fewest if fewest == most else f"{fewest} or {most}"} argument(s) in {text!r}')
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
        depth += (char in '([') - (char in ')]')
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
    if not (low.is_extended_real and high.is_extended_real and low < high):
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


PLACES = {'ones': Integer(1), 'ten': Integer(10), 'hundred': Integer(100), 'thousand': Integer(1000),
          'tenth': Rational(1, 10), 'hundredth': Rational(1, 100)}


def round_half_up(value, place):
    return (value / place + Rational(1, 2)).floor() * place


def top_digit(value):
    """A whole number rounded to its leading digit (398 -> 400, 52 -> 50)."""
    if value < 10:
        return value
    place = Integer(10) ** (len(str(int(value))) - 1)
    return round_half_up(value, place)


PRIME_PRODUCT = re.compile(r'^\s*\d+(\s*\^\s*\d+)?(\s*\*\s*\d+(\s*\^\s*\d+)?)*\s*$')
SCIENTIFIC = re.compile(r'^\s*(\d+(?:\.\d+)?)\s*\*\s*10\s*\^\s*\(?(-?\d+)\)?\s*$')
MIXED = re.compile(r'^\s*(\d+)\s*\+\s*(\d+)\s*/\s*(\d+)\s*$')


RELATIONS = {'<': Lt, '>': Gt, '<=': Le, '>=': Ge}


def set_key(interval_set):
    """A set of numbers as a comparable tuple of (start, end, left_open, right_open); infinities are symbols."""
    inf, minf = Symbol('inf'), Symbol('mininf')
    end = lambda value: inf if value == oo else minf if value == -oo else value
    parts = [interval_set] if isinstance(interval_set, Interval) else list(getattr(interval_set, 'args', [interval_set]))
    keys = []
    for part in parts:
        if isinstance(part, FiniteSet):
            keys.extend((v, v, Integer(0), Integer(0)) for v in part)
        elif isinstance(part, Interval):
            keys.append((end(part.start), end(part.end), Integer(1 if part.left_open else 0), Integer(1 if part.right_open else 0)))
        else:
            raise ValueError(f'unexpected set {part}')
    keys.sort(key=lambda k: (str(k[0]), str(k[1])))
    return Tuple(*[Tuple(*k) for k in keys])


def relation_set(text, variable):
    """The set an inequality choice such as "-1 < x < 4, x >= 7" describes."""
    result = S.EmptySet
    for chain in split_top(text, ','):
        parts = [part.strip() for part in re.split(r'(<=|>=|<|>)', chain)]
        if len(parts) < 3 or len(parts) % 2 == 0:
            raise ValueError(f'{chain!r} is not a relation chain')
        relations = [RELATIONS[parts[i + 1]](parse_formula(parts[i]), parse_formula(parts[i + 2])) for i in range(0, len(parts) - 2, 2)]
        result = result.union(And(*relations).as_set())
    return result


def inequality_solution(problem):
    lhs, rhs, op = [part.strip() for part in problem['question'].split(';')]
    f, g = parse_formula(lhs), parse_formula(rhs)
    x = variable_of(f - g) if (f - g).free_symbols else LETTERS['x']
    # Abs and friends need a real variable to be solved; the answer is compared as a set of reals.
    real = Symbol(x.name, real=True)
    return solve_univariate_inequality(RELATIONS[op](f.subs(x, real), g.subs(x, real)), real, relational=False), x


def diophantine(problem, choices):
    a, b, c = pair(problem['question'])
    pairs = [Tuple(*pair(choice)) for choice in choices]
    good = [p for p in pairs if a * p[0] + b * p[1] == c]
    if len(good) != 1 or not all(v.is_Integer for p in pairs for v in p):
        raise ValueError('exactly one choice must be an integer solution of ax + by = c')
    return good[0], pairs


def number(problem):
    """Whole-number facts: the answer and the choices as comparable values."""
    which, question, choices = problem['which'], problem['question'], problem['choices']
    values = pair(question)
    if which == 'diophantine':
        return diophantine(problem, choices)
    if which == 'to-base':
        n, base = int(values[0]), int(values[1])
        picked = []
        for choice in choices:
            digits = choice.strip()
            if not digits.isdigit() or any(int(d) >= base for d in digits):
                raise ValueError(f'{choice!r} is not a base {base} numeral')
            picked.append(Integer(int(digits, base)))
        return Integer(n), picked
    if which == 'from-base':
        digits, base = str(int(values[0])), int(values[1])
        if any(int(d) >= base for d in digits):
            raise ValueError('digits must be below the base')
        return Integer(int(digits, base)), [parse_formula(c) for c in choices]
    if which == 'remainder':
        a, m = int(values[0]), int(values[1])
        return Integer(a % m), [parse_formula(c) for c in choices]
    if which == 'power-mod':
        a, e, m = (int(v) for v in values)
        return Integer(pow(a, e, m)), [parse_formula(c) for c in choices]
    if which in ('gcd', 'lcm', 'euclid'):
        which = 'lcm' if which == 'lcm' else 'gcd'
        if not (len(values) >= 2 and all(v.is_Integer and v > 0 for v in values)):
            raise ValueError('expected two or more positive integers')
        answer = values[0]
        for v in values[1:]:
            answer = gcd(answer, v) if which == 'gcd' else lcm(answer, v)
        return answer, [parse_formula(c) for c in choices]
    if which == 'divisor-count':
        return Integer(divisor_count(int(values[0]))), [parse_formula(c) for c in choices]
    if which == 'nth-multiple':
        a, n = values
        return a * n, [parse_formula(c) for c in choices]
    if which == 'prime-factorization':
        n = int(values[0])
        picked = []
        for choice in choices:
            if not PRIME_PRODUCT.match(choice):
                raise ValueError(f'{choice!r} is not a product of numbers and powers')
            for base in re.findall(r'(\d+)(?:\s*\^\s*\d+)?', choice):
                if not isprime(int(base)):
                    raise ValueError(f'{choice!r}: {base} is not prime')
            picked.append(parse_formula(choice))
        return Integer(n), picked
    if which.startswith('round-'):
        return round_half_up(values[0], PLACES[which[6:]]), [parse_formula(c) for c in choices]
    if which == 'estimate':
        m = re.match(r'^\s*(\d+)\s*([-+*])\s*(\d+)\s*$', question)
        if not m:
            raise ValueError('estimate needs "a op b" with whole numbers')
        a, b = top_digit(Integer(m.group(1))), top_digit(Integer(m.group(3)))
        return {'+': a + b, '-': a - b, '*': a * b}[m.group(2)], [parse_formula(c) for c in choices]
    if which == 'scientific':
        n = values[0]
        picked = []
        for choice in choices:
            m = SCIENTIFIC.match(choice)
            if not m or not (1 <= Rational(m.group(1)) < 10):
                raise ValueError(f'{choice!r} is not a x 10^n with 1 <= a < 10')
            picked.append(parse_formula(choice))
        return n, picked
    if which == 'to-improper':
        m = MIXED.match(question)
        if not m or int(m.group(2)) >= int(m.group(3)):
            raise ValueError('a mixed number "a + b/c" with b < c')
        for index, choice in enumerate(choices):
            c = re.match(r'^\s*(\d+)\s*/\s*(\d+)\s*$', choice)
            if not c or (index == problem['answerIndex'] and int(c.group(1)) <= int(c.group(2))):
                raise ValueError(f'{choice!r}: the choices are fractions "a/b" and the answer is improper')
        return parse_formula(question), [parse_formula(c) for c in choices]
    if which == 'to-mixed':
        m = re.match(r'^\s*(\d+)\s*/\s*(\d+)\s*$', question)
        if not m or int(m.group(1)) <= int(m.group(2)) or int(m.group(1)) % int(m.group(2)) == 0:
            raise ValueError('an improper fraction that is not a whole number')
        picked = []
        for choice in choices:
            c = MIXED.match(choice)
            if not c or int(c.group(3)) == 0:
                raise ValueError(f'{choice!r} is not a mixed number "a + b/c"')
            picked.append(parse_formula(choice))
        return parse_formula(question), picked
    raise ValueError(f'unknown number variant {which!r}')


def stat(problem):
    which = problem['which']
    if which == 'correlation':
        return stat_spread(problem, which)
    data = sorted(pair(problem['question']))
    if len(data) < 3:
        raise ValueError('at least three values')
    if which == 'median':
        middle = len(data) // 2
        answer = data[middle] if len(data) % 2 else (data[middle - 1] + data[middle]) / 2
    elif which == 'range':
        answer = data[-1] - data[0]
    elif which in ('variance', 'std', 'correlation'):
        return stat_spread(problem, which)
    elif which == 'mode':
        counts = {v: data.count(v) for v in set(data)}
        best = max(counts.values())
        modes = [v for v, c in counts.items() if c == best]
        if len(modes) != 1 or best < 2:
            raise ValueError('the data must have exactly one most frequent value')
        answer = modes[0]
    else:
        raise ValueError(f'unknown stat variant {which!r}')
    return answer, [parse_formula(c) for c in problem['choices']]


def stat_spread(problem, which):
    if which == 'correlation':
        xs, ys = [pair(part) for part in problem['question'].split(';')]
        if len(xs) != len(ys) or len(xs) < 3:
            raise ValueError('two lists of the same length, at least 3')
        n = len(xs)
        mx, my = sum(xs) / n, sum(ys) / n
        cov = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
        vx, vy = sum((a - mx) ** 2 for a in xs), sum((b - my) ** 2 for b in ys)
        if vx == 0 or vy == 0:
            raise ValueError('the values must vary')
        return simplify(cov / sqrt(vx * vy)), [parse_formula(c) for c in problem['choices']]
    data = pair(problem['question'])
    n = len(data)
    mean = sum(data) / n
    variance = sum((v - mean) ** 2 for v in data) / n
    return (variance if which == 'variance' else simplify(sqrt(variance))), [parse_formula(c) for c in problem['choices']]


def quadratic(problem):
    which, question = problem['which'], problem['question']
    x = LETTERS['x']
    parts = question.split(';')
    f = parse_formula(parts[0])
    if which in ('discriminant', 'root-count', 'krange'):
        poly = Poly(f, x)
        if poly.degree() != 2:
            raise ValueError('a quadratic in x')
        a, b, c = poly.all_coeffs()
        d = expand(b ** 2 - 4 * a * c)
        if which == 'discriminant':
            return d, [parse_formula(c) for c in problem['choices']]
        if which == 'root-count':
            return Integer(2 if d > 0 else 1 if d == 0 else 0), [parse_formula(c) for c in problem['choices']]
        k = next(iter(d.free_symbols))
        return set_key(solve_univariate_inequality(d > 0, k, relational=False)), [set_key(relation_set(c, k)) for c in problem['choices']]
    if which in ('max', 'min'):
        low, high = pair(parts[1])
        domain = Interval(low, high)
        return simplify((maximum if which == 'max' else minimum)(f, x, domain)), [parse_formula(c) for c in problem['choices']]
    if which in ('max-all', 'min-all'):
        a = Poly(f, x).all_coeffs()[0]
        if (which == 'max-all') != (a < 0):
            raise ValueError('the parabola must open downward for a maximum and upward for a minimum')
        return simplify((maximum if which == 'max-all' else minimum)(f, x, S.Reals)), [parse_formula(c) for c in problem['choices']]
    raise ValueError(f'unknown quadratic variant {which!r}')


def triangle(problem):
    which, values = problem['which'], pair(problem['question'])
    deg = lambda v: v * pi / 180
    choices = [parse_formula(c) for c in problem['choices']]
    if which in ('sin', 'cos', 'tan'):
        opp, adj = values
        hyp = sqrt(opp ** 2 + adj ** 2)
        if not hyp.is_Integer:
            raise ValueError('the hypotenuse must be a whole number')
        return {'sin': opp / hyp, 'cos': adj / hyp, 'tan': opp / adj}[which], choices
    if which == 'sine-law':
        a, big_a, big_b = values
        if big_a + big_b >= 180:
            raise ValueError('the two angles must sum to less than 180')
        return simplify(a * sin(deg(big_b)) / sin(deg(big_a))), choices
    if which == 'cosine-side':
        a, b, big_c = values
        return simplify(sqrt(simplify(a ** 2 + b ** 2 - 2 * a * b * cos(deg(big_c))))), choices
    if which == 'cosine-cos':
        a, b, c = values
        if not (a + b > c and a + c > b and b + c > a):
            raise ValueError('not a triangle')
        return (a ** 2 + b ** 2 - c ** 2) / (2 * a * b), choices
    if which == 'triangle-area':
        a, b, big_c = values
        return simplify(a * b * sin(deg(big_c)) / 2), choices
    raise ValueError(f'unknown triangle variant {which!r}')


def function(problem):
    which, question = problem['which'], problem['question']
    x, y = LETTERS['x'], LETTERS['y']
    parts = question.split(';')
    if which in ('proportion', 'inverse'):
        x0, y0 = pair(question)
        if x0 == 0 or y0 == 0:
            raise ValueError('a nonzero point is needed')
        return (y0 / x0 * x if which == 'proportion' else x0 * y0 / x), [line_choice(c) for c in problem['choices']]
    if which in ('slope', 'intercept', 'xintercept'):
        f = parse_formula(question)
        if Poly(f, x).degree() != 1:
            raise ValueError('a linear function is needed')
        m, c = diff(f, x), f.subs(x, 0)
        answer = m if which == 'slope' else c if which == 'intercept' else -c / m
        return answer, [parse_formula(c) for c in problem['choices']]
    if which == 'rate':
        f, (a, b) = parse_formula(parts[0]), pair(parts[1])
        if a == b:
            raise ValueError('a and b must differ')
        return (f.subs(x, b) - f.subs(x, a)) / (b - a), [parse_formula(c) for c in problem['choices']]
    if which == 'intersect-lines':
        f, g = parse_formula(parts[0]), parse_formula(parts[1])
        found = solve(Eq(f, g), x)
        if len(found) != 1:
            raise ValueError('the lines must meet in exactly one point')
        return Tuple(found[0], f.subs(x, found[0])), [Tuple(*pair(c)) for c in problem['choices']]
    if which == 'intersect-parabola':
        f, g = parse_formula(parts[0]), parse_formula(parts[1])
        roots = [r for r in solve(Eq(f, g), x) if r.is_real]
        if len(roots) < 2:
            raise ValueError('the parabola and the line must cross at two points')
        return FiniteSet(*roots), [solution_choice(c, [x]) for c in problem['choices']]
    if which == 'rewrite':
        left, right = question.split('=')
        return solve(Eq(parse_formula(left), parse_formula(right)), y)[0], [line_choice(c) for c in problem['choices']]
    raise ValueError(f'unknown function variant {which!r}')


def rearrange(problem):
    left, right = problem['question'].split('=')
    target = LETTERS[problem['which']]
    found = solve(Eq(parse_formula(left), parse_formula(right)), target)
    if len(found) != 1:
        raise ValueError('the equation must be linear in the letter')
    return found[0], [parse_formula(c) for c in problem['choices']]


def eigenvector(problem):
    """The one choice that is an eigenvector of the matrix for the eigenvalue (v != 0, Av = lambda v)."""
    matrix_text, lambda_text = problem['question'].split(';')
    matrix, eigenvalue = parse_formula(matrix_text), parse_formula(lambda_text)
    if not (isinstance(matrix, MatrixBase) and matrix.rows == matrix.cols):
        raise ValueError('the question needs a square matrix')
    vectors = [parse_formula(choice) for choice in problem['choices']]
    if any(not isinstance(v, MatrixBase) or v.shape != (matrix.rows, 1) for v in vectors):
        raise ValueError('every choice must be a vector of the matrix size')
    good = [v for v in vectors if any(entry != 0 for entry in v) and same(matrix * v, eigenvalue * v)]
    if len(good) != 1:
        raise ValueError(f'exactly one choice must be an eigenvector, found {len(good)}')
    return good[0], vectors


def ode(problem):
    """The solution y(x) of the initial value problem, as an expression in x."""
    which, parts = problem['which'], problem['question'].split(';')
    x, y = LETTERS['x'], Function('y')
    if which in ('separable', 'linear'):
        right = parse_formula(parts[0])
        x0, y0 = pair(parts[1])
        solution = dsolve(Eq(y(x).diff(x), right.subs(LETTERS['y'], y(x))), y(x), ics={y(x0): y0})
    elif which == 'second':
        (a, b, c), (y0, v0) = pair(parts[0]), pair(parts[1])
        if a == 0:
            raise ValueError('a second-order equation needs a nonzero leading coefficient')
        solution = dsolve(Eq(a * y(x).diff(x, 2) + b * y(x).diff(x) + c * y(x), 0), y(x), ics={y(0): y0, y(x).diff(x).subs(x, 0): v0})
    else:
        raise ValueError(f'unknown ode variant {which!r}')
    if isinstance(solution, list):
        raise ValueError('the initial value problem must have one solution')
    return simplify(solution.rhs), [parse_formula(choice) for choice in problem['choices']]


def conic(problem):
    which, question = problem['which'], problem['question']
    x, y = LETTERS['x'], LETTERS['y']
    choices = problem['choices']

    def equation(text):
        sides = text.split('=')
        if len(sides) != 2:
            raise ValueError(f'expected an equation in {text!r}')
        return expand(parse_formula(sides[0]) - parse_formula(sides[1]))

    if which in ('parabola-focus', 'parabola-directrix'):
        # y^2 = 4px (focus (p, 0), directrix x = -p) or x^2 = 4py (focus (0, p), directrix y = -p)
        poly = Poly(equation(question), x, y)
        terms = dict(poly.terms())
        if set(terms) == {(0, 2), (1, 0)} and terms[(0, 2)] == 1:
            p, axis = -terms[(1, 0)] / 4, 'x'
        elif set(terms) == {(2, 0), (0, 1)} and terms[(2, 0)] == 1:
            p, axis = -terms[(0, 1)] / 4, 'y'
        else:
            raise ValueError('a parabola is y^2 = 4*p*x or x^2 = 4*p*y')
        if p == 0:
            raise ValueError('p must not be 0')
        if which == 'parabola-focus':
            return (Tuple(p, 0) if axis == 'x' else Tuple(0, p)), [Tuple(*pair(choice)) for choice in choices]
        return circle_form((x if axis == 'x' else y) + p), [circle_form(choice) for choice in choices]
    if which == 'parabola-equation':
        p = parse_formula(question)
        if p == 0:
            raise ValueError('p must not be 0')
        return circle_form(y ** 2 - 4 * p * x), [circle_form(choice) for choice in choices]
    if which in ('ellipse-c', 'ellipse-major', 'hyperbola-c', 'hyperbola-asymptote'):
        poly = Poly(equation(question), x, y)
        terms = dict(poly.terms())
        cx, cy, constant = terms.get((2, 0), 0), terms.get((0, 2), 0), terms.get((0, 0), 0)
        if set(terms) - {(2, 0), (0, 2), (0, 0)} or cx == 0 or cy == 0 or constant >= 0:
            raise ValueError('expected x^2/A + y^2/B = 1 or x^2/A - y^2/B = 1')
        A, B = -constant / cx, -constant / cy    # cx x^2 + cy y^2 = -constant
        if which.startswith('ellipse'):
            if not (A > 0 and B > 0 and A != B):
                raise ValueError('an ellipse needs A, B > 0 and A != B')
            answer = sqrt(abs(A - B)) if which == 'ellipse-c' else 2 * sqrt(max(A, B))
        else:
            if not (A > 0 and B < 0):
                raise ValueError('a hyperbola is x^2/A - y^2/B = 1 with A, B > 0')
            answer = sqrt(A - B) if which == 'hyperbola-c' else sqrt(-B / A)
        return simplify(answer), [parse_formula(choice) for choice in choices]
    if which == 'polar-to-xy':
        r, theta = pair(question)
        if not r > 0:
            raise ValueError('r must be positive')
        return Tuple(simplify(r * cos(theta)), simplify(r * sin(theta))), [Tuple(*pair(choice)) for choice in choices]
    if which == 'xy-to-polar':
        px, py = pair(question)
        r = simplify(sqrt(px ** 2 + py ** 2))
        if r == 0:
            raise ValueError('the origin has no polar angle')
        theta = simplify(atan2(py, px))
        if theta < 0:
            theta += 2 * pi
        return Tuple(r, simplify(theta)), [Tuple(*pair(choice)) for choice in choices]
    raise ValueError(f'unknown conic variant {which!r}')


def divmod_answer(problem):
    """The quotient and the remainder of a ÷ b (whole numbers, b > 0)."""
    a, b = pair(problem['question'])
    if not (a.is_Integer and b.is_Integer and a >= 0 and b > 0):
        raise ValueError('divmod needs whole numbers a >= 0 and b > 0')
    return Tuple(a // b, a % b), [Tuple(*pair(choice)) for choice in problem['choices']]


def _formula(problem):
    kind, question, choices = problem['kind'], problem['question'], problem['choices']
    if kind == 'inequality' and problem['which'] == 'solve':
        solution, variable = inequality_solution(problem)
        return set_key(solution), [set_key(relation_set(c, variable)) for c in problem['choices']]
    if kind == 'quadratic':
        return quadratic(problem)
    if kind == 'triangle':
        return triangle(problem)
    if kind == 'number':
        return number(problem)
    if kind == 'stat':
        return stat(problem)
    if kind == 'function':
        return function(problem)
    if kind == 'rearrange':
        return rearrange(problem)
    keyed = problem['answerIndex']
    if kind == 'graph':
        return graph(problem)
    if kind == 'divmod':
        return divmod_answer(problem)
    if kind == 'region':
        return region(problem)
    if kind == 'eigenvector':
        return eigenvector(problem)
    if kind == 'ode':
        return ode(problem)
    if kind == 'conic':
        return conic(problem)
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
    if kind == 'ode' and steps == []:
        return    # an initial value problem's working is not a chain of equal expressions
    if not (isinstance(steps, list) and 1 <= len(steps) <= 6 and all(isinstance(line, str) and line.strip() for line in steps)):
        raise ValueError('steps must be 1 to 6 non-empty lines')
    if kind == 'recurrence':
        return check_recurrence_steps(problem, answer, steps)
    for line in steps:
        if kind == 'calc' and problem.get('word') and any(letter in line for letter in 'xyzabcnmpqt'):
            # A word problem may write its equation ("150*x + 90*(15 - x) = 1710"): it must hold at the answer.
            unknowns = set().union(*(parse_formula(part).free_symbols for part in line.split('=')))
            if len(unknowns) == 1:
                symbol = next(iter(unknowns))
                if not holds(line.split('='), {symbol: answer}):
                    raise ValueError(f'step {line!r} does not hold when {symbol} = {answer}')
                continue
        if (kind == 'inequality' and problem['which'] == 'solve') or (kind == 'quadratic' and problem['which'] == 'krange'):
            check_boundary_line(problem, line)
            continue
        if kind == 'conic' and problem['which'] in ('parabola-directrix', 'parabola-equation'):
            check_equation_line(problem, answer, line)    # lines hold on the curve (y = -3 for the directrix y + 3 = 0)
            continue
        if kind in ('eigenvector', 'ode', 'conic'):
            check_consistent_chain(line)
            continue
        if kind in ('region', 'inference', 'number', 'stat', 'triangle', 'quadratic', 'divmod') or (kind == 'graph' and problem['which'] in ('vertex', 'region')) or (kind == 'function' and problem['which'] in ('slope', 'intercept', 'xintercept', 'rate')):
            check_numeric_chain(line)
            continue
        if kind in ('solve', 'tangent', 'extremum', 'identity') or (kind == 'inequality' and problem['which'] == 'amgm-equal') or kind == 'graph' or kind in ('function', 'rearrange') or (kind == 'geometry' and problem['which'].startswith(('line-', 'circle-', 'locus-'))):
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


def check_consistent_chain(line):
    """A line a = b = c whose parts are all equal to each other (numbers, vectors, matrices or expressions)."""
    for item in split_top(line, ','):
        values = [parse_formula(part) for part in item.split('=')]
        if any(not same(values[0], value) for value in values[1:]):
            raise ValueError(f'step {line!r} is not a true chain of equal values')


def check_numeric_chain(line):
    """A line of plain numbers a = b = c that are all equal (a calculation written out)."""
    for item in split_top(line, ','):   # "lo = a, hi = b" lists two chains
        values = [parse_formula(part) for part in item.split('=')]
        if any(value.free_symbols for value in values):
            raise ValueError(f'step {line!r} must be numbers only')
        if any(not same(values[0], value) for value in values[1:]):
            raise ValueError(f'step {line!r} is not a true chain of equal numbers')


def check_boundary_line(problem, line):
    """A worked line of an inequality: an equation that holds at a boundary point of the solution."""
    if problem['kind'] == 'quadratic':
        f = parse_formula(problem['question'])
        a, b, c = Poly(f, LETTERS['x']).all_coeffs()
        d = expand(b ** 2 - 4 * a * c)
        variable = next(iter(d.free_symbols))
        boundary = solve(Eq(d, 0), variable)
    else:
        lhs, rhs, _ = [part.strip() for part in problem['question'].split(';')]
        f, g = parse_formula(lhs), parse_formula(rhs)
        variable = variable_of(f - g) if (f - g).free_symbols else LETTERS['x']
        real = Symbol(variable.name, real=True)   # Abs needs a real variable
        boundary = solve(Eq(f.subs(variable, real), g.subs(variable, real)), real)
    if not boundary:
        raise ValueError('no boundary point')
    for item in split_top(line, ','):
        sides = item.split('=')
        if len(sides) < 2 or not any(holds(sides, {variable: point}) for point in boundary):
            raise ValueError(f'step {line!r} does not hold at a boundary point')


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
    if (kind == 'geometry' and problem['which'].startswith(('circle-', 'locus-'))) or (kind == 'graph' and problem['which'] == 'circle') or kind == 'conic':
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
    elif kind == 'rearrange':
        candidates = [{LETTERS[problem['which']]: answer}]
        every = True
    elif kind == 'function' and problem['which'] in ('intersect-lines', 'intersect-parabola'):
        # Each line holds at some intersection (an x value that solves f = g).
        xs = [answer[0]] if isinstance(answer, Tuple) else list(answer)
        candidates = [{LETTERS['x']: value} for value in xs]
        every = False
    elif kind in ('tangent', 'geometry', 'graph', 'function'):
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
    if kind in ('tangent', 'geometry', 'graph', 'function'):
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
    'inequality': ('math-inequality.json', formula),
    'triangle-trig': ('math-triangle-trig.json', formula),
    'statistics': ('math-statistics.json', formula),
    'integers': ('math-integers.json', formula),
    'combinatorics': ('math-combinatorics.json', formula),
    'data': ('math-data.json', formula),
    'unknowns': ('math-unknowns.json', formula),
    'rounding': ('math-rounding.json', formula),
    'divisors': ('math-divisors.json', formula),
    'prime': ('math-prime.json', formula),
    'linear-function': ('math-linear-function.json', formula),
    'square-function': ('math-square-function.json', formula),
    'quadratic-function': ('math-quadratic-function.json', formula),
    'conic': ('math-conic.json', formula),
    'vector': ('math-vector.json', formula),
    'matrix': ('math-matrix.json', formula),
    'linear-system': ('math-linear-system.json', formula),
    'vector-space': ('math-vector-space.json', formula),
    'eigen': ('math-eigen.json', formula),
    'series': ('math-series.json', formula),
    'improper-integral': ('math-improper-integral.json', formula),
    'multivariable': ('math-multivariable.json', formula),
    'limit': ('math-limit.json', formula),
    'linear-map': ('math-linear-map.json', formula),
    'inner-product': ('math-inner-product.json', formula),
    'ode': ('math-ode.json', formula),
    'division-remainder': ('math-division-remainder.json', formula),
    'place-value': ('math-place-value.json', formula),
    'measurement': ('math-measurement.json', formula),
    'time': ('math-time.json', formula),
    'rate': ('math-rate.json', formula),
    'ratio': ('math-ratio.json', formula),
    'relations': ('math-relations.json', formula),
    'counting': ('math-counting.json', formula),
    'sampling': ('math-sampling.json', formula),
    'probability': ('math-probability.json', formula),
    'sets': ('math-sets.json', formula),
    'factorization': ('math-factorization.json', factorization),
    'pythagoras': ('math-pythagoras.json', pythagoras),
}


def same(a, b):
    # Vectors and matrices compare entry by entry.
    if isinstance(a, MatrixBase) or isinstance(b, MatrixBase):
        return isinstance(a, MatrixBase) and isinstance(b, MatrixBase) and a.shape == b.shape and all(same(p, q) for p, q in zip(a, b))
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

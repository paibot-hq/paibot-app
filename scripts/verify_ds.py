"""Recompute the answers of the AI and data science problems (src/tools/ai-ds/data/<unit>.json).

A calculation problem carries a `check`: `expr`, its answer as an expression over the functions below, and `values`, the number
each of its four choices stands for. This script evaluates expr (only these functions, numbers, lists and arithmetic: anything
else is refused), and requires that exactly one choice's value equals it (within `tol`, 1e-9 when absent), that it is the
problem's answer, and that each choice's text shows its value. Every problem's shape is checked too (four distinct choices, an
answer in range, a tier, a known item). Knowledge problems have no check; their answers rest on the blind review.

The lessons (src/tools/ai-ds/lessons.json, the textbook text of an item page) are checked the same way: their shape, and each
worked example with a `check` (`expr` and `value`) has expr equal value (within `tol`) and its `answer` show that value.

    python scripts/verify_ds.py              check every bank and the lessons, exit 1 on a problem
    python scripts/verify_ds.py --json F     check one file of problems (a candidate), print the problems as JSON
    python scripts/verify_ds.py --lessons F  check one file of lessons ({"unit/item": lesson}), print the problems as JSON
"""

import ast
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'src' / 'tools' / 'ai-ds' / 'data'
CATALOG = ROOT / 'src' / 'tools' / 'ai-ds' / 'catalog.ts'
LESSONS = ROOT / 'src' / 'tools' / 'ai-ds' / 'lessons.json'


def _nums(xs):
    return [float(x) for x in xs]


def mean(xs):
    xs = _nums(xs)
    return sum(xs) / len(xs)


def median(xs):
    xs = sorted(_nums(xs))
    n = len(xs)
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def mode(xs):
    counts = {}
    for x in xs:
        counts[x] = counts.get(x, 0) + 1
    top = max(counts.values())
    modes = [x for x, c in counts.items() if c == top]
    if len(modes) != 1:
        raise ValueError('mode is not unique')
    return modes[0]


def var(xs):
    """Population variance (divide by n)."""
    m = mean(xs)
    return sum((x - m) ** 2 for x in _nums(xs)) / len(xs)


def svar(xs):
    """Sample (unbiased) variance (divide by n - 1)."""
    m = mean(xs)
    return sum((x - m) ** 2 for x in _nums(xs)) / (len(xs) - 1)


def std(xs):
    return math.sqrt(var(xs))


def sstd(xs):
    return math.sqrt(svar(xs))


def cov(xs, ys):
    """Population covariance."""
    mx, my = mean(xs), mean(ys)
    return sum((x - mx) * (y - my) for x, y in zip(_nums(xs), _nums(ys))) / len(xs)


def corr(xs, ys):
    return cov(xs, ys) / (std(xs) * std(ys))


def quantile(xs, q):
    """Linear interpolation between order statistics (numpy's default)."""
    xs = sorted(_nums(xs))
    pos = (len(xs) - 1) * q
    lo = math.floor(pos)
    hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def zscore(x, mu, sigma):
    return (x - mu) / sigma


def dot(a, b):
    return sum(x * y for x, y in zip(_nums(a), _nums(b)))


def norm(v, p=2):
    v = _nums(v)
    if p == math.inf:
        return max(abs(x) for x in v)
    return sum(abs(x) ** p for x in v) ** (1 / p)


def dist(a, b, p=2):
    return norm([x - y for x, y in zip(_nums(a), _nums(b))], p)


def cosine(a, b):
    return dot(a, b) / (norm(a) * norm(b))


def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


def det(m):
    n = len(m)
    if n == 1:
        return m[0][0]
    if n == 2:
        return m[0][0] * m[1][1] - m[0][1] * m[1][0]
    return sum((-1) ** j * m[0][j] * det([row[:j] + row[j + 1:] for row in m[1:]]) for j in range(n))


def trace(m):
    return sum(m[i][i] for i in range(len(m)))


def eig2(m):
    """The eigenvalues of a 2x2 matrix with real eigenvalues, largest first."""
    tr, d = trace(m), det(m)
    disc = tr * tr - 4 * d
    if disc < 0:
        raise ValueError('complex eigenvalues')
    r = math.sqrt(disc)
    return [(tr + r) / 2, (tr - r) / 2]


def entropy(p, base=2):
    return -sum(x * math.log(x, base) for x in _nums(p) if x > 0)


def cross_entropy(p, q, base=math.e):
    return -sum(x * math.log(y, base) for x, y in zip(_nums(p), _nums(q)) if x > 0)


def kl(p, q, base=math.e):
    return sum(x * math.log(x / y, base) for x, y in zip(_nums(p), _nums(q)) if x > 0)


def js(p, q, base=math.e):
    m = [(x + y) / 2 for x, y in zip(_nums(p), _nums(q))]
    return (kl(p, m, base) + kl(q, m, base)) / 2


def sigmoid(x):
    return 1 / (1 + math.exp(-x))


def softmax(xs, i, t=1):
    """The i-th (0-based) output of a softmax with temperature t."""
    es = [math.exp(x / t) for x in _nums(xs)]
    return es[i] / sum(es)


def relu(x):
    return max(0.0, x)


def leaky_relu(x, a=0.01):
    return x if x > 0 else a * x


def gelu(x):
    return x * 0.5 * (1 + math.erf(x / math.sqrt(2)))


def bce(y, p, base=math.e):
    """Binary cross-entropy of one prediction p for the label y (0 or 1)."""
    return -(y * math.log(p, base) + (1 - y) * math.log(1 - p, base))


def mse(ys, ps):
    return mean([(y - p) ** 2 for y, p in zip(_nums(ys), _nums(ps))])


def rmse(ys, ps):
    return math.sqrt(mse(ys, ps))


def mae(ys, ps):
    return mean([abs(y - p) for y, p in zip(_nums(ys), _nums(ps))])


def precision(tp, fp):
    return tp / (tp + fp)


def recall(tp, fn):
    return tp / (tp + fn)


def f1(tp, fp, fn):
    p, r = precision(tp, fp), recall(tp, fn)
    return 2 * p * r / (p + r)


def accuracy(tp, tn, fp, fn):
    return (tp + tn) / (tp + tn + fp + fn)


def auc(scores, labels):
    """AUC as the share of (positive, negative) pairs ranked correctly, ties counting half."""
    pos = [s for s, l in zip(scores, labels) if l == 1]
    neg = [s for s, l in zip(scores, labels) if l == 0]
    won = sum(1 if p > n else 0.5 if p == n else 0 for p in pos for n in neg)
    return won / (len(pos) * len(neg))


def iou(a, b):
    """Intersection over union of two boxes given as [x1, y1, x2, y2]."""
    w = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    h = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = w * h
    area = lambda r: (r[2] - r[0]) * (r[3] - r[1])
    return inter / (area(a) + area(b) - inter)


def perplexity(probs):
    """Perplexity of a sequence from the probabilities the model gave each token."""
    return math.exp(-mean([math.log(p) for p in _nums(probs)]))


def gini(p):
    return 1 - sum(x * x for x in _nums(p))


def conv_out(n, k, p=0, s=1, d=1):
    """Output length of a convolution or pooling over n inputs (kernel k, padding p, stride s, dilation d)."""
    return math.floor((n + 2 * p - d * (k - 1) - 1) / s) + 1


def conv_params(cin, cout, kh, kw=None, bias=True):
    kw = kh if kw is None else kw
    return cin * cout * kh * kw + (cout if bias else 0)


def dense_params(nin, nout, bias=True):
    return nin * nout + (nout if bias else 0)


def binom_pmf(n, k, p):
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k)


def poisson_pmf(lam, k):
    return math.exp(-lam) * lam ** k / math.factorial(k)


def normal_pdf(x, mu=0, sigma=1):
    return math.exp(-((x - mu) ** 2) / (2 * sigma ** 2)) / (sigma * math.sqrt(2 * math.pi))


def normal_cdf(x, mu=0, sigma=1):
    return 0.5 * (1 + math.erf((x - mu) / (sigma * math.sqrt(2))))


def discounted(rewards, gamma):
    """The discounted return r0 + γ r1 + γ² r2 + ..."""
    return sum(r * gamma ** t for t, r in enumerate(_nums(rewards)))


FUNCTIONS = {f.__name__: f for f in [
    mean, median, mode, var, svar, std, sstd, cov, corr, quantile, zscore, dot, norm, dist, cosine, matmul, det, trace, eig2,
    entropy, cross_entropy, kl, js, sigmoid, softmax, relu, leaky_relu, gelu, bce, mse, rmse, mae, precision, recall, f1,
    accuracy, auc, iou, perplexity, gini, conv_out, conv_params, dense_params, binom_pmf, poisson_pmf, normal_pdf, normal_cdf,
    discounted,
]}
FUNCTIONS.update({
    'sqrt': math.sqrt, 'exp': math.exp, 'log': math.log, 'log2': math.log2, 'log10': math.log10, 'tanh': math.tanh,
    'abs': abs, 'min': min, 'max': max, 'sum': lambda xs: sum(_nums(xs)), 'round': round, 'floor': math.floor, 'ceil': math.ceil,
    'comb': math.comb, 'perm': math.perm, 'factorial': math.factorial, 'len': len, 'pow': pow,
})
CONSTANTS = {'pi': math.pi, 'e': math.e, 'inf': math.inf}
ALLOWED = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant, ast.Call, ast.Name, ast.Load, ast.List, ast.Tuple, ast.keyword,
           ast.Subscript, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow, ast.USub, ast.UAdd)


def evaluate(expr):
    tree = ast.parse(expr, mode='eval')
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED):
            raise ValueError(f'not allowed: {type(node).__name__}')
        if isinstance(node, ast.Name) and node.id not in FUNCTIONS and node.id not in CONSTANTS:
            raise ValueError(f'unknown name: {node.id}')
        if isinstance(node, ast.Call) and not (isinstance(node.func, ast.Name) and node.func.id in FUNCTIONS):
            raise ValueError('only the listed functions can be called')
        if isinstance(node, ast.Constant) and not isinstance(node.value, (int, float)):
            raise ValueError('only numbers')
    value = eval(compile(tree, '<check>', 'eval'), {'__builtins__': {}}, {**FUNCTIONS, **CONSTANTS})  # noqa: S307 - names checked above
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f'the answer must be a number, got {value!r}')
    return float(value)


NUMBER = re.compile(r'-?\d+(?:\.\d+)?')
FRAC = re.compile(r'(-)?\\[dt]?frac\{(-?\d+(?:\.\d+)?)\}\{(-?\d+(?:\.\d+)?)\}')


def shown_number(text):
    """The number a choice shows: a TeX fraction, or the first number in it (10^{-3}, %, units and words around it allowed)."""
    t = text.replace('$', '').replace('{,}', '').replace(',', '').replace('−', '-').replace('\\,', '')
    frac = FRAC.search(t)
    if frac:
        value = float(frac.group(2)) / float(frac.group(3))
        return -value if frac.group(1) else value
    sci = re.search(r'(-?\d+(?:\.\d+)?)\s*\\times\s*10\^\{?(-?\d+)\}?', t)
    if sci:
        return float(sci.group(1)) * 10 ** int(sci.group(2))
    m = NUMBER.search(t)
    return float(m.group()) if m else None


def numbers_in(text):
    """Every number a sentence shows: TeX fractions, a x 10^n, plain numbers (a % one also as its value / 100)."""
    t = text.replace('$', '').replace('{,}', '').replace(',', '').replace('−', '-').replace('\\,', '')
    found = []
    for frac in FRAC.finditer(t):
        value = float(frac.group(2)) / float(frac.group(3))
        found.append(-value if frac.group(1) else value)
    for sci in re.finditer(r'(-?\d+(?:\.\d+)?)\s*\\times\s*10\^\{?(-?\d+)\}?', t):
        found.append(float(sci.group(1)) * 10 ** int(sci.group(2)))
    for m in re.finditer(r'-?\d+(?:\.\d+)?(\s*(?:\\%|%))?', t):
        found.append(float(m.group(0).rstrip('%\\ ').strip()))
        if m.group(1):
            found.append(found[-1] / 100)
    return found


def _text(value):
    return isinstance(value, str) and value.strip() != ''


def _texts(value, at_least=1):
    return isinstance(value, list) and len(value) >= at_least and all(_text(x) for x in value)


def lesson_errors(key, lesson, items=None):
    """What is wrong with one lesson: its shape, its TeX dollars, and the worked examples' checks."""
    errors = []
    unit, _, item = key.partition('/')
    if items is not None and item not in items.get(unit, set()):
        errors.append(f'{key}: no such item in catalog.ts')
    sections = lesson.get('sections')
    if not isinstance(sections, list) or not 2 <= len(sections) <= 4:
        errors.append(f'{key}: needs 2-4 sections')
        sections = sections if isinstance(sections, list) else []
    strings = []
    for n, section in enumerate(sections):
        where = f'{key}: sections[{n}]'
        if not _text(section.get('heading')):
            errors.append(f'{where}: needs a heading')
        if not _texts(section.get('paragraphs')):
            errors.append(f'{where}: needs paragraphs')
        for field in ('formulas', 'after'):
            if field in section and not _texts(section[field]):
                errors.append(f'{where}: {field} must be a list of text')
        strings += [section.get('heading'), *(section.get('paragraphs') or []), *(section.get('after') or [])]
        for formula in section.get('formulas') or []:
            if '$' in str(formula):
                errors.append(f'{where}: a display formula is TeX without $')
    examples = lesson.get('examples')
    if not isinstance(examples, list) or not 2 <= len(examples) <= 3:
        errors.append(f'{key}: needs 2-3 examples')
        examples = examples if isinstance(examples, list) else []
    for n, example in enumerate(examples):
        where = f'{key}: examples[{n}]'
        if not _text(example.get('prompt')):
            errors.append(f'{where}: needs a prompt')
        if not _texts(example.get('steps')) or len(example['steps']) > 6:
            errors.append(f'{where}: needs 1-6 steps')
        if not _text(example.get('answer')):
            errors.append(f'{where}: needs an answer')
        strings += [example.get('prompt'), *(example.get('steps') or []), example.get('answer')]
        check = example.get('check')
        if check is None:
            continue
        value, tol = check.get('value'), check.get('tol', 1e-9)
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            errors.append(f'{where}: check.value must be a number')
            continue
        try:
            computed = evaluate(check.get('expr', ''))
        except Exception as error:  # noqa: BLE001 - reported per example
            errors.append(f'{where}: check.expr fails: {error}')
            continue
        if abs(computed - value) > tol + 1e-9 * max(1, abs(value)):
            errors.append(f'{where}: check.expr is {computed:.6g}, not the value {value} (tol {tol})')
        elif _text(example.get('answer')) and not any(abs(x - value) <= tol + 1e-9 * max(1, abs(value)) for x in numbers_in(example['answer'])):
            errors.append(f'{where}: the answer does not show the value {value}')
    for text in strings:
        if isinstance(text, str) and text.count('$') % 2:
            errors.append(f'{key}: unbalanced $ in {text[:40]!r}')
    if 'reviewedAt' in lesson and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(lesson['reviewedAt'])):
        errors.append(f'{key}: reviewedAt must be a date')
    return errors


def item_ids():
    text = CATALOG.read_text(encoding='utf-8')
    units = {}
    for block in re.finditer(r"\{ id: '([a-z-]+)', items: \[(.*?)\] \}", text, re.S):
        units[block.group(1)] = set(re.findall(r"item\('([a-z-]+)'", block.group(2)))
    return units


def problems_of(unit, problems, items):
    errors = []
    seen = set()
    for p in problems:
        key = p.get('id', '?')
        if key in seen:
            errors.append(f'{key}: duplicate id')
        seen.add(key)
        if not re.fullmatch(rf'{unit}-\d{{3}}', key):
            errors.append(f'{key}: id must be {unit}-NNN')
        if items is not None and p.get('item') not in items:
            errors.append(f'{key}: unknown item {p.get("item")!r}')
        choices = p.get('choices')
        if not isinstance(choices, list) or len(choices) != 4 or not all(isinstance(c, str) and c.strip() for c in choices):
            errors.append(f'{key}: needs four choices')
            continue
        if len(set(c.strip() for c in choices)) != 4:
            errors.append(f'{key}: choices must differ')
        if p.get('answerIndex') not in (0, 1, 2, 3):
            errors.append(f'{key}: answerIndex must be 0-3')
        if p.get('tier') not in (1, 2, 3):
            errors.append(f'{key}: tier must be 1, 2 or 3')
        for field in ('question', 'explanation'):
            if not isinstance(p.get(field), str) or not p[field].strip():
                errors.append(f'{key}: needs {field}')
            elif p[field].count('$') % 2:
                errors.append(f'{key}: unbalanced $ in {field}')
        check = p.get('check')
        if check is None:
            continue
        values = check.get('values')
        if not isinstance(values, list) or len(values) != 4 or not all(isinstance(v, (int, float)) for v in values):
            errors.append(f'{key}: check.values needs four numbers')
            continue
        tol = check.get('tol', 1e-9)
        try:
            answer = evaluate(check.get('expr', ''))
        except Exception as error:  # noqa: BLE001 - reported per problem
            errors.append(f'{key}: check.expr fails: {error}')
            continue
        close = lambda a, b: abs(a - b) <= tol + 1e-9 * max(1, abs(b))
        matches = [i for i, v in enumerate(values) if close(v, answer)]
        if len(matches) != 1:
            errors.append(f'{key}: {len(matches)} choices equal the answer {answer:.6g} (values {values}, tol {tol})')
        elif matches[0] != p['answerIndex']:
            errors.append(f'{key}: the answer {answer:.6g} is choice {matches[0]}, not answerIndex {p["answerIndex"]}')
        for i, (text, v) in enumerate(zip(choices, values)):
            shown = shown_number(text)
            if shown is None:
                errors.append(f'{key}: choice {i} ({text!r}) shows no number')
            elif not math.isclose(shown, v, rel_tol=1e-6, abs_tol=1e-9) and not ('%' in text and math.isclose(shown / 100, v, rel_tol=1e-6, abs_tol=1e-9)):
                errors.append(f'{key}: choice {i} shows {shown} but its value is {v}')
    return errors


def main():
    units = item_ids()
    if len(sys.argv) == 3 and sys.argv[1] == '--json':
        data = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
        unit = data.get('unit', '')
        errors = problems_of(unit, data['problems'], units.get(unit))
        print(json.dumps(errors, ensure_ascii=False))
        sys.exit(1 if errors else 0)
    if len(sys.argv) == 3 and sys.argv[1] == '--lessons':
        data = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
        errors = [e for key, lesson in data.items() for e in lesson_errors(key, lesson, units)]
        print(json.dumps(errors, ensure_ascii=False))
        sys.exit(1 if errors else 0)
    errors = []
    count = checked = 0
    for path in sorted(DATA.glob('*.json')):
        unit = path.stem
        if unit not in units:
            errors.append(f'{path.name}: no such unit in catalog.ts')
            continue
        problems = json.loads(path.read_text(encoding='utf-8'))['problems']
        count += len(problems)
        checked += sum(1 for p in problems if p.get('check'))
        errors += problems_of(unit, problems, units[unit])
    lessons = json.loads(LESSONS.read_text(encoding='utf-8'))
    for key, lesson in lessons.items():
        errors += lesson_errors(key, lesson, units)
    examples = sum(1 for lesson in lessons.values() for e in lesson.get('examples', []) if e.get('check'))
    for error in errors:
        print(f'FAIL: {error}')
    if errors:
        sys.exit(1)
    print(f'PASS: {count} AI and data science problems ({checked} answers recomputed), {len(lessons)} lessons ({examples} examples recomputed)')


if __name__ == '__main__':
    main()

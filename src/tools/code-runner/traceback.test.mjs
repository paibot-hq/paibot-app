import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTraceback } from './traceback.ts';

test('Pyodide frames are dropped and the line in main.py is found', () => {
  const message = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
    ^^^^^^^^^^^^^^^^^
  File "/lib/python314.zip/_pyodide/_base.py", line 411, in run_async
    coroutine = eval(self.code, globals, locals)
  File "main.py", line 4, in <module>
    print(divide(1, 0))
  File "main.py", line 2, in divide
    return a / b
           ~~^~~
ZeroDivisionError: division by zero
`;
  assert.deepEqual(cleanTraceback(message), {
    text: `Traceback (most recent call last):
  File "main.py", line 4, in <module>
    print(divide(1, 0))
  File "main.py", line 2, in divide
    return a / b
           ~~^~~
ZeroDivisionError: division by zero`,
    line: 2,
  });
});

test('a syntax error keeps its place and caret', () => {
  const message = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 589, in eval_code_async
    self.code = compile(source, filename, "exec")
  File "main.py", line 3
    print("hi"
         ^
SyntaxError: '(' was never closed`;
  const { text, line } = cleanTraceback(message);
  assert.equal(line, 3);
  assert.match(text, /^Traceback[\s\S]*File "main.py", line 3\n {4}print\("hi"\n {9}\^\nSyntaxError/);
});

test('an error with no frame of main.py is just its last line', () => {
  assert.deepEqual(cleanTraceback(`Traceback (most recent call last):\n  File "/lib/python314.zip/_pyodide/_base.py", line 1, in x\n    y\nModuleNotFoundError: No module named 'foo'`), { text: "ModuleNotFoundError: No module named 'foo'", line: undefined });
});

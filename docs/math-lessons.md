# Math lesson generation

`src/data/item-lessons.json` holds the lessons the app can display. A lesson is
displayed only when it has `reviewedAt`. The writer's output must pass the
three-language/KaTeX checks, SymPy checks, and every selected reviewer before it
replaces the displayed lesson.

```sh
npm run math:lessons -- <unit|unit/item> ...
npm run math:lessons -- <unit|unit/item> ... --rewrite
npm run math:lessons -- <unit|unit/item> ... --figures
npm run math:lessons -- <unit|unit/item> ... --review
```

`--rewrite` writes the selected items again; `--figures` adds drawings where
useful. `--review` resumes a saved draft, including its last review findings;
otherwise it reviews an existing unreviewed lesson. It skips an already reviewed
lesson that has no saved draft. `--jobs N` controls concurrency (default 3).
Review findings are repaired with small JSON Patch edits, preserving unrelated
text, figures, and examples. The entire resulting candidate still passes the
same checks and independent review before publication.

Drafts and their feedback are stored in the ignored
`.math-work/lesson-drafts.json`. The displayed data stays unchanged while a draft
is being written, checked or reviewed. A failed check, unavailable reviewer,
exception, or interruption keeps the draft for the next run. Successful review
updates the displayed lesson and removes its draft. Back up `.math-work` along
with the working tree when moving unfinished work to another machine.

The writer defaults to Claude (`MATH_LESSON_WRITER=claude`). The reviewer defaults
to Antigravity (`MATH_LESSON_REVIEWERS=agy`); `opus` uses a separate Claude Opus
call, and `codex` uses a separate Codex call. Comma-separated reviewers must all
pass. Claude writing and Opus review share the Claude subscription's quota.
Changing providers is an explicit environment setting; a failed provider is not
silently replaced. Review with the same model in separate calls offers less
independence than review with a different model.
Use `codex/<model-id>` to select an account-supported Codex model separately for
each role. For example, `MATH_LESSON_WRITER=codex/gpt-6-luna` and
`MATH_LESSON_REVIEWERS=codex/gpt-6-sol` keep the writer and reviewer in separate
calls and different models. Plain `codex` uses `MATH_CODEX_MODEL` when set, or the
CLI's configured default otherwise. No user-wide model setting is changed.

OpenCode can run both roles with different models. For example, the following
uses the separately available free models when the OpenCode Go quota is exhausted:

```sh
MATH_LESSON_WRITER=opencode/deepseek-v4.1-flash-free \
MATH_LESSON_REVIEWERS=opencode/glm-5.3-flash-free \
npm run math:lessons -- <unit/item> ... --review
```

The exact `opencode/...` or `opencode-go/...` ID is passed through to OpenCode.
`OPENCODE_BIN` can select the installed executable when it is outside `PATH`.
OpenCode Go quota errors stop the batch as soon as they appear in the CLI error
log; the CLI may otherwise remain running without returning a response.
`MATH_LESSON_DATA_FILE` and `MATH_LESSON_DRAFTS_FILE` select separate files for
an isolated generation pass. Never run two batches that write the same files.
Before bringing an isolated revision back, check that its starting lesson still
matches the current lesson, so it cannot replace newer text.

An example may carry `prompt` (the problem's conditions and goal in ja/en/zh),
displayed before its formula. An example or mistake with `style: "box"` keeps
`x` in the machine-checked formulas but renders it as □, using the existing quiz
formula renderer. The review prompt explains this representation. Literal TeX
such as `\\square` belongs in prose, not the formula grammar.

Weekly/quota exhaustion stops the batch instead of retrying every item. Temporary
failures retain the 1-, 4-, and 10-minute retry delays. Resolve the quota/provider
issue and rerun the remaining items with `--review` to resume their drafts.

To verify saved data without calling a model:

```sh
node --test tests/unit/math-lessons.test.mjs tests/unit/math-lesson-graph.test.mjs tests/unit/math-lesson-store.test.mjs
uv run --locked python scripts/verify_lessons.py
uv run --locked python tests/unit/test_verify_lessons.py
```

`verify_lessons.py --file <json> [unit/item ...]` checks a candidate file whose
top-level keys are item IDs, without editing the displayed data. Formula checks
do not replace the prose and curriculum review.

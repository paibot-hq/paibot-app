// What the AI and data science scripts (ai-ds-generate.mjs, ai-ds-lessons.mjs) share: running a command, asking Claude
// (Claude Code in print mode, no tools) and Codex (read-only), and reading the JSON out of an answer. Antigravity (agy) is
// not called: its terms for personal plans may not allow running it from other programs.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

export const root = new URL('../../', import.meta.url);
export const prompt = name => readFileSync(new URL(`scripts/ai-ds-prompts/${name}.md`, root), 'utf8');
export const today = new Date().toISOString().slice(0, 10);
export const log = (key, message) => console.log(`${new Date().toISOString().slice(11, 19)} ${key}: ${message}`);
const local = join(homedir(), '.claude/local/claude');
const CLAUDE = process.env.CLAUDE_BIN ?? (existsSync(local) ? local : 'claude');

export function exec(command, args, { cwd, input, anyCode = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), 15 * 60_000);
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    if (input !== undefined) child.stdin.end(input);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 || anyCode ? resolve(out) : reject(new Error(`${command} failed (${code}): ${err.slice(-1500)}`)); });
  });
}

export function extractJSON(text, key) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no JSON in the answer');
  const data = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(data[key])) throw new Error(`the JSON has no ${key} list`);
  return data;
}

export async function claude(text) {
  const temp = mkdtempSync(join(tmpdir(), 'ai-ds-'));
  try { return await exec(CLAUDE, ['-p', text, '--tools', '', '--strict-mcp-config', '--output-format', 'text'], { cwd: temp }); }
  finally { rmSync(temp, { recursive: true, force: true }); }
}

export async function codex(text) {
  const temp = mkdtempSync(join(tmpdir(), 'ai-ds-'));
  const output = join(temp, 'answer.txt');
  try {
    await exec('codex', ['exec', '-c', `model_reasoning_effort="${process.env.AI_DS_REVIEW_EFFORT ?? 'medium'}"`, '--sandbox', 'read-only', '--skip-git-repo-check', '-o', output, '-'], { cwd: temp, input: text });
    return readFileSync(output, 'utf8');
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

// The items and sets named on the command line (a unit or unit/item each).
export function wantedArgs(argv) {
  const jobsAt = argv.indexOf('--jobs');
  return {
    jobs: jobsAt >= 0 ? Number(argv[jobsAt + 1]) : 3,
    flags: new Set(argv.filter(arg => arg.startsWith('--'))),
    wanted: argv.filter((arg, at) => !arg.startsWith('--') && !(jobsAt >= 0 && at === jobsAt + 1)),
  };
}

// Run work over a queue, `jobs` at a time; returns how many failed.
export async function runQueue(todo, jobs, work, label) {
  let failures = 0;
  const queue = [...todo];
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, queue.length)) }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      try { await work(next); }
      catch (error) { failures++; log(label(next), `failed: ${error.message}`); }
    }
  }));
  return failures;
}

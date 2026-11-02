import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import type { Terminal } from '@xterm/xterm';
import ToolLayout from '../../components/tool-layout';
import { createLinuxWorker } from './worker.client';
import '@xterm/xterm/css/xterm.css';
import styles from './linux.module.css';

type Status = 'idle' | 'loading' | 'ready' | 'stopped' | 'error';
const EXAMPLES = ['pwd', 'ls -la', 'cat hello.txt', "grep ERROR app.log", 'uname -a', 'echo hello | wc -c'];

export default function Linux() {
  const t = useTranslations('App.linux');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [command, setCommand] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function dispose() {
    generation.current++;
    clearTimeout(timer.current);
    worker.current?.terminate(); worker.current = null;
    terminal.current?.dispose(); terminal.current = null;
  }
  useEffect(() => () => dispose(), []);

  async function boot() {
    dispose();
    const current = generation.current;
    setConfirmReset(false); setCommand(''); setError(''); setStatus('loading');
    try {
      const { Terminal } = await import('@xterm/xterm');
      if (generation.current !== current || !host.current) return;
      const term = new Terminal({
        cols: 80, rows: 22, fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        cursorBlink: true, scrollback: 1500, convertEol: false,
        theme: { background: '#101820', foreground: '#e5edf3', cursor: '#85e1b2', selectionBackground: '#36536a' },
        allowProposedApi: false, screenReaderMode: true,
      });
      terminal.current = term;
      term.open(host.current);
      term.writeln(t('bootMessage'));
      const vm = createLinuxWorker(); worker.current = vm;
      const fail = (message: string) => {
        if (generation.current !== current) return;
        clearTimeout(timer.current); vm.terminate(); worker.current = null;
        setError(message); setStatus('error');
      };
      vm.onmessage = ({ data }) => {
        if (generation.current !== current) return;
        if (data.type === 'output') term.write(data.bytes);
        if (data.type === 'ready') {
          clearTimeout(timer.current); term.reset(); setStatus('ready'); term.focus();
        }
        if (data.type === 'error') fail(t('loadError'));
      };
      vm.onerror = () => fail(t('loadError'));
      term.onData(text => vm.postMessage({ type: 'input', text }));
      timer.current = setTimeout(() => fail(t('timeout')), 90000);
      vm.postMessage({ type: 'boot' });
    } catch { if (generation.current === current) { dispose(); setError(t('loadError')); setStatus('error'); } }
  }

  function send(text: string) {
    if (status !== 'ready') return;
    worker.current?.postMessage({ type: 'input', text });
    terminal.current?.focus();
  }
  const active = status === 'loading' || status === 'ready';
  return <ToolLayout title={t('title')}>
    <p className={styles.intro}>{t('intro')}</p>
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <span className={styles.status} role="status" data-linux-status={status}><span data-active={status === 'ready' || undefined} />{t(`status.${status}`)}</span>
        <div className={styles.actions}>
          {!active && <button type="button" className={styles.primary} onClick={boot}>{t('start')}</button>}
          {active && <button type="button" onClick={() => { dispose(); setStatus('stopped'); setConfirmReset(false); }}>{t('stop')}</button>}
          {active && <button type="button" onClick={() => setConfirmReset(true)}>{t('reset')}</button>}
        </div>
      </div>
      {confirmReset && <div className={styles.confirm}>
        <p>{t('resetConfirm')}</p>
        <button type="button" onClick={boot}>{t('resetNow')}</button>
        <button type="button" onClick={() => setConfirmReset(false)}>{t('cancel')}</button>
      </div>}
      <div className={styles.viewport} aria-label={t('terminal')}>
        <div className={styles.terminal} ref={host} />
        {!active && <div className={styles.placeholder}>{t(status === 'error' ? 'errorHint' : 'empty')}</div>}
      </div>
      {status === 'ready' && <>
        <div className={styles.keys} aria-label={t('specialKeys')}>
          <button type="button" onClick={() => send('\t')}>Tab</button>
          <button type="button" onClick={() => send('\x03')}>Ctrl+C</button>
          <button type="button" onClick={() => send('\x1b[A')}>{t('previous')}</button>
          <button type="button" onClick={() => send('\x1b[B')}>{t('next')}</button>
          <button type="button" onClick={() => send('\x1b')}>Esc</button>
        </div>
        <form className={styles.command} onSubmit={event => { event.preventDefault(); send(command + '\r'); setCommand(''); }}>
          <label htmlFor="linux-command">{t('command')}</label>
          <div><input id="linux-command" value={command} onChange={e => setCommand(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} /><button type="submit">{t('send')}</button></div>
        </form>
      </>}
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <p className={styles.note}>{t('sessionNote')}</p>
    <section className={styles.examples} aria-labelledby="linux-examples">
      <h2 id="linux-examples">{t('tryTitle')}</h2>
      <p>{t('tryIntro')}</p>
      <div>{EXAMPLES.map((example, i) => <button type="button" key={example} disabled={status !== 'ready'} onClick={() => { setCommand(example); document.getElementById('linux-command')?.focus(); }}><code>{example}</code><span>{t(`examples.${i as 0 | 1 | 2 | 3 | 4 | 5}`)}</span></button>)}</div>
    </section>
    <p className={styles.credits}><a href="https://github.com/copy/v86">v86</a> · Buildroot Linux · <a href="/linux/NOTICE.md">{t('credits')}</a></p>
  </ToolLayout>;
}

import { V86 } from 'v86';
import wasmUrl from 'v86/build/v86.wasm?url';

// The VM lives in a worker: Stop/Reset can terminate even a hung guest.
let vm: V86 | undefined;
let output: number[] = [];
let tail = '';
let initializing = false;
let ready = false;
const flush = () => {
  if (output.length) { postMessage({ type: 'output', bytes: new Uint8Array(output) }); output = []; }
};
setInterval(flush, 24);

// Boot images are fetched from the upstream projects, not redistributed in the app.
// Integrity pins them: an upstream change fails visibly rather than silently changing the guest.
const IMAGES = {
  bios: { url: 'https://raw.githubusercontent.com/copy/v86/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios/seabios.bin', integrity: 'sha256-c+PzWRAuOpmCw1/OmOt80I8YMDrH8bpuv75s3BwkTZg=' },
  kernel: { url: 'https://i.copy.sh/buildroot-bzimage68.bin', integrity: 'sha256-UHp1nHCrekkKIzvkVNC1uIvGZ5VqQQtTHLTtwJHi6xw=' },
};
async function image(name: keyof typeof IMAGES) {
  const { url, integrity } = IMAGES[name];
  const response = await fetch(url, { integrity, referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Unable to load ${name} (${response.status})`);
  return { buffer: await response.arrayBuffer() };
}

self.onmessage = async ({ data }) => {
  if (data.type === 'input') { if (ready) vm?.serial_send_bytes(0, new TextEncoder().encode(data.text.replace(/\r/g, '\n'))); return; }
  if (data.type !== 'boot' || vm) return;
  try {
    const [bios, kernel] = await Promise.all([image('bios'), image('kernel')]);
    vm = new V86({
      wasm_path: wasmUrl,
      bios, bzimage: kernel,
      memory_size: 128 * 1024 * 1024,
      vga_memory_size: 2 * 1024 * 1024,
      filesystem: {},
      cmdline: 'console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on',
      autostart: true,
      disable_keyboard: true, disable_mouse: true, disable_speaker: true,
      // No network backend: commands and files stay inside the guest.
    });
    vm.add_listener('serial0-output-byte', byte => {
      if (ready) output.push(byte);
      tail = (tail + String.fromCharCode(byte)).slice(-2048);
      if (!initializing && tail.endsWith('~% ')) {
        initializing = true;
        // Seed only on a fresh boot. Never interpolate user input into the setup script.
        vm!.serial0_send("stty -echo; export TERM=xterm PS1='paibot:~# '; mkdir -p /root/practice; printf 'Hello from Linux!\\nTry: cat hello.txt\\n' > /root/practice/hello.txt; printf 'INFO started\\nERROR file missing\\nINFO finished\\n' > /root/practice/app.log; cd /root/practice; printf '\\n__PAIBOT_READY__\\n'; stty echo\n");
      }
      if (!ready && tail.includes('\r\n__PAIBOT_READY__\r\n') && tail.endsWith('paibot:~# ')) {
        ready = true;
        output = [];
        postMessage({ type: 'ready' });
        postMessage({ type: 'output', bytes: new TextEncoder().encode('paibot:~# ') });
      }
    });
  } catch (error) {
    postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};

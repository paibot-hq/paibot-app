# Linux Terminal — credits and boot images

The emulator and terminal are bundled with PAIBOT. Boot images are downloaded
by the visitor's browser directly from their upstream hosts only after Start.
No VM networking backend is configured. Changes live in memory only.

- v86 0.5.473: https://github.com/copy/v86 — BSD-2-Clause.
  License: https://github.com/copy/v86/blob/master/LICENSE
- xterm.js: https://github.com/xtermjs/xterm.js — MIT.
  License: https://github.com/xtermjs/xterm.js/blob/master/LICENSE
- SeaBIOS rel-1.16.2, as built by v86: LGPL-3.0.
  Pinned image: https://raw.githubusercontent.com/copy/v86/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios/seabios.bin
  Source and build instructions: https://github.com/copy/v86/blob/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios/fetch-and-build-seabios.sh
  License: https://github.com/copy/v86/blob/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios/COPYING.LESSER
- Buildroot Linux 6.8 boot image (includes its initial filesystem), distributed
  by the v86 author: https://i.copy.sh/buildroot-bzimage68.bin
  Upstream demo/configuration: https://github.com/copy/v86/blob/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/src/browser/main.js
  Buildroot: https://buildroot.org/ ; Linux: https://www.kernel.org/

The Linux and BIOS binaries are not included in this repository or deployment.
Their SHA-256 integrity values are pinned in linux.worker.ts. Updating either
requires reviewing the replacement, updating its pin, and rerunning the real
boot/command/reset browser test. Upstream availability is required to boot.

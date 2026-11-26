# Linux Terminal — credits and boot images

The emulator and terminal are bundled with PAIBOT. The two boot images below are
served from this site (this folder) and loaded by the visitor's browser only after
Start. No VM networking backend is configured. Changes live in memory only.

- v86 0.5.473: https://github.com/copy/v86 — BSD-2-Clause.
  License: https://github.com/copy/v86/blob/master/LICENSE
- xterm.js: https://github.com/xtermjs/xterm.js — MIT.
  License: https://github.com/xtermjs/xterm.js/blob/master/LICENSE
- `seabios.bin` — SeaBIOS rel-1.16.2, as built by v86: LGPL-3.0.
  Upstream copy: https://raw.githubusercontent.com/copy/v86/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios/seabios.bin
  Source and build instructions: https://github.com/copy/v86/blob/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios/fetch-and-build-seabios.sh
  License: https://github.com/copy/v86/blob/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios/COPYING.LESSER
- `buildroot-bzimage68.bin` — Buildroot Linux 6.8 boot image (includes its initial
  filesystem), built and distributed by the v86 author; this is an unmodified copy.
  Upstream copy: https://i.copy.sh/buildroot-bzimage68.bin
  Upstream demo/configuration: https://github.com/copy/v86/blob/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/src/browser/main.js
  Linux (GPL-2.0) source: https://www.kernel.org/ (version 6.8) ;
  Buildroot (GPL-2.0) source: https://buildroot.org/

The images were mirrored here in November 2026, when the kernel's upstream host
stopped sending CORS headers and the terminal could no longer load it. Both files
are byte-for-byte the upstream builds: their SHA-256 integrity values are pinned
in linux.worker.ts and match the upstream copies above. Updating either requires
reviewing the replacement, updating its pin and this notice, and rerunning the
real boot/command/reset browser test.

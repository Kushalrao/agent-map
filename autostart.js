#!/usr/bin/env node
/**
 * Claude Code SessionStart hook: make sure agentview is running and watching
 * this session's project.
 *
 * - Server not running → start it (detached) watching the session's cwd, then
 *   open the browser once.
 * - Server already running → just point it at this session's cwd (POST /watch).
 *
 * Always exits 0 quickly so it never delays the session.
 */
const { spawn, exec } = require('child_process');
const path = require('path');

const PORT = process.env.AGENTVIEW_PORT || 4517;
const BASE = `http://127.0.0.1:${PORT}`;

setTimeout(() => process.exit(0), 6000).unref();

const ping = async () => {
  try {
    const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(400) });
    return r.ok;
  } catch { return false; }
};

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', async () => {
  let cwd = process.cwd();
  try { cwd = JSON.parse(input).cwd || cwd; } catch {}

  try {
    if (await ping()) {
      // already running — retarget the watched directory to this project
      await fetch(BASE + '/watch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dir: cwd }),
        signal: AbortSignal.timeout(800),
      }).catch(() => {});
      return process.exit(0);
    }

    spawn(process.execPath, [path.join(__dirname, 'server.js'), cwd], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (await ping()) break;
    }
    if (process.platform === 'darwin') exec(`open ${BASE}`);
  } catch { /* never block the session */ }
  process.exit(0);
});

#!/usr/bin/env node
/**
 * Demo: a main agent works through the repo and dispatches two sub-agent
 * "kids" mid-way. Kids do their tasks, go quiet, then run home to the main
 * agent and disappear.
 *
 *   node demo.js
 */
const path = require('path');
const PORT = process.env.AGENTVIEW_PORT || 4517;
const abs = (f) => path.join(__dirname, f);

// [seconds-to-wait-before, session, tool, file]
const script = [
  [1.0, 'main-agent', 'Read',  'README.md'],
  [3.0, 'main-agent', 'Read',  'server.js'],
  [3.0, 'main-agent', 'Edit',  'server.js'],
  // main dispatches two sub-agents
  [2.0, 'kid-1',      'Read',  'public/index.html'],
  [0.5, 'kid-2',      'Read',  'playground/hello.js'],
  [3.0, 'main-agent', 'Read',  'hook.js'],
  [1.0, 'kid-1',      'Edit',  'public/index.html'],
  [1.0, 'kid-2',      'Edit',  'playground/hello.js'],
  [2.5, 'kid-2',      'Write', 'playground/notes.md'],
  [1.0, 'main-agent', 'Edit',  'hook.js'],
  [2.0, 'kid-1',      'Edit',  'public/index.html'],
  // kids go quiet here → they run home and vanish
  [3.0, 'main-agent', 'Read',  'demo.js'],
  [4.0, 'main-agent', 'Edit',  'server.js'],
  [4.0, 'main-agent', 'Write', 'README.md'],
];

async function post(session, tool, file) {
  try {
    await fetch(`http://127.0.0.1:${PORT}/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, tool, phase: 'pre', file: abs(file) }),
    });
    console.log(`${session.padEnd(10)}  ${tool.padEnd(5)}  ${file}`);
  } catch (e) {
    console.error('server not reachable:', e.message);
    process.exit(1);
  }
}

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

(async () => {
  console.log('demo starting — watch http://localhost:4517\n');
  for (const [wait, session, tool, file] of script) {
    await sleep(wait);
    await post(session, tool, file);
  }
  console.log('\ndemo finished (kids will run home a few seconds after their last task)');
})();

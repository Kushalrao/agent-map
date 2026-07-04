#!/usr/bin/env node
/**
 * Claude Code hook forwarder.
 * Claude Code pipes the tool-call payload to stdin; we forward the file path
 * to the agentview server. Always exits 0 fast so it never blocks the agent.
 *
 * Wire it up in .claude/settings.json (project) or ~/.claude/settings.json (global):
 *   "hooks": {
 *     "PreToolUse": [{
 *       "matcher": "Edit|Write|MultiEdit|NotebookEdit|Read",
 *       "hooks": [{ "type": "command", "command": "node /ABSOLUTE/PATH/agentview/hook.js", "timeout": 5 }]
 *     }]
 *   }
 */
const PORT = process.env.AGENTVIEW_PORT || 4517;

setTimeout(() => process.exit(0), 1500).unref();

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', async () => {
  try {
    const j = JSON.parse(input);
    const ti = j.tool_input || {};
    const file = ti.file_path || ti.notebook_path || ti.path;
    if (!file) return process.exit(0);
    await fetch(`http://127.0.0.1:${PORT}/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session: j.session_id,
        tool: j.tool_name,
        phase: j.hook_event_name === 'PostToolUse' ? 'post' : 'pre',
        file,
        cwd: j.cwd,
      }),
      signal: AbortSignal.timeout(1000),
    });
  } catch {
    /* server not running — that's fine */
  }
  process.exit(0);
});

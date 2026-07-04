# agentview

Watch your coding agent move through your codebase, live in the browser. A little
character glides between files in the tree as the agent reads and edits them.

Zero dependencies — plain Node.js.

## Run it

```sh
node server.js /path/to/project-to-watch
# open http://localhost:4517
```

Omit the path to watch the current directory. Set `PORT` / `AGENTVIEW_PORT` to change the port (default 4517).

Out of the box it reacts to **raw filesystem changes** (any agent, any editor) via
`fs.watch`. For richer, real-time signal — including *reads*, per-session avatars,
and events the moment the agent decides to touch a file — install the Claude Code hook:

## Run automatically with every Claude Code session (recommended)

Add to `~/.claude/settings.json` (adjust the paths to where you cloned this repo):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /ABSOLUTE/PATH/agent-map/autostart.js",
            "timeout": 10,
            "async": true
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit|Read",
        "hooks": [
          {
            "type": "command",
            "command": "node /ABSOLUTE/PATH/agent-map/hook.js",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ]
  }
}
```

- **`autostart.js`** (SessionStart): if the server isn't running, starts it
  watching the session's project and opens the browser; if it is running,
  re-points it at the new session's project (open tabs reload automatically).
- **`hook.js`** (PreToolUse): fires *before* each file tool runs, POSTs
  `{session, tool, file}` to `http://127.0.0.1:4517/event`, and always exits 0
  within ~1.5s — it never slows down or blocks the agent, even when the server
  isn't running.

Both hooks are `async`, so they add zero latency to your sessions. Hook changes
apply to sessions started after the edit.

## How it works

```
Claude Code ──PreToolUse hook──▶ hook.js ──POST /event──▶ server.js ──SSE──▶ browser
any editor  ──file change──────▶ fs.watch ───────────────────┘
```

- `server.js` — serves the UI, builds the file tree (`GET /tree`), accepts hook
  events (`POST /event`), watches the filesystem as fallback, and broadcasts
  everything over Server-Sent Events (`GET /events`).
- `hook.js` — tiny stdin→HTTP forwarder Claude Code invokes per tool call.
- `public/index.html` — the view: collapsible file tree, an animated avatar per
  agent session (🤖 👾 🦾 …), speech bubbles ("editing server.js"), pulse
  highlights color-coded by action (read/edit/write), and an activity log.

Hook events within 3s suppress the duplicate `fs.watch` event for the same file,
so you don't get double pulses.

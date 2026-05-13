---
name: cua-localhost
description: |
  Drive the user's host machine directly through Cua, with no sandbox. Maps
  to Cua's Localhost API. Higher risk - the agent can click, type, and run
  shell commands on the real desktop. Use only when the user explicitly opts
  in and read the safety section first. Triggers - "control my computer",
  "click here", "use my real Chrome", "no sandbox", "내 컴퓨터 자동화".
---

# Localhost (unsandboxed)

When `mode: "localhost"` is set in `.pi/cua.jsonc`, Cua connects to your
host machine directly. There is no sandbox: every click, keystroke, scroll,
and shell command happens on the real OS.

## Activation

```jsonc
// .pi/cua.jsonc
{
  "mode": "localhost",
  "localhost": {
    "confirmDestructive": true
  }
}
```

## Tools that work in this mode

`cua_screenshot`, `cua_click`, `cua_type`, `cua_key`, `cua_scroll` - all
without a `sandbox` argument. For host shell execution use Pi's built-in
`bash` tool. ComputerAgent-style autonomous delegation is no longer
shipped here - the main pi agent loop drives the cua surface directly,
and bash-level `cua do task ...` invocations are documented in the
global `cua-skill` for callers that explicitly want sub-agent
delegation.

`cua_sandbox_start`, `cua_sandbox_stop`, `cua_sandbox_list` are disabled.

## Required permissions

### macOS
- **Accessibility** - System Settings > Privacy & Security > Accessibility
  > add your terminal / Pi binary
- **Screen Recording** - same panel, Screen Recording
- **Automation** - approve when prompted, or add manually for the apps you
  want to drive

### Linux
- X11 desktop (Wayland is NOT supported by Cua's localhost mode)
- `cua-auto` controls input through pynput and captures screenshots through its Python screen backend

### Windows
- Localhost mode is best-effort on Windows; prefer local QEMU VM instead.

## Safety guardrails

1. **Confirm destructive shell.** With `confirmDestructive: true` (default)
   the extension prompts before running shell commands containing patterns
   like `rm -rf`, `dd`, or `curl ... | sh`.
2. **Never type secrets.** Do not paste API keys or passwords; the model can
   see what you type.
3. **Prefer sandbox mode** for anything that opens unknown URLs or runs
   untrusted code.
4. **Stop immediately** if a screenshot shows unexpected content - the agent
   may have been redirected.

## When to choose localhost

- Driving your real browser/IDE because the workflow needs your real
  cookies/sessions.
- Cross-window automation that does not fit in a sandbox.
- Lightweight scripting where spinning up a VM is overkill.

For anything else, prefer `local` sandbox mode.

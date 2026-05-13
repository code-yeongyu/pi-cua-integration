---
name: cua-shell
description: |
  Run shell commands inside the Cua target via cua_shell. Differs from the
  built-in bash tool because it executes in the sandbox / localhost target,
  not the agent's host. Use when the user asks to "run a command inside the
  sandbox", "ssh into the cua VM", or "execute on the Linux guest".
---

# `cua_shell`

`cua_shell` executes a command in the current Cua target using the guest's
default shell (`/bin/sh -c` on Linux/macOS, PowerShell on Windows).

```jsonc
cua_shell({ command: "uname -a" })
cua_shell({ command: "ls -la /tmp", timeoutMs: 5000 })
cua_shell({ command: "echo hi", sandbox: "my-sandbox" })
```

Returns `exit`, `stdout`, `stderr`. Output is truncated to ~4 KB inline; for
larger output redirect to a file inside the sandbox and read it back with a
follow-up command.

## Differences from Pi's built-in `bash` tool

| Aspect            | `bash` (built-in)            | `cua_shell`                              |
|-------------------|------------------------------|------------------------------------------|
| Where it runs     | Host where Pi is running     | Cua target (sandbox or localhost target) |
| Working directory | Pi cwd                       | Target's default cwd                     |
| Env vars          | Host env                     | Target env (set via image builder)       |
| Timeout           | Pi-managed                   | Per-call `timeoutMs`                     |

When the user wants to "test that the script works in an Ubuntu sandbox",
use `cua_shell` after `cua_sandbox_start({ os: "linux" })`. When they want
to compile locally, use the built-in `bash` tool.

## Tips

- For multi-line scripts, write the script to a file first with
  `cua_shell({ command: "cat > /tmp/script.sh <<'EOF'\\n...\\nEOF" })`.
- Don't try to use interactive commands (`vim`, `top`); they will hang.
- Long-running commands should redirect to a log file you can poll.

---
name: cua-overview
description: |
  pi-cua-integration is a Pi/Senpi extension that bridges Cua (trycua/cua) for
  computer-use sandboxes and host control. MUST USE when the user asks to drive
  a desktop UI, take screenshots, run a "computer use" task, control a sandbox,
  or invoke any cua_* tool. Triggers - "cua", "computer use", "sandbox",
  "screenshot the desktop", "click the screen", "take over the browser",
  "샌드박스 켜줘", "스크린샷 찍어", "내 컴퓨터에서 자동화".
---

# Cua integration overview

You have access to the `pi-cua-integration` extension which exposes Cua
(`trycua/cua`) functionality through Pi tools. The extension supports three
modes; the active mode is selected at session start from `.pi/cua.jsonc` or
the default (`local`).

## Modes

| Mode        | Where actions happen                | Sandbox | API key required |
|-------------|-------------------------------------|---------|------------------|
| `local`     | Local Docker / QEMU / Lume VM       | yes     | no               |
| `localhost` | Your host machine (no sandbox)      | no      | no               |
| `cloud`     | cua.ai cloud sandbox                | yes     | `CUA_API_KEY`    |

**Local mode is the default**. It runs everything in a sandbox started on
your machine via Docker (XFCE container) for Linux, Lume for macOS guests,
or QEMU for full VMs. No account is required.

## Workflow

1. **For `local` or `cloud` modes:** call `cua_sandbox_start` first to get a
   sandbox name, then call the control tools (`cua_screenshot`, `cua_click`,
   etc.) with the `sandbox` parameter (or rely on the default sandbox).
2. **For `localhost` mode:** skip `cua_sandbox_start`. Control tools target
   the host directly.
3. **Always end** by stopping any sandbox you started, via
   `cua_sandbox_stop`. The extension also auto-cleans on session shutdown.

## Tools (10)

| Tool                 | Purpose                                          |
|----------------------|--------------------------------------------------|
| `cua_sandbox_start`  | Start (or reconnect) a sandbox                   |
| `cua_sandbox_stop`   | Destroy a sandbox                                |
| `cua_sandbox_list`   | List active sandboxes                            |
| `cua_screenshot`     | Capture PNG screenshot                           |
| `cua_click`          | Click at (x, y)                                  |
| `cua_type`           | Type text                                        |
| `cua_key`            | Press a key chord (`ctrl+s`, `Return`, etc.)     |
| `cua_scroll`         | Scroll at coordinates                            |

## Quick recipes

- **Screenshot the host** (localhost mode): `cua_screenshot()`
- **Open a local Linux sandbox and inspect it:**
  ```
  cua_sandbox_start({ os: "linux", kind: "container" })
  cua_screenshot()
  cua_sandbox_stop({ name: "<returned-name>" })
  ```
- **Multi-step drive yourself** (the main agent loop screenshots + clicks via `cua_screenshot` / `cua_click` / `cua_type`; no separate ComputerAgent sub-agent is shipped — delegate that flow to the [`cua-skill`](https://github.com/code-yeongyu/cua-skill) global skill, which documents the `cua do task` CLI for callers that want autonomous delegation).

## Companion skills

- `cua-local-sandbox` - Docker/QEMU/Lume runtime details
- `cua-localhost` - Direct host control safety notes
- `cua-cloud-sandbox` - Cloud sandbox configuration
- `cua-control` - Mouse and keyboard primitives reference

## Configuration

Project config lives at `.pi/cua.jsonc`. Global config at `~/.pi/cua.json`.
Schema is at `schema/cua.schema.json` inside the extension package.

The extension activates whenever Pi loads it. The active mode (default
`local`, sandboxed) is selected from the config; `localhost` and `cloud`
must be enabled explicitly.

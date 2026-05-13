---
name: cua-local-sandbox
description: |
  Run Cua sandboxes locally - no API key required. Covers Docker (XFCE/Kasm)
  for Linux containers, QEMU for full VMs, Lume for macOS guests on Apple
  Silicon, and Tart for Apple VZ VMs. Use when the user wants a local
  sandbox, wants to keep things off the cloud, or asks "spin up an Ubuntu
  desktop", "open a sandbox VM", "let me try this safely first".
---

# Local Cua sandbox

In `mode: "local"` (the default), `cua_sandbox_start` spins up a sandbox on
your machine. Cua picks the runtime from the image OS unless you pass
`runtime` explicitly.

## Runtime selection

| OS image    | Auto runtime                  | When `kind: "container"`        | Override         |
|-------------|-------------------------------|---------------------------------|------------------|
| `linux`     | Docker (XFCE)                 | XFCE Docker (`trycua/cua-xfce`) | `qemu`, `docker` |
| `macos`     | Lume (Apple Silicon required) | -                               | `tart`           |
| `windows`   | QEMU Docker                   | -                               | -                |
| `android`   | Android Emulator              | -                               | -                |

`kind` defaults to `"container"` for Linux (fast, GUI via XFCE) and `"vm"`
for everything else.

## Prerequisites

- Docker Desktop or Colima for Linux containers / Windows VMs
- macOS Apple Silicon for `Image.macos()` via Lume
- `qemu` installed locally for `runtime: "qemu"`

Cua will print actionable errors when prerequisites are missing.

## Example calls

```jsonc
// Fast Linux XFCE container - recommended for most automation
cua_sandbox_start({ os: "linux", kind: "container" })

// Full Ubuntu VM via QEMU
cua_sandbox_start({ os: "linux", kind: "vm", runtime: "qemu" })

// macOS guest via Lume (Apple Silicon host only)
cua_sandbox_start({ os: "macos", kind: "vm", runtime: "lume" })
```

## Performance notes

- XFCE containers are fastest (seconds to start).
- QEMU VMs take ~30s for Linux, several minutes for Windows.
- macOS Lume VMs need a one-time `lume pull` for the image.

## After start

The returned sandbox name is also used as `name` for `cua_sandbox_stop` and
the `sandbox` argument of control tools. If you only use one sandbox you can
omit the `sandbox` argument; the manager remembers the first sandbox as
default.

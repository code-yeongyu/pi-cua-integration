# Modes

`pi-cua-integration` has three operating modes. Mode is decided once per session, at `session_start`, from the resolved configuration.

## `local` (default)

A local Cua sandbox is created on demand by `cua_sandbox_start`. Choose between a fast XFCE container and a full VM via the `kind` parameter.

```jsonc
// .pi/cua.jsonc
{
  "mode": "local",
  "local": {
    "runtime": "auto",
    "image": { "os": "linux", "kind": "container" },
    "ephemeral": true
  }
}
```

Runtime auto-selection (matching `cua_sandbox._auto_runtime`):

- `kind: "container"` -> Docker (XFCE / Kasm image)
- `os: "macos"`       -> Lume (macOS Virtualization framework, Apple Silicon only)
- `os: "windows"`     -> QEMU Docker (or Hyper-V if available)
- `os: "android"`     -> Android emulator
- otherwise           -> QEMU (Docker or bare-metal)

Override with `runtime: "docker" | "qemu" | "lume" | "tart"`.

### Prerequisites

| Runtime | Prereqs |
|---------|---------|
| `docker` | Docker Desktop / Colima / Rancher Desktop running |
| `qemu`   | `qemu-system-x86_64` on PATH (Docker variant uses Docker only) |
| `lume`   | macOS Apple Silicon + `lume` CLI from `cua-lume` installer |
| `tart`   | macOS Apple Silicon + `tart` from cirruslabs |

## `localhost`

No sandbox. Cua connects to your host directly through `cua-auto`. Tools target your real desktop and shell.

```jsonc
{
  "mode": "localhost",
  "localhost": { "confirmDestructive": true }
}
```

Sandbox tools (`cua_sandbox_start`, `cua_sandbox_stop`, `cua_sandbox_list`) are disabled in this mode and return an error.

### Prerequisites

- **macOS**: Accessibility + Screen Recording + Automation permissions granted to the Pi binary.
- **Linux**: X11 desktop (Wayland not supported by pynput-backed input); screenshot support comes from `cua-auto`.
- **Windows**: prefer `local` mode with QEMU.

## `cloud`

Provisions a sandbox in cua.ai. Requires an API key.

```jsonc
{
  "mode": "cloud",
  "cloud": {
    "apiKeyEnv": "CUA_API_KEY",
    "region": "north-america",
    "image": { "os": "linux" }
  }
}
```

The `apiKeyEnv` field selects which environment variable holds the key (defaults to `CUA_API_KEY`). If the variable is missing or empty when the session starts, the extension prints a warning and falls back to `mode: "local"` for that session.

## Fallback summary

| Requested | Condition                                | Effective mode |
|-----------|------------------------------------------|----------------|
| `local`   | (always)                                 | `local`        |
| `localhost` | (always)                               | `localhost`    |
| `cloud`   | `apiKeyEnv` is set + non-empty           | `cloud`        |
| `cloud`   | `apiKeyEnv` missing/empty                | `local` (warning) |

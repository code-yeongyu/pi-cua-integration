---
name: cua-cloud-sandbox
description: |
  Use Cua's cloud sandboxes via cua.ai. Requires CUA_API_KEY. Cloud
  sandboxes are isolated VMs run by trycua with billing per usage. Use when
  the user wants no local Docker/QEMU, wants Windows/macOS guests without
  Apple Silicon, or explicitly asks for cloud.
---

# Cloud Cua sandbox

In `mode: "cloud"`, `cua_sandbox_start` provisions a sandbox in cua.ai.
Requires a Cua API key (sign up at https://cua.ai/signin).

## Activation

```jsonc
// .pi/cua.jsonc
{
  "mode": "cloud",
  "cloud": {
    "apiKeyEnv": "CUA_API_KEY",
    "region": "north-america"
  }
}
```

Then export the key before launching Pi:

```bash
export CUA_API_KEY=sk_cua-...
```

## Fallback

If the API key env var is empty when the session starts, the extension
prints a warning and falls back to `mode: "local"` for that session.

## Image options

```jsonc
cua_sandbox_start({ os: "windows" })   // Windows 11
cua_sandbox_start({ os: "macos" })     // macOS (cloud Lume)
cua_sandbox_start({ os: "linux" })     // Ubuntu container
cua_sandbox_start({ os: "android" })   // Android emulator
```

Cloud mode is the only way to get macOS/Windows VMs from non-macOS hosts or
hosts without Apple Silicon.

## Cost notes

Cua bills per sandbox-second. Stop sandboxes promptly with
`cua_sandbox_stop`. The extension also auto-stops on session shutdown.

## Region

The `region` config sets the data center. Default omitted lets cua.ai
choose. Available regions are listed in the Cua console.

# Configuration

Configuration lives in JSONC files. The extension reads both and merges project over global key-by-key at the top level.

## File locations

| File                  | Scope    | Format |
|-----------------------|----------|--------|
| `.pi/cua.jsonc`       | project  | JSONC  |
| `~/.pi/cua.json`      | global   | JSON   |

Both are optional. When neither exists the defaults apply (local mode, Linux XFCE container).

## Top-level schema

| Key         | Type                                          | Default     |
|-------------|-----------------------------------------------|-------------|
| `mode`      | `"local" \| "localhost" \| "cloud"`           | `"local"`   |
| `local`     | object                                        | `{}` (defaults) |
| `localhost` | object                                        | `{}` (defaults) |
| `cloud`     | object                                        | `{}` (defaults) |
| `python`    | object                                        | `{}` (defaults) |
| `telemetry` | object                                        | `{ enabled: false }` |

## `local`

| Key             | Type                                          | Default        |
|-----------------|-----------------------------------------------|----------------|
| `runtime`       | `"auto" \| "docker" \| "qemu" \| "lume" \| "tart"` | `"auto"`  |
| `image.os`      | `"linux" \| "macos" \| "windows" \| "android"` | `"linux"`     |
| `image.version` | string                                        | unset          |
| `image.kind`    | `"vm" \| "container"`                         | `"container"`  |
| `ephemeral`     | boolean                                       | `true`         |

## `localhost`

| Key                   | Type    | Default |
|-----------------------|---------|---------|
| `confirmDestructive`  | boolean | `true`  |

## `cloud`

| Key            | Type                                          | Default        |
|----------------|-----------------------------------------------|----------------|
| `apiKeyEnv`    | string                                        | `"CUA_API_KEY"` |
| `image.os`     | `"linux" \| "macos" \| "windows" \| "android"` | `"linux"`     |
| `image.version`| string                                        | unset          |
| `region`       | string                                        | unset          |

## `python`

| Key                   | Type    | Default     |
|-----------------------|---------|-------------|
| `executable`          | string  | `"python3"` |
| `startupTimeoutMs`    | integer | `30000`     |
| `requestTimeoutMs`    | integer | `60000`     |

`executable` is the interpreter the extension spawns for `python/daemon.py`; install `cua` into exactly this interpreter (`<executable> -m pip install --upgrade cua`). Current `cua` releases require Python `>=3.12,<3.14`:

- Python 3.14 is outside the supported range.
- On Python 3.11, pip resolves the historical `cua==0.1.0`, whose import surface does not match the daemon's `import cua`; the session then reports that the Cua package is not installed.
- On Windows, `python3` is often unavailable or resolves to the Microsoft Store alias (child exit code `9009`). Set an absolute path, for example `"executable": "C:/Path/To/Python313/python.exe"`, in `~/.pi/cua.json`.

## `telemetry`

| Key       | Type    | Default |
|-----------|---------|---------|
| `enabled` | boolean | `false` |

When `false`, the extension exports `CUA_TELEMETRY_ENABLED=false` to the Python daemon so Cua does not phone home.

## Merge semantics

For each top-level key, project overrides global by **replacing** the corresponding object (with sub-keys also merged shallowly). Unknown top-level keys are rejected with an error - the loader will throw at session start to avoid silent misconfiguration.

## Annotated example

```jsonc
{
  // Pick a mode. Local is default; explicit value shown here.
  "mode": "local",

  "local": {
    // 'auto' lets Cua decide based on image.os and image.kind.
    "runtime": "auto",
    "image": {
      "os": "linux",
      "version": "24.04",
      "kind": "container"
    },
    "ephemeral": true
  },

  "localhost": {
    "confirmDestructive": true
  },

  "cloud": {
    "apiKeyEnv": "CUA_API_KEY",
    "region": "north-america",
    "image": { "os": "linux" }
  },

  "python": {
    "executable": "python3.12",
    "startupTimeoutMs": 30000,
    "requestTimeoutMs": 90000
  },

  "telemetry": { "enabled": false }
}
```

## JSON Schema

The schema lives at [schema/cua.schema.json](../schema/cua.schema.json) and is hand-maintained via `scripts/generate-schema.mjs`. Reference it from `.pi/cua.jsonc` for IDE validation:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/pi-cua-integration/main/schema/cua.schema.json",
  "mode": "local"
}
```

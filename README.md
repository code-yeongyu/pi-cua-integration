# pi-cua-integration

[![ci](https://github.com/code-yeongyu/pi-cua-integration/actions/workflows/ci.yml/badge.svg)](https://github.com/code-yeongyu/pi-cua-integration/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Cua ([trycua/cua](https://github.com/trycua/cua)) computer-use integration for the [pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent).

`pi-cua-integration` exposes Cua sandboxes (local Docker / QEMU / Lume / Tart and optional cloud) plus unsandboxed `Localhost` host control as Pi tools and skills. **Local mode is the default.** No Cua account is required to use it.

## Modes

| Mode        | Where actions run               | Sandbox | Needs API key | Runtimes                            |
|-------------|---------------------------------|---------|---------------|-------------------------------------|
| `local` ★   | Local container or VM           | yes     | no            | Docker (XFCE/Kasm), QEMU, Lume, Tart |
| `localhost` | Your host machine               | no      | no            | cua-auto (pynput + Pillow/AppKit)    |
| `cloud`     | cua.ai-hosted VM                | yes     | `CUA_API_KEY` | Cua cloud regions                    |

★ default. If `mode: "cloud"` is selected but `CUA_API_KEY` is missing, the extension falls back to `local` with a warning.

## Requirements

- Node.js `>=22.19.0` (the pi runtime's minimum).
- Python `>=3.12,<3.14` (3.12 or 3.13) with the [`cua`](https://pypi.org/project/cua/) package. Current `cua` releases require this range: Python 3.14 is not supported yet, and on Python 3.11 pip silently resolves the historical `cua==0.1.0`, which does not provide the `import cua` surface the daemon needs.
- Install `cua` into the **same interpreter** the extension launches. The extension runs `python.executable` from the config (default `python3`); see [docs/CONFIG.md](docs/CONFIG.md#python).

## Quick start

```bash
# 1. Install (from GitHub; the package is not published to npm)
pi install git:github.com/code-yeongyu/pi-cua-integration
# or, with senpi:
senpi install git:github.com/code-yeongyu/pi-cua-integration
python3 -m pip install --upgrade cua   # python3 must be 3.12 or 3.13

# 2. (Optional) project policy
mkdir -p .pi && cat > .pi/cua.jsonc <<'EOF'
{
  "mode": "local",
  "local": {
    "runtime": "docker",
    "image": { "os": "linux", "kind": "container" }
  }
}
EOF

# 3. Run pi
pi
```

When the session starts you should see `[pi-cua] ready (mode=local, ...)`.

### Windows

On Windows `python3` is often missing or resolves to the Microsoft Store execution alias, which makes the daemon fail to start (`cua python daemon exited (code=9009)`). Install `cua` with one exact interpreter and point `python.executable` at that same interpreter:

```powershell
C:\Path\To\Python313\python.exe -m pip install --upgrade cua
```

```jsonc
// %USERPROFILE%\.pi\cua.json
{
  "python": {
    "executable": "C:/Path/To/Python313/python.exe"
  }
}
```

## Tools

| Tool                 | Purpose                                          |
|----------------------|--------------------------------------------------|
| `cua_sandbox_start`  | Start (or reconnect) a sandbox                   |
| `cua_sandbox_stop`   | Destroy a sandbox                                |
| `cua_sandbox_list`   | List active sandboxes                            |
| `cua_screenshot`     | Capture a PNG screenshot                         |
| `cua_click`          | Click at (x, y)                                  |
| `cua_type`           | Type text                                        |
| `cua_key`            | Press a key chord (`ctrl+s`, `Return`, etc.)     |
| `cua_scroll`         | Scroll at coordinates                            |

See [docs/TOOLS.md](docs/TOOLS.md) for full schemas and examples.

## Skills

The extension contributes five markdown skills via the `resources_discover` event. Pi's skill loader can auto-discover them, and the agent learns when to use the tools without prompt engineering.

| Skill                | When the agent loads it                              |
|----------------------|------------------------------------------------------|
| `cua-overview`       | Anytime any `cua_*` tool comes up                    |
| `cua-local-sandbox`  | Local Docker/QEMU/Lume sandbox details               |
| `cua-localhost`      | Unsandboxed host control safety notes                |
| `cua-cloud-sandbox`  | Cloud (cua.ai) sandbox configuration                 |
| `cua-control`        | Mouse / keyboard / scroll primitives                 |

See [docs/SKILLS.md](docs/SKILLS.md).

## Configuration

Policy lives in JSONC files (project beats global, key-by-key merge):

- `.pi/cua.jsonc` - project policy
- `~/.pi/cua.json` - global user policy

Schema: [schema/cua.schema.json](schema/cua.schema.json). Regenerate with `bun run generate:schema`.

See [docs/CONFIG.md](docs/CONFIG.md) for the full schema and annotated examples.

## Environment variables

| Variable                  | Default                 | Purpose                                                     |
|---------------------------|-------------------------|-------------------------------------------------------------|
| `CUA_API_KEY`             | unset                   | Required for `mode: "cloud"`. Env name configurable.        |
| `CUA_TELEMETRY_ENABLED`   | `false` (forced off)    | Cua opt-out; this extension forces it off unless overridden.|
| `ANTHROPIC_API_KEY` etc.  | unset                   | The pi agent that drives cua reads these for its own LLM calls. |

## Architecture

```
+--------------------------------------------------+
|  pi-mono session                                  |
|  +---------------------------------------------+  |
|  |  pi-cua-integration extension (TypeScript)   |  |
|  |   - skills via resources_discover            |  |
|  |   - tools via pi.registerTool                |  |
|  |   - /cua command via pi.registerCommand      |  |
|  |                ^                             |  |
|  |                | JSON-RPC over stdio          |  |
|  |                v                             |  |
|  |   python/daemon.py (Python subprocess)       |  |
|  |   - manages Sandbox/Localhost instances      |  |
|  |   - delegates to cua + cua-auto              |  |
|  +---------------------------------------------+  |
+--------------------------------------------------+
```

## Documentation

- [docs/MODES.md](docs/MODES.md) - local / localhost / cloud mode details
- [docs/TOOLS.md](docs/TOOLS.md) - tool reference
- [docs/SKILLS.md](docs/SKILLS.md) - skill bundle
- [docs/CONFIG.md](docs/CONFIG.md) - JSONC schema and examples
- [docs/SECURITY.md](docs/SECURITY.md) - threat model and safety notes
- [CHANGELOG.md](CHANGELOG.md) - release history
- [AGENTS.md](AGENTS.md) - conventions for AI agents working on this repo

## Development

Development and CI use [Bun](https://bun.sh) 1.4.2:

```bash
bun install
bun run check
bun run test
bun run test:integration   # needs python3 (3.12+) on PATH or PI_CUA_PYTHON
```

`package-lock.json` is kept in sync as well, so the npm flow (`npm ci && npm test`) keeps working for consumers and is checked in CI.

The Python daemon contract is verified by `test/integration/python-daemon.test.ts`.

## License

MIT - see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Related

- [trycua/cua](https://github.com/trycua/cua) - the upstream Cua SDK
- [senpi](https://github.com/code-yeongyu/senpi) - the fork/runtime this extension targets
- [pi-anthropic-computer-use](https://github.com/code-yeongyu/pi-anthropic-computer-use) - register Anthropic's native `computer` tool (compatible side-by-side)

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

## Quick start

```bash
# 1. Install
pi install npm:pi-cua-integration
pip install cua

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

Schema: [schema/cua.schema.json](schema/cua.schema.json). Regenerate with `npm run generate:schema`.

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

```bash
npm install
npm run check
npm test
```

Manual QA scripts live in `scripts/qa-*.sh` once written. The Python daemon contract is verified by `test/integration/python-daemon.test.ts` (gated by `PI_CUA_INTEGRATION_TEST=1`).

## License

MIT - see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Related

- [trycua/cua](https://github.com/trycua/cua) - the upstream Cua SDK
- [senpi](https://github.com/code-yeongyu/senpi) - the fork/runtime this extension targets
- [pi-anthropic-computer-use](https://github.com/code-yeongyu/pi-anthropic-computer-use) - register Anthropic's native `computer` tool (compatible side-by-side)

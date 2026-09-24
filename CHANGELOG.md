# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-24

### Changed

- **Breaking**: the peer dependency moved from the deprecated `@mariozechner/pi-coding-agent` to `@earendil-works/pi-coding-agent` (`*`); the `src/pi/` boundary now imports from `@earendil-works/pi-coding-agent`.
- **Breaking**: `engines.node` is now `>=22.19.0` (was `>=20.0.0`), matching the pi runtime. Node 20 is no longer tested.
- **Breaking**: removed the `PI_CUA_ENABLED` opt-in environment variable. The extension now activates whenever Pi loads it; the user's safety boundary is the config-driven `mode` (default `local` = sandboxed). Existing configs continue to work; remove `export PI_CUA_ENABLED=...` lines from your shell init.
- Development and CI moved to Bun 1.4.2 (`bun install --frozen-lockfile`, `bun run check`, `bun run test`, `bun run test:integration`). CI runs on ubuntu-latest and macos-latest with Node 22 and 24, plus an `npm-consumer` job (`npm ci && npm test`) so `package-lock.json` stays valid for npm consumers. The integration tests are now a required CI step instead of `continue-on-error`. The publish workflow verifies with Bun and still publishes with `npm publish --provenance`.
- Dependencies (all devDependencies are now exact pins):
  - `@biomejs/biome` 2.5.5 -> 2.5.14 (config migrated to the 2.5.14 schema, `recommended` -> `preset`)
  - `vitest` ^4.1.8 -> 5.0.1 (major)
  - `@types/node` ^25.9.3 -> 26.6.2 (major)
  - `@typescript/native-preview` ^7.0.0-dev.20260609.1 -> 7.0.0-dev.20260707.2
  - `typescript` ^7.0.2 -> 7.0.2
  - added `@earendil-works/pi-coding-agent` 0.87.1 so tests type-check against the current upstream runtime
  - added `typebox` 1.3.27 (imported directly by the tool schemas; pinned to the version the pi runtime ships instead of relying on hoisting)
  - GitHub Actions: `actions/checkout` v7, `actions/setup-node` v7, `actions/setup-python` v7, `oven-sh/setup-bun` v2
- Docs: README and `docs/CONFIG.md` document the supported Python range (`>=3.12,<3.14`), installing `cua` into the configured interpreter, and Windows `python.executable` setup (#30).

### Fixed

- Daemon no longer crashes on Windows when stdin is a pipe (Proactor/IOCP `WinError 6`): stdin is read in a worker thread and fed to the event loop (#47, thanks @sebastienbaudry; fixes #31). Blank input lines no longer end the request loop, with an integration regression test.
- `start_sandbox` now applies the requested image `kind`/`version` with the dataclass `Image` API of current Cua SDKs, falling back to the legacy builder methods on older SDKs (#48, thanks @sebastienbaudry). Note: the configured default `image.kind` (`"container"`) now actually reaches the SDK.
- Config loader tests build fixture paths with the same `resolve()` call as production, and `.gitattributes` forces LF checkouts, so the suite and Biome pass on Windows clones (#51, thanks @sebastienbaudry).

### Removed

- **Breaking**: `cua_run_task` tool, its dedicated `cua-agent-task` skill, the Python daemon's `handle_run_task` handler, and the `cua_agent.ComputerAgent` import. The main pi agent loop already drives `cua_screenshot` + `cua_click` / `cua_type` / `cua_key` / `cua_scroll` directly; wrapping a separate ComputerAgent sub-agent only burnt context tokens and obscured trajectories. Callers that still want autonomous delegation can invoke `cua do task "..."` from bash — documented in the standalone `cua-skill` (https://github.com/code-yeongyu/cua-skill).
- **Breaking**: `cua_shell` tool and its `cua-shell` skill. On `localhost` mode it was 100% redundant with Pi's built-in `bash` tool, and on `local`/`cloud` modes the same host-shell semantics are accessible by sending shell commands via the sandbox's `target.shell.run` path inside the daemon. The Python daemon still exposes `handle_shell` for that case; only the public extension tool surface was retracted.
- Final tool count: 8 (`cua_sandbox_start/stop/list` + `cua_screenshot/click/type/key/scroll`). The `cua-shell` and `cua-agent-task` skill markdowns are also dropped from `resources_discover`.
- `src/enablement.ts` and its `test/unit/enablement.test.ts` companion. Reflected in `AGENTS.md`, `README.md`, `docs/SECURITY.md`, `docs/SKILLS.md`, `docs/TOOLS.md`, and the `cua-overview` / `cua-cloud-sandbox` skills.

## [0.1.0] - 2026-05-13

### Added

- Initial release. Cua (trycua/cua) integration extension for the pi coding agent.
- Three operating modes, with local as the default:
  - `local` (default) — local Cua sandboxes via Docker (XFCE/KASM), QEMU, or Lume; no API key required.
  - `localhost` — direct host control via Cua's `Localhost` API; no sandbox, host machine controlled directly.
  - `cloud` — Cua cloud sandboxes via `CUA_API_KEY`.
- Skill bundle discovered via `resources_discover`: `cua-overview`, `cua-local-sandbox`, `cua-localhost`, `cua-cloud-sandbox`, `cua-control`, `cua-shell`, `cua-agent-task` markdown skills. (`cua-shell` and `cua-agent-task` later retracted — see Unreleased.)
- Ten tools registered on session start:
  - `cua_sandbox_start`, `cua_sandbox_stop`, `cua_sandbox_list`
  - `cua_screenshot`, `cua_click`, `cua_type`, `cua_key`, `cua_scroll`
  - `cua_shell`, `cua_run_task`
  - (`cua_shell` and `cua_run_task` later retracted — see Unreleased.)
- Persistent Python daemon (`python/daemon.py`) communicates with the extension over JSON-RPC on stdin/stdout. One daemon per Pi session.
- JSONC configuration loader for `.pi/cua.jsonc` and `~/.pi/cua.json` with project/global merge.
- TypeBox runtime schema plus generated JSON Schema (`schema/cua.schema.json`).
- `/cua` slash command with status, mode switch, and active sandbox listing.
- Five-doc reference under `docs/`: `MODES.md`, `TOOLS.md`, `SKILLS.md`, `CONFIG.md`, `SECURITY.md`.
- Vitest unit and integration tests; module-imports smoke test to catch runtime load errors.
- GitHub Actions CI on ubuntu-latest and macos-latest with Node 20 and 22.

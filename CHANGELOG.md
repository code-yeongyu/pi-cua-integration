# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- **Breaking**: `cua_shell` tool and its `cua-shell` skill. On `localhost` mode it was 100% redundant with Pi's built-in `bash` tool, and on `local`/`cloud` modes the same host-shell semantics are accessible through `cua_run_task` or by sending shell commands via the sandbox's `target.shell.run` path inside the daemon. The Python daemon still exposes `handle_shell` for ComputerAgent loops; only the public extension tool surface was retracted. Update tool count from 10 to 9 (`cua_sandbox_start/stop/list` + `cua_screenshot/click/type/key/scroll` + `cua_run_task`). The `cua-shell` skill markdown is also dropped from `resources_discover`.

### Changed

- **Breaking**: removed the `PI_CUA_ENABLED` opt-in environment variable. The extension now activates whenever Pi loads it; the user's safety boundary is the config-driven `mode` (default `local` = sandboxed). Existing configs continue to work; remove `export PI_CUA_ENABLED=...` lines from your shell init.

### Removed

- `src/enablement.ts` and its `test/unit/enablement.test.ts` companion. Reflected in `AGENTS.md`, `README.md`, `docs/SECURITY.md`, `docs/SKILLS.md`, `docs/TOOLS.md`, and the `cua-overview` / `cua-cloud-sandbox` skills.

## [0.1.0] - 2026-05-13

### Added

- Initial release. Cua (trycua/cua) integration extension for the pi coding agent.
- Three operating modes, with local as the default:
  - `local` (default) — local Cua sandboxes via Docker (XFCE/KASM), QEMU, or Lume; no API key required.
  - `localhost` — direct host control via Cua's `Localhost` API; no sandbox, host machine controlled directly.
  - `cloud` — Cua cloud sandboxes via `CUA_API_KEY`.
- Skill bundle discovered via `resources_discover`: `cua-overview`, `cua-local-sandbox`, `cua-localhost`, `cua-cloud-sandbox`, `cua-control`, `cua-shell`, `cua-agent-task` markdown skills (note: `cua-shell` removed in a later release — see Unreleased).
- Ten tools registered on session start:
  - `cua_sandbox_start`, `cua_sandbox_stop`, `cua_sandbox_list`
  - `cua_screenshot`, `cua_click`, `cua_type`, `cua_key`, `cua_scroll`
  - `cua_shell`, `cua_run_task` (note: `cua_shell` removed in a later release — see Unreleased).
- Persistent Python daemon (`python/daemon.py`) communicates with the extension over JSON-RPC on stdin/stdout. One daemon per Pi session.
- JSONC configuration loader for `.pi/cua.jsonc` and `~/.pi/cua.json` with project/global merge.
- TypeBox runtime schema plus generated JSON Schema (`schema/cua.schema.json`).
- `/cua` slash command with status, mode switch, and active sandbox listing.
- Five-doc reference under `docs/`: `MODES.md`, `TOOLS.md`, `SKILLS.md`, `CONFIG.md`, `SECURITY.md`.
- Vitest unit and integration tests; module-imports smoke test to catch runtime load errors.
- GitHub Actions CI on ubuntu-latest and macos-latest with Node 20 and 22.

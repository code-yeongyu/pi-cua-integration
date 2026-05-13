# pi-cua-integration

Cua (trycua/cua) computer-use integration extension for the pi coding agent.

## Commands

- `npm install` — install dependencies
- `npm test` — run vitest unit tests once
- `npm run test:watch` — vitest in watch mode
- `npm run test:integration` — run integration tests (gated by env vars)
- `npm run typecheck` — run `tsgo --noEmit` with strict TypeScript settings
- `npm run lint` — run Biome lint and format check
- `npm run lint:fix` — auto-fix Biome issues
- `npm run check` — typecheck + lint (run before every commit)
- `npm run generate:schema` — regenerate `schema/cua.schema.json` from `scripts/generate-schema.mjs`

## Conventions

- TypeScript is strict, ESM, and uses `.js` import suffixes under Node16 resolution.
- Tabs for indentation (width 3 for display), line width 120 — enforced by Biome.
- Do not use `any`, `@ts-ignore`, `@ts-expect-error`, or non-essential type assertions.
- Tests use vitest with `#given <X> #when <Y> #then <Z>` description naming and `// given / // when / // then` body comments.
- Public Pi SDK imports MUST go through `src/pi/` boundary barrel; never import `@mariozechner/pi-coding-agent` (or `@code-yeongyu/senpi`) directly from feature modules.
- Skills (markdown files) live under `skills/` at the repo root and are surfaced via the `resources_discover` event.
- The Python daemon (`python/daemon.py`) speaks newline-delimited JSON-RPC over stdin/stdout. Keep it dependency-free aside from the `cua` package.
- Local mode is the default. Cloud mode requires `CUA_API_KEY` and is opt-in via config.
- The extension activates whenever pi loads it. The user's safety boundary is the config-driven `mode` (default `local` = sandboxed). `localhost` and `cloud` modes must be selected explicitly in `.pi/cua.jsonc` or `~/.pi/cua.json`.

## Layering

- `src/pi/` — Pi SDK public-API boundary (re-export only)
- `src/config/` — JSONC config loader, TypeBox schema, normalization
- `src/cua/` — Python daemon bridge (subprocess lifecycle, JSON-RPC framing)
- `src/sandbox/` — Mode selection (local / localhost / cloud), sandbox state
- `src/tools/` — Tool definitions consumed by `pi.registerTool`
- `src/commands/` — Slash commands consumed by `pi.registerCommand`
- `src/skills/` — Skill metadata, paths returned from `resources_discover`
- `src/index.ts` — Extension factory `export default function (pi: ExtensionAPI): void`

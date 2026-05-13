# Contributing to pi-cua-integration

Keep changes small, targeted, and tested.

Before opening a PR:

```bash
npm install
npm run check
npm test
npm pack --dry-run
```

If behavior changes, update `README.md`, `CHANGELOG.md`, and tests.

Tests follow `#given X #when Y #then Z` naming with `// given / // when / // then` body comments.

Do not use `any`, `@ts-ignore`, or `@ts-expect-error`. Validate and narrow unknown data at boundaries.

All Pi SDK imports go through `src/pi/` boundary barrel — never import `@mariozechner/pi-coding-agent` (or `@code-yeongyu/senpi`) directly from feature modules.

The Python daemon (`python/daemon.py`) is the runtime contract with Cua. Any change to the daemon protocol must update `src/cua/protocol.ts`, the TypeScript types, and integration tests.

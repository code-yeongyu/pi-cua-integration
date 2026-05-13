# Skills

The extension ships five markdown skills inside `skills/` and surfaces their absolute paths through the `resources_discover` event:

```ts
pi.on("resources_discover", async () => {
  return { skillPaths: [/* 5 paths */] };
});
```

Pi's skill loader picks them up automatically. No manual install is required.

## Bundled skills

| Slug                  | File                                | Purpose                                        |
|-----------------------|-------------------------------------|------------------------------------------------|
| `cua-overview`        | `skills/cua-overview/SKILL.md`      | Top-level usage map, tool index, modes         |
| `cua-local-sandbox`   | `skills/cua-local-sandbox/SKILL.md` | Local Docker / QEMU / Lume / Tart details      |
| `cua-localhost`       | `skills/cua-localhost/SKILL.md`     | Host-control safety + per-OS permissions       |
| `cua-cloud-sandbox`   | `skills/cua-cloud-sandbox/SKILL.md` | Cloud (cua.ai) sandbox setup                   |
| `cua-control`         | `skills/cua-control/SKILL.md`       | Mouse / keyboard / scroll primitives reference |

Each skill follows Anthropic Skills frontmatter (`name`, `description`) so the model can identify when to load it.

## Adding a skill

1. Create a new directory under `skills/` with a `SKILL.md` file.
2. Add the slug to `SKILL_NAMES` in `src/skills/paths.ts`.
3. Update `test/unit/skills/paths.test.ts` (the existing test iterates `SKILL_NAMES`).
4. Update `CHANGELOG.md` and this document.

## Disabling skill discovery

The extension only contributes paths; Pi decides whether to load them. To suppress all skills in a session, uninstall the extension (`pi uninstall pi-cua-integration`) or remove it from your Pi extension list. There is no granular skill filter in v0.1.

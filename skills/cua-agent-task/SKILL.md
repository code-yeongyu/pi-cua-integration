---
name: cua-agent-task
description: |
  Hand off a natural-language task to Cua's ComputerAgent via cua_run_task.
  Used when the user describes a high-level goal that requires many clicks
  and screenshots ("open Firefox and search for X", "fill in this form",
  "navigate to settings and toggle Y"). The agent loops with vision +
  actions until done.
---

# `cua_run_task`

`cua_run_task` is a one-call abstraction over Cua's `ComputerAgent`. It
runs a complete vision+action loop inside the daemon and returns the
result.

```jsonc
cua_run_task({
  task: "Open Firefox, navigate to https://cua.ai, and take a screenshot of the homepage.",
  model: "anthropic/claude-sonnet-4-5",
  maxTurns: 30
})
```

## Parameters

| Field      | Type     | Default                              | Notes                                  |
|------------|----------|--------------------------------------|----------------------------------------|
| `task`     | string   | required                             | Natural-language goal                  |
| `model`    | string   | `anthropic/claude-sonnet-4-5`        | LiteLLM-compatible id                  |
| `maxTurns` | integer  | unset                                | Hard cap on agent loop iterations      |
| `sandbox`  | string   | default sandbox                      | Target sandbox name (ignored in `localhost` mode) |

## When to prefer it over the granular tools

| Situation                                  | Use granular tools | Use `cua_run_task` |
|--------------------------------------------|---------------------|---------------------|
| You know exactly which pixels to click     | yes                 | no                  |
| You need a screenshot to inspect           | yes (`cua_screenshot`) | no              |
| You want the agent to drive end-to-end     | no                  | yes                 |
| You need to debug each step                | yes                 | no                  |
| You want to bound cost / iterations        | yes                 | maybe (`maxTurns`)  |

## Authentication

The daemon uses the model provider's standard env vars:

- `ANTHROPIC_API_KEY` for `anthropic/*` models
- `OPENAI_API_KEY` for `openai/*`
- `GOOGLE_API_KEY` for `gemini/*`

LiteLLM resolves these automatically. Set them in the same shell that runs
Pi.

## Return value

The tool returns a single text content block with:

- A summary line (`Task complete (12 actions, 5 screenshots).`)
- The agent's final answer text

Detailed traces are kept inside the daemon (not surfaced to the model
context) to keep token usage manageable.

## Cost notes

Each turn includes a screenshot which costs image tokens. Use `maxTurns`
when iterating on prompts. Stop the sandbox afterwards with
`cua_sandbox_stop` to avoid lingering cloud charges.

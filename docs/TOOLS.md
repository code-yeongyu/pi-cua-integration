# Tools

All ten tools become available after a successful session start. Schemas are TypeBox shapes consumed by `pi.registerTool`.

## Lifecycle tools

### `cua_sandbox_start`

```jsonc
cua_sandbox_start({
  name?: string,         // optional, Cua generates one if omitted
  os?: "linux" | "macos" | "windows" | "android",
  version?: string,
  kind?: "vm" | "container",
  runtime?: "auto" | "docker" | "qemu" | "lume" | "tart"
})
```

Disabled in `localhost` mode. The returned name is also the manager's default sandbox; subsequent control calls without `sandbox` target it.

### `cua_sandbox_stop`

```jsonc
cua_sandbox_stop({ name: string })
```

### `cua_sandbox_list`

```jsonc
cua_sandbox_list({})
```

Returns a text summary of active sandboxes tracked by this session.

## Control tools

All control tools accept an optional `sandbox` field. Omit it to use the default sandbox (local/cloud) or the host (localhost mode).

### `cua_screenshot`

```jsonc
cua_screenshot({ sandbox?: string })
```

Returns a PNG image content block plus a text block reporting dimensions.

### `cua_click`

```jsonc
cua_click({
  x: number,
  y: number,
  button?: "left" | "right" | "middle",
  clicks?: number,
  sandbox?: string
})
```

### `cua_type`

```jsonc
cua_type({ text: string, sandbox?: string })
```

### `cua_key`

```jsonc
cua_key({
  keys: string | string[],   // single chord or sequence
  sandbox?: string
})
```

### `cua_scroll`

```jsonc
cua_scroll({
  x: number,
  y: number,
  scrollX?: number,
  scrollY?: number,
  sandbox?: string
})
```

## Execution tools

### `cua_shell`

```jsonc
cua_shell({
  command: string,
  timeoutMs?: number,
  sandbox?: string
})
```

Runs in the target's default shell. Returns `exit`, `stdout`, `stderr`. Output is clipped at ~4 KB inline; for larger output write to a file inside the sandbox and read it back.

### `cua_run_task`

```jsonc
cua_run_task({
  task: string,
  model?: string,           // default "anthropic/claude-sonnet-4-5"
  maxTurns?: number,
  sandbox?: string
})
```

Delegates to Cua's `ComputerAgent.run()` inside the daemon. Returns a single text content block with a summary line plus the agent's final answer. Provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.) must be set in the shell that launched Pi.

## Error handling

Tools raise (`throw`) on:

- Missing or unknown sandbox name
- Localhost-mode usage of sandbox lifecycle tools
- Daemon process exit
- Cua import failures (when invoking tools that need Cua)

Pi surfaces tool errors to the agent as `isError: true` tool results, so the model can recover.

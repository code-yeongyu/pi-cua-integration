# Security

`pi-cua-integration` gives an LLM agent the ability to drive a real GUI: type, click, scroll, run shell commands, and execute end-to-end tasks. This document covers the threat model and mitigations.

## Threat model

| What we defend against                                   | How |
|----------------------------------------------------------|-----|
| Untrusted code escaping into your dev machine            | Default `local` mode uses a sandbox (Docker or VM). |
| Accidental destructive actions on the host               | `localhost` mode prompts before destructive shell. |
| Cloud data leaks via Cua telemetry                       | `CUA_TELEMETRY_ENABLED=false` forced by default. |
| Unintended host control                                  | Default `mode` is sandboxed `local`; `localhost` must be set explicitly in config. |
| Wrong sandbox name escalating to unintended target       | The manager rejects unknown sandbox names. |
| Stale sandboxes leaking across sessions                  | `ephemeral: true` (default) destroys sandboxes on session shutdown. |

| What we do **not** defend against                        | Mitigation |
|----------------------------------------------------------|------------|
| Container/VM escape (kernel exploits in Docker/QEMU)     | Keep Docker / QEMU up to date. Use a hardened host. |
| Prompt injection in screenshot content                   | Anthropic / OpenAI computer-use classifiers; review actions. |
| Malicious Python packages in `pip install cua`           | Pin Cua version, audit dependencies. |
| Compromised LiteLLM provider keys                        | Rotate keys; scope to least privilege. |
| Host-side automation while running `localhost`           | Run only when explicitly opted in. |

## Per-mode risk

### `local`
Lowest risk. Actions happen inside a Docker container or VM. The container's network usually has internet access unless you configure otherwise inside the image.

### `cloud`
Actions run in cua.ai's infrastructure. Data passing through the cloud sandbox is subject to Cua's privacy policy. **Do not paste production secrets into a cloud sandbox.**

### `localhost`
Highest risk. The agent can read clipboard, take screenshots of any window, type into any focused app, and run shell commands as your user. Use only for trusted automations.

## Recommended hygiene

1. **Pin Cua**: `pip install cua==<version>`; do not use `latest` in production.
2. **Scope LLM keys**: Use separate provider keys for the pi agent driving cua, and rotate often.
3. **Block destructive shell** by default (`confirmDestructive: true`).
4. **Set `ephemeral: true`** so sandboxes are destroyed at session shutdown.
5. **Review skills**: the bundled skills are read-only inside the extension package; users can not modify them at runtime.
6. **Audit screenshot content**: never auto-OCR screenshots back into the agent context if they may contain secrets.

## Environment isolation matrix

| Resource         | `local` (container) | `local` (VM) | `localhost` | `cloud` |
|------------------|---------------------|--------------|-------------|---------|
| Filesystem       | container fs        | guest fs     | host fs     | guest fs |
| Network          | container network   | guest network | host network | guest network |
| Process tree     | container PID ns    | guest kernel | host        | guest kernel |
| Clipboard        | virtual             | virtual      | shared host | virtual |
| Display          | XFCE inside container | guest GUI  | shared host | guest GUI |

## Reporting vulnerabilities

Open a private security advisory at the GitHub repository. Do not file public issues for security topics.

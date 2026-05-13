import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const ShellParams = Type.Object(
	{
		command: Type.String({
			description:
				"Shell command to run inside the target sandbox or on localhost. Executed via the guest's default shell.",
		}),
		timeoutMs: Type.Optional(Type.Integer({ description: "Per-command timeout in milliseconds.", minimum: 100 })),
		sandbox: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

export type ShellInput = Static<typeof ShellParams>;

const MAX_INLINE_OUTPUT = 4_000;

function clip(text: string, limit: number): string {
	if (text.length <= limit) return text;
	return `${text.slice(0, limit)}\n…(truncated ${text.length - limit} chars)`;
}

export function createShellTool(manager: SandboxManager, client: CuaClient): ToolDefinition {
	return defineTool({
		name: "cua_shell",
		label: "Cua: shell",
		description: "Run a shell command on the current Cua target and return stdout/stderr/exit code.",
		parameters: ShellParams,
		async execute(_toolCallId, params) {
			const target = manager.resolveTarget(params.sandbox);
			const shellOptions: { timeoutMs?: number } = {};
			if (params.timeoutMs !== undefined) shellOptions.timeoutMs = params.timeoutMs;
			const result = await client.shell(target, params.command, shellOptions);
			const parts: string[] = [`exit=${result.exitCode}`];
			if (result.stdout.length > 0) parts.push(`stdout:\n${clip(result.stdout, MAX_INLINE_OUTPUT)}`);
			if (result.stderr.length > 0) parts.push(`stderr:\n${clip(result.stderr, MAX_INLINE_OUTPUT)}`);
			return textResult(parts.join("\n\n"));
		},
	});
}

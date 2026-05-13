import { type Static, Type } from "typebox";

import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const SandboxStopParams = Type.Object(
	{
		name: Type.String({ description: "Sandbox name returned by cua_sandbox_start." }),
	},
	{ additionalProperties: false },
);

export type SandboxStopInput = Static<typeof SandboxStopParams>;

export function createSandboxStopTool(manager: SandboxManager): ToolDefinition {
	return defineTool({
		name: "cua_sandbox_stop",
		label: "Cua: stop sandbox",
		description: "Destroy a Cua sandbox previously started in this session.",
		parameters: SandboxStopParams,
		async execute(_toolCallId, params) {
			await manager.stopSandbox(params.name);
			return textResult(`Stopped sandbox '${params.name}'.`);
		},
	});
}

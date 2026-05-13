import { Type } from "typebox";

import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const SandboxListParams = Type.Object({}, { additionalProperties: false });

export function createSandboxListTool(manager: SandboxManager): ToolDefinition {
	return defineTool({
		name: "cua_sandbox_list",
		label: "Cua: list sandboxes",
		description: "List Cua sandboxes active in this session.",
		parameters: SandboxListParams,
		async execute() {
			const active = manager.getActiveSandboxes();
			if (active.length === 0) {
				return textResult("No active sandboxes. Use cua_sandbox_start to create one.");
			}
			const lines = active.map((entry) => `- ${entry.name} (${entry.mode}, ${entry.os})`);
			return textResult(`Active sandboxes (${active.length}):\n${lines.join("\n")}`);
		},
	});
}

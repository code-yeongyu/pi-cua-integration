import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const RunTaskParams = Type.Object(
	{
		task: Type.String({
			description:
				"Natural-language task description, e.g. 'Open Firefox and search for the docs'. Cua's ComputerAgent will drive the target.",
		}),
		model: Type.Optional(
			Type.String({
				description:
					"LiteLLM-compatible model id (e.g. 'anthropic/claude-sonnet-4-5'). Defaults to the daemon's CUA_MODEL_NAME.",
			}),
		),
		maxTurns: Type.Optional(Type.Integer({ description: "Maximum agent turns before giving up.", minimum: 1 })),
		sandbox: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

export type RunTaskInput = Static<typeof RunTaskParams>;

export function createRunTaskTool(manager: SandboxManager, client: CuaClient): ToolDefinition {
	return defineTool({
		name: "cua_run_task",
		label: "Cua: run agent task",
		description:
			"Hand off a natural-language task to Cua's ComputerAgent (cua-agent). The agent loops with vision + actions until done. Returns final text + screenshots.",
		parameters: RunTaskParams,
		async execute(_toolCallId, params) {
			const target = manager.resolveTarget(params.sandbox);
			const inputArg: Parameters<CuaClient["runTask"]>[1] = { task: params.task };
			if (params.model !== undefined) inputArg.model = params.model;
			if (params.maxTurns !== undefined) inputArg.maxTurns = params.maxTurns;
			const result = await client.runTask(target, inputArg);
			const summary = [
				`Task complete (${result.toolCalls.length} action${result.toolCalls.length === 1 ? "" : "s"}, ${result.screenshots.length} screenshot${result.screenshots.length === 1 ? "" : "s"}).`,
				result.finalText,
			].join("\n\n");
			return textResult(summary);
		},
	});
}

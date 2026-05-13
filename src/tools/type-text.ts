import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const TypeParams = Type.Object(
	{
		text: Type.String({ description: "Text to type into the active surface." }),
		sandbox: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

export type TypeInput = Static<typeof TypeParams>;

export function createTypeTool(manager: SandboxManager, client: CuaClient): ToolDefinition {
	return defineTool({
		name: "cua_type",
		label: "Cua: type text",
		description: "Type a string into the active surface of the current Cua target.",
		parameters: TypeParams,
		async execute(_toolCallId, params) {
			const target = manager.resolveTarget(params.sandbox);
			await client.type(target, params.text);
			const length = params.text.length;
			return textResult(`Typed ${length} character${length === 1 ? "" : "s"}.`);
		},
	});
}

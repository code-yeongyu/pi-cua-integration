import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const ClickParams = Type.Object(
	{
		x: Type.Integer({ description: "X coordinate in pixels." }),
		y: Type.Integer({ description: "Y coordinate in pixels." }),
		button: Type.Optional(
			Type.Union([Type.Literal("left"), Type.Literal("right"), Type.Literal("middle")], {
				description: "Mouse button. Default left.",
			}),
		),
		clicks: Type.Optional(Type.Integer({ description: "Number of clicks (1=single, 2=double, 3=triple)." })),
		sandbox: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

export type ClickInput = Static<typeof ClickParams>;

export function createClickTool(manager: SandboxManager, client: CuaClient): ToolDefinition {
	return defineTool({
		name: "cua_click",
		label: "Cua: click",
		description: "Click at the given (x, y) on the current Cua target.",
		parameters: ClickParams,
		async execute(_toolCallId, params) {
			const target = manager.resolveTarget(params.sandbox);
			await client.click(target, {
				x: params.x,
				y: params.y,
				button: params.button ?? "left",
				clicks: params.clicks ?? 1,
			});
			const verb = params.clicks === 2 ? "double-click" : params.clicks === 3 ? "triple-click" : "click";
			return textResult(`${params.button ?? "left"} ${verb} at (${params.x}, ${params.y}).`);
		},
	});
}

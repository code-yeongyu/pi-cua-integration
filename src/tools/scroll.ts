import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const ScrollParams = Type.Object(
	{
		x: Type.Integer({ description: "X coordinate where the scroll originates." }),
		y: Type.Integer({ description: "Y coordinate where the scroll originates." }),
		scrollX: Type.Optional(Type.Integer({ description: "Horizontal scroll amount (positive = right)." })),
		scrollY: Type.Optional(Type.Integer({ description: "Vertical scroll amount (positive = down)." })),
		sandbox: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

export type ScrollInput = Static<typeof ScrollParams>;

export function createScrollTool(manager: SandboxManager, client: CuaClient): ToolDefinition {
	return defineTool({
		name: "cua_scroll",
		label: "Cua: scroll",
		description: "Scroll at the given coordinates on the current Cua target.",
		parameters: ScrollParams,
		async execute(_toolCallId, params) {
			const target = manager.resolveTarget(params.sandbox);
			await client.scroll(target, {
				x: params.x,
				y: params.y,
				scrollX: params.scrollX ?? 0,
				scrollY: params.scrollY ?? 0,
			});
			return textResult(`Scrolled (${params.scrollX ?? 0}, ${params.scrollY ?? 0}) at (${params.x}, ${params.y}).`);
		},
	});
}

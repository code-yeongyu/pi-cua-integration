import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const ScrollParams = Type.Object(
	{
		x: Type.Integer({ description: "X coordinate where the scroll originates." }),
		y: Type.Integer({ description: "Y coordinate where the scroll originates." }),
		dx: Type.Optional(Type.Integer({ description: "Horizontal wheel delta. Positive values scroll right." })),
		dy: Type.Optional(Type.Integer({ description: "Vertical wheel delta. Negative values scroll down." })),
		scrollX: Type.Optional(Type.Integer({ description: "Alias for dx. Positive values scroll right." })),
		scrollY: Type.Optional(Type.Integer({ description: "Alias for dy. Negative values scroll down." })),
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
			const scrollX = params.dx ?? params.scrollX ?? 0;
			const scrollY = params.dy ?? params.scrollY ?? 0;
			await client.scroll(target, {
				x: params.x,
				y: params.y,
				scrollX,
				scrollY,
			});
			return textResult(`Scrolled (${scrollX}, ${scrollY}) at (${params.x}, ${params.y}).`);
		},
	});
}

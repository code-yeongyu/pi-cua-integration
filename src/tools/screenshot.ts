import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { multiContentResult } from "./result.js";

export const ScreenshotParams = Type.Object(
	{
		sandbox: Type.Optional(
			Type.String({
				description: "Sandbox name. Omit to use the default sandbox or localhost target.",
			}),
		),
	},
	{ additionalProperties: false },
);

export type ScreenshotInput = Static<typeof ScreenshotParams>;

export function createScreenshotTool(manager: SandboxManager, client: CuaClient): ToolDefinition {
	return defineTool({
		name: "cua_screenshot",
		label: "Cua: screenshot",
		description:
			"Capture a PNG screenshot of the current Cua target (sandbox or host). The image is returned as an image content block; the text block reports dimensions.",
		parameters: ScreenshotParams,
		async execute(_toolCallId, params) {
			const target = manager.resolveTarget(params.sandbox);
			const result = await client.screenshot(target);
			return multiContentResult(result.pngBase64, `Screenshot ${result.width}x${result.height}`);
		},
	});
}

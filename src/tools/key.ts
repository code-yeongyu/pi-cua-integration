import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const KeyParams = Type.Object(
	{
		keys: Type.Union(
			[
				Type.String({
					description:
						"Single key or chord, e.g. 'Return', 'ctrl+s'. Cua maps these to pynput Key/KeyCode values.",
				}),
				Type.Array(Type.String(), {
					description: "Sequence of key chords to press in order.",
				}),
			],
			{
				description: "Either a single key/chord string or an array of chord strings to press in order.",
			},
		),
		sandbox: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

export type KeyInput = Static<typeof KeyParams>;

export function createKeyTool(manager: SandboxManager, client: CuaClient): ToolDefinition {
	return defineTool({
		name: "cua_key",
		label: "Cua: key press",
		description: "Press one or more key chords on the current Cua target.",
		parameters: KeyParams,
		async execute(_toolCallId, params) {
			const target = manager.resolveTarget(params.sandbox);
			await client.key(target, params.keys);
			const summary = Array.isArray(params.keys) ? params.keys.join(", ") : params.keys;
			return textResult(`Pressed: ${summary}.`);
		},
	});
}

import { type Static, Type } from "typebox";

import type { CuaClient } from "../cua/client.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

/** pynput key names accepted by the daemon (see pynput.keyboard.Key). */
export const PYNPUT_KEY_NAMES = new Set<string>([
	"alt",
	"alt_l",
	"alt_r",
	"alt_gr",
	"backspace",
	"caps_lock",
	"cmd",
	"cmd_l",
	"cmd_r",
	"ctrl",
	"ctrl_l",
	"ctrl_r",
	"delete",
	"down",
	"end",
	"enter",
	"esc",
	...Array.from({ length: 20 }, (_, i) => `f${i + 1}`),
	"home",
	"insert",
	"left",
	"menu",
	"num_lock",
	"page_down",
	"page_up",
	"pause",
	"print_screen",
	"right",
	"scroll_lock",
	"shift",
	"shift_l",
	"shift_r",
	"space",
	"tab",
	"up",
]);

/** Common agent-facing aliases mapped to pynput key names. */
const KEY_ALIASES: Record<string, string> = {
	super: "cmd",
	super_l: "cmd_l",
	super_r: "cmd_r",
	meta: "cmd",
	win: "cmd",
	windows: "cmd",
	option: "alt",
	options: "alt",
	return: "enter",
	escape: "esc",
	spacebar: "space",
	bksp: "backspace",
	del: "delete",
	ins: "insert",
	pgup: "page_up",
	pgdn: "page_down",
	pgdown: "page_down",
	prtsc: "print_screen",
};

/**
 * Normalize a single key name (case-insensitive). Returns the pynput name,
 * or the lowercased input when it is already valid (e.g. "a", "f5").
 */
export function normalizeKeyName(part: string): string {
	const lower = part.toLowerCase();
	return KEY_ALIASES[lower] ?? lower;
}

/**
 * Normalize a key chord like "Ctrl+Shift+A" or "super+tab".
 * Throws a readable error when a part is not a valid pynput key name.
 */
export function normalizeKeyChord(chord: string): string {
	return chord
		.split("+")
		.map((part) => {
			const trimmed = part.trim();
			const name = normalizeKeyName(trimmed);
			if (name.length === 1 || PYNPUT_KEY_NAMES.has(name)) {
				return name;
			}
			throw new Error(
				`Unknown key "${trimmed}". Valid keys: single characters (a-z, 0-9), or one of ${[...PYNPUT_KEY_NAMES].sort().join(", ")} (aliases: super/meta/win -> cmd, option -> alt, return -> enter).`,
			);
		})
		.join("+");
}

export function normalizeKeys(keys: string | string[]): string | string[] {
	return Array.isArray(keys) ? keys.map(normalizeKeyChord) : normalizeKeyChord(keys);
}

export const KeyParams = Type.Object(
	{
		keys: Type.Union(
			[
				Type.String({
					description:
						"Single key or chord, e.g. 'Return', 'ctrl+s', 'super+v'. Aliases: super/meta/win -> cmd (PC Super / Mac Command), option -> alt, return -> enter.",
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
			const keys = normalizeKeys(params.keys);
			await client.key(target, keys);
			const summary = Array.isArray(keys) ? keys.join(", ") : keys;
			return textResult(`Pressed: ${summary}.`);
		},
	});
}

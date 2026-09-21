import { describe, expect, it } from "vitest";

import { normalizeKeyChord, normalizeKeys } from "../../../src/tools/key.js";

describe("normalizeKeyChord", () => {
	it("#given pynput names #when normalized #then they are lowercased and kept", () => {
		expect(normalizeKeyChord("Ctrl+Shift+A")).toBe("ctrl+shift+a");
		expect(normalizeKeyChord("F5")).toBe("f5");
		expect(normalizeKeyChord("Tab")).toBe("tab");
	});

	it("#given agent aliases #when normalized #then they map to pynput names", () => {
		expect(normalizeKeyChord("Super+Tab")).toBe("cmd+tab");
		expect(normalizeKeyChord("meta")).toBe("cmd");
		expect(normalizeKeyChord("win")).toBe("cmd");
		expect(normalizeKeyChord("windows+v")).toBe("cmd+v");
		expect(normalizeKeyChord("Option+C")).toBe("alt+c");
		expect(normalizeKeyChord("Return")).toBe("enter");
		expect(normalizeKeyChord("Escape")).toBe("esc");
		expect(normalizeKeyChord("PgUp")).toBe("page_up");
	});

	it("#given an unknown key #when normalized #then it throws a readable error listing valid keys", () => {
		expect(() => normalizeKeyChord("Superkey")).toThrowError(/Unknown key "Superkey"/);
		expect(() => normalizeKeyChord("Superkey")).toThrowError(/super\/meta\/win -> cmd/);
	});

	it("#given an array of chords #when normalized #then every chord is normalized", () => {
		expect(normalizeKeys(["Super+C", "Return", "ctrl+s"])).toEqual(["cmd+c", "enter", "ctrl+s"]);
	});
});

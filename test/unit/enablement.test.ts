import { describe, expect, it } from "vitest";

import { isPiCuaEnabled, isTruthyEnvValue, PI_CUA_ENABLED_ENV } from "../../src/enablement.js";

describe("enablement", () => {
	it("#given truthy env values #when checked #then returns true", () => {
		// given
		const truthy = ["1", "true", "TRUE", "yes", "Yes", "on", "ON", " 1 "];
		// when / then
		for (const value of truthy) {
			expect(isTruthyEnvValue(value)).toBe(true);
		}
	});

	it("#given falsy env values #when checked #then returns false", () => {
		// given
		const falsy = ["0", "false", "no", "off", "", "  ", "anything"];
		// when / then
		for (const value of falsy) {
			expect(isTruthyEnvValue(value)).toBe(false);
		}
	});

	it("#given undefined value #when checked #then returns false", () => {
		// given / when / then
		expect(isTruthyEnvValue(undefined)).toBe(false);
	});

	it("#given PI_CUA_ENABLED unset #when isPiCuaEnabled checked #then returns false", () => {
		// given
		const env = {};
		// when
		const enabled = isPiCuaEnabled(env);
		// then
		expect(enabled).toBe(false);
	});

	it("#given PI_CUA_ENABLED=on #when isPiCuaEnabled checked #then returns true", () => {
		// given
		const env = { [PI_CUA_ENABLED_ENV]: "on" };
		// when
		const enabled = isPiCuaEnabled(env);
		// then
		expect(enabled).toBe(true);
	});
});

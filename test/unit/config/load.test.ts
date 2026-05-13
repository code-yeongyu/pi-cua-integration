import { describe, expect, it } from "vitest";

import { isCuaConfig, loadConfig, mergeConfigs, parseJsonc, stripJsonc } from "../../../src/config/load.js";

const FAKE_HOME = "/fake-home";
const FAKE_CWD = "/fake-cwd";

function makeReader(map: Map<string, string>): (absolutePath: string) => Promise<string> {
	return async (absolutePath: string): Promise<string> => {
		const text = map.get(absolutePath);
		if (text === undefined) {
			const error = new Error(`ENOENT: ${absolutePath}`) as NodeJS.ErrnoException;
			error.code = "ENOENT";
			throw error;
		}
		return text;
	};
}

describe("stripJsonc", () => {
	it("#given line comments + trailing comma #when stripped #then returns valid JSON", () => {
		// given
		const text = `{ "mode": "local", // comment\n }`;
		// when
		const stripped = stripJsonc(text);
		// then
		expect(JSON.parse(stripped)).toEqual({ mode: "local" });
	});

	it("#given block comments #when stripped #then removes them", () => {
		// given
		const text = `{ /* head */ "mode": /* mid */ "cloud" /* tail */ }`;
		// when
		const stripped = stripJsonc(text);
		// then
		expect(JSON.parse(stripped)).toEqual({ mode: "cloud" });
	});

	it("#given a URL inside a string #when stripped #then does not corrupt the URL", () => {
		// given
		const text = `{ "homepage": "https://cua.ai" }`;
		// when
		const stripped = stripJsonc(text);
		// then
		expect(JSON.parse(stripped)).toEqual({ homepage: "https://cua.ai" });
	});
});

describe("parseJsonc", () => {
	it("#given JSONC with comments #when parsed #then returns the data", () => {
		// given
		const text = `{ /* x */ "mode": "localhost", }`;
		// when
		const data = parseJsonc(text);
		// then
		expect(data).toEqual({ mode: "localhost" });
	});
});

describe("isCuaConfig", () => {
	it("#given valid keys #when checked #then returns true", () => {
		// given / when / then
		expect(isCuaConfig({ mode: "local" })).toBe(true);
		expect(isCuaConfig({ mode: "cloud", cloud: { region: "us-east" } })).toBe(true);
		expect(isCuaConfig({})).toBe(true);
	});

	it("#given unknown top-level key #when checked #then returns false", () => {
		// given / when / then
		expect(isCuaConfig({ mode: "local", unknown: true })).toBe(false);
	});

	it("#given non-object #when checked #then returns false", () => {
		// given / when / then
		expect(isCuaConfig(null)).toBe(false);
		expect(isCuaConfig("local")).toBe(false);
		expect(isCuaConfig(42)).toBe(false);
	});
});

describe("mergeConfigs", () => {
	it("#given both undefined #when merged #then returns undefined", () => {
		// given / when
		const merged = mergeConfigs(undefined, undefined);
		// then
		expect(merged).toBeUndefined();
	});

	it("#given global and project #when merged #then project overrides global", () => {
		// given
		const global = { mode: "cloud" as const, cloud: { region: "us-east" } };
		const project = { mode: "local" as const, cloud: { region: "eu-west" } };
		// when
		const merged = mergeConfigs(global, project);
		// then
		expect(merged?.mode).toBe("local");
		expect(merged?.cloud?.region).toBe("eu-west");
	});

	it("#given project only #when merged #then returns project", () => {
		// given
		const project = { mode: "localhost" as const };
		// when
		const merged = mergeConfigs(undefined, project);
		// then
		expect(merged).toEqual(project);
	});
});

describe("loadConfig", () => {
	it("#given no files exist #when loaded #then returns local defaults", async () => {
		// given
		const reader = makeReader(new Map());
		// when
		const loaded = await loadConfig({ cwd: FAKE_CWD, home: FAKE_HOME, readTextFile: reader });
		// then
		expect(loaded.resolved.mode).toBe("local");
		expect(loaded.sources).toEqual([]);
	});

	it("#given a project config exists #when loaded #then uses it", async () => {
		// given
		const reader = makeReader(new Map([[`${FAKE_CWD}/.pi/cua.jsonc`, `{ "mode": "localhost" }`]]));
		// when
		const loaded = await loadConfig({ cwd: FAKE_CWD, home: FAKE_HOME, readTextFile: reader });
		// then
		expect(loaded.resolved.mode).toBe("localhost");
		expect(loaded.sources).toHaveLength(1);
	});

	it("#given global + project configs #when loaded #then project wins", async () => {
		// given
		const reader = makeReader(
			new Map([
				[`${FAKE_HOME}/.pi/cua.json`, `{ "mode": "cloud", "cloud": { "region": "us-east" } }`],
				[`${FAKE_CWD}/.pi/cua.jsonc`, `{ "cloud": { "region": "eu-west" } }`],
			]),
		);
		// when
		const loaded = await loadConfig({ cwd: FAKE_CWD, home: FAKE_HOME, readTextFile: reader });
		// then
		expect(loaded.resolved.mode).toBe("cloud");
		expect(loaded.resolved.cloud.region).toBe("eu-west");
		expect(loaded.sources).toHaveLength(2);
	});

	it("#given invalid top-level key #when loaded #then throws", async () => {
		// given
		const reader = makeReader(new Map([[`${FAKE_CWD}/.pi/cua.jsonc`, `{ "mode": "local", "bogus": true }`]]));
		// when / then
		await expect(loadConfig({ cwd: FAKE_CWD, home: FAKE_HOME, readTextFile: reader })).rejects.toThrow(
			/unrecognised top-level keys/,
		);
	});
});

import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../../../src/config/normalize.js";
import { resolveMode } from "../../../src/sandbox/mode.js";

describe("resolveMode", () => {
	it("#given default config #when resolved #then returns local with default_local reason", () => {
		// given
		const config = normalizeConfig(undefined);
		// when
		const result = resolveMode({ config, env: {} });
		// then
		expect(result.mode).toBe("local");
		expect(result.reason).toBe("default_local");
		expect(result.warnings).toEqual([]);
	});

	it("#given mode=localhost #when resolved #then returns localhost", () => {
		// given
		const config = normalizeConfig({ mode: "localhost" });
		// when
		const result = resolveMode({ config, env: {} });
		// then
		expect(result.mode).toBe("localhost");
		expect(result.reason).toBe("explicit_localhost");
	});

	it("#given mode=cloud + CUA_API_KEY #when resolved #then returns cloud", () => {
		// given
		const config = normalizeConfig({ mode: "cloud" });
		const env = { CUA_API_KEY: "sk_cua-..." };
		// when
		const result = resolveMode({ config, env });
		// then
		expect(result.mode).toBe("cloud");
		expect(result.reason).toBe("explicit_cloud");
	});

	it("#given mode=cloud but no API key #when resolved #then falls back to local with warning", () => {
		// given
		const config = normalizeConfig({ mode: "cloud" });
		// when
		const result = resolveMode({ config, env: {} });
		// then
		expect(result.mode).toBe("local");
		expect(result.reason).toBe("cloud_mode_missing_cua_api_key");
		expect(result.warnings).toHaveLength(1);
	});

	it("#given custom apiKeyEnv #when resolved #then uses that env name", () => {
		// given
		const config = normalizeConfig({
			mode: "cloud",
			cloud: { apiKeyEnv: "MY_CUA_KEY" },
		});
		const env = { MY_CUA_KEY: "value" };
		// when
		const result = resolveMode({ config, env });
		// then
		expect(result.mode).toBe("cloud");
	});
});

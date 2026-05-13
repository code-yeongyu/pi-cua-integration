import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../../../src/config/normalize.js";

describe("normalizeConfig", () => {
	it("#given undefined input #when normalized #then returns local defaults", () => {
		// given / when
		const resolved = normalizeConfig(undefined);
		// then
		expect(resolved.mode).toBe("local");
		expect(resolved.local.runtime).toBe("auto");
		expect(resolved.local.image.os).toBe("linux");
		expect(resolved.local.image.kind).toBe("container");
		expect(resolved.local.ephemeral).toBe(true);
		expect(resolved.cloud.apiKeyEnv).toBe("CUA_API_KEY");
		expect(resolved.localhost.confirmDestructive).toBe(true);
		expect(resolved.python.executable).toBe("python3");
		expect(resolved.telemetry.enabled).toBe(false);
	});

	it("#given mode=cloud + region #when normalized #then preserves them", () => {
		// given
		const input = { mode: "cloud" as const, cloud: { region: "us-west" } };
		// when
		const resolved = normalizeConfig(input);
		// then
		expect(resolved.mode).toBe("cloud");
		expect(resolved.cloud.region).toBe("us-west");
	});

	it("#given local kind=vm runtime=qemu #when normalized #then preserves them", () => {
		// given
		const input = { local: { runtime: "qemu" as const, image: { os: "linux" as const, kind: "vm" as const } } };
		// when
		const resolved = normalizeConfig(input);
		// then
		expect(resolved.local.runtime).toBe("qemu");
		expect(resolved.local.image.kind).toBe("vm");
	});

	it("#given ephemeral=false #when normalized #then preserves it", () => {
		// given
		const input = { local: { ephemeral: false } };
		// when
		const resolved = normalizeConfig(input);
		// then
		expect(resolved.local.ephemeral).toBe(false);
	});
});

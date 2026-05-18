import { describe, expect, it, vi } from "vitest";

import { normalizeConfig } from "../../../src/config/normalize.js";
import type { CuaClient } from "../../../src/cua/client.js";
import { SandboxManager } from "../../../src/sandbox/manager.js";

function makeClient(overrides: Partial<CuaClient> = {}): CuaClient {
	return {
		async ping() {
			return { ok: true, daemonVersion: "test" };
		},
		startSandbox: vi.fn(async (input) => ({ name: input.name ?? "sb-1" })),
		stopSandbox: vi.fn(async () => undefined),
		listSandboxes: vi.fn(async () => []),
		screenshot: vi.fn(),
		click: vi.fn(),
		type: vi.fn(),
		key: vi.fn(),
		scroll: vi.fn(),
		shell: vi.fn(),
		...overrides,
	} as CuaClient;
}

describe("SandboxManager", () => {
	it("#given local mode #when starting a sandbox #then tracks it as default", async () => {
		// given
		const client = makeClient();
		const manager = new SandboxManager({
			client,
			config: normalizeConfig(undefined),
			mode: "local",
			env: {},
		});
		// when
		const entry = await manager.startSandbox({});
		// then
		expect(entry.name).toBe("sb-1");
		expect(manager.getActiveSandboxes()).toHaveLength(1);
		expect(manager.getDefaultSandbox()?.name).toBe("sb-1");
		const target = manager.resolveTarget();
		expect(target).toEqual({ kind: "sandbox", name: "sb-1" });
	});

	it("#given localhost mode #when resolveTarget called #then returns localhost target", () => {
		// given
		const client = makeClient();
		const manager = new SandboxManager({
			client,
			config: normalizeConfig({ mode: "localhost" }),
			mode: "localhost",
			env: {},
		});
		// when
		const target = manager.resolveTarget();
		// then
		expect(target).toEqual({ kind: "localhost" });
	});

	it("#given localhost mode #when startSandbox called #then throws", async () => {
		// given
		const manager = new SandboxManager({
			client: makeClient(),
			config: normalizeConfig({ mode: "localhost" }),
			mode: "localhost",
			env: {},
		});
		// when / then
		await expect(manager.startSandbox({})).rejects.toThrow(/localhost/);
	});

	it("#given local mode with no active sandbox #when resolveTarget called #then throws", () => {
		// given
		const manager = new SandboxManager({
			client: makeClient(),
			config: normalizeConfig(undefined),
			mode: "local",
			env: {},
		});
		// when / then
		expect(() => manager.resolveTarget()).toThrow(/cua_sandbox_start/);
	});

	it("#given two sandboxes #when stopSandbox is called on default #then next sandbox becomes default", async () => {
		// given
		let counter = 0;
		const client = makeClient({
			startSandbox: vi.fn(async () => {
				counter += 1;
				return { name: `sb-${counter}` };
			}),
		});
		const manager = new SandboxManager({
			client,
			config: normalizeConfig(undefined),
			mode: "local",
			env: {},
		});
		await manager.startSandbox({});
		await manager.startSandbox({});
		// when
		await manager.stopSandbox("sb-1");
		// then
		expect(manager.getActiveSandboxes()).toHaveLength(1);
		expect(manager.getDefaultSandbox()?.name).toBe("sb-2");
	});

	it("#given cloud mode #when startSandbox is called #then passes api key from env", async () => {
		// given
		const client = makeClient();
		const config = normalizeConfig({ mode: "cloud", cloud: { region: "us-east" } });
		const manager = new SandboxManager({
			client,
			config,
			mode: "cloud",
			env: { CUA_API_KEY: "sk-test" },
		});
		// when
		await manager.startSandbox({});
		// then
		const startMock = client.startSandbox as ReturnType<typeof vi.fn>;
		expect(startMock).toHaveBeenCalledWith(
			expect.objectContaining({ mode: "cloud", apiKey: "sk-test", region: "us-east" }),
		);
	});

	it("#given shutdownAll #when called #then stops every sandbox", async () => {
		// given
		let counter = 0;
		const client = makeClient({
			startSandbox: vi.fn(async () => {
				counter += 1;
				return { name: `sb-${counter}` };
			}),
		});
		const manager = new SandboxManager({
			client,
			config: normalizeConfig(undefined),
			mode: "local",
			env: {},
		});
		await manager.startSandbox({});
		await manager.startSandbox({});
		// when
		const results = await manager.shutdownAll();
		// then
		expect(results).toHaveLength(2);
		expect(manager.getActiveSandboxes()).toHaveLength(0);
		expect(manager.getDefaultSandbox()).toBeUndefined();
	});
});

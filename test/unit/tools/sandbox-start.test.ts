import { describe, expect, it, vi } from "vitest";

import { normalizeConfig } from "../../../src/config/normalize.js";
import type { CuaClient } from "../../../src/cua/client.js";
import { SandboxManager } from "../../../src/sandbox/manager.js";
import { createSandboxStartTool } from "../../../src/tools/sandbox-start.js";

function makeClient(): CuaClient {
	return {
		async ping() {
			return { ok: true, daemonVersion: "test" };
		},
		startSandbox: vi.fn(async (input) => ({ name: input.name ?? "sb-test" })),
		stopSandbox: vi.fn(),
		listSandboxes: vi.fn(),
		screenshot: vi.fn(),
		click: vi.fn(),
		type: vi.fn(),
		key: vi.fn(),
		scroll: vi.fn(),
		shell: vi.fn(),
	} as CuaClient;
}

describe("createSandboxStartTool", () => {
	it("#given a local manager #when the tool runs #then it starts a sandbox and returns the name", async () => {
		// given
		const client = makeClient();
		const manager = new SandboxManager({
			client,
			config: normalizeConfig(undefined),
			mode: "local",
			env: {},
		});
		const tool = createSandboxStartTool(manager);
		// when
		const result = await tool.execute("call-1", {}, undefined, undefined, {} as never);
		// then
		expect(result.content[0]).toEqual(expect.objectContaining({ type: "text" }));
		expect(manager.getActiveSandboxes()).toHaveLength(1);
	});

	it("#given a localhost manager #when the tool runs #then it throws", async () => {
		// given
		const client = makeClient();
		const manager = new SandboxManager({
			client,
			config: normalizeConfig({ mode: "localhost" }),
			mode: "localhost",
			env: {},
		});
		const tool = createSandboxStartTool(manager);
		// when / then
		await expect(tool.execute("call-1", {}, undefined, undefined, {} as never)).rejects.toThrow(/localhost/);
	});
});

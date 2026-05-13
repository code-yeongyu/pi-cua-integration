import { describe, expect, it, vi } from "vitest";

import { normalizeConfig } from "../../../src/config/normalize.js";
import type { CuaClient } from "../../../src/cua/client.js";
import { SandboxManager } from "../../../src/sandbox/manager.js";
import { createScrollTool } from "../../../src/tools/scroll.js";

function makeClient(): CuaClient {
	return {
		async ping() {
			return { ok: true, daemonVersion: "test" };
		},
		startSandbox: vi.fn(),
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

describe("createScrollTool", () => {
	it("#given dx and dy aliases #when the tool runs #then it forwards them as scroll deltas", async () => {
		// given
		const client = makeClient();
		const manager = new SandboxManager({
			client,
			config: normalizeConfig({ mode: "localhost" }),
			mode: "localhost",
			env: {},
		});
		const tool = createScrollTool(manager, client);
		// when
		await tool.execute("call-1", { x: 100, y: 200, dx: 1, dy: -3 }, undefined, undefined, {} as never);
		// then
		expect(client.scroll).toHaveBeenCalledWith({ kind: "localhost" }, { x: 100, y: 200, scrollX: 1, scrollY: -3 });
	});
});

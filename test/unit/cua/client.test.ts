import { describe, expect, it, vi } from "vitest";

import { createCuaClient } from "../../../src/cua/client.js";
import type { DaemonHandle } from "../../../src/cua/daemon.js";

function fakeDaemon(callResult?: unknown): { handle: DaemonHandle; call: ReturnType<typeof vi.fn> } {
	const call = vi.fn(async () => callResult ?? { name: "fake-sandbox" });
	const handle = {
		call,
		shutdown: vi.fn(async () => undefined),
		ready: { type: "ready", version: "0.1.0", cuaAvailable: true, cuaVersion: "0.0.0", cuaImportError: null },
		events: { on: vi.fn() },
	} as unknown as DaemonHandle;
	return { handle, call };
}

describe("createCuaClient startSandbox", () => {
	it("#given a cold-start scenario #when startSandbox is called #then the RPC uses a long timeout", async () => {
		// given
		const { handle, call } = fakeDaemon();
		const client = createCuaClient(handle);
		// when
		await client.startSandbox({ mode: "local", os: "linux", kind: "container" });
		// then
		expect(call).toHaveBeenCalledTimes(1);
		const [method, params, timeoutMs] = call.mock.calls[0] as unknown as [string, Record<string, unknown>, number];
		expect(method).toBe("start_sandbox");
		expect(params).toMatchObject({ mode: "local", os: "linux", kind: "container" });
		// Cold starts (QEMU download / image pull) can exceed the 60s default;
		// the client must not orphan the sandbox by timing out early.
		expect(timeoutMs).toBe(300_000);
	});
});

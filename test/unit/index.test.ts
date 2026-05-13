import { afterEach, describe, expect, it, vi } from "vitest";
import { PI_CUA_ENABLED_ENV } from "../../src/enablement.js";
import piCuaIntegrationExtension from "../../src/index.js";

interface FakePi {
	registerTool: ReturnType<typeof vi.fn>;
	registerCommand: ReturnType<typeof vi.fn>;
	on: ReturnType<typeof vi.fn>;
	handlers: Map<string, Array<(...args: unknown[]) => unknown>>;
}

function makeFakePi(): FakePi {
	const handlers = new Map<string, Array<(...args: unknown[]) => unknown>>();
	return {
		handlers,
		registerTool: vi.fn(),
		registerCommand: vi.fn(),
		on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
			const list = handlers.get(event) ?? [];
			list.push(handler);
			handlers.set(event, list);
		}),
	};
}

afterEach(() => {
	delete process.env[PI_CUA_ENABLED_ENV];
});

describe("piCuaIntegrationExtension factory", () => {
	it("#given PI_CUA_ENABLED unset #when factory runs #then no handlers are registered", () => {
		// given
		const pi = makeFakePi();
		// when
		piCuaIntegrationExtension(pi as never);
		// then
		expect(pi.on).not.toHaveBeenCalled();
		expect(pi.registerTool).not.toHaveBeenCalled();
		expect(pi.registerCommand).not.toHaveBeenCalled();
	});

	it("#given PI_CUA_ENABLED=1 #when factory runs #then resources_discover + session lifecycle hooks register", () => {
		// given
		process.env[PI_CUA_ENABLED_ENV] = "1";
		const pi = makeFakePi();
		// when
		piCuaIntegrationExtension(pi as never);
		// then
		expect(pi.handlers.has("resources_discover")).toBe(true);
		expect(pi.handlers.has("session_start")).toBe(true);
		expect(pi.handlers.has("session_shutdown")).toBe(true);
	});

	it("#given PI_CUA_ENABLED=1 #when resources_discover handler runs #then returns local skill paths", async () => {
		// given
		process.env[PI_CUA_ENABLED_ENV] = "true";
		const pi = makeFakePi();
		piCuaIntegrationExtension(pi as never);
		const handler = pi.handlers.get("resources_discover")?.[0];
		// when
		const result = await handler?.({ type: "resources_discover" }, {} as never);
		// then
		expect(result).toBeDefined();
		const skillPaths = (result as { skillPaths: string[] }).skillPaths;
		expect(skillPaths.length).toBeGreaterThan(0);
		for (const path of skillPaths) {
			expect(path).toContain("skills");
		}
	});
});

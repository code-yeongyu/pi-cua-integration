import type { CuaClient } from "../cua/client.js";
import type { ExtensionAPI, ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";

import { createClickTool } from "./click.js";
import { createKeyTool } from "./key.js";
import { createSandboxListTool } from "./sandbox-list.js";
import { createSandboxStartTool } from "./sandbox-start.js";
import { createSandboxStopTool } from "./sandbox-stop.js";
import { createScreenshotTool } from "./screenshot.js";
import { createScrollTool } from "./scroll.js";
import { createTypeTool } from "./type-text.js";

export interface ToolRegistrationOptions {
	readonly manager: SandboxManager;
	readonly client: CuaClient;
}

export function buildAllTools(options: ToolRegistrationOptions): ReadonlyArray<ToolDefinition> {
	const { manager, client } = options;
	return [
		createSandboxStartTool(manager),
		createSandboxStopTool(manager),
		createSandboxListTool(manager),
		createScreenshotTool(manager, client),
		createClickTool(manager, client),
		createTypeTool(manager, client),
		createKeyTool(manager, client),
		createScrollTool(manager, client),
	];
}

export function registerAllTools(pi: ExtensionAPI, options: ToolRegistrationOptions): void {
	for (const tool of buildAllTools(options)) {
		pi.registerTool(tool);
	}
}

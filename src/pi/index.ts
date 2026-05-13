export type {
	AgentToolResult,
	AgentToolUpdateCallback,
	BeforeAgentStartEvent,
	BeforeAgentStartEventResult,
	ExtensionAPI,
	ExtensionContext,
	ExtensionHandler,
	RegisteredCommand,
	SessionShutdownEvent,
	SessionStartEvent,
	ToolDefinition,
} from "@mariozechner/pi-coding-agent";

export { defineTool } from "@mariozechner/pi-coding-agent";

export interface ResourcesDiscoverEvent {
	readonly type: "resources_discover";
	readonly cwd: string | undefined;
}

export interface ResourcesDiscoverResult {
	readonly skillPaths?: ReadonlyArray<string>;
}

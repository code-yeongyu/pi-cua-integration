import type { ExtensionAPI } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";

export interface CuaCommandOptions {
	readonly manager: SandboxManager;
	readonly daemonVersion: string;
	readonly cuaAvailable: boolean;
	readonly cuaVersion: string | null;
}

function formatStatus(options: CuaCommandOptions): string {
	const mgr = options.manager;
	const active = mgr.getActiveSandboxes();
	const lines: string[] = [
		`pi-cua-integration status`,
		`  mode      : ${mgr.getMode()}`,
		`  daemon    : ${options.daemonVersion}`,
		`  cua       : ${options.cuaAvailable ? (options.cuaVersion ?? "available") : "NOT INSTALLED (pip install cua)"}`,
		`  sandboxes : ${active.length}`,
	];
	for (const entry of active) {
		lines.push(`              - ${entry.name} (${entry.mode}, ${entry.os})`);
	}
	if (mgr.getMode() === "cloud") {
		lines.push(`  api-key   : env=${mgr.config.cloud.apiKeyEnv}`);
	}
	return lines.join("\n");
}

export function registerCuaCommand(pi: ExtensionAPI, options: CuaCommandOptions): void {
	pi.registerCommand("cua", {
		description: "Show pi-cua-integration status, mode, daemon version, and active sandboxes.",
		async handler(_args, ctx) {
			ctx.ui.notify(formatStatus(options), "info");
		},
	});
}

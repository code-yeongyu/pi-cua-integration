import { registerCuaCommand } from "./commands/cua.js";
import { loadConfig } from "./config/load.js";
import { type CuaClient, createCuaClient } from "./cua/client.js";
import { type DaemonHandle, startDaemon } from "./cua/daemon.js";
import { errorMessage } from "./cua/errors.js";
import { PYTHON_DAEMON_SCRIPT } from "./cua/paths.js";
import type { ExtensionAPI } from "./pi/index.js";
import { SandboxManager } from "./sandbox/manager.js";
import { resolveMode } from "./sandbox/mode.js";
import { getSkillPaths, getSkillRoot } from "./skills/paths.js";
import { registerAllTools } from "./tools/index.js";

interface ExtensionState {
	daemon: DaemonHandle;
	client: CuaClient;
	manager: SandboxManager;
}

let state: ExtensionState | undefined;

function buildPythonEnv(
	baseEnv: NodeJS.ProcessEnv,
	options: { telemetryEnabled: boolean; cloudApiKey: string | undefined },
): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...baseEnv };
	env["CUA_TELEMETRY_ENABLED"] = options.telemetryEnabled ? "true" : "false";
	if (options.cloudApiKey !== undefined && options.cloudApiKey.length > 0) {
		env["CUA_API_KEY"] = options.cloudApiKey;
	}
	env["PYTHONUNBUFFERED"] = "1";
	return env;
}

export default function piCuaIntegrationExtension(pi: ExtensionAPI): void {
	pi.on("resources_discover", async () => {
		return { skillPaths: Array.from(getSkillPaths()) };
	});

	pi.on("session_start", async (_event, ctx) => {
		const loaded = await loadConfig({ cwd: ctx.cwd });
		const resolution = resolveMode({ config: loaded.resolved, env: process.env });
		const apiKey = process.env[loaded.resolved.cloud.apiKeyEnv];
		const env = buildPythonEnv(process.env, {
			telemetryEnabled: loaded.resolved.telemetry.enabled,
			cloudApiKey: resolution.mode === "cloud" ? apiKey : undefined,
		});

		for (const warning of resolution.warnings) {
			ctx.ui.notify(`[pi-cua] ${warning}`, "warning");
		}

		let daemon: DaemonHandle;
		try {
			daemon = await startDaemon({
				pythonExecutable: loaded.resolved.python.executable,
				daemonScript: PYTHON_DAEMON_SCRIPT,
				env,
				cwd: ctx.cwd,
				startupTimeoutMs: loaded.resolved.python.startupTimeoutMs,
				requestTimeoutMs: loaded.resolved.python.requestTimeoutMs,
				onLog: (entry) => {
					if (entry.level === "error") {
						ctx.ui.notify(`[pi-cua daemon] ${entry.message}`, "error");
					}
				},
			});
		} catch (error) {
			ctx.ui.notify(
				`[pi-cua] Failed to start Python daemon: ${errorMessage(error)}. Extension disabled for this session.`,
				"error",
			);
			return;
		}

		if (!daemon.ready.cuaAvailable) {
			ctx.ui.notify(
				`[pi-cua] Cua Python package is not installed (${daemon.ready.cuaImportError ?? "import failed"}). Install with: pip install cua`,
				"warning",
			);
		}

		const client = createCuaClient(daemon);
		const manager = new SandboxManager({
			client,
			config: loaded.resolved,
			mode: resolution.mode,
			env: process.env,
		});

		state = { daemon, client, manager };

		registerAllTools(pi, { manager, client });
		registerCuaCommand(pi, {
			manager,
			daemonVersion: daemon.ready.version,
			cuaAvailable: daemon.ready.cuaAvailable,
			cuaVersion: daemon.ready.cuaVersion,
		});

		ctx.ui.notify(`[pi-cua] ready (mode=${resolution.mode}, skill paths=${getSkillRoot()})`, "info");
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (state === undefined) return;
		const { daemon, manager } = state;
		try {
			const results = await manager.shutdownAll();
			for (const result of results) {
				if (result.error !== undefined) {
					ctx.ui.notify(
						`[pi-cua] Failed to stop sandbox '${result.name}' during shutdown: ${result.error}`,
						"error",
					);
				}
			}
		} catch (error) {
			ctx.ui.notify(`[pi-cua] Failed to stop sandboxes during shutdown: ${errorMessage(error)}`, "error");
		}
		try {
			await daemon.shutdown();
		} catch (error) {
			ctx.ui.notify(`[pi-cua] Failed to stop Python daemon during shutdown: ${errorMessage(error)}`, "error");
		}
		state = undefined;
	});
}

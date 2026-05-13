import type { DaemonHandle } from "./daemon.js";

export interface SandboxSummary {
	readonly name: string;
	readonly mode: "local" | "cloud";
	readonly osType: string;
	readonly status: string;
	readonly createdAt: number;
}

export interface ScreenshotResult {
	readonly pngBase64: string;
	readonly width: number;
	readonly height: number;
}

export interface ShellResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
}

export interface RunTaskResult {
	readonly finalText: string;
	readonly screenshots: ReadonlyArray<ScreenshotResult>;
	readonly toolCalls: ReadonlyArray<{ readonly action: string; readonly params: Record<string, unknown> }>;
	readonly usage: Record<string, unknown> | null;
}

export type Target = { readonly kind: "sandbox"; readonly name: string } | { readonly kind: "localhost" };

function encodeTarget(target: Target): Record<string, unknown> {
	if (target.kind === "sandbox") {
		return { target_kind: "sandbox", target_name: target.name };
	}
	return { target_kind: "localhost" };
}

export interface CuaClient {
	ping(): Promise<{ ok: true; daemonVersion: string }>;
	startSandbox(input: {
		mode: "local" | "cloud";
		name?: string;
		os: "linux" | "macos" | "windows" | "android";
		version?: string;
		kind?: "vm" | "container";
		runtime?: "auto" | "docker" | "qemu" | "lume" | "tart";
		apiKey?: string;
		region?: string;
	}): Promise<{ name: string }>;
	stopSandbox(name: string): Promise<void>;
	listSandboxes(): Promise<ReadonlyArray<SandboxSummary>>;
	screenshot(target: Target): Promise<ScreenshotResult>;
	click(
		target: Target,
		input: { x: number; y: number; button?: "left" | "right" | "middle"; clicks?: number },
	): Promise<void>;
	type(target: Target, text: string): Promise<void>;
	key(target: Target, keys: ReadonlyArray<string> | string): Promise<void>;
	scroll(target: Target, input: { x: number; y: number; scrollX?: number; scrollY?: number }): Promise<void>;
	shell(target: Target, command: string, options?: { timeoutMs?: number }): Promise<ShellResult>;
	runTask(target: Target, input: { task: string; model?: string; maxTurns?: number }): Promise<RunTaskResult>;
}

export function createCuaClient(daemon: DaemonHandle): CuaClient {
	return {
		async ping() {
			const result = await daemon.call<{ ok: boolean; daemon_version: string }>("ping");
			return { ok: true as const, daemonVersion: result.daemon_version };
		},
		async startSandbox(input) {
			const result = await daemon.call<{ name: string }>("start_sandbox", {
				mode: input.mode,
				name: input.name ?? null,
				os: input.os,
				version: input.version ?? null,
				kind: input.kind ?? null,
				runtime: input.runtime ?? null,
				api_key: input.apiKey ?? null,
				region: input.region ?? null,
			});
			return { name: result.name };
		},
		async stopSandbox(name) {
			await daemon.call<{ ok: true }>("stop_sandbox", { name });
		},
		async listSandboxes() {
			const result = await daemon.call<{
				sandboxes: ReadonlyArray<{
					name: string;
					mode: "local" | "cloud";
					os_type: string;
					status: string;
					created_at: number;
				}>;
			}>("list_sandboxes");
			return result.sandboxes.map((entry) => ({
				name: entry.name,
				mode: entry.mode,
				osType: entry.os_type,
				status: entry.status,
				createdAt: entry.created_at,
			}));
		},
		async screenshot(target) {
			const result = await daemon.call<{ png_b64: string; width: number; height: number }>(
				"screenshot",
				encodeTarget(target),
			);
			return { pngBase64: result.png_b64, width: result.width, height: result.height };
		},
		async click(target, input) {
			await daemon.call("click", {
				...encodeTarget(target),
				x: input.x,
				y: input.y,
				button: input.button ?? "left",
				clicks: input.clicks ?? 1,
			});
		},
		async type(target, text) {
			await daemon.call("type", { ...encodeTarget(target), text });
		},
		async key(target, keys) {
			await daemon.call("key", {
				...encodeTarget(target),
				keys: Array.isArray(keys) ? Array.from(keys) : keys,
			});
		},
		async scroll(target, input) {
			await daemon.call("scroll", {
				...encodeTarget(target),
				x: input.x,
				y: input.y,
				scroll_x: input.scrollX ?? 0,
				scroll_y: input.scrollY ?? 0,
			});
		},
		async shell(target, command, options) {
			const result = await daemon.call<{
				stdout: string;
				stderr: string;
				exit_code: number;
			}>(
				"shell",
				{ ...encodeTarget(target), command, timeout_ms: options?.timeoutMs ?? null },
				options?.timeoutMs ?? undefined,
			);
			return {
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exit_code,
			};
		},
		async runTask(target, input) {
			const result = await daemon.call<{
				final_text: string;
				screenshots: ReadonlyArray<{ png_b64: string; width: number; height: number }>;
				tool_calls: ReadonlyArray<{ action: string; params: Record<string, unknown> }>;
				usage: Record<string, unknown> | null;
			}>("run_task", {
				...encodeTarget(target),
				task: input.task,
				model: input.model ?? null,
				max_turns: input.maxTurns ?? null,
			});
			return {
				finalText: result.final_text,
				screenshots: result.screenshots.map((s) => ({
					pngBase64: s.png_b64,
					width: s.width,
					height: s.height,
				})),
				toolCalls: result.tool_calls,
				usage: result.usage,
			};
		},
	};
}

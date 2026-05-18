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

export type Target = { readonly kind: "sandbox"; readonly name: string } | { readonly kind: "localhost" };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function expectRecord(value: unknown, method: string): Record<string, unknown> {
	if (!isRecord(value)) {
		throw new Error(`Invalid cua daemon response for ${method}: expected object`);
	}
	return value;
}

function expectString(value: unknown, method: string, field: string): string {
	if (typeof value !== "string") {
		throw new Error(`Invalid cua daemon response for ${method}: expected string field '${field}'`);
	}
	return value;
}

function expectNumber(value: unknown, method: string, field: string): number {
	if (typeof value !== "number") {
		throw new Error(`Invalid cua daemon response for ${method}: expected number field '${field}'`);
	}
	return value;
}

function isSandboxMode(value: unknown): value is SandboxSummary["mode"] {
	return value === "local" || value === "cloud";
}

function decodePingResult(value: unknown): { ok: boolean; daemonVersion: string } {
	const record = expectRecord(value, "ping");
	if (typeof record["ok"] !== "boolean") {
		throw new Error("Invalid cua daemon response for ping: expected boolean field 'ok'");
	}
	return { ok: record["ok"], daemonVersion: expectString(record["daemon_version"], "ping", "daemon_version") };
}

function decodeStartSandboxResult(value: unknown): { name: string } {
	const record = expectRecord(value, "start_sandbox");
	return { name: expectString(record["name"], "start_sandbox", "name") };
}

function decodeListSandboxesResult(value: unknown): ReadonlyArray<SandboxSummary> {
	const record = expectRecord(value, "list_sandboxes");
	const sandboxes = record["sandboxes"];
	if (!Array.isArray(sandboxes)) {
		throw new Error("Invalid cua daemon response for list_sandboxes: expected array field 'sandboxes'");
	}
	return sandboxes.map((entry) => {
		const sandbox = expectRecord(entry, "list_sandboxes");
		const mode = sandbox["mode"];
		if (!isSandboxMode(mode)) {
			throw new Error("Invalid cua daemon response for list_sandboxes: expected sandbox mode 'local' or 'cloud'");
		}
		return {
			name: expectString(sandbox["name"], "list_sandboxes", "name"),
			mode,
			osType: expectString(sandbox["os_type"], "list_sandboxes", "os_type"),
			status: expectString(sandbox["status"], "list_sandboxes", "status"),
			createdAt: expectNumber(sandbox["created_at"], "list_sandboxes", "created_at"),
		};
	});
}

function decodeScreenshotResult(value: unknown): ScreenshotResult {
	const record = expectRecord(value, "screenshot");
	return {
		pngBase64: expectString(record["png_b64"], "screenshot", "png_b64"),
		width: expectNumber(record["width"], "screenshot", "width"),
		height: expectNumber(record["height"], "screenshot", "height"),
	};
}

function decodeShellResult(value: unknown): ShellResult {
	const record = expectRecord(value, "shell");
	return {
		stdout: expectString(record["stdout"], "shell", "stdout"),
		stderr: expectString(record["stderr"], "shell", "stderr"),
		exitCode: expectNumber(record["exit_code"], "shell", "exit_code"),
	};
}

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
}

export function createCuaClient(daemon: DaemonHandle): CuaClient {
	return {
		async ping() {
			const result = decodePingResult(await daemon.call("ping"));
			return { ok: true as const, daemonVersion: result.daemonVersion };
		},
		async startSandbox(input) {
			const result = decodeStartSandboxResult(
				await daemon.call("start_sandbox", {
					mode: input.mode,
					name: input.name ?? null,
					os: input.os,
					version: input.version ?? null,
					kind: input.kind ?? null,
					runtime: input.runtime ?? null,
					api_key: input.apiKey ?? null,
					region: input.region ?? null,
				}),
			);
			return { name: result.name };
		},
		async stopSandbox(name) {
			await daemon.call("stop_sandbox", { name });
		},
		async listSandboxes() {
			return decodeListSandboxesResult(await daemon.call("list_sandboxes"));
		},
		async screenshot(target) {
			return decodeScreenshotResult(await daemon.call("screenshot", encodeTarget(target)));
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
			return decodeShellResult(
				await daemon.call(
					"shell",
					{ ...encodeTarget(target), command, timeout_ms: options?.timeoutMs ?? null },
					options?.timeoutMs ?? undefined,
				),
			);
		},
	};
}

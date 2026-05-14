import type { ResolvedCuaConfig } from "../config/normalize.js";
import type { ImageOS, Mode } from "../config/schema.js";
import type { CuaClient, Target } from "../cua/client.js";
import { CuaNoActiveSandboxError, CuaSandboxModeError, CuaSandboxNotActiveError, errorMessage } from "../cua/errors.js";

export interface ActiveSandbox {
	readonly name: string;
	readonly mode: "local" | "cloud";
	readonly os: ImageOS;
	readonly createdAt: number;
}

export interface SandboxManagerOptions {
	readonly client: CuaClient;
	readonly config: ResolvedCuaConfig;
	readonly mode: Mode;
	readonly env: NodeJS.ProcessEnv;
	readonly now?: () => number;
}

export class SandboxManager {
	readonly mode: Mode;
	readonly config: ResolvedCuaConfig;
	private readonly client: CuaClient;
	private readonly env: NodeJS.ProcessEnv;
	private readonly now: () => number;
	private readonly active = new Map<string, ActiveSandbox>();
	private defaultSandboxName: string | undefined;

	constructor(options: SandboxManagerOptions) {
		this.client = options.client;
		this.config = options.config;
		this.mode = options.mode;
		this.env = options.env;
		this.now = options.now ?? (() => Date.now());
	}

	getMode(): Mode {
		return this.mode;
	}

	getActiveSandboxes(): ReadonlyArray<ActiveSandbox> {
		return Array.from(this.active.values());
	}

	getDefaultSandbox(): ActiveSandbox | undefined {
		if (this.defaultSandboxName === undefined) return undefined;
		return this.active.get(this.defaultSandboxName);
	}

	resolveTarget(name?: string): Target {
		if (this.mode === "localhost") {
			if (name !== undefined) {
				throw new CuaSandboxModeError(
					"Sandbox name was provided but the current mode is localhost; no sandboxes are tracked.",
				);
			}
			return { kind: "localhost" };
		}
		const explicit = name ?? this.defaultSandboxName;
		if (explicit === undefined) {
			throw new CuaNoActiveSandboxError(
				`No active sandbox; call cua_sandbox_start (mode=${this.mode}) before using control tools.`,
			);
		}
		if (!this.active.has(explicit)) {
			throw new CuaSandboxNotActiveError(`Sandbox '${explicit}' is not active in this session.`);
		}
		return { kind: "sandbox", name: explicit };
	}

	async startSandbox(input: {
		readonly name?: string;
		readonly os?: ImageOS;
		readonly version?: string;
		readonly kind?: "vm" | "container";
		readonly runtime?: "auto" | "docker" | "qemu" | "lume" | "tart";
	}): Promise<ActiveSandbox> {
		if (this.mode === "localhost") {
			throw new CuaSandboxModeError("Cannot start a sandbox in localhost mode.");
		}
		const isCloud = this.mode === "cloud";
		const imageDefaults = isCloud ? this.config.cloud.image : this.config.local.image;
		const os: ImageOS = input.os ?? imageDefaults.os;
		const kind = input.kind ?? imageDefaults.kind;
		const version = input.version ?? imageDefaults.version;
		const apiKey = isCloud ? this.env[this.config.cloud.apiKeyEnv] : undefined;
		const region = isCloud ? this.config.cloud.region : undefined;
		const runtime = isCloud ? undefined : (input.runtime ?? this.config.local.runtime);

		const startInput: Parameters<CuaClient["startSandbox"]>[0] = {
			mode: isCloud ? "cloud" : "local",
			os,
			kind,
		};
		if (input.name !== undefined) startInput.name = input.name;
		if (version !== undefined) startInput.version = version;
		if (runtime !== undefined) startInput.runtime = runtime;
		if (apiKey !== undefined) startInput.apiKey = apiKey;
		if (region !== undefined) startInput.region = region;

		const result = await this.client.startSandbox(startInput);
		const entry: ActiveSandbox = {
			name: result.name,
			mode: isCloud ? "cloud" : "local",
			os,
			createdAt: this.now(),
		};
		this.active.set(result.name, entry);
		if (this.defaultSandboxName === undefined) {
			this.defaultSandboxName = result.name;
		}
		return entry;
	}

	async stopSandbox(name: string): Promise<void> {
		if (!this.active.has(name)) {
			throw new CuaSandboxNotActiveError(`Sandbox '${name}' is not active in this session.`);
		}
		await this.client.stopSandbox(name);
		this.active.delete(name);
		if (this.defaultSandboxName === name) {
			const next = this.active.keys().next();
			this.defaultSandboxName = next.done === true ? undefined : next.value;
		}
	}

	async shutdownAll(): Promise<ReadonlyArray<{ name: string; error?: string }>> {
		const results: { name: string; error?: string }[] = [];
		for (const name of Array.from(this.active.keys())) {
			try {
				await this.client.stopSandbox(name);
				this.active.delete(name);
				results.push({ name });
			} catch (error) {
				results.push({ name, error: errorMessage(error) });
			}
		}
		this.defaultSandboxName = undefined;
		return results;
	}
}

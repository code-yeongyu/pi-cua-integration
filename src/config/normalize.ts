import {
	type CuaConfig,
	DEFAULT_IMAGE_OS,
	DEFAULT_LOCAL_RUNTIME,
	DEFAULT_MODE,
	type ImageOS,
	type LocalRuntime,
	type Mode,
} from "./schema.js";

export interface ResolvedImage {
	readonly os: ImageOS;
	readonly version: string | undefined;
	readonly kind: "vm" | "container";
}

export interface ResolvedLocalConfig {
	readonly runtime: LocalRuntime;
	readonly image: ResolvedImage;
	readonly ephemeral: boolean;
}

export interface ResolvedCloudConfig {
	readonly apiKeyEnv: string;
	readonly image: ResolvedImage;
	readonly region: string | undefined;
}

export interface ResolvedLocalhostConfig {
	readonly confirmDestructive: boolean;
}

export interface ResolvedPythonConfig {
	readonly executable: string;
	readonly startupTimeoutMs: number;
	readonly requestTimeoutMs: number;
}

export interface ResolvedTelemetryConfig {
	readonly enabled: boolean;
}

export interface ResolvedCuaConfig {
	readonly mode: Mode;
	readonly local: ResolvedLocalConfig;
	readonly localhost: ResolvedLocalhostConfig;
	readonly cloud: ResolvedCloudConfig;
	readonly python: ResolvedPythonConfig;
	readonly telemetry: ResolvedTelemetryConfig;
}

const DEFAULT_KIND: ResolvedImage["kind"] = "container";

function resolveImage(
	partial: { os?: ImageOS; version?: string; kind?: "vm" | "container" } | undefined,
): ResolvedImage {
	const os: ImageOS = partial?.os ?? DEFAULT_IMAGE_OS;
	const kind: ResolvedImage["kind"] = partial?.kind ?? DEFAULT_KIND;
	return {
		os,
		version: partial?.version,
		kind,
	};
}

export function normalizeConfig(input: CuaConfig | undefined): ResolvedCuaConfig {
	const mode: Mode = input?.mode ?? DEFAULT_MODE;

	const local: ResolvedLocalConfig = {
		runtime: input?.local?.runtime ?? DEFAULT_LOCAL_RUNTIME,
		image: resolveImage(input?.local?.image),
		ephemeral: input?.local?.ephemeral ?? true,
	};

	const cloud: ResolvedCloudConfig = {
		apiKeyEnv: input?.cloud?.apiKeyEnv ?? "CUA_API_KEY",
		image: resolveImage(input?.cloud?.image),
		region: input?.cloud?.region,
	};

	const localhost: ResolvedLocalhostConfig = {
		confirmDestructive: input?.localhost?.confirmDestructive ?? true,
	};

	const python: ResolvedPythonConfig = {
		executable: input?.python?.executable ?? "python3",
		startupTimeoutMs: input?.python?.startupTimeoutMs ?? 30_000,
		requestTimeoutMs: input?.python?.requestTimeoutMs ?? 60_000,
	};

	const telemetry: ResolvedTelemetryConfig = {
		enabled: input?.telemetry?.enabled ?? false,
	};

	return { mode, local, localhost, cloud, python, telemetry };
}

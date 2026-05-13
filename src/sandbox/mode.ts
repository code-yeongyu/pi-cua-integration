import type { ResolvedCuaConfig } from "../config/normalize.js";
import type { Mode } from "../config/schema.js";

export interface ModeResolution {
	readonly mode: Mode;
	readonly reason: string;
	readonly warnings: ReadonlyArray<string>;
}

export interface ResolveModeInput {
	readonly config: ResolvedCuaConfig;
	readonly env: NodeJS.ProcessEnv;
}

export function resolveMode(input: ResolveModeInput): ModeResolution {
	const warnings: string[] = [];
	const requested = input.config.mode;

	if (requested === "cloud") {
		const envName = input.config.cloud.apiKeyEnv;
		const apiKey = input.env[envName];
		if (apiKey === undefined || apiKey.trim().length === 0) {
			warnings.push(`Cloud mode requested but ${envName} is not set; falling back to local mode.`);
			return {
				mode: "local",
				reason: `cloud_mode_missing_${envName.toLowerCase()}`,
				warnings,
			};
		}
		return { mode: "cloud", reason: "explicit_cloud", warnings };
	}

	if (requested === "localhost") {
		return { mode: "localhost", reason: "explicit_localhost", warnings };
	}

	return { mode: "local", reason: "default_local", warnings };
}

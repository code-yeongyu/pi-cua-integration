import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { CuaConfigValidationError, hasErrorCode } from "../cua/errors.js";
import { normalizeConfig, type ResolvedCuaConfig } from "./normalize.js";
import type { CuaConfig } from "./schema.js";

export const PROJECT_CONFIG_RELATIVE_PATH = ".pi/cua.jsonc";
export const GLOBAL_CONFIG_RELATIVE_PATH = ".pi/cua.json";

export interface LoadConfigOptions {
	readonly cwd?: string;
	readonly home?: string;
	readonly readTextFile?: (absolutePath: string) => Promise<string>;
}

export interface LoadedConfig {
	readonly resolved: ResolvedCuaConfig;
	readonly sources: ReadonlyArray<string>;
	readonly raw: CuaConfig | undefined;
}

async function defaultReader(absolutePath: string): Promise<string> {
	return await readFile(absolutePath, "utf8");
}

async function tryRead(
	absolutePath: string,
	readTextFile: (path: string) => Promise<string>,
): Promise<string | undefined> {
	try {
		return await readTextFile(absolutePath);
	} catch (error) {
		if (hasErrorCode(error, "ENOENT") || hasErrorCode(error, "ENOTDIR")) {
			return undefined;
		}
		throw error;
	}
}

const LINE_COMMENT_RE = /(^|[^:\\])\/\/.*$/gm;
const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g;
const TRAILING_COMMA_RE = /,(\s*[}\]])/g;

export function stripJsonc(input: string): string {
	const noBlock = input.replace(BLOCK_COMMENT_RE, "");
	const noLine = noBlock.replace(LINE_COMMENT_RE, (_match, prefix) => String(prefix));
	return noLine.replace(TRAILING_COMMA_RE, "$1");
}

export function parseJsonc(text: string): unknown {
	const stripped = stripJsonc(text);
	return JSON.parse(stripped);
}

const CUA_CONFIG_KEYS: ReadonlySet<string> = new Set(["mode", "local", "localhost", "cloud", "python", "telemetry"]);

export function isCuaConfig(value: unknown): value is CuaConfig {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	for (const key of Object.keys(value)) {
		if (!CUA_CONFIG_KEYS.has(key)) {
			return false;
		}
	}
	return true;
}

export function mergeConfigs(global: CuaConfig | undefined, project: CuaConfig | undefined): CuaConfig | undefined {
	if (global === undefined && project === undefined) {
		return undefined;
	}
	const base: CuaConfig = global ?? {};
	const override: CuaConfig = project ?? {};
	const merged: CuaConfig = { ...base };
	if (override.mode !== undefined) merged.mode = override.mode;
	if (override.local !== undefined) merged.local = { ...(base.local ?? {}), ...override.local };
	if (override.localhost !== undefined) {
		merged.localhost = { ...(base.localhost ?? {}), ...override.localhost };
	}
	if (override.cloud !== undefined) merged.cloud = { ...(base.cloud ?? {}), ...override.cloud };
	if (override.python !== undefined) merged.python = { ...(base.python ?? {}), ...override.python };
	if (override.telemetry !== undefined) {
		merged.telemetry = { ...(base.telemetry ?? {}), ...override.telemetry };
	}
	return merged;
}

async function loadOne(
	absolutePath: string,
	readTextFile: (path: string) => Promise<string>,
): Promise<{ raw: CuaConfig; source: string } | undefined> {
	const text = await tryRead(absolutePath, readTextFile);
	if (text === undefined) return undefined;
	const parsed = parseJsonc(text);
	if (!isCuaConfig(parsed)) {
		throw new CuaConfigValidationError(`Invalid pi-cua config at ${absolutePath}: unrecognised top-level keys`);
	}
	return { raw: parsed, source: absolutePath };
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig> {
	const cwd = options.cwd ?? process.cwd();
	const home = options.home ?? homedir();
	const readTextFile = options.readTextFile ?? defaultReader;

	const projectPath = resolve(cwd, PROJECT_CONFIG_RELATIVE_PATH);
	const globalPath = resolve(home, GLOBAL_CONFIG_RELATIVE_PATH);

	const [project, global] = await Promise.all([loadOne(projectPath, readTextFile), loadOne(globalPath, readTextFile)]);

	const merged = mergeConfigs(global?.raw, project?.raw);

	const sources: string[] = [];
	if (global !== undefined) sources.push(global.source);
	if (project !== undefined) sources.push(project.source);

	return {
		resolved: normalizeConfig(merged),
		sources,
		raw: merged,
	};
}

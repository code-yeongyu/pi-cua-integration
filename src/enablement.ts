export const PI_CUA_ENABLED_ENV = "PI_CUA_ENABLED";

const TRUTHY_VALUES: ReadonlySet<string> = new Set(["1", "true", "yes", "on"]);

export function isTruthyEnvValue(value: string | undefined): boolean {
	if (value === undefined) {
		return false;
	}
	return TRUTHY_VALUES.has(value.trim().toLowerCase());
}

export function isPiCuaEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	return isTruthyEnvValue(env[PI_CUA_ENABLED_ENV]);
}

export class CuaDaemonExitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CuaDaemonExitError";
	}
}

export class CuaDaemonRpcError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CuaDaemonRpcError";
	}
}

export class CuaDaemonStartupTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CuaDaemonStartupTimeoutError";
	}
}

export class CuaDaemonRequestTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CuaDaemonRequestTimeoutError";
	}
}

export class CuaSandboxModeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CuaSandboxModeError";
	}
}

export class CuaNoActiveSandboxError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CuaNoActiveSandboxError";
	}
}

export class CuaSandboxNotActiveError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CuaSandboxNotActiveError";
	}
}

export class CuaConfigValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CuaConfigValidationError";
	}
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function errorFromUnknown(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export function hasErrorCode(error: unknown, code: string): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

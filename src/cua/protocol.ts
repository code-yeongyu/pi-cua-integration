export interface DaemonRequest {
	readonly id: number;
	readonly method: string;
	readonly params: Record<string, unknown>;
}

export interface DaemonSuccessResponse {
	readonly id: number;
	readonly result: unknown;
	readonly error?: undefined;
}

export interface DaemonErrorResponse {
	readonly id: number;
	readonly result?: undefined;
	readonly error: { readonly code: number; readonly message: string; readonly data?: unknown };
}

export type DaemonResponse = DaemonSuccessResponse | DaemonErrorResponse;

export interface DaemonReadyEvent {
	readonly type: "ready";
	readonly version: string;
	readonly cuaAvailable: boolean;
	readonly cuaVersion: string | null;
	readonly cuaImportError: string | null;
}

export interface DaemonLogEvent {
	readonly type: "log";
	readonly level: "debug" | "info" | "warning" | "error";
	readonly message: string;
}

export type DaemonEvent = DaemonReadyEvent | DaemonLogEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isDaemonError(value: unknown): value is DaemonErrorResponse["error"] {
	return isRecord(value) && typeof value["code"] === "number" && typeof value["message"] === "string";
}

export function isResponse(value: unknown): value is DaemonResponse {
	if (!isRecord(value) || typeof value["id"] !== "number") return false;
	if ("result" in value) return true;
	return isDaemonError(value["error"]);
}

export function isEvent(value: unknown): value is DaemonEvent {
	if (!isRecord(value)) return false;
	const type = value["type"];
	if (type === "ready") {
		return (
			typeof value["version"] === "string" &&
			typeof value["cuaAvailable"] === "boolean" &&
			(typeof value["cuaVersion"] === "string" || value["cuaVersion"] === null) &&
			(typeof value["cuaImportError"] === "string" || value["cuaImportError"] === null)
		);
	}
	if (type === "log") {
		return (
			(value["level"] === "debug" ||
				value["level"] === "info" ||
				value["level"] === "warning" ||
				value["level"] === "error") &&
			typeof value["message"] === "string"
		);
	}
	return false;
}

export function isReadyEvent(value: unknown): value is DaemonReadyEvent {
	return isEvent(value) && value.type === "ready";
}

export function isLogEvent(value: unknown): value is DaemonLogEvent {
	return isEvent(value) && value.type === "log";
}

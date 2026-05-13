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

export function isResponse(value: unknown): value is DaemonResponse {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return typeof record.id === "number";
}

export function isEvent(value: unknown): value is DaemonEvent {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	if (typeof record.type !== "string") return false;
	return record.type === "ready" || record.type === "log";
}

export function isReadyEvent(value: unknown): value is DaemonReadyEvent {
	return isEvent(value) && value.type === "ready";
}

export function isLogEvent(value: unknown): value is DaemonLogEvent {
	return isEvent(value) && value.type === "log";
}

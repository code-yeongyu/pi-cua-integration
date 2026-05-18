import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { EventEmitter } from "node:events";

import {
	CuaDaemonExitError,
	CuaDaemonRequestTimeoutError,
	CuaDaemonRpcError,
	CuaDaemonStartupTimeoutError,
	errorFromUnknown,
} from "./errors.js";
import { type DaemonReadyEvent, type DaemonRequest, isLogEvent, isReadyEvent, isResponse } from "./protocol.js";

export interface DaemonStartOptions {
	readonly pythonExecutable: string;
	readonly daemonScript: string;
	readonly env: NodeJS.ProcessEnv;
	readonly cwd: string;
	readonly startupTimeoutMs: number;
	readonly requestTimeoutMs: number;
	readonly onLog?: (event: { level: string; message: string }) => void;
}

export interface DaemonHandle {
	call(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
	shutdown(): Promise<void>;
	readonly ready: DaemonReadyEvent;
	readonly events: EventEmitter;
}

interface PendingCall {
	readonly resolve: (value: unknown) => void;
	readonly reject: (reason: Error) => void;
	readonly timeoutHandle: NodeJS.Timeout;
}

const NEWLINE = "\n";

function decodeLines(buffer: string, chunk: string): { complete: string[]; remainder: string } {
	const combined = buffer + chunk;
	const parts = combined.split(NEWLINE);
	const remainder = parts.pop() ?? "";
	return { complete: parts, remainder };
}

export async function startDaemon(options: DaemonStartOptions): Promise<DaemonHandle> {
	const child: ChildProcessWithoutNullStreams = spawn(options.pythonExecutable, ["-u", options.daemonScript], {
		cwd: options.cwd,
		env: options.env,
		stdio: ["pipe", "pipe", "pipe"],
	});

	const emitter = new EventEmitter();
	const pending = new Map<number, PendingCall>();
	let nextId = 1;
	let stdoutBuffer = "";
	let exited = false;
	let exitReason: Error | undefined;

	const stderrChunks: string[] = [];
	child.stderr.setEncoding("utf8");
	child.stderr.on("data", (chunk: string) => {
		stderrChunks.push(chunk);
		if (options.onLog !== undefined) {
			options.onLog({ level: "error", message: `[python-stderr] ${chunk.trim()}` });
		}
	});

	function failPending(reason: Error): void {
		for (const [, call] of pending) {
			clearTimeout(call.timeoutHandle);
			call.reject(reason);
		}
		pending.clear();
	}

	child.on("exit", (code, signal) => {
		exited = true;
		const stderr = stderrChunks.join("").trim();
		const detail = stderr.length > 0 ? `: ${stderr}` : "";
		exitReason = new CuaDaemonExitError(`cua python daemon exited (code=${code}, signal=${signal})${detail}`);
		failPending(exitReason);
		emitter.emit("exit", { code, signal, stderr });
	});

	child.on("error", (error) => {
		exitReason = error;
		failPending(error);
		emitter.emit("error", error);
	});

	child.stdout.setEncoding("utf8");
	child.stdout.on("data", (chunk: string) => {
		const { complete, remainder } = decodeLines(stdoutBuffer, chunk);
		stdoutBuffer = remainder;
		for (const line of complete) {
			const trimmed = line.trim();
			if (trimmed.length === 0) continue;
			let parsed: unknown;
			try {
				parsed = JSON.parse(trimmed);
			} catch {
				emitter.emit("malformed", trimmed);
				continue;
			}
			if (isReadyEvent(parsed)) {
				emitter.emit("ready", parsed);
				continue;
			}
			if (isLogEvent(parsed)) {
				emitter.emit("log", parsed);
				if (options.onLog !== undefined) {
					options.onLog({ level: parsed.level, message: parsed.message });
				}
				continue;
			}
			if (isResponse(parsed)) {
				const call = pending.get(parsed.id);
				if (call === undefined) {
					emitter.emit("orphan-response", parsed);
					continue;
				}
				pending.delete(parsed.id);
				clearTimeout(call.timeoutHandle);
				if (parsed.error !== undefined) {
					call.reject(new CuaDaemonRpcError(`[cua daemon ${parsed.error.code}] ${parsed.error.message}`));
				} else {
					call.resolve(parsed.result);
				}
				continue;
			}
			emitter.emit("malformed", parsed);
		}
	});

	function write(payload: object): void {
		const line = `${JSON.stringify(payload)}${NEWLINE}`;
		if (!child.stdin.writable) {
			throw exitReason ?? new Error("cua daemon stdin is not writable");
		}
		child.stdin.write(line);
	}

	const readyPromise = new Promise<DaemonReadyEvent>((resolveReady, rejectReady) => {
		const timeoutHandle = setTimeout(() => {
			rejectReady(
				new CuaDaemonStartupTimeoutError(`cua daemon did not signal ready within ${options.startupTimeoutMs} ms`),
			);
		}, options.startupTimeoutMs);
		emitter.once("ready", (event: DaemonReadyEvent) => {
			clearTimeout(timeoutHandle);
			resolveReady(event);
		});
		emitter.once("exit", () => {
			clearTimeout(timeoutHandle);
			rejectReady(exitReason ?? new Error("cua daemon exited before ready"));
		});
		emitter.once("error", (error: Error) => {
			clearTimeout(timeoutHandle);
			rejectReady(error);
		});
	});

	const resolvedReady = await readyPromise;

	const handle: DaemonHandle = {
		ready: resolvedReady,
		events: emitter,
		async call(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<unknown> {
			if (exited) {
				throw exitReason ?? new Error("cua daemon has exited");
			}
			const id = nextId;
			nextId += 1;
			const effectiveTimeout = timeoutMs ?? options.requestTimeoutMs;
			const request: DaemonRequest = { id, method, params: params ?? {} };
			return await new Promise<unknown>((resolve, reject) => {
				const timeoutHandle = setTimeout(() => {
					if (pending.delete(id)) {
						reject(
							new CuaDaemonRequestTimeoutError(
								`cua daemon call timed out after ${effectiveTimeout} ms: ${method}`,
							),
						);
					}
				}, effectiveTimeout);
				pending.set(id, {
					resolve,
					reject,
					timeoutHandle,
				});
				try {
					write(request);
				} catch (error) {
					pending.delete(id);
					clearTimeout(timeoutHandle);
					reject(errorFromUnknown(error));
				}
			});
		},
		async shutdown(): Promise<void> {
			if (exited) return;
			let shutdownWriteError: Error | undefined;
			try {
				write({ id: 0, method: "shutdown", params: {} });
			} catch (error) {
				shutdownWriteError = errorFromUnknown(error);
			}
			const closed = new Promise<void>((resolveClose) => {
				if (exited) {
					resolveClose();
					return;
				}
				emitter.once("exit", () => resolveClose());
			});
			const killTimeout = setTimeout(() => child.kill("SIGTERM"), 2_000);
			await closed;
			clearTimeout(killTimeout);
			if (shutdownWriteError !== undefined) throw shutdownWriteError;
		},
	};

	return handle;
}

export type { DaemonEvent, DaemonResponse } from "./protocol.js";

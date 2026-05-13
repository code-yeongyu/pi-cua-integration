#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(HERE, "..");
const DAEMON = resolve(ROOT, "python", "daemon.py");

const PYTHON = process.env.PYTHON_EXECUTABLE ?? "python3";

console.log(`[qa] launching daemon: ${PYTHON} ${DAEMON}`);

const child = spawn(PYTHON, ["-u", DAEMON], {
	cwd: ROOT,
	env: { ...process.env, PYTHONUNBUFFERED: "1", CUA_TELEMETRY_ENABLED: "false" },
	stdio: ["pipe", "pipe", "pipe"],
});

let buffer = "";
let nextId = 1;
const pending = new Map();
let readyEvent = null;

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
	buffer += chunk;
	let nl;
	while ((nl = buffer.indexOf("\n")) >= 0) {
		const line = buffer.slice(0, nl).trim();
		buffer = buffer.slice(nl + 1);
		if (line.length === 0) continue;
		let event;
		try {
			event = JSON.parse(line);
		} catch (error) {
			console.error("[qa] malformed line:", line);
			continue;
		}
		if (event.type === "ready") {
			readyEvent = event;
			console.log(`[qa] daemon ready: version=${event.version} cua=${event.cuaAvailable} ${event.cuaVersion ?? "(n/a)"}`);
			if (event.cuaImportError) console.log(`[qa]   cuaImportError: ${event.cuaImportError}`);
			continue;
		}
		if (event.type === "log") {
			console.log(`[qa] daemon log [${event.level}] ${event.message}`);
			continue;
		}
		if (typeof event.id === "number") {
			const pendingCall = pending.get(event.id);
			if (pendingCall === undefined) {
				console.log(`[qa] orphan response`, event);
				continue;
			}
			pending.delete(event.id);
			pendingCall(event);
			continue;
		}
		console.log("[qa] unrecognized event:", event);
	}
});

child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
	process.stderr.write(`[qa stderr] ${chunk}`);
});

child.on("exit", (code, signal) => {
	console.log(`[qa] daemon exited code=${code} signal=${signal}`);
});

async function waitForReady(timeoutMs = 10_000) {
	const start = Date.now();
	while (readyEvent === null) {
		if (Date.now() - start > timeoutMs) throw new Error("daemon did not signal ready");
		await delay(50);
	}
}

async function call(method, params = {}, timeoutMs = 10_000) {
	const id = nextId++;
	const promise = new Promise((resolve_, reject_) => {
		const timeout = setTimeout(() => {
			pending.delete(id);
			reject_(new Error(`timeout calling ${method}`));
		}, timeoutMs);
		pending.set(id, (event) => {
			clearTimeout(timeout);
			if (event.error) reject_(new Error(`${event.error.code}: ${event.error.message}`));
			else resolve_(event.result);
		});
	});
	const payload = `${JSON.stringify({ id, method, params })}\n`;
	child.stdin.write(payload);
	return promise;
}

(async () => {
	try {
		await waitForReady();
		const pingResult = await call("ping");
		console.log(`[qa] ping ok: ${JSON.stringify(pingResult)}`);

		const listResult = await call("list_sandboxes");
		console.log(`[qa] list_sandboxes ok: ${JSON.stringify(listResult)}`);

		try {
			const startResult = await call("start_sandbox", {
				mode: "local",
				os: "linux",
				kind: "container",
			});
			console.log(`[qa] start_sandbox ok: ${JSON.stringify(startResult)}`);
		} catch (error) {
			console.log(`[qa] start_sandbox failed (expected without cua + docker): ${error.message}`);
		}

		const stopResult = await call("shutdown");
		console.log(`[qa] shutdown ack: ${JSON.stringify(stopResult)}`);
	} catch (error) {
		console.error("[qa] FATAL", error);
		process.exitCode = 1;
	} finally {
		setTimeout(() => {
			if (!child.killed) child.kill("SIGTERM");
			process.exit(process.exitCode ?? 0);
		}, 2_000);
	}
})();

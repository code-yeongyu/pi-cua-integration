import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const daemonPath = fileURLToPath(new URL("../../python/daemon.py", import.meta.url));
const pythonExecutable = process.env.PI_CUA_PYTHON ?? "python3";

async function runPythonSnippet(source: string): Promise<unknown> {
	const result = await execFileAsync(pythonExecutable, ["-c", source], {
		env: { ...process.env, PI_CUA_DAEMON_PATH: daemonPath },
		encoding: "utf8",
		maxBuffer: 1024 * 1024,
	});
	const stderr = String(result.stderr).trim();
	if (stderr.length > 0) {
		throw new Error(stderr);
	}
	return JSON.parse(String(result.stdout));
}

describe("python daemon control handlers", () => {
	it("#given PNG bytes screenshot #when handled #then returns real image dimensions", async () => {
		// given
		const source = `
import asyncio
import base64
import importlib.util
import json
import os

spec = importlib.util.spec_from_file_location("daemon_under_test", os.environ["PI_CUA_DAEMON_PATH"])
daemon = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(daemon)

png_bytes = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACddGYaAAAADElEQVR42mP8z8AARAAA//8C/AL+XkD6fgAAAABJRU5ErkJggg==")

class FakeTarget:
	async def screenshot(self):
		return png_bytes

class TestDaemon(daemon.Daemon):
	async def _resolve_target(self, params):
		return FakeTarget()

async def main():
	result = await TestDaemon().handle_screenshot({})
	print(json.dumps({"width": result["width"], "height": result["height"], "has_png": bool(result["png_b64"])}))

asyncio.run(main())
`;
		// when
		const result = await runPythonSnippet(source);
		// then
		expect(result).toEqual({ width: 1, height: 2, has_png: true });
	});
});

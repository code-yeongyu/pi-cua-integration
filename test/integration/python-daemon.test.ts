import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const daemonPath = fileURLToPath(new URL("../../python/daemon.py", import.meta.url));
const pythonExecutable = process.env["PI_CUA_PYTHON"] ?? "python3";

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

	it("#given key chord string #when handled #then modifiers are held with the action key", async () => {
		// given
		const source = `
import asyncio
import importlib.util
import json
import os

spec = importlib.util.spec_from_file_location("daemon_under_test", os.environ["PI_CUA_DAEMON_PATH"])
daemon = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(daemon)

class FakeKeyboard:
	def __init__(self):
		self.calls = []

	async def keypress(self, keys):
		self.calls.append(keys)

class FakeTarget:
	def __init__(self):
		self.keyboard = FakeKeyboard()

target = FakeTarget()

class TestDaemon(daemon.Daemon):
	async def _resolve_target(self, params):
		return target

async def main():
	test_daemon = TestDaemon()
	await test_daemon.handle_key({"keys": "cmd+s"})
	await test_daemon.handle_key({"keys": ["ctrl+a", "return"]})
	print(json.dumps(target.keyboard.calls))

asyncio.run(main())
`;
		// when
		const result = await runPythonSnippet(source);
		// then
		expect(result).toEqual([["cmd", "s"], ["ctrl", "a"], ["return"]]);
	});

	it("#given two left clicks #when handled #then emits a native double-click", async () => {
		// given
		const source = `
import asyncio
import importlib.util
import json
import os

spec = importlib.util.spec_from_file_location("daemon_under_test", os.environ["PI_CUA_DAEMON_PATH"])
daemon = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(daemon)

class FakeMouse:
	def __init__(self):
		self.calls = []

	async def click(self, x, y, button="left"):
		self.calls.append(["click", x, y, button])

	async def double_click(self, x, y):
		self.calls.append(["double_click", x, y])

class FakeTarget:
	def __init__(self):
		self.mouse = FakeMouse()

target = FakeTarget()

class TestDaemon(daemon.Daemon):
	async def _resolve_target(self, params):
		return target

async def main():
	await TestDaemon().handle_click({"x": 10, "y": 20, "button": "left", "clicks": 2})
	print(json.dumps(target.mouse.calls))

asyncio.run(main())
`;
		// when
		const result = await runPythonSnippet(source);
		// then
		expect(result).toEqual([["double_click", 10, 20]]);
	});

	it("#given dx and dy scroll aliases #when handled #then forwards wheel deltas", async () => {
		// given
		const source = `
import asyncio
import importlib.util
import json
import os

spec = importlib.util.spec_from_file_location("daemon_under_test", os.environ["PI_CUA_DAEMON_PATH"])
daemon = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(daemon)

class FakeMouse:
	def __init__(self):
		self.calls = []

	async def scroll(self, x, y, scroll_x, scroll_y):
		self.calls.append([x, y, scroll_x, scroll_y])

class FakeTarget:
	def __init__(self):
		self.mouse = FakeMouse()

target = FakeTarget()

class TestDaemon(daemon.Daemon):
	async def _resolve_target(self, params):
		return target

async def main():
	await TestDaemon().handle_scroll({"x": 100, "y": 200, "dx": 1, "dy": -3})
	print(json.dumps(target.mouse.calls))

asyncio.run(main())
`;
		// when
		const result = await runPythonSnippet(source);
		// then
		expect(result).toEqual([[100, 200, 1, -3]]);
	});
});

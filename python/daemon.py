#!/usr/bin/env python3
"""pi-cua-integration daemon.

Speaks newline-delimited JSON-RPC on stdin/stdout. Each request is a JSON
object with id (number), method (string), params (object). Each response is
either {id, result} or {id, error: {code, message}}.

Startup emits a single {type: "ready", version, cua_available, cua_version,
cua_import_error} event.

This daemon depends on the cua Python package for sandbox/agent control
when in use. When cua is missing the daemon still starts and reports the
import error in the ready event so the TypeScript side can warn cleanly.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import sys
import traceback
from typing import Any

DAEMON_VERSION = "0.1.0"


def _emit(event: dict[str, Any]) -> None:
	sys.stdout.write(json.dumps(event, separators=(",", ":"), ensure_ascii=False))
	sys.stdout.write("\n")
	sys.stdout.flush()


def _log(level: str, message: str) -> None:
	_emit({"type": "log", "level": level, "message": message})


try:
	import cua  # noqa: F401
	from cua import Sandbox, Image, Localhost, ComputerAgent

	_CUA_AVAILABLE = True
	_CUA_VERSION = getattr(cua, "__version__", None)
	_CUA_IMPORT_ERROR: str | None = None
except Exception as error:  # noqa: BLE001
	Sandbox = None  # type: ignore[assignment]
	Image = None  # type: ignore[assignment]
	Localhost = None  # type: ignore[assignment]
	ComputerAgent = None  # type: ignore[assignment]
	_CUA_AVAILABLE = False
	_CUA_VERSION = None
	_CUA_IMPORT_ERROR = f"{type(error).__name__}: {error}"


class CuaUnavailableError(RuntimeError):
	"""Raised when a request requires cua but the package is not importable."""


def _require_cua() -> None:
	if not _CUA_AVAILABLE:
		raise CuaUnavailableError(
			f"cua Python package is not installed: {_CUA_IMPORT_ERROR}. Install with 'pip install cua'."
		)


def _image_from_params(params: dict[str, Any]) -> Any:
	_require_cua()
	os_type = params.get("os") or "linux"
	version = params.get("version")
	kind = params.get("kind") or "container"
	if os_type == "linux":
		image = Image.linux()
	elif os_type == "macos":
		image = Image.macos()
	elif os_type == "windows":
		image = Image.windows()
	elif os_type == "android":
		image = Image.android()
	else:
		raise ValueError(f"Unsupported os: {os_type}")
	if version is not None and hasattr(image, "version"):
		try:
			image = image.version(version)
		except Exception:  # noqa: BLE001
			# Image.linux().version() may not exist in some cua releases; ignore
			pass
	if hasattr(image, "kind") and kind in {"vm", "container"}:
		try:
			image = image.kind(kind)
		except Exception:  # noqa: BLE001
			pass
	return image


def _runtime_from_name(name: str | None) -> Any:
	if name is None or name == "auto":
		return None
	from cua_sandbox import runtime as cua_runtime

	mapping = {
		"docker": getattr(cua_runtime, "DockerRuntime", None),
		"qemu": getattr(cua_runtime, "QEMURuntime", None),
		"lume": getattr(cua_runtime, "LumeRuntime", None),
		"tart": getattr(cua_runtime, "TartRuntime", None),
	}
	cls = mapping.get(name)
	if cls is None:
		raise ValueError(f"Unsupported runtime: {name}")
	return cls()


class Daemon:
	def __init__(self) -> None:
		self._sandboxes: dict[str, Any] = {}
		self._localhost: Any | None = None
		self._sandbox_meta: dict[str, dict[str, Any]] = {}
		self._lock: asyncio.Lock | None = None
		self._stop: asyncio.Event | None = None

	def _ensure_async_primitives(self) -> None:
		if self._lock is None:
			self._lock = asyncio.Lock()
		if self._stop is None:
			self._stop = asyncio.Event()

	async def _get_localhost(self) -> Any:
		_require_cua()
		if self._localhost is None:
			assert Localhost is not None
			self._localhost = await Localhost.connect()
		return self._localhost

	async def _resolve_target(self, params: dict[str, Any]) -> Any:
		kind = params.get("target_kind")
		if kind == "localhost":
			return await self._get_localhost()
		if kind == "sandbox":
			name = params.get("target_name")
			if not isinstance(name, str):
				raise ValueError("Sandbox target requires target_name (string).")
			sandbox = self._sandboxes.get(name)
			if sandbox is None:
				raise ValueError(f"Sandbox '{name}' is not active.")
			return sandbox
		raise ValueError(f"Unknown target_kind: {kind!r}")

	async def handle_ping(self, _params: dict[str, Any]) -> dict[str, Any]:
		return {"ok": True, "daemon_version": DAEMON_VERSION}

	async def handle_start_sandbox(self, params: dict[str, Any]) -> dict[str, Any]:
		_require_cua()
		mode = params.get("mode")
		if mode not in {"local", "cloud"}:
			raise ValueError(f"start_sandbox requires mode in {{local, cloud}}, got {mode!r}")
		os_type = params.get("os") or "linux"
		name = params.get("name")
		image = _image_from_params(params)
		assert Sandbox is not None
		create_kwargs: dict[str, Any] = {}
		if name is not None:
			create_kwargs["name"] = name
		if mode == "local":
			create_kwargs["local"] = True
			runtime = _runtime_from_name(params.get("runtime"))
			if runtime is not None:
				create_kwargs["runtime"] = runtime
		else:
			api_key = params.get("api_key")
			if api_key is not None:
				create_kwargs["api_key"] = api_key
			region = params.get("region")
			if region is not None:
				create_kwargs["region"] = region
		sandbox = await Sandbox.create(image, **create_kwargs)
		resolved_name = getattr(sandbox, "name", None) or name or f"sb-{len(self._sandboxes) + 1}"
		self._sandboxes[resolved_name] = sandbox
		self._sandbox_meta[resolved_name] = {
			"mode": mode,
			"os_type": os_type,
			"created_at": asyncio.get_running_loop().time(),
		}
		return {"name": resolved_name}

	async def handle_stop_sandbox(self, params: dict[str, Any]) -> dict[str, Any]:
		_require_cua()
		name = params.get("name")
		if not isinstance(name, str):
			raise ValueError("stop_sandbox requires name (string).")
		sandbox = self._sandboxes.pop(name, None)
		self._sandbox_meta.pop(name, None)
		if sandbox is None:
			raise ValueError(f"Sandbox '{name}' is not active.")
		try:
			await sandbox.destroy()
		except Exception as error:  # noqa: BLE001
			# Some cua versions only support disconnect()
			try:
				await sandbox.disconnect()
			except Exception:  # noqa: BLE001
				raise error
		return {"ok": True}

	async def handle_list_sandboxes(self, _params: dict[str, Any]) -> dict[str, Any]:
		entries: list[dict[str, Any]] = []
		for name, sandbox in self._sandboxes.items():
			meta = self._sandbox_meta.get(name, {})
			entries.append(
				{
					"name": name,
					"mode": meta.get("mode", "local"),
					"os_type": meta.get("os_type", "linux"),
					"status": getattr(sandbox, "status", "running") if hasattr(sandbox, "status") else "running",
					"created_at": meta.get("created_at", 0),
				}
			)
		return {"sandboxes": entries}

	async def handle_screenshot(self, params: dict[str, Any]) -> dict[str, Any]:
		target = await self._resolve_target(params)
		raw = await target.screenshot()
		if isinstance(raw, bytes):
			png_bytes = raw
		elif isinstance(raw, str):
			png_bytes = base64.b64decode(raw)
		elif hasattr(raw, "save"):
			buffer = io.BytesIO()
			raw.save(buffer, format="PNG")
			png_bytes = buffer.getvalue()
		elif isinstance(raw, dict) and "data" in raw:
			data = raw["data"]
			png_bytes = base64.b64decode(data) if isinstance(data, str) else bytes(data)
		else:
			raise TypeError(f"Unsupported screenshot return type: {type(raw).__name__}")
		width = getattr(raw, "width", 0) if not isinstance(raw, (bytes, str, dict)) else 0
		height = getattr(raw, "height", 0) if not isinstance(raw, (bytes, str, dict)) else 0
		return {
			"png_b64": base64.b64encode(png_bytes).decode("ascii"),
			"width": int(width or 0),
			"height": int(height or 0),
		}

	async def handle_click(self, params: dict[str, Any]) -> dict[str, Any]:
		target = await self._resolve_target(params)
		x = int(params["x"])
		y = int(params["y"])
		button = params.get("button", "left")
		clicks = int(params.get("clicks", 1))
		mouse = getattr(target, "mouse", None)
		if mouse is None:
			raise RuntimeError("Target has no .mouse interface")
		for _ in range(clicks):
			if button == "right":
				await mouse.right_click(x, y) if hasattr(mouse, "right_click") else await mouse.click(x, y, button="right")
			elif button == "middle":
				await mouse.middle_click(x, y) if hasattr(mouse, "middle_click") else await mouse.click(x, y, button="middle")
			else:
				await mouse.click(x, y) if hasattr(mouse, "click") else await mouse.left_click(x, y)
		return {"ok": True}

	async def handle_type(self, params: dict[str, Any]) -> dict[str, Any]:
		target = await self._resolve_target(params)
		text = str(params["text"])
		keyboard = getattr(target, "keyboard", None)
		if keyboard is None:
			raise RuntimeError("Target has no .keyboard interface")
		await keyboard.type(text)
		return {"ok": True}

	async def handle_key(self, params: dict[str, Any]) -> dict[str, Any]:
		target = await self._resolve_target(params)
		keys = params["keys"]
		keyboard = getattr(target, "keyboard", None)
		if keyboard is None:
			raise RuntimeError("Target has no .keyboard interface")
		chords = keys if isinstance(keys, list) else [keys]
		for chord in chords:
			await keyboard.press(str(chord))
		return {"ok": True}

	async def handle_scroll(self, params: dict[str, Any]) -> dict[str, Any]:
		target = await self._resolve_target(params)
		x = int(params["x"])
		y = int(params["y"])
		scroll_x = int(params.get("scroll_x", 0))
		scroll_y = int(params.get("scroll_y", 0))
		mouse = getattr(target, "mouse", None)
		if mouse is None or not hasattr(mouse, "scroll"):
			raise RuntimeError("Target has no .mouse.scroll method")
		await mouse.scroll(x, y, scroll_x, scroll_y)
		return {"ok": True}

	async def handle_shell(self, params: dict[str, Any]) -> dict[str, Any]:
		target = await self._resolve_target(params)
		command = str(params["command"])
		shell = getattr(target, "shell", None)
		if shell is None or not hasattr(shell, "run"):
			raise RuntimeError("Target has no .shell.run method")
		timeout_ms = params.get("timeout_ms")
		kwargs: dict[str, Any] = {}
		if timeout_ms is not None:
			kwargs["timeout"] = int(timeout_ms) / 1000.0
		result = await shell.run(command, **kwargs)
		stdout = getattr(result, "stdout", "") or ""
		stderr = getattr(result, "stderr", "") or ""
		exit_code = int(getattr(result, "exit_code", getattr(result, "returncode", 0)))
		return {"stdout": stdout, "stderr": stderr, "exit_code": exit_code}

	async def handle_run_task(self, params: dict[str, Any]) -> dict[str, Any]:
		_require_cua()
		if ComputerAgent is None:
			raise RuntimeError("ComputerAgent is not importable from cua")
		target = await self._resolve_target(params)
		task = str(params["task"])
		model = params.get("model") or "anthropic/claude-sonnet-4-5"
		max_turns = params.get("max_turns")
		agent_kwargs: dict[str, Any] = {"model": model, "tools": [target]}
		if max_turns is not None:
			agent_kwargs["max_trajectory_budget"] = {"max_turns": int(max_turns)}
		agent = ComputerAgent(**agent_kwargs)
		final_text_parts: list[str] = []
		screenshots: list[dict[str, Any]] = []
		tool_calls: list[dict[str, Any]] = []
		usage: dict[str, Any] | None = None
		messages = [{"role": "user", "content": task}]
		async for result in agent.run(messages):
			output = result.get("output") if isinstance(result, dict) else None
			if not output:
				continue
			for item in output:
				if not isinstance(item, dict):
					continue
				item_type = item.get("type")
				if item_type == "message":
					content = item.get("content", [])
					for block in content:
						if isinstance(block, dict) and block.get("type") == "output_text":
							final_text_parts.append(str(block.get("text", "")))
						elif isinstance(block, dict) and block.get("type") == "text":
							final_text_parts.append(str(block.get("text", "")))
				elif item_type == "computer_call":
					action = item.get("action") or item.get("name") or "unknown"
					tool_calls.append({"action": str(action), "params": dict(item)})
				elif item_type == "computer_call_output":
					out = item.get("output", {})
					if isinstance(out, dict):
						url = out.get("image_url") or out.get("data")
						if isinstance(url, str) and url.startswith("data:image/png;base64,"):
							b64 = url.split(",", 1)[1]
							screenshots.append({"png_b64": b64, "width": 0, "height": 0})
				usage_block = item.get("usage") if isinstance(item, dict) else None
				if isinstance(usage_block, dict):
					usage = usage_block
		return {
			"final_text": "\n\n".join(part for part in final_text_parts if part),
			"screenshots": screenshots,
			"tool_calls": tool_calls,
			"usage": usage,
		}

	async def handle_shutdown(self, _params: dict[str, Any]) -> dict[str, Any]:
		for name in list(self._sandboxes.keys()):
			try:
				await self.handle_stop_sandbox({"name": name})
			except Exception as error:  # noqa: BLE001
				_log("warning", f"Failed to stop sandbox '{name}' on shutdown: {error}")
		if self._localhost is not None:
			try:
				await self._localhost.disconnect()
			except Exception as error:  # noqa: BLE001
				_log("warning", f"Failed to disconnect localhost on shutdown: {error}")
		if self._stop is not None:
			self._stop.set()
		return {"ok": True}

	async def dispatch(self, request: dict[str, Any]) -> dict[str, Any]:
		method = request.get("method")
		params = request.get("params") or {}
		handler_name = f"handle_{method}"
		handler = getattr(self, handler_name, None)
		if handler is None:
			raise ValueError(f"Unknown method: {method!r}")
		assert self._lock is not None
		async with self._lock:
			return await handler(params)

	async def run(self) -> None:
		self._ensure_async_primitives()
		_emit(
			{
				"type": "ready",
				"version": DAEMON_VERSION,
				"cuaAvailable": _CUA_AVAILABLE,
				"cuaVersion": _CUA_VERSION,
				"cuaImportError": _CUA_IMPORT_ERROR,
			}
		)
		loop = asyncio.get_running_loop()
		reader = asyncio.StreamReader(loop=loop)
		protocol = asyncio.StreamReaderProtocol(reader)
		await loop.connect_read_pipe(lambda: protocol, sys.stdin)
		assert self._stop is not None
		while not self._stop.is_set():
			line = await reader.readline()
			if not line:
				break
			text = line.decode("utf-8", errors="replace").strip()
			if not text:
				continue
			try:
				request = json.loads(text)
			except json.JSONDecodeError as error:
				_emit(
					{
						"id": 0,
						"error": {
							"code": -32700,
							"message": f"Parse error: {error}",
						},
					}
				)
				continue
			request_id = request.get("id", 0)
			if request.get("method") == "shutdown":
				_emit({"id": request_id, "result": {"ok": True}})
				try:
					await self.handle_shutdown({})
				except Exception:  # noqa: BLE001
					pass
				break
			asyncio.create_task(self._handle_request(request_id, request))

	async def _handle_request(self, request_id: int, request: dict[str, Any]) -> None:
		try:
			result = await self.dispatch(request)
			_emit({"id": request_id, "result": result})
		except CuaUnavailableError as error:
			_emit({"id": request_id, "error": {"code": -32001, "message": str(error)}})
		except ValueError as error:
			_emit({"id": request_id, "error": {"code": -32602, "message": str(error)}})
		except Exception as error:  # noqa: BLE001
			_emit(
				{
					"id": request_id,
					"error": {
						"code": -32603,
						"message": f"{type(error).__name__}: {error}",
						"data": traceback.format_exc(),
					},
				}
			)


def main() -> None:
	asyncio.run(Daemon().run())


if __name__ == "__main__":
	main()

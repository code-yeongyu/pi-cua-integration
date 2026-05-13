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

import asyncio  # noqa: ANYIO_OK
import base64
import importlib
import inspect
import io
import json
import struct
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


def _png_dimensions(png_bytes: bytes) -> tuple[int, int]:
	if len(png_bytes) < 24 or not png_bytes.startswith(b"\x89PNG\r\n\x1a\n") or png_bytes[12:16] != b"IHDR":
		raise ValueError("Screenshot bytes are not a PNG image.")
	width, height = struct.unpack(">II", png_bytes[16:24])
	return int(width), int(height)


def _split_key_chord(chord: str) -> list[str]:
	parts = [part.strip() for part in chord.split("+") if part.strip()]
	if not parts:
		raise ValueError("Key chord must contain at least one key.")
	return parts


async def _maybe_await(value: Any) -> Any:
	if inspect.isawaitable(value):
		return await value
	return value


def _load_cua() -> tuple[Any, Any, Any, Any, bool, str | None, str | None]:
	try:
		cua_module = importlib.import_module("cua")
		return (
			cua_module,
			getattr(cua_module, "Sandbox"),
			getattr(cua_module, "Image"),
			getattr(cua_module, "Localhost"),
			True,
			getattr(cua_module, "__version__", None),
			None,
		)
	except Exception as error:  # noqa: BLE001
		return None, None, None, None, False, None, f"{type(error).__name__}: {error}"


cua, Sandbox, Image, Localhost, _CUA_AVAILABLE, _CUA_VERSION, _CUA_IMPORT_ERROR = _load_cua()


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
		except Exception as error:  # noqa: BLE001
			# Image.linux().version() may not exist in some cua releases; ignore
			_log("debug", f"Ignoring unsupported image version {version!r}: {type(error).__name__}: {error}")
	if hasattr(image, "kind") and kind in {"vm", "container"}:
		try:
			image = image.kind(kind)
		except Exception as error:  # noqa: BLE001
			_log("debug", f"Ignoring unsupported image kind {kind!r}: {type(error).__name__}: {error}")
	return image


def _runtime_from_name(name: str | None) -> Any:
	if name is None or name == "auto":
		return None
	cua_runtime = importlib.import_module("cua_sandbox.runtime")

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
		if not width or not height:
			width, height = _png_dimensions(png_bytes)
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
		if button == "left" and clicks == 2 and hasattr(mouse, "double_click"):
			await _maybe_await(mouse.double_click(x, y))
			return {"ok": True}
		for _ in range(clicks):
			if button == "right":
				if hasattr(mouse, "right_click"):
					await _maybe_await(mouse.right_click(x, y))
				else:
					await _maybe_await(mouse.click(x, y, button="right"))
			elif button == "middle":
				if hasattr(mouse, "middle_click"):
					await _maybe_await(mouse.middle_click(x, y))
				else:
					await _maybe_await(mouse.click(x, y, button="middle"))
			else:
				if hasattr(mouse, "click"):
					await _maybe_await(mouse.click(x, y))
				else:
					await _maybe_await(mouse.left_click(x, y))
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
			parts = _split_key_chord(str(chord))
			if hasattr(keyboard, "keypress"):
				await _maybe_await(keyboard.keypress(parts))
			elif hasattr(keyboard, "hotkey"):
				await _maybe_await(keyboard.hotkey(parts))
			elif hasattr(keyboard, "press"):
				if len(parts) != 1:
					raise RuntimeError("Target keyboard cannot press multi-key chords.")
				await _maybe_await(keyboard.press(parts[0]))
			else:
				raise RuntimeError("Target has no supported keyboard press method")
		return {"ok": True}

	async def handle_scroll(self, params: dict[str, Any]) -> dict[str, Any]:
		target = await self._resolve_target(params)
		x = int(params["x"])
		y = int(params["y"])
		scroll_x = int(params.get("scroll_x", params.get("dx", 0)))
		scroll_y = int(params.get("scroll_y", params.get("dy", 0)))
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
				except Exception as error:  # noqa: BLE001
					_log("warning", f"Failed to finish shutdown: {type(error).__name__}: {error}")
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

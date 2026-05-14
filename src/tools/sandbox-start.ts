import { type Static, Type } from "typebox";

import { CuaSandboxModeError } from "../cua/errors.js";
import { defineTool, type ToolDefinition } from "../pi/index.js";
import type { SandboxManager } from "../sandbox/manager.js";
import { textResult } from "./result.js";

export const SandboxStartParams = Type.Object(
	{
		name: Type.Optional(
			Type.String({
				description:
					"Optional sandbox name. When omitted Cua generates one. Reuse the name to reconnect to a persistent sandbox.",
			}),
		),
		os: Type.Optional(
			Type.Union([Type.Literal("linux"), Type.Literal("macos"), Type.Literal("windows"), Type.Literal("android")], {
				description: "Guest OS for the sandbox image.",
			}),
		),
		version: Type.Optional(Type.String({ description: "Distro/OS version tag, e.g. '24.04' or 'sequoia'." })),
		kind: Type.Optional(
			Type.Union([Type.Literal("vm"), Type.Literal("container")], {
				description: "container is a XFCE/Kasm Docker image (fast, Linux only). vm is QEMU/Lume (full VM).",
			}),
		),
		runtime: Type.Optional(
			Type.Union(
				[
					Type.Literal("auto"),
					Type.Literal("docker"),
					Type.Literal("qemu"),
					Type.Literal("lume"),
					Type.Literal("tart"),
				],
				{ description: "Local runtime override. Ignored in cloud mode." },
			),
		),
	},
	{ additionalProperties: false },
);

export type SandboxStartInput = Static<typeof SandboxStartParams>;

export function createSandboxStartTool(manager: SandboxManager): ToolDefinition {
	return defineTool({
		name: "cua_sandbox_start",
		label: "Cua: start sandbox",
		description:
			"Start (or reconnect to) a Cua sandbox in the configured mode. Cannot be used in localhost mode. Returns the sandbox name to use in subsequent control tools.",
		parameters: SandboxStartParams,
		async execute(_toolCallId, params) {
			if (manager.getMode() === "localhost") {
				throw new CuaSandboxModeError(
					"cua_sandbox_start is not available in localhost mode; use the control tools directly against the host.",
				);
			}
			const startInput: {
				name?: string;
				os?: "linux" | "macos" | "windows" | "android";
				version?: string;
				kind?: "vm" | "container";
				runtime?: "auto" | "docker" | "qemu" | "lume" | "tart";
			} = {};
			if (params.name !== undefined) startInput.name = params.name;
			if (params.os !== undefined) startInput.os = params.os;
			if (params.version !== undefined) startInput.version = params.version;
			if (params.kind !== undefined) startInput.kind = params.kind;
			if (params.runtime !== undefined) startInput.runtime = params.runtime;
			const entry = await manager.startSandbox(startInput);
			return textResult(
				`Started ${entry.mode} sandbox '${entry.name}' (${entry.os}). Use this name when calling other cua_* tools.`,
			);
		},
	});
}

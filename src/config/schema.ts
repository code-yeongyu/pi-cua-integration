import { type Static, Type } from "typebox";

export const ModeSchema = Type.Union([Type.Literal("local"), Type.Literal("localhost"), Type.Literal("cloud")], {
	description: "Top-level mode selector. Local sandbox is the default.",
});

export type Mode = Static<typeof ModeSchema>;
export const ALL_MODES: ReadonlyArray<Mode> = ["local", "localhost", "cloud"];
export const DEFAULT_MODE: Mode = "local";

export const LocalRuntimeSchema = Type.Union(
	[Type.Literal("auto"), Type.Literal("docker"), Type.Literal("qemu"), Type.Literal("lume"), Type.Literal("tart")],
	{
		description:
			"Local runtime for sandbox mode. 'auto' lets Cua pick based on the image OS type. macOS images default to Lume, others to Docker/QEMU.",
	},
);

export type LocalRuntime = Static<typeof LocalRuntimeSchema>;
export const DEFAULT_LOCAL_RUNTIME: LocalRuntime = "auto";

export const ImageOSSchema = Type.Union(
	[Type.Literal("linux"), Type.Literal("macos"), Type.Literal("windows"), Type.Literal("android")],
	{ description: "Guest OS for the sandbox image." },
);

export type ImageOS = Static<typeof ImageOSSchema>;
export const DEFAULT_IMAGE_OS: ImageOS = "linux";

export const LocalConfigSchema = Type.Object(
	{
		runtime: Type.Optional(LocalRuntimeSchema),
		image: Type.Optional(
			Type.Object(
				{
					os: Type.Optional(ImageOSSchema),
					version: Type.Optional(Type.String({ description: "Distro version or OS version tag." })),
					kind: Type.Optional(
						Type.Union([Type.Literal("vm"), Type.Literal("container")], {
							description: "Container is XFCE/Kasm Docker, vm is QEMU/Lume.",
						}),
					),
				},
				{ additionalProperties: false },
			),
		),
		ephemeral: Type.Optional(
			Type.Boolean({
				description: "Destroy the sandbox on session shutdown. Default true for local mode.",
			}),
		),
	},
	{ additionalProperties: false, description: "Local mode (Docker/QEMU/Lume) settings." },
);

export type LocalConfig = Static<typeof LocalConfigSchema>;

export const CloudConfigSchema = Type.Object(
	{
		apiKeyEnv: Type.Optional(
			Type.String({
				description: "Environment variable name to read the Cua API key from. Default CUA_API_KEY.",
				default: "CUA_API_KEY",
			}),
		),
		image: Type.Optional(
			Type.Object(
				{
					os: Type.Optional(ImageOSSchema),
					version: Type.Optional(Type.String()),
				},
				{ additionalProperties: false },
			),
		),
		region: Type.Optional(Type.String({ description: "Cua cloud region, e.g. 'north-america'." })),
	},
	{ additionalProperties: false, description: "Cloud mode (cua.ai) settings." },
);

export type CloudConfig = Static<typeof CloudConfigSchema>;

export const LocalhostConfigSchema = Type.Object(
	{
		confirmDestructive: Type.Optional(
			Type.Boolean({
				description: "When true, destructive shell commands prompt the user before execution. Default true.",
			}),
		),
	},
	{ additionalProperties: false, description: "Localhost (unsandboxed) mode settings." },
);

export type LocalhostConfig = Static<typeof LocalhostConfigSchema>;

export const PythonConfigSchema = Type.Object(
	{
		executable: Type.Optional(
			Type.String({
				description: "Python interpreter for the Cua daemon. Default 'python3'.",
				default: "python3",
			}),
		),
		startupTimeoutMs: Type.Optional(
			Type.Integer({
				description: "Milliseconds to wait for the daemon to send its ready handshake.",
				minimum: 100,
				default: 30_000,
			}),
		),
		requestTimeoutMs: Type.Optional(
			Type.Integer({
				description: "Default per-request timeout when calling the daemon.",
				minimum: 100,
				default: 60_000,
			}),
		),
	},
	{ additionalProperties: false, description: "Python daemon process settings." },
);

export type PythonConfig = Static<typeof PythonConfigSchema>;

export const CuaConfigSchema = Type.Object(
	{
		mode: Type.Optional(ModeSchema),
		local: Type.Optional(LocalConfigSchema),
		localhost: Type.Optional(LocalhostConfigSchema),
		cloud: Type.Optional(CloudConfigSchema),
		python: Type.Optional(PythonConfigSchema),
		telemetry: Type.Optional(
			Type.Object(
				{
					enabled: Type.Optional(
						Type.Boolean({
							description: "Override CUA_TELEMETRY_ENABLED. Defaults to false in pi-cua-integration.",
						}),
					),
				},
				{ additionalProperties: false },
			),
		),
	},
	{ additionalProperties: false, description: "pi-cua-integration configuration." },
);

export type CuaConfig = Static<typeof CuaConfigSchema>;

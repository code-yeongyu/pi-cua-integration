#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const stringArray = { type: "array", items: { type: "string" } };

const localConfig = {
	type: "object",
	additionalProperties: false,
	properties: {
		runtime: {
			enum: ["auto", "docker", "qemu", "lume", "tart"],
			default: "auto",
		},
		image: {
			type: "object",
			additionalProperties: false,
			properties: {
				os: { enum: ["linux", "macos", "windows", "android"] },
				version: { type: "string" },
				kind: { enum: ["vm", "container"] },
			},
		},
		ephemeral: { type: "boolean", default: true },
	},
};

const cloudConfig = {
	type: "object",
	additionalProperties: false,
	properties: {
		apiKeyEnv: { type: "string", default: "CUA_API_KEY" },
		image: {
			type: "object",
			additionalProperties: false,
			properties: {
				os: { enum: ["linux", "macos", "windows", "android"] },
				version: { type: "string" },
			},
		},
		region: { type: "string" },
	},
};

const localhostConfig = {
	type: "object",
	additionalProperties: false,
	properties: {
		confirmDestructive: { type: "boolean", default: true },
	},
};

const pythonConfig = {
	type: "object",
	additionalProperties: false,
	properties: {
		executable: { type: "string", default: "python3" },
		startupTimeoutMs: { type: "integer", minimum: 100, default: 30000 },
		requestTimeoutMs: { type: "integer", minimum: 100, default: 60000 },
	},
};

const telemetryConfig = {
	type: "object",
	additionalProperties: false,
	properties: {
		enabled: { type: "boolean", default: false },
	},
};

const schema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	$id: "https://github.com/code-yeongyu/pi-cua-integration/schema/cua.schema.json",
	title: "pi-cua-integration configuration",
	type: "object",
	additionalProperties: false,
	properties: {
		mode: {
			enum: ["local", "localhost", "cloud"],
			default: "local",
			description: "Top-level mode selector. Local sandbox is the default.",
		},
		local: localConfig,
		localhost: localhostConfig,
		cloud: cloudConfig,
		python: pythonConfig,
		telemetry: telemetryConfig,
	},
	examples: [
		{ mode: "local" },
		{
			mode: "local",
			local: { runtime: "docker", image: { os: "linux", kind: "container" } },
		},
		{ mode: "localhost", localhost: { confirmDestructive: true } },
		{
			mode: "cloud",
			cloud: { apiKeyEnv: "CUA_API_KEY", region: "north-america" },
		},
	],
};

void stringArray;

const outputPath = resolve(ROOT, "schema", "cua.schema.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(schema, null, "\t")}\n`);
console.log(`Wrote ${outputPath}`);

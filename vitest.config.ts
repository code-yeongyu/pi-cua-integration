import { defineConfig } from "vitest/config";

const isTargetingIntegration = process.argv.some((argument) => argument.includes("test/integration"));

export default defineConfig({
	test: {
		environment: "node",
		include: ["test/**/*.test.ts"],
		exclude: isTargetingIntegration ? [] : ["test/integration/**"],
		testTimeout: 30_000,
		hookTimeout: 30_000,
		pool: "threads",
	},
});

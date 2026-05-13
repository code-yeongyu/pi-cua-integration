import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SRC_DIR = resolve(HERE, "..", "..", "src");

async function collectTsFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir);
	const result: string[] = [];
	for (const entry of entries) {
		const full = join(dir, entry);
		const stats = await stat(full);
		if (stats.isDirectory()) {
			const nested = await collectTsFiles(full);
			result.push(...nested);
			continue;
		}
		if (!entry.endsWith(".ts") || entry.endsWith(".d.ts")) continue;
		result.push(full);
	}
	return result;
}

describe("module-imports smoke", () => {
	it("#given every src/*.ts file #when dynamically imported #then it loads without runtime error", async () => {
		// given
		const files = await collectTsFiles(SRC_DIR);
		expect(files.length).toBeGreaterThan(0);
		// when / then
		for (const file of files) {
			const url = pathToFileURL(file).href;
			// vitest resolves .ts paths via its transformer
			await import(url);
		}
	});
});

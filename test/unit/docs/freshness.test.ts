import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT_DIR = resolve(HERE, "..", "..", "..");

async function readProjectFile(path: string): Promise<string> {
	return readFile(resolve(ROOT_DIR, path), "utf8");
}

describe("documentation freshness", () => {
	it("#given localhost docs #when checked #then they describe the current cua_auto backend", async () => {
		// given
		const readme = await readProjectFile("README.md");
		const modes = await readProjectFile("docs/MODES.md");
		const localhostSkill = await readProjectFile("skills/cua-localhost/SKILL.md");
		// when / then
		expect(readme).not.toMatch(/xdotool\s*\/\s*cliclick/);
		expect(readme).not.toContain("cua-agent");
		expect(modes).not.toMatch(/xdotool.*scrot/);
		expect(localhostSkill).not.toMatch(/xdotool.*scrot/);
	});

	it("#given tool docs #when checked #then they mention the registered eight-tool surface", async () => {
		// given
		const tools = await readProjectFile("docs/TOOLS.md");
		const skills = await readProjectFile("docs/SKILLS.md");
		// when / then
		expect(tools).not.toContain("All ten tools");
		expect(tools).toContain("All eight tools");
		expect(skills).not.toContain("seven markdown skills");
		expect(skills).toContain("five markdown skills");
	});
});

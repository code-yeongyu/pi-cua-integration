import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getSkillPaths, getSkillRoot, SKILL_NAMES } from "../../../src/skills/paths.js";

describe("skill paths", () => {
	it("#given the skill registry #when paths are read #then each one points to an existing SKILL.md", () => {
		// given
		const paths = getSkillPaths();
		// when / then
		expect(paths.length).toBe(SKILL_NAMES.length);
		for (const path of paths) {
			expect(existsSync(join(path, "SKILL.md"))).toBe(true);
		}
	});

	it("#given the skill root #when read #then it exists as a directory", () => {
		// given
		const root = getSkillRoot();
		// when / then
		expect(existsSync(root)).toBe(true);
	});
});

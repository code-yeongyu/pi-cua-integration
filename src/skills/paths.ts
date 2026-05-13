import { resolve } from "node:path";

import { SKILLS_ROOT } from "../cua/paths.js";

export const SKILL_NAMES: ReadonlyArray<string> = [
	"cua-overview",
	"cua-local-sandbox",
	"cua-localhost",
	"cua-cloud-sandbox",
	"cua-control",
];

export function getSkillPaths(): ReadonlyArray<string> {
	return SKILL_NAMES.map((name) => resolve(SKILLS_ROOT, name));
}

export function getSkillRoot(): string {
	return SKILLS_ROOT;
}

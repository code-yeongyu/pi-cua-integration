import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = resolve(HERE, "..", "..");
export const PYTHON_DAEMON_SCRIPT = resolve(PACKAGE_ROOT, "python", "daemon.py");
export const SKILLS_ROOT = resolve(PACKAGE_ROOT, "skills");

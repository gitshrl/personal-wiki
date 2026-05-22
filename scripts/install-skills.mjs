import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const sourceRoot = join(repoRoot, "skills");
const targetRoots = readTargetRoots();

if (!existsSync(sourceRoot)) {
  throw new Error(`Missing skills source directory: ${sourceRoot}`);
}

const skills = readdirSync(sourceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(sourceRoot, name, "SKILL.md")));

if (skills.length === 0) {
  throw new Error(`No skills with SKILL.md found in ${sourceRoot}`);
}

for (const targetRoot of targetRoots) {
  mkdirSync(targetRoot, { recursive: true });

  for (const skill of skills) {
    const source = join(sourceRoot, skill);
    const target = join(targetRoot, skill);

    rmSync(target, { recursive: true, force: true });
    cpSync(source, target, { recursive: true });
    console.log(`installed ${skill} -> ${target}`);
  }
}

console.log(`installed ${skills.length} skill(s) into ${targetRoots.length} destination(s)`);
console.log(`source: ${sourceRoot}`);

function readTargetRoots() {
  const destinations = readFlagValues("--dest");
  if (destinations.length === 0 && process.env.SKILLS_INSTALL_DIR) {
    destinations.push(process.env.SKILLS_INSTALL_DIR);
  }

  if (destinations.length === 0) {
    throw new Error(
      "Missing install destination. Usage: node scripts/install-skills.mjs --dest <dir> [--dest <dir>]"
    );
  }

  return [...new Set(destinations.map((dest) => resolve(expandHome(dest))))];
}

function readFlagValues(flag) {
  const values = [];

  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== flag) continue;

    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}`);
    }

    values.push(value);
  }

  return values;
}

function expandHome(pathValue) {
  if (pathValue === "~") return homedir();
  if (pathValue.startsWith("~/")) return join(homedir(), pathValue.slice(2));
  return pathValue;
}

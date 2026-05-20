import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface PersonalWikiRuntimePaths {
  homeDir: string;
  databasePath: string;
  configPath: string;
  resourcesDir: string;
  uploadsDir: string;
  qdrantStorageDir: string;
  logsDir: string;
  backupsDir: string;
}

export function getPersonalWikiHome(env = process.env): string {
  return expandHome(env.PERSONAL_WIKI_HOME?.trim() || "~/.personal-wiki");
}

export function getPersonalWikiRuntimePaths(env = process.env): PersonalWikiRuntimePaths {
  const homeDir = getPersonalWikiHome(env);
  return {
    homeDir,
    databasePath: join(homeDir, "personal-wiki.sqlite"),
    configPath: join(homeDir, "config.json"),
    resourcesDir: join(homeDir, "resources"),
    uploadsDir: join(homeDir, "uploads"),
    qdrantStorageDir: join(homeDir, "qdrant"),
    logsDir: join(homeDir, "logs"),
    backupsDir: join(homeDir, "backups")
  };
}

export function ensurePersonalWikiRuntimeHome(env = process.env): PersonalWikiRuntimePaths {
  const paths = getPersonalWikiRuntimePaths(env);
  mkdirSync(paths.homeDir, { recursive: true });
  mkdirSync(paths.resourcesDir, { recursive: true });
  mkdirSync(paths.uploadsDir, { recursive: true });
  mkdirSync(paths.qdrantStorageDir, { recursive: true });
  mkdirSync(paths.logsDir, { recursive: true });
  mkdirSync(paths.backupsDir, { recursive: true });
  return paths;
}

function expandHome(pathValue: string): string {
  if (pathValue === "~") return homedir();
  if (pathValue.startsWith("~/")) return join(homedir(), pathValue.slice(2));
  return resolve(pathValue);
}

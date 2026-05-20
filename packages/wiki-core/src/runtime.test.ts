import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { homedir } from "node:os";
import { getPersonalWikiHome, getPersonalWikiRuntimePaths } from "./runtime";

describe("runtime paths", () => {
  it("defaults to ~/.personal-wiki", () => {
    expect(getPersonalWikiHome({})).toBe(join(homedir(), ".personal-wiki"));
  });

  it("keeps all runtime paths under the configured home", () => {
    const paths = getPersonalWikiRuntimePaths({ PERSONAL_WIKI_HOME: "/tmp/wiki-home" });

    expect(paths).toMatchObject({
      homeDir: "/tmp/wiki-home",
      databasePath: "/tmp/wiki-home/personal-wiki.sqlite",
      resourcesDir: "/tmp/wiki-home/resources",
      uploadsDir: "/tmp/wiki-home/uploads",
      qdrantStorageDir: "/tmp/wiki-home/qdrant"
    });
  });
});

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const sourceDir = join(root, "src");
const privateCorePath = join(root, ".private", "agent-switch-private-core", "src-tauri-core", "src", "lib.rs");
const hasPrivateCore = existsSync(privateCorePath);

function findTypeScriptTests(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return findTypeScriptTests(path);
      if (entry.isFile() && entry.name.endsWith(".test.ts")) return [path];
      return [];
    })
    .sort();
}

const tests = findTypeScriptTests(sourceDir);

for (const testFile of tests) {
  const relativePath = relative(root, testFile);
  const source = readFileSync(testFile, "utf8");
  if (!hasPrivateCore && source.includes("@requires-private-core")) {
    console.log(`Skipping internal-only test without private core: ${relativePath}`);
    continue;
  }

  const result = spawnSync(process.execPath, ["--experimental-strip-types", relativePath], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

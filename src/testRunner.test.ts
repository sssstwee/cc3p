import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const runner = readFileSync(new URL("../scripts/run-tests.mjs", import.meta.url), "utf8");

assert.equal(runner.includes("requires-private-core"), true);
assert.equal(runner.includes("hasPrivateCore"), true);
assert.equal(runner.includes("Skipping internal-only test"), true);

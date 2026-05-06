const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "bin", "aicc-skills.js");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aicc-skills-"));
}

test("installs the skill under CODEX_HOME and prints hello", () => {
  const codexHome = makeTempDir();
  const staleDir = path.join(codexHome, "skills", "aicc-skills");
  fs.mkdirSync(staleDir, { recursive: true });
  fs.writeFileSync(path.join(staleDir, "stale.txt"), "old");

  const output = execFileSync(process.execPath, [cliPath], {
    cwd: repoRoot,
    env: { ...process.env, CODEX_HOME: codexHome },
    encoding: "utf8"
  });

  assert.equal(output.trim(), "hello");
  assert.ok(fs.existsSync(path.join(staleDir, "SKILL.md")));
  assert.ok(!fs.existsSync(path.join(staleDir, "stale.txt")));
});

test("falls back to HOME/.codex when CODEX_HOME is unset", () => {
  const home = makeTempDir();
  const env = { ...process.env, HOME: home };
  delete env.CODEX_HOME;

  const output = execFileSync(process.execPath, [cliPath], {
    cwd: repoRoot,
    env,
    encoding: "utf8"
  });

  assert.equal(output.trim(), "hello");
  assert.ok(fs.existsSync(path.join(home, ".codex", "skills", "aicc-skills", "SKILL.md")));
});

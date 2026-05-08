const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, "SKILL.md must start with YAML frontmatter");

  return Object.fromEntries(
    match[1]
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        assert.notEqual(separatorIndex, -1, `Invalid frontmatter line: ${line}`);
        return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()];
      })
  );
}

test("package.json is not an npm CLI installer", () => {
  const packageJson = readJson("package.json");

  assert.equal(packageJson.private, true);
  assert.equal(packageJson.bin, undefined);
  assert.deepEqual(packageJson.files, ["skills/"]);
  assert.ok(!fs.existsSync(path.join(repoRoot, "bin", "aicc-skills.js")));
});

test("aicc-skills is discoverable as a skills CLI package", () => {
  const skillMarkdown = readText("skills/aicc-skills/SKILL.md");
  const metadata = parseFrontmatter(skillMarkdown);

  assert.equal(metadata.name, "aicc-skills");
  assert.ok(metadata.description);
});

test("README documents npx skills add as the only install path", () => {
  const readme = readText("README.md");

  assert.match(readme, /npx skills add <github-owner>\/<repo> -a codex -g -y/);
  assert.match(readme, /npx skills add <github-owner>\/<repo> -a claude-code -g -y/);
  assert.match(readme, /npx skills add <github-owner>\/<repo> -a codebuddy -g -y/);
  assert.match(readme, /For WorkBuddy, use the `skills` CLI agent id `codebuddy`/);
  assert.doesNotMatch(readme, /npx aicc-skills/);
});

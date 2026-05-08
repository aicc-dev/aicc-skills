const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
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

test("aicc-init skill provides cross-platform setup scripts", () => {
  const skillMarkdown = readText("skills/aicc-init/SKILL.md");
  const metadata = parseFrontmatter(skillMarkdown);

  assert.equal(metadata.name, "aicc-init");
  assert.match(metadata.description, /initialize/i);

  assert.ok(fs.existsSync(path.join(repoRoot, "skills/aicc-init/scripts/setup.js")));
  assert.ok(fs.existsSync(path.join(repoRoot, "skills/aicc-init/scripts/setup.sh")));
  assert.ok(fs.existsSync(path.join(repoRoot, "skills/aicc-init/scripts/setup.ps1")));
});

test("node setup script maps platform and architecture without downloading in dry-run mode", () => {
  const output = execFileSync(process.execPath, ["skills/aicc-init/scripts/setup.js"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      AICC_SETUP_DRY_RUN: "1",
      AICC_TEST_PLATFORM: "darwin",
      AICC_TEST_ARCH: "arm64"
    },
    encoding: "utf8"
  });

  assert.match(output, /asset: aicc-darwin-arm64/);
  assert.match(output, /url: https:\/\/oss-telrobot\.oss-cn-hangzhou\.aliyuncs\.com\/static\/aicc-cli\/latest\/aicc-darwin-arm64/);
  assert.match(output, /destination: .*\.aicc.*bin.*aicc/);
});

test("shell setup script supports macOS and Linux dry-run initialization", () => {
  execFileSync("sh", ["-n", "skills/aicc-init/scripts/setup.sh"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  const output = execFileSync("sh", ["skills/aicc-init/scripts/setup.sh"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      AICC_SETUP_DRY_RUN: "1",
      AICC_TEST_UNAME_S: "Linux",
      AICC_TEST_UNAME_M: "x86_64"
    },
    encoding: "utf8"
  });

  assert.match(output, /asset: aicc-linux-x64/);
  assert.match(output, /url: https:\/\/oss-telrobot\.oss-cn-hangzhou\.aliyuncs\.com\/static\/aicc-cli\/latest\/aicc-linux-x64/);
});

test("powershell setup script includes Windows asset mapping", () => {
  const script = readText("skills/aicc-init/scripts/setup.ps1");

  assert.match(script, /aicc-win32-x64\.exe/);
  assert.match(script, /oss-telrobot\.oss-cn-hangzhou\.aliyuncs\.com/);
  assert.match(script, /PROCESSOR_ARCHITECTURE/);
  assert.match(script, /Invoke-WebRequest/);
});

test("go sample CLI and build script are present", () => {
  assert.ok(fs.existsSync(path.join(repoRoot, "go.mod")));
  assert.ok(fs.existsSync(path.join(repoRoot, "cmd/aicc/main.go")));
  assert.ok(fs.existsSync(path.join(repoRoot, "cmd/aicc/main_test.go")));
  assert.ok(fs.existsSync(path.join(repoRoot, "scripts/build-aicc.sh")));

  const buildScript = readText("scripts/build-aicc.sh");
  assert.match(buildScript, /aicc-darwin-arm64/);
  assert.match(buildScript, /aicc-linux-x64/);
  assert.match(buildScript, /aicc-win32-x64\.exe/);
  assert.match(buildScript, /GOOS=darwin GOARCH=arm64/);
});

test("go sample CLI prints version and runtime information", () => {
  const versionOutput = execFileSync("go", ["run", "-ldflags", "-X main.version=test-version", "./cmd/aicc", "--version"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(versionOutput.trim(), "test-version");

  const infoOutput = execFileSync("go", ["run", "-ldflags", "-X main.version=test-version", "./cmd/aicc"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.match(infoOutput, /name: aicc/);
  assert.match(infoOutput, /version: test-version/);
  assert.match(infoOutput, /goos: /);
  assert.match(infoOutput, /goarch: /);
});

test("README documents npx skills add as the only install path", () => {
  const readme = readText("README.md");

  assert.match(readme, /npx skills add <github-owner>\/<repo> -a codex -g -y/);
  assert.match(readme, /npx skills add <github-owner>\/<repo> -a claude-code -g -y/);
  assert.match(readme, /npx skills add <github-owner>\/<repo> -a codebuddy -g -y/);
  assert.match(readme, /For WorkBuddy, use the `skills` CLI agent id `codebuddy`/);
  assert.match(readme, /aicc-init/);
  assert.match(readme, /sh scripts\/setup\.sh/);
  assert.match(readme, /setup\.ps1/);
  assert.match(readme, /https:\/\/oss-telrobot\.oss-cn-hangzhou\.aliyuncs\.com\/static\/aicc-cli\/latest\/<asset>/);
  assert.match(readme, /scripts\/build-aicc\.sh/);
  assert.doesNotMatch(readme, /npx aicc-skills/);
});

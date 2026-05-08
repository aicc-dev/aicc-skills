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

test("aicc task skill uses a namespaced public name", () => {
  const skillMarkdown = readText("skills/aicc-skills/SKILL.md");
  const metadata = parseFrontmatter(skillMarkdown);
  const openaiAgentConfig = readText("skills/aicc-skills/agents/openai.yaml");

  assert.equal(metadata.name, "aicc:task");
  assert.ok(metadata.description);
  assert.match(openaiAgentConfig, /\$aicc:task/);
  assert.doesNotMatch(openaiAgentConfig, /\$aicc-skills/);
});

test("aicc init skill uses a namespaced public name and provides setup scripts", () => {
  const skillMarkdown = readText("skills/aicc-init/SKILL.md");
  const metadata = parseFrontmatter(skillMarkdown);

  assert.equal(metadata.name, "aicc:init");
  assert.match(metadata.description, /initialize/i);

  assert.ok(fs.existsSync(path.join(repoRoot, "skills/aicc-init/scripts/setup.js")));
  assert.ok(fs.existsSync(path.join(repoRoot, "skills/aicc-init/scripts/setup.sh")));
  assert.ok(fs.existsSync(path.join(repoRoot, "skills/aicc-init/scripts/setup.ps1")));
  assert.ok(fs.existsSync(path.join(repoRoot, "skills/aicc-init/scripts/token-mock.js")));
});

test("token mock writes local config and reports executable state", () => {
  const home = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "aicc-token-"));
  const binDir = path.join(home, ".aicc", "bin");
  fs.mkdirSync(binDir, { recursive: true });
  const executable = path.join(binDir, "aicc");
  fs.writeFileSync(executable, "#!/bin/sh\n");
  fs.chmodSync(executable, 0o755);

  const output = execFileSync(process.execPath, ["skills/aicc-init/scripts/token-mock.js", "--token", "mock-token"], {
    cwd: repoRoot,
    env: { ...process.env, HOME: home },
    encoding: "utf8"
  });

  assert.match(output, /aicc executable: found/);
  assert.match(output, /token: mock-token/);

  const config = JSON.parse(fs.readFileSync(path.join(home, ".aicc", "config.json"), "utf8"));
  assert.deepEqual(config, {
    token: "mock-token",
    executablePath: executable,
    executableFound: true
  });
});

test("token mock can write config when executable is missing", () => {
  const home = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "aicc-token-missing-"));

  const output = execFileSync(process.execPath, ["skills/aicc-init/scripts/token-mock.js"], {
    cwd: repoRoot,
    env: { ...process.env, HOME: home, AICC_TOKEN: "env-token" },
    encoding: "utf8"
  });

  assert.match(output, /aicc executable: missing/);
  assert.match(output, /token: env-token/);

  const config = JSON.parse(fs.readFileSync(path.join(home, ".aicc", "config.json"), "utf8"));
  assert.equal(config.token, "env-token");
  assert.equal(config.executableFound, false);
  assert.match(config.executablePath, /\.aicc.*bin.*aicc/);
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
  assert.match(output, /config path: .*\.aicc.*config\.json/);
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
  assert.match(output, /config path: .*\.aicc.*config\.json/);
});

test("powershell setup script includes Windows asset mapping", () => {
  const script = readText("skills/aicc-init/scripts/setup.ps1");

  assert.match(script, /aicc-win32-x64\.exe/);
  assert.match(script, /oss-telrobot\.oss-cn-hangzhou\.aliyuncs\.com/);
  assert.match(script, /PROCESSOR_ARCHITECTURE/);
  assert.match(script, /Invoke-WebRequest/);
  assert.match(script, /config\.json/);
  assert.doesNotMatch(script, /SetEnvironmentVariable/);
});

test("shell setup script writes executable config without modifying shell profiles", () => {
  const home = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "aicc-config-"));
  const fakeCurl = path.join(home, "curl");
  fs.writeFileSync(
    fakeCurl,
    [
      "#!/bin/sh",
      "while [ $# -gt 0 ]; do",
      "  if [ \"$1\" = \"-o\" ]; then",
      "    shift",
      "    printf '#!/bin/sh\\n' > \"$1\"",
      "    exit 0",
      "  fi",
      "  shift",
      "done",
      "exit 1",
      ""
    ].join("\n")
  );
  fs.chmodSync(fakeCurl, 0o755);

  const env = {
    ...process.env,
    HOME: home,
    PATH: `${home}:${process.env.PATH}`,
    SHELL: "/bin/zsh",
    AICC_TEST_UNAME_S: "Darwin",
    AICC_TEST_UNAME_M: "arm64"
  };

  execFileSync("sh", ["skills/aicc-init/scripts/setup.sh"], {
    cwd: repoRoot,
    env,
    encoding: "utf8"
  });

  const config = JSON.parse(fs.readFileSync(path.join(home, ".aicc", "config.json"), "utf8"));
  assert.equal(config.executablePath, path.join(home, ".aicc", "bin", "aicc"));
  assert.equal(config.executableFound, true);
  assert.ok(!fs.existsSync(path.join(home, ".zshrc")));
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
  assert.match(readme, /aicc:init/);
  assert.match(readme, /aicc:task/);
  assert.match(readme, /token-mock\.js/);
  assert.match(readme, /sh scripts\/setup\.sh/);
  assert.match(readme, /setup\.ps1/);
  assert.match(readme, /https:\/\/oss-telrobot\.oss-cn-hangzhou\.aliyuncs\.com\/static\/aicc-cli\/latest\/<asset>/);
  assert.match(readme, /scripts\/build-aicc\.sh/);
  assert.match(readme, /executablePath/);
  assert.doesNotMatch(readme, /AICC_UPDATE_PATH/);
  assert.doesNotMatch(readme, /npx aicc-skills/);
});

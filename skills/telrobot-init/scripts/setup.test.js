const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const scriptsDir = __dirname;
const hasGo = spawnSync("go", ["version"], { encoding: "utf8" }).status === 0;

function createFakeCliSource(t) {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-source-"));
  fs.writeFileSync(path.join(source, "go.mod"), "module fake-telrobot-cli\n\ngo 1.22\n");
  fs.writeFileSync(
    path.join(source, "main.go"),
    [
      "package main",
      "",
      'import "fmt"',
      "",
      'var version = "dev"',
      'var buildTime = "unknown"',
      'var gitCommit = "unknown"',
      "",
      'func main() { fmt.Println("dev cli", version, buildTime, gitCommit) }',
      "",
    ].join("\n"),
  );
  t.after(() => fs.rmSync(source, { recursive: true, force: true }));
  return source;
}

function cliDestination(home) {
  const name = process.platform === "win32" ? "telrobot-cli.exe" : "telrobot-cli";
  return path.join(home, "bin", name);
}

function createRemoteSkillPackage(t, version) {
  const remote = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-skill-remote-"));
  const packagePath = path.join(remote, "package.json");
  fs.writeFileSync(packagePath, `${JSON.stringify({ name: "telrobot-skills", version }, null, 2)}\n`);
  t.after(() => fs.rmSync(remote, { recursive: true, force: true }));
  return pathToFileURL(packagePath).href;
}

function cliAssetKey() {
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const arch = ["arm64", "aarch64"].includes(process.arch) ? "arm64" : "amd64";
  return `${platform}-${arch}`;
}

function createRemoteCliRelease(t, version, assetContent = "updated cli\n", sha256 = "") {
  const remote = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-release-"));
  const assetPath = path.join(remote, process.platform === "win32" ? "telrobot-cli.exe" : "telrobot-cli");
  fs.writeFileSync(assetPath, assetContent);
  const checksum = sha256 || crypto.createHash("sha256").update(assetContent).digest("hex");
  const manifestPath = path.join(remote, "manifest.json");
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        version,
        assets: {
          [cliAssetKey()]: {
            url: pathToFileURL(assetPath).href,
            sha256: checksum,
            filename: path.basename(assetPath),
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  t.after(() => fs.rmSync(remote, { recursive: true, force: true }));
  return { manifestUrl: pathToFileURL(manifestPath).href, assetPath };
}

test("setup.js bundled skill version matches package.json", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(scriptsDir, "../../../package.json"), "utf8"));
  const setupJs = fs.readFileSync(path.join(scriptsDir, "setup.js"), "utf8");
  assert.match(setupJs, new RegExp(`const bundledSkillVersion = "${packageJson.version}"`));
});

test("setup.js does not write config or require token when CLI already exists", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-setup-"));
  const binDir = path.join(home, "bin");
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(path.join(binDir, "telrobot-cli"), "");

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js")], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_TOKEN: "",
      TELROBOT_MODE: "",
      TELROBOT_TEST_PLATFORM: "linux",
      TELROBOT_TEST_ARCH: "amd64",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Telrobot CLI 已存在|Telrobot CLI already exists/);
  assert.equal(fs.existsSync(path.join(home, "config.yaml")), false);
});

test("setup.js ignores legacy mode and profile flags without writing config", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-setup-flags-"));
  const binDir = path.join(home, "bin");
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(cliDestination(home), "");

  const result = spawnSync(
    process.execPath,
    [
      path.join(scriptsDir, "setup.js"),
      "--mode",
      "multi",
      "--profile",
      "张三=zhang-token",
      "--profile",
      "李四",
      "--current-profile",
      "李四",
    ],
    {
      env: {
        ...process.env,
        TELROBOT_HOME: home,
        TELROBOT_TOKEN: "",
        TELROBOT_TEST_PLATFORM: "linux",
        TELROBOT_TEST_ARCH: "amd64",
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(home, "config.yaml")), false);
});

test("setup.js check mode reports missing environment without writing files", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-setup-check-"));

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--check"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_TEST_PLATFORM: "linux",
      TELROBOT_TEST_ARCH: "amd64",
      TELROBOT_MODE: "",
      TELROBOT_PROFILE: "",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Telrobot CLI: missing/);
  assert.doesNotMatch(result.stdout, /config.yaml/);
  assert.doesNotMatch(result.stdout, /Token:/);
  assert.equal(fs.existsSync(path.join(home, "bin", "telrobot-cli")), false);
  assert.equal(fs.existsSync(path.join(home, "config.yaml")), false);
});

test("setup.js check mode ignores config state and only checks CLI", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-check-cli-only-"));
  fs.mkdirSync(path.join(home, "bin"), { recursive: true });
  fs.writeFileSync(cliDestination(home), "");
  fs.writeFileSync(
    path.join(home, "config.yaml"),
    "current: 默认用户\nprofiles:\n  默认用户:\n    auth:\n      token:   \n",
  );

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--check"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_TEST_PLATFORM: "linux",
      TELROBOT_TEST_ARCH: "amd64",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Telrobot CLI: present/);
  assert.doesNotMatch(result.stdout, /config.yaml/);
  assert.doesNotMatch(result.stdout, /Token:/);
});

test("setup.js skill update check prompts only once per day when remote version is newer", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-skill-update-"));
  const packageUrl = createRemoteSkillPackage(t, "2.3.0");
  const env = {
    ...process.env,
    TELROBOT_HOME: home,
    TELROBOT_SKILL_VERSION: "2.2.0",
    TELROBOT_SKILL_UPDATE_PACKAGE_URL: packageUrl,
    TELROBOT_SKILL_UPDATE_TODAY: "2026-07-15",
  };

  const first = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--skill-update-check"], {
    env,
    encoding: "utf8",
  });

  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /skill版本已更新，是否需要帮您更新？/);
  assert.match(first.stdout, /当前版本: 2\.2\.0/);
  assert.match(first.stdout, /最新版本: 2\.3\.0/);

  const state = JSON.parse(fs.readFileSync(path.join(home, "skill-update-state.json"), "utf8"));
  assert.equal(state.lastPromptDate, "2026-07-15");
  assert.equal(state.lastPromptCurrentVersion, "2.2.0");
  assert.equal(state.lastPromptVersion, "2.3.0");

  const second = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--skill-update-check"], {
    env,
    encoding: "utf8",
  });

  assert.equal(second.status, 0, second.stderr);
  assert.doesNotMatch(second.stdout, /skill版本已更新/);

  const nextDay = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--skill-update-check"], {
    env: {
      ...env,
      TELROBOT_SKILL_UPDATE_TODAY: "2026-07-16",
    },
    encoding: "utf8",
  });

  assert.equal(nextDay.status, 0, nextDay.stderr);
  assert.match(nextDay.stdout, /skill版本已更新，是否需要帮您更新？/);
});

test("setup.js skill update check stays silent when local version is current", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-skill-current-"));
  const packageUrl = createRemoteSkillPackage(t, "2.3.0");

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--skill-update-check"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_SKILL_VERSION: "2.3.0",
      TELROBOT_SKILL_UPDATE_PACKAGE_URL: packageUrl,
      TELROBOT_SKILL_UPDATE_TODAY: "2026-07-15",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "");
  assert.equal(fs.existsSync(path.join(home, "skill-update-state.json")), false);
});

test("setup.js skill update apply requires an agent name", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-skill-apply-missing-"));

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--skill-update-apply"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
    },
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--agent <agent-name>/);
});

test("setup.js skill update apply runs skills add for the selected agent", { skip: process.platform === "win32" }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-skill-apply-"));
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-fake-npx-"));
  const argsFile = path.join(binDir, "args.txt");
  const fakeNpx = path.join(binDir, "npx");
  fs.writeFileSync(fakeNpx, '#!/bin/sh\nprintf "%s\\n" "$@" > "$FAKE_NPX_ARGS"\n');
  fs.chmodSync(fakeNpx, 0o755);

  const result = spawnSync(
    process.execPath,
    [
      path.join(scriptsDir, "setup.js"),
      "--skill-update-apply",
      "--agent",
      "workbuddy",
      "--skills-repo",
      "aicc-dev/aicc-skills",
    ],
    {
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
        TELROBOT_HOME: home,
        FAKE_NPX_ARGS: argsFile,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readFileSync(argsFile, "utf8").trim().split("\n"), [
    "skills",
    "add",
    "aicc-dev/aicc-skills",
    "-a",
    "workbuddy",
    "-g",
    "-y",
  ]);

  const state = JSON.parse(fs.readFileSync(path.join(home, "skill-update-state.json"), "utf8"));
  assert.equal(state.lastUpdatedAgent, "workbuddy");
  assert.equal(state.lastUpdatedRepo, "aicc-dev/aicc-skills");
});

test("setup.js CLI update check prompts only once per day when remote version is newer", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-update-"));
  fs.mkdirSync(path.dirname(cliDestination(home)), { recursive: true });
  fs.writeFileSync(cliDestination(home), "installed cli\n");
  const release = createRemoteCliRelease(t, "v2.3.0");
  const env = {
    ...process.env,
    TELROBOT_HOME: home,
    TELROBOT_CLI_CURRENT_VERSION: "v2.2.0",
    TELROBOT_CLI_UPDATE_MANIFEST_URL: release.manifestUrl,
    TELROBOT_SKILL_UPDATE_TODAY: "2026-07-15",
  };

  const first = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--cli-update-check"], {
    env,
    encoding: "utf8",
  });

  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /telrobot-saas-cli版本已更新，是否需要帮您更新？/);
  assert.match(first.stdout, /当前版本: v2\.2\.0/);
  assert.match(first.stdout, /最新版本: v2\.3\.0/);

  const state = JSON.parse(fs.readFileSync(path.join(home, "skill-update-state.json"), "utf8"));
  assert.equal(state.lastCliPromptDate, "2026-07-15");
  assert.equal(state.lastCliPromptCurrentVersion, "v2.2.0");
  assert.equal(state.lastCliPromptVersion, "v2.3.0");

  const second = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--cli-update-check"], {
    env,
    encoding: "utf8",
  });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout.trim(), "");

  const nextDay = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--cli-update-check"], {
    env: {
      ...env,
      TELROBOT_SKILL_UPDATE_TODAY: "2026-07-16",
    },
    encoding: "utf8",
  });
  assert.equal(nextDay.status, 0, nextDay.stderr);
  assert.match(nextDay.stdout, /telrobot-saas-cli版本已更新/);
});

test("setup.js CLI update check stays silent when local version is current", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-current-"));
  fs.mkdirSync(path.dirname(cliDestination(home)), { recursive: true });
  fs.writeFileSync(cliDestination(home), "installed cli\n");
  const release = createRemoteCliRelease(t, "v2.3.0");

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--cli-update-check"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_CLI_CURRENT_VERSION: "v2.3.0",
      TELROBOT_CLI_UPDATE_MANIFEST_URL: release.manifestUrl,
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "");
  assert.equal(fs.existsSync(path.join(home, "skill-update-state.json")), false);
});

test(
  "setup.js CLI update check reads the installed CLI version output",
  { skip: process.platform === "win32" },
  (t) => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-version-output-"));
    const destination = cliDestination(home);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(
      destination,
      '#!/bin/sh\nprintf "Telrobot CLI\\nVersion:    v2.3.0\\nBuild Time: test\\nGit Commit: test\\n"\n',
    );
    fs.chmodSync(destination, 0o755);
    const release = createRemoteCliRelease(t, "v2.3.0");

    const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--cli-update-check"], {
      env: {
        ...process.env,
        TELROBOT_HOME: home,
        TELROBOT_CLI_UPDATE_MANIFEST_URL: release.manifestUrl,
      },
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "");
  },
);

test("setup.js CLI update check stays silent when CLI is missing", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-missing-update-"));
  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--cli-update-check"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_CLI_UPDATE_MANIFEST_URL: path.join(home, "missing-manifest.json"),
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "");
  assert.equal(fs.existsSync(path.join(home, "skill-update-state.json")), false);
});

test("setup.js CLI update apply installs the manifest asset and records the version", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-apply-"));
  const destination = cliDestination(home);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, "old cli\n");
  const release = createRemoteCliRelease(t, "v2.3.0", "new cli\n");

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--cli-update-apply"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_CLI_UPDATE_MANIFEST_URL: release.manifestUrl,
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(destination, "utf8"), "new cli\n");
  const state = JSON.parse(fs.readFileSync(path.join(home, "skill-update-state.json"), "utf8"));
  assert.equal(state.lastCliUpdatedVersion, "v2.3.0");
});

test("setup.js CLI update apply keeps the installed CLI when checksum validation fails", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-checksum-"));
  const destination = cliDestination(home);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, "old cli\n");
  const release = createRemoteCliRelease(t, "v2.3.0", "corrupt cli\n", "0".repeat(64));

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--cli-update-apply"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_CLI_UPDATE_MANIFEST_URL: release.manifestUrl,
    },
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /checksum mismatch/);
  assert.equal(fs.readFileSync(destination, "utf8"), "old cli\n");
});

test("setup.js dev mode builds local CLI source into telrobot home", { skip: !hasGo }, (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-dev-"));
  const source = createFakeCliSource(t);
  const destination = cliDestination(home);

  const result = spawnSync(
    process.execPath,
    [path.join(scriptsDir, "setup.js"), "--mode", "single", "--dev", "--cli-source", source],
    {
      env: {
        ...process.env,
        TELROBOT_HOME: home,
        TELROBOT_TOKEN: "dev-token",
        TELROBOT_CLI_VERSION: "v9.8.7-test",
        TELROBOT_BUILD_TIME: "2026-07-15T00:00:00Z",
        TELROBOT_GIT_COMMIT: "abc1234",
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(destination), true);
  assert.equal(fs.existsSync(path.join(home, "config.yaml")), false);

  const cliResult = spawnSync(destination, [], { encoding: "utf8" });
  assert.equal(cliResult.status, 0, cliResult.stderr);
  assert.match(cliResult.stdout, /dev cli/);
  assert.match(cliResult.stdout, /v9\.8\.7-test 2026-07-15T00:00:00Z abc1234/);
});

test("setup.js dev mode discovers telrobot-saas-go next to the current workspace", { skip: !hasGo }, (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-workspace-"));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-dev-discover-"));
  const source = path.join(workspace, "telrobot-saas-go", "telrobot-saas-cli");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, "go.mod"), "module fake-telrobot-cli\n\ngo 1.22\n");
  fs.writeFileSync(
    path.join(source, "main.go"),
    [
      "package main",
      "",
      'var version = "dev"',
      'var buildTime = "unknown"',
      'var gitCommit = "unknown"',
      "",
      "func main() {}",
      "",
    ].join("\n"),
  );
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "setup.js"), "--mode", "single", "--dev"], {
    cwd: workspace,
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_TOKEN: "dev-discover-token",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(cliDestination(home)), true);
  assert.match(result.stdout, /DEV 模式/);
  assert.match(result.stdout, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("setup.js dev mode rejects missing local CLI source", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-dev-missing-"));
  const missingSource = path.join(home, "missing-cli-source");

  const result = spawnSync(
    process.execPath,
    [path.join(scriptsDir, "setup.js"), "--mode", "single", "--dev", "--cli-source", missingSource],
    {
      env: {
        ...process.env,
        TELROBOT_HOME: home,
        TELROBOT_TOKEN: "dev-discover-token",
      },
      encoding: "utf8",
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DEV mode requires local telrobot-saas-cli source/);
  assert.equal(fs.existsSync(cliDestination(home)), false);
});

test("token-config.js writes named UTF-8 profile", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-token-"));

  const result = spawnSync(
    process.execPath,
    [path.join(scriptsDir, "token-config.js"), "--profile", "张三", "--token", "zhang-token"],
    {
      env: {
        ...process.env,
        TELROBOT_HOME: home,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const config = fs.readFileSync(path.join(home, "config.yaml"), "utf8");
  assert.match(config, /current: 张三/);
  assert.match(config, /张三:/);
  assert.match(config, /token: zhang-token/);
});

test("token-config.js merges token into existing profile without removing other profiles", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-token-merge-"));
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(
    path.join(home, "config.yaml"),
    [
      "current: 张三",
      "",
      "server:",
      "  baseURL: https://ai.telrobot.top/cli",
      "",
      "output:",
      "  format: table",
      "",
      "profiles:",
      "  张三:",
      "    auth:",
      "      token: zhang-token",
      "  李四:",
      "    auth:",
      "      token:",
      "",
    ].join("\n"),
  );

  const result = spawnSync(
    process.execPath,
    [path.join(scriptsDir, "token-config.js"), "--profile", "李四", "--token", "li-token"],
    {
      env: {
        ...process.env,
        TELROBOT_HOME: home,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const config = fs.readFileSync(path.join(home, "config.yaml"), "utf8");
  assert.match(config, /^current: 张三$/m);
  assert.match(config, /张三:\n    auth:\n      token: zhang-token/);
  assert.match(config, /李四:\n    auth:\n      token: li-token/);
});

test("profile-current.js switches current profile in existing config", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-current-"));
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(
    path.join(home, "config.yaml"),
    [
      "current: 张三",
      "",
      "server:",
      "  baseURL: https://ai.telrobot.top/cli",
      "",
      "profiles:",
      "  张三:",
      "    auth:",
      "      token: zhang-token",
      "  李四:",
      "    auth:",
      "      token: li-token",
      "",
    ].join("\n"),
  );

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "profile-current.js"), "--profile", "李四"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Current profile updated: 李四/);
  const config = fs.readFileSync(path.join(home, "config.yaml"), "utf8");
  assert.match(config, /^current: 李四$/m);
  assert.match(config, /张三:\n    auth:\n      token: zhang-token/);
  assert.match(config, /李四:\n    auth:\n      token: li-token/);
});

test("profile-current.js rejects unknown profile without changing current", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-current-missing-"));
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(
    path.join(home, "config.yaml"),
    "current: 张三\nprofiles:\n  张三:\n    auth:\n      token: zhang-token\n",
  );

  const result = spawnSync(process.execPath, [path.join(scriptsDir, "profile-current.js"), "--profile", "李四"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
    },
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /profile does not exist: 李四/);
  const config = fs.readFileSync(path.join(home, "config.yaml"), "utf8");
  assert.match(config, /^current: 张三$/m);
});

test("setup.sh installs CLI without writing config", { skip: process.platform === "win32" }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-sh-"));
  const assets = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-assets-"));
  fs.writeFileSync(path.join(assets, "telrobot-linux-amd64"), "#!/bin/sh\n");

  const result = spawnSync("sh", [path.join(scriptsDir, "setup.sh"), "--mode", "multi", "--profile", "李四"], {
    env: {
      ...process.env,
      TELROBOT_HOME: home,
      TELROBOT_TOKEN: "shell-token",
      TELROBOT_TEST_UNAME_S: "Linux",
      TELROBOT_TEST_UNAME_M: "x86_64",
      TELROBOT_DOWNLOAD_BASE_URL: `file://${assets}`,
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(cliDestination(home)), true);
  assert.equal(fs.existsSync(path.join(home, "config.yaml")), false);
});

test("setup.ps1 does not write profile config", () => {
  const source = fs.readFileSync(path.join(scriptsDir, "setup.ps1"), "utf8");
  assert.doesNotMatch(source, /current: \$Profile/);
  assert.doesNotMatch(source, /profiles:/);
  assert.doesNotMatch(source, /Set-Content -Path \$configPath/);
  assert.doesNotMatch(source, /TELROBOT_TOKEN is required/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const scriptsDir = __dirname;
const hasGo = spawnSync("go", ["version"], { encoding: "utf8" }).status === 0;

function createFakeCliSource(t) {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-cli-source-"));
  fs.writeFileSync(path.join(source, "go.mod"), "module fake-telrobot-cli\n\ngo 1.22\n");
  fs.writeFileSync(
    path.join(source, "main.go"),
    'package main\n\nimport "fmt"\n\nfunc main() { fmt.Println("dev cli") }\n',
  );
  t.after(() => fs.rmSync(source, { recursive: true, force: true }));
  return source;
}

function cliDestination(home) {
  const name = process.platform === "win32" ? "telrobot-cli.exe" : "telrobot-cli";
  return path.join(home, "bin", name);
}

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
});

test("setup.js dev mode discovers telrobot-saas-go next to the current workspace", { skip: !hasGo }, (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-workspace-"));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "telrobot-dev-discover-"));
  const source = path.join(workspace, "telrobot-saas-go", "telrobot-saas-cli");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, "go.mod"), "module fake-telrobot-cli\n\ngo 1.22\n");
  fs.writeFileSync(path.join(source, "main.go"), "package main\n\nfunc main() {}\n");
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
      "  apiVersion: v1",
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
      "  apiVersion: v1",
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

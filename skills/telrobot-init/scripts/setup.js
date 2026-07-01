#!/usr/bin/env node

const fs = require("node:fs");
const https = require("node:https");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

//后续根据实际上传地址修改
const defaultBaseUrl = "https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/latest";

function normalizePlatform(value) {
  switch (value) {
    case "darwin":
    case "linux":
    case "win32":
      return value;
    default:
      throw new Error(`Unsupported platform: ${value}`);
  }
}

function normalizeArch(value) {
  switch (value) {
    case "x64":
    case "amd64":
    case "x86_64":
      return "amd64";
    case "arm64":
    case "aarch64":
      return "arm64";
    default:
      throw new Error(`Unsupported architecture: ${value}`);
  }
}

function resolveTarget() {
  const platform = normalizePlatform(process.env.TELROBOT_TEST_PLATFORM || process.platform);
  const arch = normalizeArch(process.env.TELROBOT_TEST_ARCH || process.arch);

  if (platform === "win32" && arch !== "amd64") {
    throw new Error("Windows is currently supported only on amd64");
  }

  return { platform, arch };
}

function getAssetName(target) {
  const extension = target.platform === "win32" ? ".exe" : "";
  // 转换 platform 标识以匹配 build-release.sh 的命名规范
  // Node.js 使用 "win32"，但 Go 构建使用 "windows"
  const platformName = target.platform === "win32" ? "windows" : target.platform;
  return `telrobot-${platformName}-${target.arch}${extension}`;
}

function getBaseUrl() {
  if (process.env.TELROBOT_DOWNLOAD_BASE_URL) {
    return process.env.TELROBOT_DOWNLOAD_BASE_URL.replace(/\/$/, "");
  }
  return defaultBaseUrl;
}

function getTelrobotHome() {
  return process.env.TELROBOT_HOME || path.join(os.homedir(), ".telrobot-cli");
}

function getBinDir(telrobotHome) {
  return process.env.TELROBOT_BIN_DIR || path.join(telrobotHome, "bin");
}

function getDestination(assetName, binDir) {
  const executableName = assetName.endsWith(".exe") ? "telrobot-cli.exe" : "telrobot-cli";
  return path.join(binDir, executableName);
}

function parseArgValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return "";
  }
  return args[index + 1] || "";
}

function hasArg(args, name) {
  return args.includes(name);
}

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function isDevMode(args) {
  return hasArg(args, "--dev") || isTruthy(process.env.TELROBOT_DEV);
}

function isCliInstalled(destination) {
  const cliExists = fs.existsSync(destination);
  return { initialized: cliExists, cliExists };
}

function getInstallContext() {
  const target = resolveTarget();
  const assetName = getAssetName(target);
  const telrobotHome = getTelrobotHome();
  const binDir = getBinDir(telrobotHome);
  const destination = getDestination(assetName, binDir);

  return { target, assetName, telrobotHome, binDir, destination };
}

function findDefaultCliSource() {
  const bases = [process.cwd(), __dirname];
  try {
    bases.push(fs.realpathSync(__dirname));
  } catch {
    // Ignore realpath failures and use the literal script path candidates.
  }

  const seen = new Set();
  for (const base of bases) {
    let current = path.resolve(base);
    while (!seen.has(current)) {
      seen.add(current);
      const candidate = path.join(current, "telrobot-saas-go", "telrobot-saas-cli");
      if (fs.existsSync(path.join(candidate, "go.mod"))) {
        return candidate;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return "";
}

function resolveCliSource(args) {
  const explicitSource = parseArgValue(args, "--cli-source") || process.env.TELROBOT_CLI_SOURCE || "";
  const cliSource = explicitSource ? path.resolve(explicitSource) : findDefaultCliSource();

  if (!cliSource || !fs.existsSync(path.join(cliSource, "go.mod"))) {
    throw new Error(
      "DEV mode requires local telrobot-saas-cli source; pass --cli-source <path> or set TELROBOT_CLI_SOURCE",
    );
  }

  return cliSource;
}

function buildLocalCli(cliSource, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  console.log("🔨 DEV 模式：从本地源码编译 Telrobot CLI...");
  console.log(`📂 源码目录: ${cliSource}`);
  execFileSync("go", ["build", "-o", destination, "."], {
    cwd: cliSource,
    stdio: "inherit",
  });
  if (process.platform !== "win32") {
    fs.chmodSync(destination, 0o755);
  }
  console.log(`✅ 已安装本地编译 Telrobot CLI: ${destination}`);
}

function checkEnvironmentOnly() {
  const { destination } = getInstallContext();
  const status = isCliInstalled(destination);

  console.log(`Telrobot CLI: ${status.cliExists ? "present" : "missing"} (${destination})`);

  if (!status.initialized) {
    process.exitCode = 1;
  }
}

async function installCli(options = {}) {
  const { force = false, devMode = false, cliSource = "" } = options;
  const { assetName, destination } = getInstallContext();
  const url = `${getBaseUrl()}/${assetName}`;
  const status = isCliInstalled(destination);

  if (devMode) {
    buildLocalCli(cliSource, destination);
  } else if (force || !status.cliExists) {
    console.log("📥 正在下载 Telrobot CLI...");
    console.log(`🔗 URL: ${url}`);
    await download(url, destination);
    console.log(`✅ 已安装 Telrobot CLI: ${destination}`);
  } else {
    console.log("✅ Telrobot CLI 已存在，跳过下载");
  }

  console.log("🚀 Telrobot CLI 安装完成");
  console.log("ℹ️  配置文件由 telrobot-cli config 命令维护，setup 脚本不会写入 config.yaml");
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const file = fs.createWriteStream(destination, { mode: 0o755 });

    const client = url.startsWith("http://") ? http : https;
    client
      .get(url, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          file.close();
          fs.rmSync(destination, { force: true });
          download(response.headers.location, destination).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.rmSync(destination, { force: true });
          reject(new Error(`Download failed with HTTP ${response.statusCode}: ${url}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            if (process.platform !== "win32") {
              fs.chmodSync(destination, 0o755);
            }
            resolve();
          });
        });
      })
      .on("error", (error) => {
        file.close();
        fs.rmSync(destination, { force: true });
        reject(error);
      });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isCheckMode = args.includes('--check');
  const isDryRun = process.env.TELROBOT_SETUP_DRY_RUN === "1";
  const devMode = isDevMode(args);
  const force = args.includes('--force');

  if (isCheckMode) {
    checkEnvironmentOnly();
    return;
  }

  const cliSource = devMode ? resolveCliSource(args) : "";

  if (isDryRun) {
    const { target, assetName, destination } = getInstallContext();
    const url = `${getBaseUrl()}/${assetName}`;
    console.log(`platform: ${target.platform}`);
    console.log(`arch: ${target.arch}`);
    console.log(`asset: ${assetName}`);
    console.log(`url: ${url}`);
    console.log(`destination: ${destination}`);
    if (devMode) {
      console.log(`dev mode: true`);
      console.log(`cli source: ${cliSource}`);
    }
    return;
  }

  await installCli({ force, devMode, cliSource });
}

main().catch((error) => {
  process.stderr.write(`Failed to initialize Telrobot: ${error.message}\n`);
  process.exit(1);
});

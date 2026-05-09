#!/usr/bin/env node

const fs = require("node:fs");
const https = require("node:https");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

//后续根据实际上传地址修改
const defaultBaseUrl = "https://releases.telrobot.com/latest";

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
  return process.env.TELROBOT_HOME || path.join(os.homedir(), ".telrobot");
}

function getBinDir(telrobotHome) {
  return process.env.TELROBOT_BIN_DIR || path.join(telrobotHome, "bin");
}

function getDestination(assetName, binDir) {
  const executableName = assetName.endsWith(".exe") ? "telrobot-cli.exe" : "telrobot-cli";
  return path.join(binDir, executableName);
}

function getConfigPath(telrobotHome) {
  return process.env.TELROBOT_CONFIG_PATH || path.join(telrobotHome, "config.json");
}

function writeConfig(configPath, executablePath, apiUrl, token) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });

  const config = {
    executablePath,
    executableFound: true,
    //后续修改成实际的发布服务器地址
    apiUrl: apiUrl || "http://localhost:8001",
    version: "1.0.0"
  };

  if (token) {
    config.token = token;
  }

  fs.writeFileSync(
    configPath,
    `${JSON.stringify(config, null, 2)}\n`
  );
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
  const target = resolveTarget();
  const assetName = getAssetName(target);
  const url = `${getBaseUrl()}/${assetName}`;
  const telrobotHome = getTelrobotHome();
  const binDir = getBinDir(telrobotHome);
  const destination = getDestination(assetName, binDir);
  const configPath = getConfigPath(telrobotHome);
  const apiUrl = process.env.TELROBOT_API_URL;
  const token = process.env.TELROBOT_TOKEN;

  if (process.env.TELROBOT_SETUP_DRY_RUN === "1") {
    console.log(`platform: ${target.platform}`);
    console.log(`arch: ${target.arch}`);
    console.log(`asset: ${assetName}`);
    console.log(`url: ${url}`);
    console.log(`destination: ${destination}`);
    console.log(`config path: ${configPath}`);
    return;
  }

  console.log(`📥 Downloading Telrobot CLI for ${target.platform}-${target.arch}...`);
  console.log(`🔗 URL: ${url}`);

  await download(url, destination);
  writeConfig(configPath, destination, apiUrl, token);

  console.log(`✅ Installed Telrobot CLI: ${destination}`);
  console.log(`📝 Wrote config: ${configPath}`);
  console.log(`🚀 Ready to use! Agents will read executablePath from config.`);
}

main().catch((error) => {
  process.stderr.write(`Failed to initialize Telrobot: ${error.message}\n`);
  process.exit(1);
});
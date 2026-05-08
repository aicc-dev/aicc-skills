#!/usr/bin/env node

const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");

const defaultBaseUrl = "https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest";

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
      return "x64";
    case "arm64":
    case "aarch64":
      return "arm64";
    default:
      throw new Error(`Unsupported architecture: ${value}`);
  }
}

function resolveTarget() {
  const platform = normalizePlatform(process.env.AICC_TEST_PLATFORM || process.platform);
  const arch = normalizeArch(process.env.AICC_TEST_ARCH || process.arch);

  if (platform === "win32" && arch !== "x64") {
    throw new Error("Windows is currently supported only on x64");
  }

  return { platform, arch };
}

function getAssetName(target) {
  const extension = target.platform === "win32" ? ".exe" : "";
  return `aicc-${target.platform}-${target.arch}${extension}`;
}

function getBaseUrl() {
  if (process.env.AICC_DOWNLOAD_BASE_URL) {
    return process.env.AICC_DOWNLOAD_BASE_URL.replace(/\/$/, "");
  }

  return defaultBaseUrl;
}

function getDestination(assetName) {
  const binDir = process.env.AICC_BIN_DIR || path.join(os.homedir(), ".aicc", "bin");
  const executableName = assetName.endsWith(".exe") ? "aicc.exe" : "aicc";
  return path.join(binDir, executableName);
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const file = fs.createWriteStream(destination, { mode: 0o755 });

    https
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
  const destination = getDestination(assetName);

  if (process.env.AICC_SETUP_DRY_RUN === "1") {
    console.log(`platform: ${target.platform}`);
    console.log(`arch: ${target.arch}`);
    console.log(`asset: ${assetName}`);
    console.log(`url: ${url}`);
    console.log(`destination: ${destination}`);
    return;
  }

  await download(url, destination);
  console.log(`Installed AICC executable: ${destination}`);
}

main().catch((error) => {
  process.stderr.write(`Failed to initialize AICC: ${error.message}\n`);
  process.exit(1);
});

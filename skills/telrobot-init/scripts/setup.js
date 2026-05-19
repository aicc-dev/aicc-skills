#!/usr/bin/env node

const fs = require("node:fs");
const https = require("node:https");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

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

function getConfigPath(telrobotHome) {
  // CLI 实际读取的配置文件路径：~/.telrobot-cli/config.yaml
  return process.env.TELROBOT_CONFIG_PATH || path.join(telrobotHome, "config.yaml");
}

function writeConfig(configPath, executablePath, token) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });

  // 写入 YAML 格式配置（仅保留用户可变配置，baseURL 在 CLI 代码内部硬编码）
  const configLines = [
    'auth:',
    `  token: ${token || ''}`,
    'output:',
    '  format: table',
  ];

  fs.writeFileSync(configPath, configLines.join('\n') + '\n');
}

// 检测环境是否已初始化
function isEnvironmentInitialized(destination, configPath) {
  const cliExists = fs.existsSync(destination);
  const configExists = fs.existsSync(configPath);

  if (!cliExists || !configExists) {
    return { initialized: false, cliExists, configExists };
  }

  return { initialized: true, cliExists: true, configExists: true };
}

// 智能初始化（自动初始化除 Token 外的所有配置）
async function smartInit(options = {}) {
  const { skipCheck = false } = options;
  const target = resolveTarget();
  const assetName = getAssetName(target);
  const url = `${getBaseUrl()}/${assetName}`;
  const telrobotHome = getTelrobotHome();
  const binDir = getBinDir(telrobotHome);
  const destination = getDestination(assetName, binDir);
  const configPath = getConfigPath(telrobotHome);
  const apiUrl = process.env.TELROBOT_API_URL;
  const token = process.env.TELROBOT_TOKEN;

  // 检查环境状态
  const status = isEnvironmentInitialized(destination, configPath);

  if (status.initialized && skipCheck) {
    console.log("✅ 环境已初始化，无需重复配置");
    return true;
  }

  if (!status.cliExists) {
    console.log("📥 正在下载 Telrobot CLI...");
    console.log(`🔗 URL: ${url}`);
    await download(url, destination);
    console.log(`✅ 已安装 Telrobot CLI: ${destination}`);
  } else {
    console.log("✅ Telrobot CLI 已存在，跳过下载");
  }

  if (!status.configExists) {
    console.log("📝 正在生成配置文件...");
    writeConfig(configPath, destination, token || '');
    console.log(`📝 已创建配置文件: ${configPath}`);
  } else {
    console.log("✅ 配置文件已存在，跳过创建");
  }

  console.log("🚀 环境初始化完成");

  // Token 配置提示
  if (!token) {
    console.log("\n🔐 下一步：配置认证 Token");
    console.log("  telrobot-cli config set-token <your-token>");
  } else {
    console.log("\n✅ Token 已通过环境变量配置");
  }

  return true;
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

  // 智能初始化模式（推荐）
  if (isCheckMode || !args.includes('--force')) {
    await smartInit({ skipCheck: isCheckMode });
    return;
  }

  // 强制重新安装模式（传统模式）
  const target = resolveTarget();
  const assetName = getAssetName(target);
  const url = `${getBaseUrl()}/${assetName}`;
  const telrobotHome = getTelrobotHome();
  const binDir = getBinDir(telrobotHome);
  const destination = getDestination(assetName, binDir);
  const configPath = getConfigPath(telrobotHome);
  const token = process.env.TELROBOT_TOKEN;

  if (isDryRun) {
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
  writeConfig(configPath, destination, token);

  console.log(`✅ Installed Telrobot CLI: ${destination}`);
  console.log(`📝 Wrote config: ${configPath}`);
  
  // 检查是否配置了 Token
  if (!token) {
    console.log('\n⚠️  Token 未配置，请执行以下命令：');
    console.log('   telrobot-cli config set-token <your-token>');
    console.log('\n或使用环境变量一次性完成：');
    console.log('   TELROBOT_TOKEN=your-token node scripts/setup.js');
  } else {
    console.log('🚀 Ready to use! Agents will read executablePath from config.');
  }
}

main().catch((error) => {
  process.stderr.write(`Failed to initialize Telrobot: ${error.message}\n`);
  process.exit(1);
});
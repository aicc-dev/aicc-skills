#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function getTelrobotHome() {
  return process.env.TELROBOT_HOME || path.join(os.homedir(), ".telrobot-cli");
}

function getConfigPath(telrobotHome) {
  // CLI 实际读取的配置文件路径：~/.telrobot-cli/config.yaml
  return process.env.TELROBOT_CONFIG_PATH || path.join(telrobotHome, "config.yaml");
}

function getExecutablePath() {
  const telrobotHome = getTelrobotHome();
  const binDir = process.env.TELROBOT_BIN_DIR || path.join(telrobotHome, "bin");
  return process.env.TELROBOT_EXECUTABLE_PATH || path.join(binDir, "telrobot-cli");
}

function updateConfig(configPath, executablePath, token) {
  // 写入 YAML 格式配置（仅保留用户可变配置，baseURL 在 CLI 代码内部硬编码）
  const configLines = [
    'auth:',
    `  token: ${token}`,
    'output:',
    '  format: table',
  ];

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, configLines.join('\n') + '\n');

  return { token, configPath };
}

function main() {
  const args = process.argv.slice(2);
  const tokenFlagIndex = args.indexOf('--token');
  const token = process.env.TELROBOT_TOKEN ||
    (tokenFlagIndex !== -1 ? args[tokenFlagIndex + 1] : args[0]);

  if (!token) {
    console.error("Error: Token is required");
    console.error("Usage: node scripts/token-config.js --token <your-token>");
    console.error("Or: TELROBOT_TOKEN=your-token node scripts/token-config.js");
    process.exit(1);
  }

  const telrobotHome = getTelrobotHome();
  const configPath = getConfigPath(telrobotHome);
  const executablePath = getExecutablePath();

  // Verify executable exists
  if (!fs.existsSync(executablePath)) {
    console.warn(`Warning: Telrobot CLI not found at ${executablePath}`);
    console.warn("Please run telrobot:init first to install the CLI");
  }

  const config = updateConfig(configPath, executablePath, token);

  console.log("✅ Token configuration updated successfully");
  console.log(`📝 Config file: ${config.configPath}`);
  console.log(`🔑 Token: ${config.token.substring(0, 8)}...`);
}

main();

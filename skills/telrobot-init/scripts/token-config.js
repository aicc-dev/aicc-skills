#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function getTelrobotHome() {
  return process.env.TELROBOT_HOME || path.join(os.homedir(), ".telrobot");
}

function getConfigPath(telrobotHome) {
  return process.env.TELROBOT_CONFIG_PATH || path.join(telrobotHome, "config.json");
}

function getExecutablePath() {
  const telrobotHome = getTelrobotHome();
  const binDir = process.env.TELROBOT_BIN_DIR || path.join(telrobotHome, "bin");
  return process.env.TELROBOT_EXECUTABLE_PATH || path.join(binDir, "telrobot-cli");
}

function updateConfig(configPath, executablePath, token) {
  let config = {};

  // Read existing config if it exists
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not parse existing config, creating new one`);
    }
  }

  // Update or add fields
  config.executablePath = executablePath;
  config.executableFound = fs.existsSync(executablePath);
  config.token = token;
  config.apiUrl = config.apiUrl || "http://localhost:8001";
  config.version = config.version || "1.0.0";

  // Write updated config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  return config;
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
  console.log(`📝 Config file: ${configPath}`);
  console.log(`🔑 Token: ${token.substring(0, 8)}...`);
  console.log(`📂 Executable: ${config.executablePath}`);
  console.log(`🌐 API URL: ${config.apiUrl}`);
}

main();
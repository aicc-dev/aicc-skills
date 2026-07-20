#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const defaultProfileName = "默认用户";
const defaultCliBaseUrl = "https://ai.telrobot.top/cli";

function getTelrobotHome() {
  return process.env.TELROBOT_HOME || path.join(os.homedir(), ".telrobot-cli");
}

function getConfigPath(telrobotHome) {
  return process.env.TELROBOT_CONFIG_PATH || path.join(telrobotHome, "config.yaml");
}

function getExecutablePath() {
  const telrobotHome = getTelrobotHome();
  const binDir = process.env.TELROBOT_BIN_DIR || path.join(telrobotHome, "bin");
  return process.env.TELROBOT_EXECUTABLE_PATH || path.join(binDir, "telrobot-cli");
}

function parseArgValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return "";
  }
  return args[index + 1] || "";
}

function buildNewConfig(token, profileName) {
  const baseUrl = process.env.TELROBOT_API_URL || defaultCliBaseUrl;
  return [
    `current: ${profileName}`,
    "",
    "server:",
    `  baseURL: ${baseUrl}`,
    "",
    "output:",
    "  format: table",
    "",
    "profiles:",
    `  ${profileName}:`,
    "    auth:",
    `      token: ${token}`,
  ].join("\n") + "\n";
}

function findProfileBlock(lines, profileName) {
  let inProfiles = false;
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^profiles:\s*$/.test(line)) {
      inProfiles = true;
      continue;
    }
    if (!inProfiles) {
      continue;
    }
    if (/^[^ \t#][^:]*:\s*$/.test(line)) {
      break;
    }

    const match = line.match(/^  ([^ ].*):\s*$/);
    if (!match) {
      continue;
    }
    if (start !== -1) {
      end = i;
      break;
    }
    if (match[1].trim() === profileName) {
      start = i;
    }
  }

  return start === -1 ? null : { start, end };
}

function findProfilesSection(lines) {
  return lines.findIndex((line) => /^profiles:\s*$/.test(line));
}

function mergeTokenIntoConfig(content, token, profileName) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }

  const block = findProfileBlock(lines, profileName);
  if (block) {
    for (let i = block.start + 1; i < block.end; i += 1) {
      if (/^      token:\s*/.test(lines[i])) {
        lines[i] = `      token: ${token}`;
        return lines.join("\n") + "\n";
      }
    }

    lines.splice(block.start + 1, 0, "    auth:", `      token: ${token}`);
    return lines.join("\n") + "\n";
  }

  const profilesIndex = findProfilesSection(lines);
  if (profilesIndex === -1) {
    lines.push("", "profiles:");
  }

  lines.push(`  ${profileName}:`, "    auth:", `      token: ${token}`);
  return lines.join("\n") + "\n";
}

function updateConfig(configPath, token, profileName) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, buildNewConfig(token, profileName));
  } else {
    fs.writeFileSync(configPath, mergeTokenIntoConfig(fs.readFileSync(configPath, "utf8"), token, profileName));
  }

  return { token, profileName, configPath };
}

function main() {
  const args = process.argv.slice(2);
  const tokenFlag = parseArgValue(args, "--token");
  const token = (process.env.TELROBOT_TOKEN || tokenFlag || args[0] || "").trim();
  const profileName = parseArgValue(args, "--profile") || process.env.TELROBOT_PROFILE || defaultProfileName;

  if (!token || token === "--profile") {
    console.error("Error: Token is required");
    console.error("Usage: node scripts/token-config.js --profile <name> --token <your-token>");
    console.error("Or: TELROBOT_PROFILE=name TELROBOT_TOKEN=your-token node scripts/token-config.js");
    process.exit(1);
  }

  const telrobotHome = getTelrobotHome();
  const configPath = getConfigPath(telrobotHome);
  const executablePath = getExecutablePath();

  if (!fs.existsSync(executablePath)) {
    console.warn(`Warning: Telrobot CLI not found at ${executablePath}`);
    console.warn("Please run telrobot:init first to install the CLI");
  }

  const config = updateConfig(configPath, token, profileName);

  console.log("Token configuration updated successfully");
  console.log(`Config file: ${config.configPath}`);
  console.log(`Profile: ${config.profileName}`);
  console.log(`Token: ${config.token.substring(0, 8)}...`);
}

main();

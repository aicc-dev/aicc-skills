#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");

function getTelrobotHome() {
  return process.env.TELROBOT_HOME || path.join(os.homedir(), ".telrobot-cli");
}

function getConfigPath(telrobotHome) {
  return process.env.TELROBOT_CONFIG_PATH || path.join(telrobotHome, "config.yaml");
}

function parseArgValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return "";
  }
  return args[index + 1] || "";
}

async function promptValue(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

function listProfiles(content) {
  const profiles = [];
  let inProfiles = false;

  for (const line of content.split(/\r?\n/)) {
    if (/^profiles:\s*$/.test(line)) {
      inProfiles = true;
      continue;
    }
    if (inProfiles && /^[^ \t#][^:]*:\s*$/.test(line)) {
      break;
    }
    if (!inProfiles) {
      continue;
    }

    const match = line.match(/^  ([^ ].*):\s*$/);
    if (match) {
      profiles.push(match[1].trim());
    }
  }

  return profiles;
}

function setCurrentProfile(content, profileName) {
  if (/^current:\s*.*$/m.test(content)) {
    return content.replace(/^current:\s*.*$/m, `current: ${profileName}`);
  }
  return `current: ${profileName}\n${content}`;
}

async function resolveProfile(args) {
  let profileName = parseArgValue(args, "--profile") || process.env.TELROBOT_PROFILE || "";
  if (!profileName && args[0] && !args[0].startsWith("-")) {
    profileName = args[0];
  }
  profileName = profileName.trim();

  if (!profileName && process.stdin.isTTY && process.stdout.isTTY) {
    profileName = await promptValue("请输入要切换为当前用户/profile 的别名: ");
  }

  if (!profileName) {
    throw new Error("profile is required; use --profile <alias>");
  }

  return profileName;
}

async function main() {
  const args = process.argv.slice(2);
  const profileName = await resolveProfile(args);
  const telrobotHome = getTelrobotHome();
  const configPath = getConfigPath(telrobotHome);

  if (!fs.existsSync(configPath)) {
    throw new Error(`config file does not exist: ${configPath}`);
  }

  const content = fs.readFileSync(configPath, "utf8");
  const profiles = listProfiles(content);
  if (!profiles.includes(profileName)) {
    throw new Error(`profile does not exist: ${profileName}`);
  }

  fs.writeFileSync(configPath, setCurrentProfile(content, profileName));

  console.log(`Current profile updated: ${profileName}`);
  console.log(`Config file: ${configPath}`);
}

main().catch((error) => {
  process.stderr.write(`Failed to switch current profile: ${error.message}\n`);
  process.exit(1);
});

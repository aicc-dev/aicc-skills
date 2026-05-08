#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--token") {
      options.token = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--token=")) {
      options.token = arg.slice("--token=".length);
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return options;
}

function getAiccHome() {
  return process.env.AICC_HOME || path.join(os.homedir(), ".aicc");
}

function getExecutablePath(aiccHome) {
  if (process.env.AICC_EXECUTABLE_PATH) {
    return process.env.AICC_EXECUTABLE_PATH;
  }

  const executableName = process.platform === "win32" ? "aicc.exe" : "aicc";
  return path.join(aiccHome, "bin", executableName);
}

function canExecute(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    if (process.platform !== "win32") {
      fs.accessSync(filePath, fs.constants.X_OK);
    }
    return true;
  } catch {
    return false;
  }
}

function writeConfig(configPath, config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = args.token || process.env.AICC_TOKEN || "mock-token";
  const aiccHome = getAiccHome();
  const executablePath = getExecutablePath(aiccHome);
  const executableFound = canExecute(executablePath);
  const configPath = process.env.AICC_CONFIG_PATH || path.join(aiccHome, "config.json");

  writeConfig(configPath, {
    token,
    executablePath,
    executableFound
  });

  console.log(`aicc executable: ${executableFound ? "found" : "missing"}`);
  console.log(`executable path: ${executablePath}`);
  console.log(`config path: ${configPath}`);
  console.log(`token: ${token}`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Failed to write mock AICC token: ${error.message}\n`);
  process.exit(1);
}

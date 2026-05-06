#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const skillName = "aicc-skills";
const packageRoot = path.resolve(__dirname, "..");
const sourceSkillDir = path.join(packageRoot, "skills", skillName);

function getSkillsRoot() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  return path.join(codexHome, "skills");
}

function installSkill() {
  const skillsRoot = getSkillsRoot();
  const destinationSkillDir = path.join(skillsRoot, skillName);

  fs.mkdirSync(skillsRoot, { recursive: true });
  fs.rmSync(destinationSkillDir, { recursive: true, force: true });
  fs.cpSync(sourceSkillDir, destinationSkillDir, { recursive: true });
}

try {
  installSkill();
  console.log("hello");
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  process.stderr.write(`Failed to install ${skillName}: ${message}\n`);
  process.exit(1);
}

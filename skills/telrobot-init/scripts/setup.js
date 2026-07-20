#!/usr/bin/env node

const fs = require("node:fs");
const crypto = require("node:crypto");
const https = require("node:https");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

//后续根据实际上传地址修改
const defaultBaseUrl = "https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/latest";
// 发布 manifest 同时提供最新版本、平台下载地址和文件校验值。
const defaultCliManifestUrl = "https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/releases/manifest.json";
const defaultSkillsRepo = "aicc-dev/aicc-skills";
const defaultSkillsPackageUrl = "https://raw.githubusercontent.com/aicc-dev/aicc-skills/main/package.json";
const bundledSkillVersion = "2.3.0";

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

function isSkillUpdateDisabled() {
  return isTruthy(process.env.TELROBOT_SKILL_UPDATE_DISABLED);
}

function isSkillUpdateVerbose() {
  return isTruthy(process.env.TELROBOT_SKILL_UPDATE_VERBOSE);
}

function isCliUpdateDisabled() {
  return isTruthy(process.env.TELROBOT_CLI_UPDATE_DISABLED);
}

function isCliUpdateVerbose() {
  return isTruthy(process.env.TELROBOT_CLI_UPDATE_VERBOSE);
}

function getSkillsRepo(args = []) {
  return parseArgValue(args, "--skills-repo") || process.env.TELROBOT_SKILL_UPDATE_REPO || defaultSkillsRepo;
}

function getSkillsPackageSource(args = []) {
  if (process.env.TELROBOT_SKILL_UPDATE_PACKAGE_URL) {
    return process.env.TELROBOT_SKILL_UPDATE_PACKAGE_URL;
  }

  const repo = getSkillsRepo(args);
  const repoPath = path.resolve(repo);
  if (fs.existsSync(repoPath)) {
    return path.join(repoPath, "package.json");
  }

  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return `https://raw.githubusercontent.com/${repo}/main/package.json`;
  }

  return defaultSkillsPackageUrl;
}

function readPackageVersion(packageJsonPath, expectedName = "") {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (expectedName && packageJson.name !== expectedName) {
      return "";
    }
    return String(packageJson.version || "").trim();
  } catch {
    return "";
  }
}

function findLocalSkillPackageVersion(startDir = __dirname) {
  const seen = new Set();
  let current = path.resolve(startDir);

  while (!seen.has(current)) {
    seen.add(current);
    const candidate = path.join(current, "package.json");
    const version = readPackageVersion(candidate, "telrobot-skills");
    if (version) {
      return version;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return "";
}

function getCurrentSkillVersion() {
  return process.env.TELROBOT_SKILL_VERSION || findLocalSkillPackageVersion() || bundledSkillVersion;
}

function parseComparableVersion(value) {
  const clean = String(value || "").trim().replace(/^v/i, "");
  const [coreAndBuild, prerelease = ""] = clean.split("-", 2);
  const [core] = coreAndBuild.split("+", 1);
  const parts = core.split(".").map((part) => Number.parseInt(part, 10));
  while (parts.length < 3) {
    parts.push(0);
  }
  return {
    numbers: parts.slice(0, 3).map((part) => (Number.isFinite(part) ? part : 0)),
    prerelease,
  };
}

function compareVersions(left, right) {
  const a = parseComparableVersion(left);
  const b = parseComparableVersion(right);

  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) {
      return a.numbers[index] > b.numbers[index] ? 1 : -1;
    }
  }

  if (a.prerelease && !b.prerelease) {
    return -1;
  }
  if (!a.prerelease && b.prerelease) {
    return 1;
  }
  if (a.prerelease !== b.prerelease) {
    return a.prerelease > b.prerelease ? 1 : -1;
  }
  return 0;
}

function isComparableVersion(value) {
  return /^v?\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(String(value || "").trim());
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmpPath, filePath);
}

function getSkillUpdateStatePath() {
  return process.env.TELROBOT_SKILL_UPDATE_STATE || path.join(getTelrobotHome(), "skill-update-state.json");
}

function getTodayString(date = new Date()) {
  if (process.env.TELROBOT_SKILL_UPDATE_TODAY) {
    return process.env.TELROBOT_SKILL_UPDATE_TODAY;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fetchText(source, redirectCount = 0) {
  if (source.startsWith("file://")) {
    return Promise.resolve(fs.readFileSync(new URL(source), "utf8"));
  }

  if (!/^https?:\/\//.test(source)) {
    return Promise.resolve(fs.readFileSync(path.resolve(source), "utf8"));
  }

  if (redirectCount > 5) {
    return Promise.reject(new Error(`Too many redirects while reading ${source}`));
  }

  return new Promise((resolve, reject) => {
    const client = source.startsWith("http://") ? http : https;
    client
      .get(source, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          const nextUrl = new URL(response.headers.location, source).toString();
          response.resume();
          fetchText(nextUrl, redirectCount + 1).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Failed to read ${source}: HTTP ${response.statusCode}`));
          return;
        }

        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
          if (body.length > 1024 * 1024) {
            response.destroy(new Error(`Response too large while reading ${source}`));
          }
        });
        response.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

async function getLatestSkillVersion(args = []) {
  const source = getSkillsPackageSource(args);
  let packageJson;
  try {
    packageJson = JSON.parse(await fetchText(source));
  } catch (error) {
    throw new Error(`Unable to read remote skill package version from ${source}: ${error.message}`);
  }

  const version = String(packageJson.version || "").trim();
  if (!version) {
    throw new Error(`Remote skill package version is missing in ${source}`);
  }

  return { version, source };
}

async function checkSkillUpdate(args = []) {
  if (isSkillUpdateDisabled()) {
    return { status: "disabled" };
  }

  const currentVersion = getCurrentSkillVersion();
  const latest = await getLatestSkillVersion(args);
  if (compareVersions(currentVersion, latest.version) >= 0) {
    return { status: "current", currentVersion, latestVersion: latest.version };
  }

  const statePath = getSkillUpdateStatePath();
  const state = readJsonFile(statePath, {});
  const today = getTodayString();

  if (state.lastPromptDate === today && !hasArg(args, "--force-skill-update-prompt")) {
    return { status: "suppressed", currentVersion, latestVersion: latest.version };
  }

  writeJsonFile(statePath, {
    ...state,
    lastPromptDate: today,
    lastPromptedAt: new Date().toISOString(),
    lastPromptCurrentVersion: currentVersion,
    lastPromptVersion: latest.version,
    lastPackageSource: latest.source,
  });

  console.log("skill版本已更新，是否需要帮您更新？");
  console.log(`当前版本: ${currentVersion}`);
  console.log(`最新版本: ${latest.version}`);
  console.log("用户同意后执行: node scripts/setup.js --skill-update-apply --agent <agent-name>");

  return { status: "prompted", currentVersion, latestVersion: latest.version };
}

async function checkSkillUpdateQuietly(args = []) {
  try {
    return await checkSkillUpdate(args);
  } catch (error) {
    if (isSkillUpdateVerbose()) {
      console.error(`Skill update check skipped: ${error.message}`);
    }
    return { status: "failed", error };
  }
}

function getCliManifestSource(args = []) {
  return (
    parseArgValue(args, "--cli-manifest-url") ||
    process.env.TELROBOT_CLI_UPDATE_MANIFEST_URL ||
    defaultCliManifestUrl
  );
}

function getCliUpdateStatePath() {
  return process.env.TELROBOT_CLI_UPDATE_STATE || getSkillUpdateStatePath();
}

function getManifestAssetKey(target) {
  const platform = target.platform === "win32" ? "windows" : target.platform;
  return `${platform}-${target.arch}`;
}

function getCurrentCliVersion(destination) {
  // 测试可显式覆盖；生产环境始终以已安装二进制自身报告的版本为准。
  const override = String(process.env.TELROBOT_CLI_CURRENT_VERSION || "").trim();
  if (override) {
    return override;
  }

  let output;
  try {
    output = execFileSync(destination, ["version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(`Unable to execute local telrobot-cli version command: ${error.message}`);
  }

  const match = output.match(/^Version:\s*(\S+)\s*$/im);
  const version = match ? match[1].trim() : "";
  if (!isComparableVersion(version)) {
    throw new Error(`Unable to parse local telrobot-cli version: ${version || "missing"}`);
  }
  return version;
}

async function getLatestCliRelease(args = []) {
  const source = getCliManifestSource(args);
  let manifest;
  try {
    manifest = JSON.parse(await fetchText(source));
  } catch (error) {
    throw new Error(`Unable to read telrobot-cli release manifest from ${source}: ${error.message}`);
  }

  const version = String(manifest.version || "").trim();
  if (!isComparableVersion(version)) {
    throw new Error(`CLI release version is missing or invalid in ${source}`);
  }

  const { target } = getInstallContext();
  const assetKey = getManifestAssetKey(target);
  const asset = manifest.assets && manifest.assets[assetKey];
  // 检查阶段就确认平台产物存在，避免提示一个实际上无法安装的版本。
  if (!asset || !asset.url) {
    throw new Error(`CLI release asset ${assetKey} is missing in ${source}`);
  }

  return { version, source, assetKey, asset };
}

async function checkCliUpdate(args = []) {
  if (isCliUpdateDisabled()) {
    return { status: "disabled" };
  }

  const { destination } = getInstallContext();
  if (!fs.existsSync(destination)) {
    return { status: "missing" };
  }

  const currentVersion = getCurrentCliVersion(destination);
  const latest = await getLatestCliRelease(args);
  if (compareVersions(currentVersion, latest.version) >= 0) {
    return { status: "current", currentVersion, latestVersion: latest.version };
  }

  const statePath = getCliUpdateStatePath();
  const state = readJsonFile(statePath, {});
  const today = getTodayString();
  // Skill 与 CLI 可以共用状态文件，但分别限频，互不压制提醒。
  if (state.lastCliPromptDate === today && !hasArg(args, "--force-cli-update-prompt")) {
    return { status: "suppressed", currentVersion, latestVersion: latest.version };
  }

  writeJsonFile(statePath, {
    ...state,
    lastCliPromptDate: today,
    lastCliPromptedAt: new Date().toISOString(),
    lastCliPromptCurrentVersion: currentVersion,
    lastCliPromptVersion: latest.version,
    lastCliManifestSource: latest.source,
  });

  console.log("telrobot-saas-cli版本已更新，是否需要帮您更新？");
  console.log(`当前版本: ${currentVersion}`);
  console.log(`最新版本: ${latest.version}`);
  console.log("用户同意后执行: node scripts/setup.js --cli-update-apply");

  return { status: "prompted", currentVersion, latestVersion: latest.version };
}

async function checkCliUpdateQuietly(args = []) {
  try {
    return await checkCliUpdate(args);
  } catch (error) {
    if (isCliUpdateVerbose()) {
      console.error(`CLI update check skipped: ${error.message}`);
    }
    return { status: "failed", error };
  }
}

function calculateSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function replaceDownloadedCli(source, destination) {
  try {
    // POSIX rename 可原子替换；Windows 已存在目标文件时需要先删除。
    fs.renameSync(source, destination);
  } catch (error) {
    if (process.platform !== "win32" || !["EEXIST", "EPERM"].includes(error.code)) {
      throw error;
    }
    fs.rmSync(destination, { force: true });
    fs.renameSync(source, destination);
  }
}

async function applyCliUpdate(args = []) {
  const latest = await getLatestCliRelease(args);
  const { destination } = getInstallContext();
  const expectedSha256 = String(latest.asset.sha256 || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error(`CLI release asset ${latest.assetKey} has no valid SHA-256 checksum`);
  }

  const tempDestination = `${destination}.${process.pid}.update`;
  console.log(`📥 正在更新 Telrobot CLI: ${latest.version}`);
  console.log(`🔗 URL: ${latest.asset.url}`);

  try {
    // 保留旧 CLI，直到临时文件下载完成并通过发布清单中的 SHA-256 校验。
    await download(latest.asset.url, tempDestination);
    const actualSha256 = calculateSha256(tempDestination);
    if (actualSha256 !== expectedSha256) {
      throw new Error(`CLI checksum mismatch: expected ${expectedSha256}, received ${actualSha256}`);
    }
    replaceDownloadedCli(tempDestination, destination);
  } finally {
    fs.rmSync(tempDestination, { force: true });
  }

  const statePath = getCliUpdateStatePath();
  const state = readJsonFile(statePath, {});
  writeJsonFile(statePath, {
    ...state,
    lastCliUpdatedAt: new Date().toISOString(),
    lastCliUpdatedVersion: latest.version,
    lastCliManifestSource: latest.source,
  });

  console.log(`✅ Telrobot CLI 已更新至 ${latest.version}`);
}

async function applySkillUpdate(args = []) {
  const agentName = parseArgValue(args, "--agent") || process.env.TELROBOT_SKILL_UPDATE_AGENT || "";
  if (!agentName) {
    throw new Error("Skill update requires --agent <agent-name> or TELROBOT_SKILL_UPDATE_AGENT");
  }

  const repo = getSkillsRepo(args);
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  console.log(`📦 正在更新 Telrobot skills: ${repo} -> ${agentName}`);
  execFileSync(npxCommand, ["skills", "add", repo, "-a", agentName, "-g", "-y"], {
    stdio: "inherit",
  });

  const statePath = getSkillUpdateStatePath();
  const state = readJsonFile(statePath, {});
  writeJsonFile(statePath, {
    ...state,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedAgent: agentName,
    lastUpdatedRepo: repo,
  });

  console.log("✅ Telrobot skills 更新完成");
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

function optionalCommandOutput(command, args, cwd, fallback) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function formatBuildTime(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function getBuildMetadata(cliSource) {
  const version =
    process.env.TELROBOT_CLI_VERSION ||
    optionalCommandOutput("git", ["describe", "--tags", "--always", "--dirty"], cliSource, "dev");
  const buildTime = process.env.TELROBOT_BUILD_TIME || formatBuildTime();
  const gitCommit =
    process.env.TELROBOT_GIT_COMMIT || optionalCommandOutput("git", ["rev-parse", "--short", "HEAD"], cliSource, "unknown");

  return { version, buildTime, gitCommit };
}

function buildLdflags(metadata) {
  return [
    "-s",
    "-w",
    `-X main.version=${metadata.version}`,
    `-X main.buildTime=${metadata.buildTime}`,
    `-X main.gitCommit=${metadata.gitCommit}`,
  ].join(" ");
}

function buildLocalCli(cliSource, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const metadata = getBuildMetadata(cliSource);
  console.log("🔨 DEV 模式：从本地源码编译 Telrobot CLI...");
  console.log(`📂 源码目录: ${cliSource}`);
  console.log(`🏷️  版本信息: ${metadata.version} (${metadata.gitCommit})`);
  execFileSync("go", ["build", "-ldflags", buildLdflags(metadata), "-o", destination, "."], {
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
  if (url.startsWith("file://") || !/^https?:\/\//.test(url)) {
    const source = url.startsWith("file://") ? new URL(url) : path.resolve(url);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    if (process.platform !== "win32") {
      fs.chmodSync(destination, 0o755);
    }
    return Promise.resolve();
  }

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
  const isSkillUpdateCheck = args.includes("--skill-update-check");
  const isSkillUpdateApply = args.includes("--skill-update-apply");
  const isCliUpdateCheck = args.includes("--cli-update-check");
  const isCliUpdateApply = args.includes("--cli-update-apply");
  const isDryRun = process.env.TELROBOT_SETUP_DRY_RUN === "1";
  const devMode = isDevMode(args);
  const force = args.includes('--force');

  if (isSkillUpdateCheck) {
    await checkSkillUpdateQuietly(args);
    return;
  }

  if (isSkillUpdateApply) {
    await applySkillUpdate(args);
    return;
  }

  if (isCliUpdateCheck) {
    await checkCliUpdateQuietly(args);
    return;
  }

  if (isCliUpdateApply) {
    await applyCliUpdate(args);
    return;
  }

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

# AICC Skills

AICC agent skills package for agents that support the `skills` CLI ecosystem.

## Install

Replace `<github-owner>/<repo>` with the GitHub repository that hosts this package.

```bash
npx skills add <github-owner>/<repo> -a codex -g -y
npx skills add <github-owner>/<repo> -a claude-code -g -y
npx skills add <github-owner>/<repo> -a codebuddy -g -y
```

For WorkBuddy, use the `skills` CLI agent id `codebuddy`.

For local development, run from the repository root:

```bash
npx skills add . --list
npx skills add . -a codex -g -y
```

## Contents

```text
skills/aicc-skills/SKILL.md
skills/aicc-skills/agents/openai.yaml
skills/aicc-init/SKILL.md
skills/aicc-init/scripts/setup.js
skills/aicc-init/scripts/setup.sh
skills/aicc-init/scripts/setup.ps1
```

## Initialize AICC Executable

After installing the skills, ask the agent to use `aicc-init` to initialize AICC.

The init skill downloads the executable that matches the current OS and CPU from AICC OSS and installs it into `~/.aicc/bin`.

If Node.js is available, run from the `skills/aicc-init` directory:

```bash
node scripts/setup.js
```

On macOS or Linux without Node.js:

```bash
sh scripts/setup.sh
```

On Windows without Node.js:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

The release assets are expected to use these names:

```text
aicc-darwin-arm64
aicc-darwin-x64
aicc-linux-arm64
aicc-linux-x64
aicc-win32-x64.exe
```

By default the scripts download from:

```text
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest/<asset>
```

Set `AICC_DOWNLOAD_BASE_URL` to point at a different OSS directory.

## Build AICC Binaries

The example Go CLI is in `cmd/aicc`. It prints the CLI name, version, and runtime platform, and supports `--version`.

Build all release assets with:

```bash
scripts/build-aicc.sh
```

The build script writes:

```text
dist/aicc-darwin-arm64
dist/aicc-darwin-x64
dist/aicc-linux-arm64
dist/aicc-linux-x64
dist/aicc-win32-x64.exe
```

Upload those files to:

```text
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest/
```

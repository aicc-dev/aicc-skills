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

Public skill names:

```text
aicc:init
aicc:task
```

Repository paths:

```text
skills/aicc-skills/SKILL.md
skills/aicc-skills/agents/openai.yaml
skills/aicc-init/SKILL.md
skills/aicc-init/scripts/setup.js
skills/aicc-init/scripts/setup.sh
skills/aicc-init/scripts/setup.ps1
skills/aicc-init/scripts/token-mock.js
```

## Initialize AICC Executable

After installing the skills, ask the agent to use `aicc:init` to initialize AICC.

The init skill downloads the executable that matches the current OS and CPU from AICC OSS, installs it into `~/.aicc/bin`, and writes `~/.aicc/config.json`.
Agents should invoke AICC through the `executablePath` value in that config instead of relying on PATH.

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

## Mock Local Token Config

`aicc:init` also includes a token config mock. It checks whether the local `aicc` executable exists, then writes token config JSON to `~/.aicc/config.json`.

Run from the `skills/aicc-init` directory:

```bash
node scripts/token-mock.js --token mock-token
```

Or provide the token via environment:

```bash
AICC_TOKEN=mock-token node scripts/token-mock.js
```

The mock JSON shape is:

```json
{
  "token": "mock-token",
  "executablePath": "/Users/example/.aicc/bin/aicc",
  "executableFound": true
}
```

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

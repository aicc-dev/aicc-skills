---
name: aicc:init
description: Initialize AICC by downloading the platform-specific executable, checking the local binary, and writing token config.
---

# AICC Init

Use this skill when the user asks to initialize AICC, install the AICC executable, run AICC setup, or fix a missing AICC binary.
Also use it when the user asks to set, mock, or verify the local AICC token configuration.

## Behavior

Run one setup script from this skill directory. Do not assume Node.js is available, especially in WorkBuddy installs that came from a GitHub URL.

Preferred order:

1. If Node.js is available:

```bash
node scripts/setup.js
```

2. On macOS or Linux without Node.js:

```bash
sh scripts/setup.sh
```

3. On Windows without Node.js:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

The scripts detect the current OS and CPU, download the matching executable from AICC OSS, install it into `~/.aicc/bin`, and write `~/.aicc/config.json`.
Agents should invoke AICC through the `executablePath` value in that config instead of relying on PATH.

## Token Mock

For local token setup mock behavior, run:

```bash
node scripts/token-mock.js --token mock-token
```

This script checks whether `~/.aicc/bin/aicc` exists and is executable, then writes:

```text
~/.aicc/config.json
```

The mock JSON shape is:

```json
{
  "token": "mock-token",
  "executablePath": "~/.aicc/bin/aicc",
  "executableFound": true
}
```

## Supported Targets

- `darwin-arm64`
- `darwin-x64`
- `linux-arm64`
- `linux-x64`
- `win32-x64`

## Configuration

The setup scripts support these environment variables:

- `AICC_DOWNLOAD_BASE_URL`: override the OSS base URL.
- `AICC_BIN_DIR`: override the install directory.
- `AICC_HOME`: override the `.aicc` home directory for token mock config.
- `AICC_TOKEN`: token value used by `token-mock.js` when `--token` is omitted.
- `AICC_CONFIG_PATH`: override the token mock config JSON path.
- `AICC_EXECUTABLE_PATH`: override the executable path checked by token mock.
- `AICC_SETUP_DRY_RUN=1`: print the resolved asset, URL, and destination without downloading.

The default download base URL is:

```text
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest
```

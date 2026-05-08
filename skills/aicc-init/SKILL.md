---
name: aicc-init
description: Initialize AICC by downloading the platform-specific executable for the current OS and CPU.
---

# AICC Init

Use this skill when the user asks to initialize AICC, install the AICC executable, run AICC setup, or fix a missing AICC binary.

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

The scripts detect the current OS and CPU, download the matching executable from AICC OSS, install it into `~/.aicc/bin`, and print the installed path.

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
- `AICC_SETUP_DRY_RUN=1`: print the resolved asset, URL, and destination without downloading.

The default download base URL is:

```text
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest
```

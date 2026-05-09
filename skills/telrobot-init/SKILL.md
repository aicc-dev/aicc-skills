---
name: telrobot:init
description: Initialize Telrobot CLI environment by downloading platform-specific executable and configuring local settings.
---

# Telrobot Init

Use this skill when the user asks to initialize Telrobot, install the Telrobot CLI executable, run Telrobot setup, or fix a missing Telrobot binary.
Also use it when the user asks to set, configure, or verify the local Telrobot token and API configuration.

## Behavior

Run one setup script from this skill directory. Do not assume Node.js is available.

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

> Windows only supports `amd64` architecture. The script detects `$env:PROCESSOR_ARCHITECTURE` automatically.

The scripts detect the current OS and CPU, download the matching Telrobot CLI executable from the release server, install it into `~/.telrobot/bin`, and write `~/.telrobot/config.json`.

Agents should invoke Telrobot CLI through the `executablePath` value in that config instead of relying on PATH.

## Configuration

After initialization, create the config file at `~/.telrobot/config.json`:

```json
{
  "executablePath": "/Users/example/.telrobot/bin/telrobot-cli",
  "executableFound": true,
  "apiUrl": "https://api.telrobot.com",
  "token": "user-token-here"
}
```

## Supported Targets

- `darwin-amd64` (macOS Intel)
- `darwin-arm64` (macOS Apple Silicon)
- `linux-amd64` (Linux x86_64)
- `linux-arm64` (Linux ARM64)
- `windows-amd64.exe` (Windows x86_64)

## Environment Variables

The setup scripts support these environment variables:

- `TELROBOT_DOWNLOAD_BASE_URL`: override the download base URL
- `TELROBOT_BIN_DIR`: override the install directory (default: `~/.telrobot/bin`)
- `TELROBOT_HOME`: override the Telrobot home directory
- `TELROBOT_CONFIG_PATH`: override the config file path
- `TELROBOT_API_URL`: override the API URL
- `TELROBOT_TOKEN`: set the API token
- `TELROBOT_SETUP_DRY_RUN=1`: print the resolved asset, URL, and destination without downloading

The default download base URL is:
```
https://releases.telrobot.com/latest
```

## Token Configuration

For API token configuration, you can:

1. Set during initialization via environment variable:
```bash
TELROBOT_TOKEN=your-token node scripts/setup.js
```

On Windows (PowerShell):
```powershell
$env:TELROBOT_TOKEN="your-token"; powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

2. Configure manually by editing `~/.telrobot/config.json`

3. Use the token config script:
```bash
node scripts/token-config.js --token your-token
```

## Usage Example

After initialization, other skills should read the config:

```javascript
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const configPath = path.join(os.homedir(), '.telrobot', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const executable = config.executablePath;

// Execute: ~/.telrobot/bin/telrobot-cli task list
executeCommand(executable, ['task', 'list']);
```
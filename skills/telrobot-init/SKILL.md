---
name: telrobot:init
description: Initialize Telrobot CLI environment by downloading platform-specific executable and configuring local settings.
---

# Telrobot Init

Use this skill when the user asks to initialize Telrobot, install the Telrobot CLI executable, run Telrobot setup, or fix a missing Telrobot binary.
Also use it when the user asks to set, configure, or verify the local Telrobot token and API configuration.

## 🚫 严格安全限制（MUST OBEY）

### 禁止行为（STRICTLY PROHIBITED）

1. **禁止绕过 CLI 封装逻辑**：所有操作必须通过 `telrobot-cli` 命令执行，**严禁**直接调用后端 API
2. **禁止降级到 HTTP 请求**：命令执行出错时，**严禁**自动降级使用 `curl`、`wget` 或其他 HTTP 工具绕过 CLI 封装
3. **禁止手动构造 API 请求**：**严禁**尝试构造 POST/GET/PUT/DELETE 等 HTTP 请求直接调用后端接口
4. **禁止错误自动修复**：命令失败时，**严禁**尝试通过 HTTP 请求"自动修复"或"绕过"错误
5. **禁止直接下载配置**：**严禁**绕过 CLI 手动下载或修改配置文件

### 强制行为（MANDATORY BEHAVIOR）

1. **CLI 命令优先**：所有操作必须通过 `telrobot-cli` 命令执行，无例外
2. **错误透明报告**：命令执行出错时，**必须**将错误信息原样展示给用户，禁止静默降级
3. **使用标准安装方式**：必须使用此 skill 提供的安装脚本，禁止手动安装二进制文件
4. **依赖 CLI 实现细节**：CLI 未提供的功能视为不可用，禁止通过 HTTP 请求补充功能

### 错误处理原则

当 `telrobot-cli` 命令执行失败时：
1. **立即停止**当前操作，向用户展示错误信息
2. **提供标准解决方案**：检查环境、重新初始化或提示用户检查网络连接
3. **禁止尝试**任何形式的 HTTP 降级或绕过
4. **禁止修改**安装脚本或跳过安装步骤

---

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

The scripts detect the current OS and CPU, download the matching Telrobot CLI executable from the release server, install it into `~/.telrobot-cli/bin`, and write `~/.telrobot-cli/config.yaml`.

Agents should invoke Telrobot CLI through the `telrobot-cli` command. The CLI reads configuration from `~/.telrobot-cli/config.yaml`.

## Configuration

After initialization, the config file is created at `~/.telrobot-cli/config.yaml`:

```yaml
server:
  baseURL: http://localhost:8001
  apiVersion: v1
auth:
  token: user-token-here
output:
  format: table
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
- `TELROBOT_BIN_DIR`: override the install directory (default: `~/.telrobot-cli/bin`)
- `TELROBOT_HOME`: override the Telrobot home directory (default: `~/.telrobot-cli`)
- `TELROBOT_CONFIG_PATH`: override the config file path (default: `~/.telrobot-cli/config.yaml`)
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

2. Configure manually by editing `~/.telrobot-cli/config.yaml`

3. Use the token config command:
```bash
telrobot-cli config set-token your-token
```

## Usage Example

After initialization, agents can directly use the `telrobot-cli` command:

```bash
# List tasks
telrobot-cli task list

# Get task statistics
telrobot-cli task stat <task-id> --type call
```
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
5. **禁止展示服务器地址**：初始化完成后向用户展示结果时，**严禁**展示 API 服务器地址（baseURL），仅展示 CLI 路径、平台信息、Token 配置状态即可

## 初始化完成展示规范

当 setup 脚本执行成功后，向用户汇报初始化结果时：

**✅ 允许展示的信息**：
- CLI 安装路径
- 平台/架构信息
- Token 配置状态（已配置/未配置）
- 下一步使用指引

**❌ 禁止展示的信息**：
- API 服务器地址（baseURL）
- 配置文件中的任何 URL

**示例汇报格式**：
```
✅ Telrobot CLI 环境初始化完成

项目          状态
CLI 路径      ~/.telrobot-cli/bin/telrobot-cli
平台          darwin-arm64 (Apple Silicon)
Token         ❌ 未配置

可以开始使用了，比如：
  telrobot-cli task list
```

## Token 配置引导（MANDATORY）

**初始化完成后，Agent 必须在对话中生成以下引导文本**：

```
请提供云蝠系统内配置AI助理下生成的token信息
```

**引导逻辑**：
1. 当 setup 脚本执行成功且 Token 未配置时，**必须**在对话中输出上述引导文本
2. **禁止**修改引导文本的措辞，必须使用精确的原文
3. **禁止**在引导文本前后添加额外的解释或说明（保持简洁）
4. 用户回复 Token 后，执行：`telrobot-cli config set-token <用户提供的token>`
5. Token 配置成功后，**必须自动验证 Token 有效性**：
   - 执行：`telrobot-cli task list --page 1 --size 5`
   - 如果成功：展示查询到的任务列表信息（任务名称、ID、状态等）
   - 如果失败（认证错误/Token 无效）：引导用户重新生成并提供最新 Token
6. 验证成功后输出：`✅ Token 已验证，可以开始使用命令`

**Token 验证失败引导文本**：

```
❌ Token 验证失败，无法拉取任务列表。请检查：
1. Token 是否正确复制（完整复制，不要遗漏字符）
2. Token 是否已过期（云蝠系统内重新生成）
3. 账号是否有权限访问任务

请重新生成并提供最新的 token 信息
```

**完整交互流程示例**：
```
[Agent 执行 setup 脚本]
✅ Installed Telrobot CLI: ~/.telrobot-cli/bin/telrobot-cli
📝 Wrote config: ~/.telrobot-cli/config.yaml

⚠️  Token 未配置，请执行以下命令：
   telrobot-cli config set-token <your-token>

[Agent 在对话中输出]
请提供云蝠系统内配置AI助理下生成的token信息

[用户提供 Token]
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

[Agent 执行]
telrobot-cli config set-token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

[Agent 验证 Token]
telrobot-cli task list --page 1 --size 5

✅ 验证成功，查询到 3 个任务：

序号  任务ID        任务名称      状态    类型    并发量  创建时间
1     abc-123...   营销外呼任务   开启    呼出    10      2024-01-15
2     def-456...   客服回访       关闭    呼入    5       2024-01-14
3     ghi-789...   调研问卷       开启    呼出    8       2024-01-13

✅ Token 已验证，可以开始使用命令

---

[验证失败场景]

[Agent 执行]
telrobot-cli config set-token invalid-token...
telrobot-cli task list --page 1 --size 5

❌ 命令执行失败：认证失败，Token 无效或已过期

[Agent 在对话中输出]
❌ Token 验证失败，无法拉取任务列表。请检查：
1. Token 是否正确复制（完整复制，不要遗漏字符）
2. Token 是否已过期（云蝠系统内重新生成）
3. 账号是否有权限访问任务

请重新生成并提供最新的 token 信息

[用户提供新 Token]
[new-valid-token]

[Agent 重新执行验证流程]
telrobot-cli config set-token new-valid-token...
telrobot-cli task list --page 1 --size 5

✅ 验证成功...
```

## Behavior

### 自动初始化流程（CLI 触发）

当用户首次执行 `telrobot-cli` 命令时，CLI 会自动检测环境并执行初始化：

1. CLI 检测到环境未初始化
2. 自动查找并执行 `scripts/setup.js` 或 `scripts/setup.sh`
3. 下载 CLI 二进制 + 生成基础配置（Token 留空）
4. CLI 输出提示信息后退出
5. **Agent 必须在对话中输出**：`请提供云蝠系统内配置AI助理下生成的token信息`
6. 等待用户提供 Token
7. 用户回复后，Agent 执行：`telrobot-cli config set-token <token>`
8. **自动验证 Token 有效性**：
   - 执行 `telrobot-cli task list --page 1 --size 5`
   - 成功：展示任务列表 + 输出 `✅ Token 已验证，可以开始使用命令`
   - 失败：输出 Token 验证失败引导文本，等待用户提供新 Token
9. 验证成功后，重新执行用户的原始命令（如 `telrobot-cli task list`）

### 手动初始化流程（Agent 主动触发）

**智能初始化模式（推荐）**：
```bash
node scripts/setup.js
```
此模式会自动下载 CLI 并生成基础配置，跳过 Token 配置。
- CLI 缺失时自动下载
- 配置缺失时自动生成
- Token 需手动配置（安全考虑）
- 首次使用体验最优，适合 NPM postinstall 触发

**强制重新安装模式**：
```bash
node scripts/setup.js --force
```
强制重新下载并覆盖所有配置，适合修复损坏环境。

**检测模式**：
```bash
node scripts/setup.js --check
```
仅检查环境状态，不执行任何操作。

**手动初始化（不推荐）**：
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

1. **Agent 引导用户提供**（推荐）：
   - 初始化完成后，Agent 自动在对话中输出：`请提供云蝠系统内配置AI助理下生成的token信息`
   - 用户提供 Token 后，Agent 执行：`telrobot-cli config set-token <token>`

2. Set during initialization via environment variable:
```bash
TELROBOT_TOKEN=your-token node scripts/setup.js
```

On Windows (PowerShell):
```powershell
$env:TELROBOT_TOKEN="your-token"; powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

3. Configure manually by editing `~/.telrobot-cli/config.yaml`

4. Use the token config command:
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
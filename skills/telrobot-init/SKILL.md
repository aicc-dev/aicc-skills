---
name: telrobot:init
description: Initialize Telrobot CLI environment automatically after skill installation. Downloads platform-specific executable or builds local CLI source in DEV mode, then guides telrobot-cli config commands for token/profile setup. MUST be triggered immediately after any telrobot skill is installed.
---

# Telrobot Init

**此 Skill 不直接暴露给用户使用**。当用户安装 `telrobot-task` 或 `telrobot-number` 后，Agent **自动**调用此 Skill 完成环境初始化。

**用户不需要知道此 Skill 的存在**，也不需要手动调用 `@skill:telrobot-init`。

## 触发时机（CRITICAL）

### 场景 1：Skill 安装后立即初始化（推荐）

**当用户安装此 Skill 或相关 Skill（telrobot-task/telrobot-number）后，Agent 必须立即执行环境初始化**：

1. **Agent 自动检测**：检查 `~/.telrobot-cli/bin/telrobot-cli` 是否存在，并检查 `~/.telrobot-cli/config.yaml` 是否存在
2. **如果 CLI 缺失**：Agent 执行 `node scripts/setup.js`（或 Shell/PowerShell 兜底脚本）安装 CLI。setup 脚本只下载或编译 CLI，**不会写入 config.yaml**
3. **如果配置缺失**：Agent 执行 `telrobot-cli config init`，由 CLI 创建 `config.yaml`
4. **如果 token 为空**：Agent 输出 token 引导文本，等待用户提供 token
5. **用户提供 token 后**：单用户执行 `telrobot-cli config set-token <token>`；指定用户身份执行 `telrobot-cli config profile set-token <别名> <token>`；需要切换当前用户时执行 `telrobot-cli config profile use <别名>`
6. **如果 Token 已配置且非空**：Agent 自动验证 Token 有效性

**重要**：不要等待用户输入需求才初始化，**安装 Skill 后立即执行**。

## 配置创建与 Token 设置（MANDATORY）

setup 脚本只负责安装 CLI，不负责写入 `config.yaml`。当 `~/.telrobot-cli/config.yaml` 不存在时，Agent 必须使用 CLI 创建配置：

```bash
telrobot-cli config init
```

当缺少 token 时，Agent 必须先输出：

```
请提供系统内配置 AI 助理下生成的 token 信息
```

用户提供 token 后：

```bash
# 默认用户
telrobot-cli config set-token <token>

# 新增或更新指定用户身份；profile 不存在时 CLI 会自动创建
telrobot-cli config profile set-token <别名> <token>

# 切换当前用户身份
telrobot-cli config profile use <别名>
```

执行规则：
- **禁止**通过 setup.js/setup.sh/setup.ps1 写入或修改 `config.yaml`。
- **禁止**由 Agent 直接编辑 `config.yaml` 创建 profile 或 token；配置写入必须通过 `telrobot-cli config ...` 命令完成。
- CLI 当前没有单独的 `profile add` 命令；新增用户身份使用 `telrobot-cli config profile set-token <别名> <token>`。
- 如果用户只给别名未给 token，Agent 必须继续输出 token 引导文本，不能创建空 token profile。
- profile 表示不同用户身份。
- 中文 profile 名按 UTF-8 支持，建议避免空格、`/`、`\`、`:` 等容易影响 shell 或路径解析的字符。

## DEV 本地编译模式

当用户提到“dev 模式”、“开发模式”、“本地源码初始化”、“从本地 telrobot-saas-go 编译 CLI”或“不要远程下载”时，Agent 必须使用 Node.js setup 脚本的 DEV 模式，不要走远程下载：

```bash
node scripts/setup.js --dev --cli-source /Users/long/projects/aicc-agent/telrobot-saas-go/telrobot-saas-cli
```

执行规则：
- `--dev` 会在本地执行 `go build -o ~/.telrobot-cli/bin/telrobot-cli .`，并覆盖已有 CLI 二进制。
- `--cli-source` 指向 `telrobot-saas-go/telrobot-saas-cli` 源码目录；如果用户未提供，Agent 先在当前工作区附近查找该目录。
- 找不到源码目录时，Agent 询问用户提供 `telrobot-saas-cli` 的本地路径。
- DEV 模式只表示二进制来源是本地源码；profile/token 配置仍通过 `telrobot-cli config ...` 命令完成。

### 场景 2：用户首次使用功能时初始化（兜底）

如果场景 1 未触发（如 Agent 未检测到 Skill 安装），当用户**用自然语言描述需求**（如"查看任务"、"导入号码"）时，Agent 自动检测环境并执行初始化。

### 场景 3：环境损坏时自动修复

当 CLI 二进制文件缺失或损坏时，Agent 自动调用此 Skill 修复环境。

## 🔤 防乱码模式说明

防乱码模式下，所有命令统一使用 `env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` 前缀，**仅影响当前命令进程，不污染用户全局 shell 环境**。

**防乱码模式执行后，Agent 必须主动检查输出是否包含乱码字符（如 `\xef\xbf\xbd`、`?`、无意义符号序列）**：
- 输出正常 → 继续使用防乱码模式执行后续命令
- 输出仍乱码 → **立即切换为 `--output json` 模式**，不得继续使用表格输出：

```bash
env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli task list --output json
```

Agent 拿到 JSON 数据后，**必须自行解析并以格式化表格展示给用户**，不得将原始 JSON 直接输出。

如果三层均无法解决，提示用户可能是 IDE/终端面板本身的编码配置问题，建议检查终端字符集设置。

初始化阶段同时检测终端编码（不额外增加步骤）：

```bash
echo "LANG=${LANG:-unset} LC_ALL=${LC_ALL:-unset}"
```

根据输出判断模式，**会话内一次性确定，后续命令不再重复检测**：

| 检测结果 | 执行模式 |
|---|---|
| 输出包含 `UTF-8` 或 `utf8` | ✅ 正常模式：直接执行 |
| 输出不包含上述内容 | ⚠️ 防乱码模式：加 `env` 前缀 |
### 场景 4：切换当前用户/profile

当用户说“切换默认用户”、“切换当前用户”、“默认 profile 改成 <别名>”或类似表达时，Agent 不要重新初始化，也不要重新下载 CLI。必须通过 CLI 切换当前 profile：

```bash
telrobot-cli config profile use <别名>
```

执行规则：
- 如果用户没有明确给出别名，先询问“要切换为哪个用户/profile？”
- CLI 会确认 `<别名>` 已存在于 `profiles` 下；不存在时必须把错误展示给用户，并提示先用 `telrobot-cli config profile set-token <别名> <token>` 添加该 profile。
- 该操作只切换当前 profile，不修改任何 token。
- **禁止**由 Agent 直接编辑 `config.yaml` 或使用脚本修改 `current`。

### 场景 5：查看和删除用户/profile

当用户说“查看我的账号”、“有哪些账号”、“有哪些 profile”、“列出用户身份”等类似表达时，Agent 必须通过 CLI 查询：

```bash
telrobot-cli config profile list
```

执行规则：
- 原样展示 CLI 输出的 profile 列表，并标明当前 `current` profile。
- 不读取或解析 `config.yaml` 来替代 CLI 命令。

当用户说“删除某个账号/profile/用户身份”时，Agent 必须先执行：

```bash
telrobot-cli config profile list
```

删除规则：
- 如果用户提供的别名与列表中的 profile **完全匹配**，二次确认后执行 `telrobot-cli config profile remove <别名>`。
- 如果用户提供的是部分名称或不完全匹配，必须把匹配候选展示给用户，让用户明确确认要删除的完整别名后再执行。
- 如果匹配到多个候选，必须让用户选择一个完整别名；禁止猜测删除。
- 如果没有匹配项，向用户说明未找到，不执行删除。
- 删除当前 `current` profile 时，必须提示用户删除后需要重新设置当前 profile；按 CLI 返回结果原样展示。
- 删除 profile **必须且只能**通过 `telrobot-cli config profile remove <完整别名>` 执行。
- **禁止**由 Agent 直接编辑 `~/.telrobot-cli/config.yaml`、用脚本修改 YAML、用 `sed`/`perl`/文本替换删除 profile，避免破坏配置结构或误删用户信息。

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
5. **展示信息保持简洁**：初始化完成后向用户展示结果时，仅展示 CLI 路径、平台信息、Token 配置状态即可

## 初始化完成展示规范

当 setup 脚本执行成功后，向用户汇报初始化结果时：

**✅ 允许展示的信息**：
- CLI 安装路径
- 平台/架构信息
- Token 配置状态（已配置/未配置）
- 下一步使用指引

**示例汇报格式（Token 未配置）**：
```
✅ Telrobot CLI 环境初始化完成

项目          状态
CLI 路径      ~/.telrobot-cli/bin/telrobot-cli
平台          darwin-arm64 (Apple Silicon)
Token         ❌ 未配置

请提供系统内配置 AI 助理下生成的 token 信息
```

**示例汇报格式（Token 已配置）**：
```
✅ Telrobot CLI 环境初始化完成

项目          状态
CLI 路径      ~/.telrobot-cli/bin/telrobot-cli
平台          darwin-arm64 (Apple Silicon)
Token         ✅ 已配置

[Agent 自动拉取任务列表]
telrobot-cli task list --page 1 --size 5

✅ 验证成功！查询到 3 个任务：

1. 营销外呼任务（abc-123...）- 运行中，10 并发
2. 客服回访（def-456...）- 已暂停，5 并发
3. 调研问卷（ghi-789...）- 运行中，8 并发

现在可以开始使用了！比如：
- "帮我查看当前账号下的呼叫任务"
- "启动营销外呼任务"
```

**Token 验证失败场景**：
```
✅ Telrobot CLI 环境初始化完成

项目          状态
CLI 路径      ~/.telrobot-cli/bin/telrobot-cli
平台          darwin-arm64 (Apple Silicon)
Token         ✅ 已配置

[Agent 自动拉取任务列表]
telrobot-cli task list --page 1 --size 5

❌ 命令执行失败：认证失败，Token 无效或已过期

❌ Token 验证失败，无法拉取任务列表。请检查：
1. Token 是否正确复制（完整复制，不要遗漏字符）
2. Token 是否已过期（在系统内重新生成）
3. 账号是否有权限访问任务

请重新生成并提供最新的 token 信息
```

## Token 配置引导（MANDATORY）

**初始化前发现 token 缺失或为空时，Agent 必须在对话中生成以下引导文本**：

```
请提供系统内配置 AI 助理下生成的 token 信息
```

**引导逻辑**：
1. 当 `~/.telrobot-cli/config.yaml` 不存在，或存在但 `token:` 值为空时，**必须**在对话中输出上述引导文本
2. **禁止**修改引导文本的措辞，必须使用精确的原文
3. **禁止**在引导文本前后添加额外的解释或说明（保持简洁）
4. 用户回复 Token 后，**Agent 自动执行 CLI 配置命令**：默认用户执行 `telrobot-cli config set-token <用户提供的token>`；指定身份执行 `telrobot-cli config profile set-token <profile> <token>`。如果 `config.yaml` 不存在，先执行 `telrobot-cli config init`
5. Token 配置成功后，**Agent 必须自动验证 Token 有效性**：
   - **Agent 自动执行**：`telrobot-cli task list --page 1 --size 5`（用户无需手动执行）
   - 如果成功：Agent 用自然语言总结查询结果（如"我找到了 3 个任务，分别是..."）
   - 如果失败（认证错误/Token 无效）：引导用户重新生成并提供最新 Token
6. 验证成功后，Agent 用自然语言告知用户（如"✅ Token 已验证，现在可以帮我管理任务了"）

**Token 验证失败引导文本**：

```
❌ Token 验证失败，无法拉取任务列表。请检查：
1. Token 是否正确复制（完整复制，不要遗漏字符）
2. Token 是否已过期（在系统内重新生成）
3. 账号是否有权限访问任务

请重新生成并提供最新的 token 信息
```

**完整交互流程示例**：
```
[Agent 在初始化前输出]
请提供系统内配置 AI 助理下生成的 token 信息

[用户提供 Token]
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

[Agent 自动执行配置和验证，用户无需手动操作]
telrobot-cli config init
telrobot-cli config set-token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
telrobot-cli task list --page 1 --size 5

[Agent 用自然语言总结结果]
✅ 验证成功！我找到了 3 个任务：

1. 营销外呼任务（abc-123...）- 运行中，10 并发
2. 客服回访（def-456...）- 已暂停，5 并发
3. 调研问卷（ghi-789...）- 运行中，8 并发

✅ Token 已验证，现在可以帮我管理任务了！比如你可以说：
- "查看今天的拨打情况"
- "启动营销外呼任务"


---

[验证失败场景]

[Agent 自动执行，用户无需手动操作]
telrobot-cli config set-token invalid-token...
telrobot-cli task list --page 1 --size 5

❌ 命令执行失败：认证失败，Token 无效或已过期

[Agent 在对话中输出]
❌ Token 验证失败，无法拉取任务列表。请检查：
1. Token 是否正确复制（完整复制，不要遗漏字符）
2. Token 是否已过期（在系统内重新生成）
3. 账号是否有权限访问任务

请重新生成并提供最新的 token 信息

[用户提供新 Token]
[new-valid-token]

[Agent 自动重新执行验证流程]
telrobot-cli config set-token new-valid-token...
telrobot-cli task list --page 1 --size 5

[Agent 用自然语言总结]
✅ 验证成功！现在可以开始使用了...
```

## Behavior

### 自动初始化流程（CRITICAL）

### 流程 A：Skill 安装后立即初始化（推荐）

**触发时机**：用户安装 `telrobot-init`/`telrobot-task`/`telrobot-number` Skill 后

**执行步骤**：
1. **Agent 自动检测环境**：
   ```bash
   # 检查 CLI 是否存在
   test -f ~/.telrobot-cli/bin/telrobot-cli && echo "EXISTS" || echo "MISSING"
   ```
2. **如果 CLI 缺失**：Agent 执行 setup 脚本安装 CLI
   ```bash
   node scripts/setup.js
   ```
3. **如果配置缺失**：Agent 使用 CLI 创建配置
   ```bash
   telrobot-cli config init
   ```
4. **初始化完成后**：Agent 检查 Token 配置
   ```bash
   # 检查 config.yaml 中 token 值是否非空
   grep -Eq '^[[:space:]]*token:[[:space:]]*[^[:space:]]+' ~/.telrobot-cli/config.yaml 2>/dev/null && echo "CONFIGURED" || echo "MISSING"
   ```
5. **Token 未配置或为空**：Agent 输出引导文本
   ```
   请提供系统内配置 AI 助理下生成的 token 信息
   ```
6. **用户提供 Token 后**：Agent 自动配置并验证
   ```bash
   telrobot-cli config set-token <用户提供的token>
   telrobot-cli task list --page 1 --size 5  # 验证 Token
   ```
7. **验证成功**：Agent 通知用户环境已就绪
   ```
   ✅ Telrobot CLI 环境已就绪，可以开始使用了！
   
   你可以告诉我：
   - "查看当前账户下的呼叫任务"
   - "导入一批号码到营销任务"
   - "今天的拨打情况总结"
   ```

### 流程 B：用户首次使用时初始化（兜底）

**触发时机**：用户用自然语言描述需求（如"查看任务"），但环境未初始化

**执行步骤**：与流程 A 相同，但在初始化完成后，**继续执行用户的原始请求**。

**示例**：
```
用户说："查看当前账户下的呼叫任务"
    ↓
Agent 检测环境未初始化
    ↓
Agent 执行 setup 脚本
    ↓
Agent 提示："请提供系统内配置 AI 助理下生成的 token 信息"
    ↓
用户提供 Token
    ↓
Agent 配置并验证 Token
    ↓
Agent 继续执行用户原始请求：telrobot-cli task list
    ↓
Agent 用自然语言回答："我找到了 3 个任务..."
```

### 手动初始化流程（Agent 主动触发）

**CLI 安装模式（推荐）**：
```bash
node scripts/setup.js
```
此模式只安装 CLI。
- CLI 缺失时自动下载
- CLI 已存在时跳过下载
- 不写入 `config.yaml`
- profile/token/current 配置必须通过 `telrobot-cli config ...` 命令完成

**DEV 本地编译模式（开发使用）**：
```bash
node scripts/setup.js --dev --cli-source /path/to/telrobot-saas-go/telrobot-saas-cli
TELROBOT_DEV=1 TELROBOT_CLI_SOURCE=/path/to/telrobot-saas-go/telrobot-saas-cli node scripts/setup.js
```
此模式从本地 Go 源码编译 CLI 到 `~/.telrobot-cli/bin/`，不会从远程下载二进制。

**强制重新安装模式**：
```bash
node scripts/setup.js --force
```
强制重新下载并覆盖 CLI 二进制，不覆盖配置。

**检测模式**：
```bash
node scripts/setup.js --check
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

The scripts detect the current OS and CPU, download the matching Telrobot CLI executable from the release server, and install it into `~/.telrobot-cli/bin`.

The setup scripts never write `~/.telrobot-cli/config.yaml`. Configuration must be created and updated by `telrobot-cli config` commands.

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
- `TELROBOT_DEV=1`: Node.js setup only; build `telrobot-cli` from local source instead of downloading
- `TELROBOT_CLI_SOURCE`: Node.js setup only; local `telrobot-saas-go/telrobot-saas-cli` source path for DEV mode
- `TELROBOT_SETUP_DRY_RUN=1`: print the resolved asset, URL, and destination without downloading

`TELROBOT_TOKEN`、`TELROBOT_PROFILE`、`TELROBOT_CONFIG_PATH`、`TELROBOT_API_URL` 等配置变量属于 `telrobot-cli config` 或 CLI 运行期，不由 setup 脚本消费或写入。

The default download base URL is:
```
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/latest
```

## Token Configuration

For API token configuration, you can:

1. **Agent 引导用户提供**（推荐）：
   - 初始化前发现缺少当前 profile 的 token 时，Agent 自动在对话中输出：`请提供系统内配置 AI 助理下生成的 token 信息`
   - 用户提供 Token 后，Agent 执行：`telrobot-cli config set-token <token>`，或 `telrobot-cli config profile set-token <profile> <token>`

2. Use CLI config commands:
```bash
telrobot-cli config init
telrobot-cli config set-token your-token
telrobot-cli config profile set-token 张三 token-a
telrobot-cli config profile set-token 李四 token-b
telrobot-cli config profile use 张三
```

On Windows (PowerShell):
```powershell
.\telrobot-cli.exe config init
.\telrobot-cli.exe config profile set-token 张三 your-token
```

3. Use the token config command:
```bash
telrobot-cli config set-token your-token
telrobot-cli config profile set-token 张三 your-token
telrobot-cli config profile use 张三
telrobot-cli config profile list
telrobot-cli config profile remove 张三
telrobot-cli --profile 张三 task list
```

配置文件使用 `current` 和 `profiles` 管理多个用户身份。默认 profile 名为 `默认用户`；中文 profile 名按 UTF-8 支持，建议避免空格、`/`、`\`、`:` 等容易影响 shell 或路径解析的字符。

## Agent 使用原则（CRITICAL）

**核心原则**：
1. **Skill 安装后立即初始化环境**，不要等待用户输入需求
2. 用户使用自然语言描述需求，Agent 自动执行 CLI 命令并理解结果
3. **禁止要求用户手动执行 CLI 命令**（除 Token 配置引导外）

### 完整交互流程示例

#### 场景 1：Skill 安装后立即初始化

```
[用户安装 telrobot-number Skill]
    ↓
[Agent 自动检测环境]
test -f ~/.telrobot-cli/bin/telrobot-cli && echo "EXISTS" || echo "MISSING"
    ↓
[输出: MISSING]
    ↓
[Agent 自动安装 CLI]
node scripts/setup.js
    ↓
[输出]
✅ Installed Telrobot CLI: ~/.telrobot-cli/bin/telrobot-cli
ℹ️  Config is managed by telrobot-cli config commands
    ↓
[Agent 创建配置并询问 Token]
telrobot-cli config init
请提供系统内配置 AI 助理下生成的 token 信息
    ↓
[用户提供 Token]
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ↓
[Agent 自动配置并验证]
telrobot-cli config set-token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
telrobot-cli task list --page 1 --size 5
    ↓
[验证成功]
✅ Telrobot CLI 环境已就绪，可以开始使用了！

你可以告诉我：
- "查看当前账户下的呼叫任务"
- "导入一批号码到营销任务"
- "今天的拨打情况总结"
```

#### 场景 2：用户首次使用时初始化

```
用户说："查看当前账户下的呼叫任务"
    ↓
[Agent 自动检测环境]
test -f ~/.telrobot-cli/bin/telrobot-cli && echo "EXISTS" || echo "MISSING"
    ↓
[输出: MISSING]
    ↓
[Agent 自动安装 CLI]
node scripts/setup.js
    ↓
[Agent 创建配置并询问用户身份和 Token]
telrobot-cli config init
请提供系统内配置 AI 助理下生成的 token 信息
    ↓
[用户输入：张三 + Token]
    ↓
[Agent 自动配置当前 profile]
telrobot-cli config profile set-token 张三 eyJhbGci...
telrobot-cli config profile use 张三
    ↓
[Agent 自动验证当前 profile 的 Token]
telrobot-cli task list --page 1 --size 5
    ↓
[验证成功，继续执行用户原始请求]
telrobot-cli task list --page 1 --size 20
    ↓
[Agent 用自然语言回答]
✅ 我找到了 5 个任务：

1. 营销外呼任务（abc-123...）- 运行中，10 并发
2. 客服回访（def-456...）- 已暂停，5 并发
...
```

### 正确示例 vs 错误示例

**✅ 正确示例**：
```
用户说："查看当前账户下的呼叫任务"
✅ Agent 自动执行：telrobot-cli task list
✅ Agent 用自然语言回答："我找到了 5 个任务，分别是..."

用户说："今天的拨打情况怎么样"
✅ Agent 自动执行：telrobot-cli task stat <task-id> --type over_all --date "2024-01-15"
✅ Agent 用自然语言回答："今天共拨打 150 通，接通率 65%..."

用户说："启动营销外呼任务"
✅ Agent 自动执行：telrobot-cli task start <task-uuid>
✅ Agent 用自然语言回答："✅ 营销外呼任务已启动"
```

**❌ 错误示例**：
```
用户说："查看当前账户下的呼叫任务"
❌ Agent 回答："请执行 telrobot-cli task list 查看任务"
❌ Agent 回答："你可以用 task list 命令查询"

用户安装 Skill 后
❌ Agent 等待用户输入需求才初始化
❌ Agent 要求用户手动执行 setup 脚本
```

**约束**：
1. **Skill 安装后必须立即初始化环境**，不得等待用户输入需求
2. Agent **必须自动执行** CLI 命令，不得要求用户手动执行
3. Agent **必须用自然语言总结**命令结果，不得直接输出原始表格
4. Agent **禁止展示** CLI 命令语法给用户（除非用户明确要求）
5. 仅在 Token 配置引导时，可以输出固定的引导文本
6. Token 验证成功后，Agent 应通知用户环境已就绪，并提示可以使用哪些功能

## Usage Example

### 场景 1：Skill 安装后立即初始化

```
[用户安装 telrobot-number Skill]
    ↓
[Agent 自动初始化环境 + 提示 Token]
请提供系统内配置 AI 助理下生成的 token 信息
    ↓
[用户提供 Token]
xxx-token-xxx
    ↓
[Agent 配置并验证成功]
✅ Telrobot CLI 环境已就绪，可以开始使用了！

你可以告诉我：
- "查看当前账户下的呼叫任务"
- "导入一批号码到营销任务"
- "今天的拨打情况总结"
```

### 场景 2：用户首次使用时初始化

初始化完成后，用户只需用自然语言描述需求，Agent 会自动处理：

```
用户："查看当前账户下的呼叫任务"
→ Agent 自动查询并用自然语言回答

用户："今天的拨打情况总结"
→ Agent 自动查询统计并用自然语言回答

用户："有哪些 A 级意向客户"
→ Agent 自动查询客户列表并用自然语言回答

用户："启动营销外呼任务"
→ Agent 自动启动任务并确认
```

**Agent 不应要求用户手动执行 CLI 命令，而是自动执行并理解结果。**

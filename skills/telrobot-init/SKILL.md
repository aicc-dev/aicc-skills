---
name: telrobot:init
description: Initialize Telrobot CLI environment by downloading platform-specific executable and configuring local settings.
---

# Telrobot Init

**此 Skill 不直接暴露给用户使用**。当用户安装 `telrobot-task` 或 `telrobot-number` 后，Agent **自动**调用此 Skill 完成环境初始化。

**用户不需要知道此 Skill 的存在**，也不需要手动调用 `@skill:telrobot-init`。

## 触发时机（CRITICAL）

### 场景 1：Skill 安装后立即初始化（推荐）

**当用户安装此 Skill 或相关 Skill（telrobot-task/telrobot-number）后，Agent 必须立即执行环境初始化**：

1. **Agent 自动检测**：检查 `~/.telrobot-cli/bin/telrobot-cli` 是否存在
2. **如果缺失**：Agent 立即执行 `node scripts/setup.js`（或 `sh scripts/setup.sh`）
3. **初始化完成后**：Agent 检查 Token 配置状态
4. **如果 Token 未配置**：Agent 输出引导文本，等待用户提供 Token
5. **如果 Token 已配置**：Agent 自动验证 Token 有效性

**重要**：不要等待用户输入需求才初始化，**安装 Skill 后立即执行**。

### 场景 2：用户首次使用功能时初始化（兜底）

如果场景 1 未触发（如 Agent 未检测到 Skill 安装），当用户**用自然语言描述需求**（如"查看任务"、"导入号码"）时，Agent 自动检测环境并执行初始化。

### 场景 3：环境损坏时自动修复

当 CLI 二进制文件缺失或损坏时，Agent 自动调用此 Skill 修复环境。

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

**示例汇报格式（Token 未配置）**：
```
✅ Telrobot CLI 环境初始化完成

项目          状态
CLI 路径      ~/.telrobot-cli/bin/telrobot-cli
平台          darwin-arm64 (Apple Silicon)
Token         ❌ 未配置

请提供云蝠系统内配置AI助理下生成的token信息
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
2. Token 是否已过期（云蝠系统内重新生成）
3. 账号是否有权限访问任务

请重新生成并提供最新的 token 信息
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
4. 用户回复 Token 后，**Agent 自动执行**：`telrobot-cli config set-token <用户提供的token>`（用户无需手动执行）
5. Token 配置成功后，**Agent 必须自动验证 Token 有效性**：
   - **Agent 自动执行**：`telrobot-cli task list --page 1 --size 5`（用户无需手动执行）
   - 如果成功：Agent 用自然语言总结查询结果（如"我找到了 3 个任务，分别是..."）
   - 如果失败（认证错误/Token 无效）：引导用户重新生成并提供最新 Token
6. 验证成功后，Agent 用自然语言告知用户（如"✅ Token 已验证，现在可以帮我管理任务了"）

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

[Agent 自动执行配置和验证，用户无需手动操作]
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
2. Token 是否已过期（云蝠系统内重新生成）
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
2. **如果 CLI 缺失**：Agent 立即执行初始化
   ```bash
   # 优先使用 Node.js 版本
   node scripts/setup.js
   # 或降级到 Shell 版本
   sh scripts/setup.sh
   ```
3. **初始化完成后**：Agent 检查 Token 配置
   ```bash
   # 检查 config.yaml 中是否有 token
   grep -q "token:" ~/.telrobot-cli/config.yaml 2>/dev/null && echo "CONFIGURED" || echo "MISSING"
   ```
4. **Token 未配置**：Agent 输出引导文本
   ```
   请提供云蝠系统内配置AI助理下生成的token信息
   ```
5. **用户提供 Token 后**：Agent 自动配置并验证
   ```bash
   telrobot-cli config set-token <用户提供的token>
   telrobot-cli task list --page 1 --size 5  # 验证 Token
   ```
6. **验证成功**：Agent 通知用户环境已就绪
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
Agent 提示："请提供云蝠系统内配置AI助理下生成的token信息"
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
[Agent 自动执行初始化]
node scripts/setup.js
    ↓
[输出]
✅ Installed Telrobot CLI: ~/.telrobot-cli/bin/telrobot-cli
📝 Wrote config: ~/.telrobot-cli/config.yaml

⚠️  Token 未配置，请执行以下命令：
   telrobot-cli config set-token <your-token>
    ↓
[Agent 在对话中输出]
请提供云蝠系统内配置AI助理下生成的token信息
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
[Agent 自动执行初始化]
node scripts/setup.js
    ↓
[Agent 在对话中输出]
请提供云蝠系统内配置AI助理下生成的token信息
    ↓
[用户提供 Token]
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ↓
[Agent 自动配置并验证]
telrobot-cli config set-token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
请提供云蝠系统内配置AI助理下生成的token信息
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
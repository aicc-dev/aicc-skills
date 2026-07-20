# Telrobot Skills 集合

> Telrobot CLI 的 AI Agent 技能包

## 📋 目录结构

```
skills/
├── README.md                                    # 本文档
├── telrobot-init/                               # 环境初始化技能
│   ├── SKILL.md                                 # 技能定义
│   └── scripts/                                 # 安装脚本
│       ├── setup.js                             # Node.js 版本
│       ├── setup.sh                             # Shell 版本
│       ├── setup.ps1                            # PowerShell 版本（Windows）
│       ├── token-config.js                      # Token 配置
│       └── profile-current.js                   # 切换当前 profile
├── telrobot-task/                               # 任务管理技能
│   └── SKILL.md                                 # 技能定义
├── telrobot-number/                             # 号码管理技能
│   └── SKILL.md                                 # 技能定义
└── telrobot-crm/                                # CRM 客户导入技能
    └── SKILL.md                                 # 技能定义
```

## 🎯 技能说明

### 1. telrobot-init（环境初始化）

**路径**: `telrobot-init/SKILL.md`

**用途**: 初始化 Telrobot CLI 环境

**功能**:
- 自动检测用户操作系统和 CPU 架构
- 下载对应的 Telrobot CLI 二进制文件
- 安装到 `~/.telrobot-cli/bin/`
- 配置文件由 `telrobot-cli config ...` 命令创建和维护，setup 脚本不写 `config.yaml`

**使用场景**:
- 用户首次使用 Telrobot 功能
- 需要更新 Telrobot CLI 版本
- 重新配置环境

**触发方式**:
```
初始化 telrobot 环境
安装 telrobot 工具
设置 telrobot CLI
```

**环境变量**:
- `TELROBOT_DOWNLOAD_BASE_URL`: 覆盖下载地址
- `TELROBOT_BIN_DIR`: 覆盖安装目录
- `TELROBOT_DEV=1`: 从本地 Go 源码编译 CLI，不从远程下载
- `TELROBOT_CLI_SOURCE`: DEV 模式下的 `telrobot-saas-go/telrobot-saas-cli` 源码路径

---

### 2. telrobot-task（任务管理）

**路径**: `telrobot-task/SKILL.md`

**用途**: Telrobot 任务管理

**功能**:
- 查看任务列表、创建任务、启动/停止任务
- 激活/复制/删除任务
- 配置外呼线路、查看任务统计
- 按名称搜索任务，多结果时展示给用户确认后用 UUID 精确执行

**使用场景**:
- 日常任务管理操作
- 查询和搜索任务

**触发方式**:
```
查看任务列表
创建任务
启动任务 xxx
停止任务 xxx
```

---

### 3. telrobot-number（号码管理）

**路径**: `telrobot-number/SKILL.md`

**用途**: Telrobot 号码管理

**功能**:
- 查看、添加、更新号码
- 批量导入号码
- 文件导入号码：调用 `telrobot-cli number import-file` 解析 `.txt/.csv/.excel/.xlsx` 并按 500 条/批导入；本地仅保存 manifest、checkpoint、NDJSON 失败明细和最终报告，`.xls` 需先转换为标准 `.xlsx`
- 呼入任务禁止导入号码；选择导入目标时必须提示用户改选外呼任务
- 单批导入号码数量达到或超过 50000 条时，必须使用后台异步文件导入
- 删除号码、批量重置号码、批量删除号码接口尚未完全验证，当前暂不可用

**使用场景**:
- 任务号码管理
- 批量号码操作

**触发方式**:
```
查看号码列表
添加号码
批量导入号码
导入号码
```

---

### 4. telrobot-crm（CRM 客户导入）

**路径**: `telrobot-crm/SKILL.md`

**用途**: 从图片、纯文本或 Excel 向 CRM 公海导入客户

**功能**:
- 图片只由多模态模型提取结构化姓名和手机号，模糊或多客户时先确认
- 纯文本抽取全部姓名手机号对，并逐条执行 `telrobot-cli crm add`
- Excel 只把路径交给 `crm prepare-file`；非标准文件确认前禁止上传
- 未匹配字段只进入 `ignored_fields`，不自动创建 CRM 字段
- 文件状态区分处理中、全部成功、部分成功和失败

**使用场景**:
- 导入 CRM 客户
- 从截图、文本或客户表格写入 CRM 公海
- 查询 CRM 文件导入状态

---

## 🔒 安全限制（AI Agent MUST OBEY）

### ⚠️ 严格安全规则（CRITICAL）

在使用 Telrobot Skills 时，AI Agent **必须严格遵守**以下安全限制，**任何违反都将导致安全和稳定性风险**：

#### 禁止行为（STRICTLY PROHIBITED）

1. **禁止绕过 CLI 封装逻辑**
   - 所有操作必须通过 `telrobot-cli` 命令执行
   - **严禁**直接调用后端 API 接口
   - **严禁**手动构造 HTTP 请求

2. **禁止命令降级到 HTTP 请求**
   - 命令执行出错时，**严禁**自动降级使用 `curl`、`wget` 或其他 HTTP 工具
   - **严禁**认为"命令失败就用 HTTP 请求补上"
   - **严禁**尝试通过 HTTP 请求"绕过"CLI 错误

3. **禁止错误自动修复**
   - 命令失败时，**严禁**尝试通过 HTTP 请求"自动修复"问题
   - **严禁**在 CLI 命令失败后，私自构造 API 请求完成任务

4. **禁止功能扩展**
   - CLI 未提供的功能**视为不可用**
   - **严禁**通过 HTTP 请求"补充"CLI 未实现的功能

#### 强制行为（MANDATORY BEHAVIOR）

1. **CLI 命令绝对优先**
   - 所有操作必须通过 `telrobot-cli` 命令执行，**无例外**
   - 即使 CLI 功能有限，也不得绕过

2. **错误透明报告**
   - 命令执行出错时，**必须**将错误信息原样展示给用户
   - **严禁**静默降级或隐藏错误

3. **按文档处理错误**
   - 严格按照各 skill 文档中的 "Error Handling" 表格处理错误
   - **严禁**自定义绕过方案

4. **依赖 CLI 实现细节**
   - CLI 的功能边界即系统的功能边界
   - **严禁**通过 HTTP 请求突破 CLI 限制

#### 错误处理原则

当 `telrobot-cli` 命令执行失败时，AI Agent 必须：

1. **立即停止**当前操作
2. **向用户展示**错误信息（原文）
3. **参考**相关 skill 文档的 "Error Handling" 表格
4. **提供**标准解决方案
5. **禁止尝试**任何形式的 HTTP 降级或绕过

#### 典型违规示例（MUST NOT DO）

❌ **错误行为**：
```
Agent: telrobot-cli task list 出错
Agent: 尝试使用 curl http://localhost:8000/api/v1/tasks 绕过错误
```

✅ **正确行为**：
```
Agent: telrobot-cli task list 出错
Agent: 错误信息：[展示错误]
Agent: 标准解决方案：[按文档提供方案]
```

#### 安全风险评估

违反上述限制可能导致：
- **安全隐患**：绕过认证和授权机制
- **稳定性风险**：绕过错误处理和数据验证
- **维护风险**：绕过版本控制和功能更新
- **数据风险**：绕过数据完整性检查

#### 监控和审计

- 所有 AI Agent 操作都会被审计
- 发现绕过 CLI 封装的行为将被记录并报告
- 重复违规将导致技能包权限被限制

---

## 🚀 安装和使用

### 标准安装方式

根据你使用的 Agent 替换 `<agent-name>`：

```bash
npx skills add aicc-dev/aicc-skills -a <agent-name> -g -y
```

支持的 Agent 示例：

| Agent          | 安装命令                                                            |
|----------------|-----------------------------------------------------------------|
| WorkBuddy      | `npx skills add aicc-dev/aicc-skills -a workbuddy -g -y`          |
| Qoder          | `npx skills add aicc-dev/aicc-skills -a qoder -g -y`              |
| Cursor         | `npx skills add aicc-dev/aicc-skills -a cursor -g -y`             |
| Claude Code    | `npx skills add aicc-dev/aicc-skills -a claude-code -g -y`        |
| GitHub Copilot | `npx skills add aicc-dev/aicc-skills -a github-copilot -g -y`     |
| Windsurf       | `npx skills add aicc-dev/aicc-skills -a windsurf -g -y`           |

> 完整支持列表：执行 `npx skills add --help` 查看所有可用 agent 名称。

### 使用流程

#### 1. 安装技能包

在 AI Agent 中：
```
用户：安装 telrobot 技能包
Agent：执行 npx skills add aicc-dev/aicc-skills...
```

#### 2. 初始化环境

在 AI Agent 中：
```
用户：使用 telrobot:init 初始化环境
Agent：检测平台 → 下载二进制文件 → 配置环境 → 完成
```

#### 3. 开始使用

在 AI Agent 中：
```
用户：创建一个新的外呼任务
Agent：读取配置 → 执行 CLI 命令 → 返回结果
```

---

## 🔧 配置文件

### Telrobot 配置

**位置**: `~/.telrobot-cli/config.yaml`

**结构**:
```yaml
current: 默认用户

output:
  format: table

profiles:
  默认用户:
    auth:
      token: user-token-here

  张三:
    auth:
      token: another-user-token
```

profile 表示不同用户身份。未指定 profile 时，CLI 按 `--profile`、`TELROBOT_PROFILE`、`current`、单 profile 自动选择的顺序解析。新增或更新正式站 profile token 使用 `telrobot-cli config profile set-token <别名> <token> --environment prod`。

**配置方式**:

1. **创建配置文件**：
```bash
telrobot-cli config init
```

2. **手动配置 Token**：
```
设置 telrobot token 为 abc123
```

3. **环境变量**：
```bash
node skills/telrobot-init/scripts/setup.js
telrobot-cli config set-token abc123 --environment prod
telrobot-cli config profile set-token 张三 abc123 --environment prod
telrobot-cli config profile use 张三
```

如果只是切换默认用户/profile，使用 `telrobot-cli config profile use <别名>`，不需要重新初始化或重新下载 CLI。

如果只是补充或更新某个正式站 profile 的 token，使用 `telrobot-cli config profile set-token <别名> <token> --environment prod`；profile 不存在时 CLI 会自动创建。

---

## 🔄 技能工作流程

```
用户安装技能包
       ↓
Agent 获得技能定义
       ↓
用户请求初始化
       ↓
telrobot:init 技能执行
       ↓
下载二进制文件 → telrobot-cli config init/set-token
       ↓
用户开始日常使用
       ↓
telrobot:task 技能执行
       ↓
读取配置 → 执行命令 → 返回结果
```

---

## 📝 技能开发规范

### SKILL.md 文件结构

```markdown
---
name: skill-name
description: 技能描述
---

# 技能文档内容

## Behavior
技能行为说明

## Configuration
配置说明

## Usage
使用示例
```

### 必需字段

- **name**: 技能唯一标识（使用冒号分隔，如 `telrobot:init`）
- **description**: 技能功能说明，告诉 Agent 何时使用

### 文件命名规范

- 技能目录：使用 kebab-case（如 `telrobot-init`）
- 技能名称：使用冒号分隔（如 `telrobot:init`）

---

## 🛠️ 开发者工具

### 构建多平台版本

```bash
# 构建所有平台的二进制文件
./scripts/build-release.sh 1.0.0

# 输出在 dist/ 目录
dist/
├── telrobot-darwin-arm64
├── telrobot-linux-amd64
├── telrobot-windows-amd64.exe
└── ...
```

### 测试安装脚本

```bash
# 干运行模式（不实际下载）
TELROBOT_SETUP_DRY_RUN=1 node skills/telrobot-init/scripts/setup.js

# 本地测试
TELROBOT_DOWNLOAD_BASE_URL="file://$(pwd)/dist" \
node skills/telrobot-init/scripts/setup.js
```

---

## 📚 相关文档

- **项目文档**: 项目根目录下的 `README.md`
- **使用指南**: 项目根目录下的 `使用指南.md`
- **客户手册**: 项目根目录下的 `客户手册.md`
- **发布指南**: 项目根目录下的 `RELEASE.md`
- **完整解析**: 项目根目录下的 `完整解析文档.md`

---

## 🤝 贡献指南

### 添加新技能

1. 在 `skills/` 下创建新目录
2. 创建 `SKILL.md` 文件
3. 按照规范填写技能定义
4. 更新本 `README.md`
5. 测试技能功能

### 技能测试

- 在支持的 Agent 中测试
- 验证技能触发逻辑
- 检查跨平台兼容性
- 测试错误处理

---

## 📄 版本信息

- **技能包版本**: v2.2.0
- **支持的 CLI 版本**: v2.0.1+
- **更新时间**: 2026-07-01
- **维护**: Telrobot SaaS 团队

---

**提示**: 这些技能遵循标准的 AI Agent 技能格式，可在各种支持 `npx skills add` 的 AI 助手中使用。

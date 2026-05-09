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
│       └── token-config.js                      # Token 配置
├── telrobot-task/                               # 任务管理技能
│   └── SKILL.md                                 # 技能定义
└── telrobot-number/                             # 号码管理技能
    └── SKILL.md                                 # 技能定义
```

## 🎯 技能说明

### 1. telrobot-init（环境初始化）

**路径**: `telrobot-init/SKILL.md`

**用途**: 初始化 Telrobot CLI 环境

**功能**:
- 自动检测用户操作系统和 CPU 架构
- 下载对应的 Telrobot CLI 二进制文件
- 安装到 `~/.telrobot/bin/`
- 生成配置文件 `~/.telrobot/config.json`

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
- `TELROBOT_TOKEN`: 设置 API Token

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
- 查看、添加、更新、删除号码
- 批量导入、批量重置、批量删除号码

**使用场景**:
- 任务号码管理
- 批量号码操作

**触发方式**:
```
查看号码列表
添加号码
批量导入号码
```

---

## 🚀 安装和使用

### 标准安装方式

根据你使用的 Agent 替换 `<agent-name>`：

```bash
npx skills add gsq/telrobot-saas-cli -a <agent-name> -g -y
```

支持的 Agent 示例：

| Agent | 安装命令 |
|-------|---------|
| WorkBuddy | `npx skills add gsq/telrobot-saas-cli -a workbuddy -g -y` |
| Qoder | `npx skills add gsq/telrobot-saas-cli -a qoder -g -y` |
| Cursor | `npx skills add gsq/telrobot-saas-cli -a cursor -g -y` |
| Claude Code | `npx skills add gsq/telrobot-saas-cli -a claude-code -g -y` |
| GitHub Copilot | `npx skills add gsq/telrobot-saas-cli -a github-copilot -g -y` |
| Windsurf | `npx skills add gsq/telrobot-saas-cli -a windsurf -g -y` |

> 完整支持列表：执行 `npx skills add --help` 查看所有可用 agent 名称。

### 使用流程

#### 1. 安装技能包

在 AI Agent 中：
```
用户：安装 telrobot 技能包
Agent：执行 npx skills add gsq/telrobot-saas-cli...
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

**位置**: `~/.telrobot/config.json`

**结构**:
```json
{
  "executablePath": "/Users/user/.telrobot/bin/telrobot-cli",
  "executableFound": true,
  "apiUrl": "https://api.telrobot.com",
  "token": "user-token-here",
  "version": "1.0.0"
}
```

**配置方式**:

1. **初始化时自动生成**：
```
使用 telrobot:init 初始化环境
```

2. **手动配置 Token**：
```
设置 telrobot token 为 abc123
```

3. **环境变量**：
```bash
TELROBOT_TOKEN=abc123 node skills/telrobot-init/scripts/setup.js
```

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
下载二进制文件 → 生成配置
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

- **技能包版本**: v1.0.0
- **支持的 CLI 版本**: v1.0.0+
- **更新时间**: 2026-05-09
- **维护**: Telrobot SaaS 团队

---

**提示**: 这些技能遵循标准的 AI Agent 技能格式，可在各种支持 `npx skills add` 的 AI 助手中使用。
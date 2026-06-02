# Telrobot Skills

Telrobot Skills 是一组面向 Agent 的技能包，适用于支持 `skills` CLI 生态的工具。
安装入口统一使用 `npx skills add`，技能安装完成后，再通过初始化技能下载并配置本地 Telrobot CLI 可执行程序。

## 设计思路

这个仓库把”安装技能”和”安装 Telrobot CLI 可执行程序”拆成两个步骤。

`npx skills add` 只负责安装 Agent 技能。它会把技能说明、脚本和 Agent 配置复制到目标 Agent 的技能目录。这个仓库不提供自定义 npm 安装器，也不把 npm 包本身作为安装入口。

`telrobot:init` 负责初始化本地 Telrobot CLI 运行环境。它会识别当前 OS 和 CPU 架构，从服务器下载对应的可执行文件，安装到 `~/.telrobot-cli/bin`。`config.yaml` 必须由 `telrobot-cli config ...` 命令创建和维护，setup 脚本不写配置文件。

`telrobot:task` 是任务管理入口。它应该通过 Telrobot CLI 读取 `~/.telrobot-cli/config.yaml` 中的 profile 配置执行任务命令，而不是绕过 CLI 直接请求接口。

这样做的好处是安装过程不会修改 shell profile、用户环境变量或系统 PATH。用户如果要在终端手动执行，可以直接使用完整路径，例如 `~/.telrobot-cli/bin/telrobot-cli`。

## 命名空间

公开技能名使用 Telrobot 命名空间：

```text
telrobot:init
telrobot:task
telrobot:number
```

仓库目录保持文件系统友好的 kebab-case：

```text
skills/telrobot-init/SKILL.md
skills/telrobot-task/SKILL.md
skills/telrobot-number/SKILL.md
```

部分 Agent 会根据目录名生成 slash command。例如 Claude Code 里可能显示为 `/telrobot-init`、`/telrobot-task` 和 `/telrobot-number`，但 `SKILL.md` 里的公开技能名仍然是 `telrobot:init`、`telrobot:task` 和 `telrobot:number`。

## 安装

安装当前仓库：

```bash
npx skills add aicc-dev/aicc-skills -a workbuddy -g -y
npx skills add aicc-dev/aicc-skills -a claude-code -g -y
npx skills add aicc-dev/aicc-skills -a cursor -g -y
```

通用 GitHub 仓库模板：

```bash
npx skills add <github-owner>/<repo> -a <agent-name> -g -y
```

支持的 Agent 示例：
- workbuddy: WorkBuddy
- claude-code: Claude Code  
- cursor: Cursor
- qoder: Qoder
- github-copilot: GitHub Copilot
- windsurf: Windsurf

本地开发时，在仓库根目录执行：

```bash
npx skills add . --list
npx skills add . -a claude-code -g -y
```

安装完成后，让 Agent 执行初始化技能：

```text
使用 telrobot:init 初始化 Telrobot CLI 环境。
```

## 初始化 Telrobot CLI

`telrobot:init` 内置三种 setup 脚本，Agent 可以根据本机可用运行时选择合适的脚本。

如果本机有 Node.js，在 `skills/telrobot-init` 目录执行：

```bash
node scripts/setup.js
```

开发本地 CLI 时可使用 DEV 模式，从本地 `telrobot-saas-go/telrobot-saas-cli` 编译并安装到 `~/.telrobot-cli/bin/`，不从远程下载：

```bash
node scripts/setup.js --dev --cli-source /path/to/telrobot-saas-go/telrobot-saas-cli
TELROBOT_DEV=1 TELROBOT_CLI_SOURCE=/path/to/telrobot-saas-go/telrobot-saas-cli node scripts/setup.js
```

macOS 或 Linux 没有 Node.js 时：

```bash
sh scripts/setup.sh
```

Windows 没有 Node.js 时：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

脚本会写入：

```text
~/.telrobot-cli/bin/telrobot-cli
```

配置文件由 CLI 写入：

```bash
telrobot-cli config init
telrobot-cli config set-token your-token
telrobot-cli config profile set-token 张三 your-token
telrobot-cli config profile use 张三
```

配置文件结构：

```yaml
current: 默认用户

server:
  baseURL: https://ai.telrobot.top/cli
  apiVersion: v1

output:
  format: table

profiles:
  默认用户:
    auth:
      token: user-token-here
```

可以用 `TELROBOT_HOME` 覆盖 Telrobot 本地目录。`TELROBOT_DEV=1` 和 `TELROBOT_CLI_SOURCE` 控制本地源码编译。多用户身份用 profile 表示同一生产环境下的不同用户 token，不表示 dev/test/prod 环境。

## Token 配置

Token 和 profile 配置必须通过 `telrobot-cli config ...` 命令完成。setup 脚本不会写入 token 或 profile。

CLI 支持直接维护 profile：

```bash
telrobot-cli config profile list
telrobot-cli config profile use 张三
telrobot-cli config profile set-token 张三 your-token
telrobot-cli --profile 张三 task list
```

在 `telrobot:init` skill 内切换默认用户时，使用 `telrobot-cli config profile use <别名>`；新增用户身份使用 `telrobot-cli config profile set-token <别名> <token>`。

## 二进制文件

setup 脚本默认从下面的地址下载平台对应的可执行文件：

```text
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/latest/<asset>
```

需要上传到服务器的文件名：

```text
telrobot-darwin-arm64
telrobot-darwin-amd64
telrobot-linux-arm64
telrobot-linux-amd64
telrobot-windows-amd64.exe
```

如果要切换下载地址，可以设置 `TELROBOT_DOWNLOAD_BASE_URL` 环境变量。

## 构建多平台二进制文件

使用提供的构建脚本生成所有平台的二进制文件：

```bash
./scripts/build-release.sh <version>
```

例如：

```bash
./scripts/build-release.sh 1.0.0
```

构建脚本会生成：

```text
dist/telrobot-darwin-arm64
dist/telrobot-darwin-amd64
dist/telrobot-linux-arm64
dist/telrobot-linux-amd64
dist/telrobot-windows-amd64.exe
dist/SHA256SUMS
```

发布时把这些文件上传到：

```text
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/latest/
```

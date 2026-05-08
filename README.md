# AICC Skills

AICC Skills 是一组面向 Agent 的技能包，适用于支持 `skills` CLI 生态的工具。
安装入口统一使用 `npx skills add`，技能安装完成后，再通过初始化技能下载并配置本地 AICC 可执行程序。

## 设计思路

这个仓库把“安装技能”和“安装 AICC 可执行程序”拆成两个步骤。

`npx skills add` 只负责安装 Agent 技能。它会把技能说明、脚本和 Agent 配置复制到目标 Agent 的技能目录。这个仓库不提供自定义 npm 安装器，也不把 npm 包本身作为安装入口。

`aicc:init` 负责初始化本地 AICC 运行环境。它会识别当前 OS 和 CPU 架构，从 OSS 下载对应的可执行文件，安装到 `~/.aicc/bin`，并写入 `~/.aicc/config.json`。

`aicc:task` 是任务流程入口。它应该读取 `~/.aicc/config.json`，通过其中的 `executablePath` 调用 AICC，而不是假设系统 `PATH` 里一定存在 `aicc` 命令。

这样做的好处是安装过程不会修改 shell profile、用户环境变量或系统 PATH。用户如果要在终端手动执行，可以直接使用完整路径，例如 `~/.aicc/bin/aicc`；Agent 内部则统一从配置文件读取执行路径。

## 命名空间

公开技能名使用 AICC 命名空间：

```text
aicc:init
aicc:task
```

仓库目录保持文件系统友好的 kebab-case：

```text
skills/aicc-init/SKILL.md
skills/aicc-skills/SKILL.md
```

部分 Agent 会根据目录名生成 slash command。例如 Claude Code 里可能显示为 `/aicc-init` 和 `/aicc-task`，但 `SKILL.md` 里的公开技能名仍然是 `aicc:init` 和 `aicc:task`。

## 安装

安装当前仓库：

```bash
npx skills add aicc-dev/aicc-skills -a codex -g -y
npx skills add aicc-dev/aicc-skills -a claude-code -g -y
npx skills add aicc-dev/aicc-skills -a codebuddy -g -y
```

通用 GitHub 仓库模板：

```bash
npx skills add <github-owner>/<repo> -a codex -g -y
npx skills add <github-owner>/<repo> -a claude-code -g -y
npx skills add <github-owner>/<repo> -a codebuddy -g -y
```

WorkBuddy 当前使用 `skills` CLI 的 Agent id `codebuddy`。

本地开发时，在仓库根目录执行：

```bash
npx skills add . --list
npx skills add . -a codex -g -y
```

安装完成后，让 Agent 执行初始化技能：

```text
使用 aicc:init 初始化 AICC。
```

## 初始化 AICC

`aicc:init` 内置三种 setup 脚本，Agent 可以根据本机可用运行时选择合适的脚本。

如果本机有 Node.js，在 `skills/aicc-init` 目录执行：

```bash
node scripts/setup.js
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
~/.aicc/bin/aicc
~/.aicc/config.json
```

配置文件结构：

```json
{
  "executablePath": "/Users/example/.aicc/bin/aicc",
  "executableFound": true
}
```

可以用 `AICC_HOME` 覆盖 AICC 本地目录，也可以用 `AICC_CONFIG_PATH` 覆盖配置文件路径。

## Token Mock

`aicc:init` 还包含一个本地 token 配置 mock。它会检查本地 AICC 可执行文件是否存在，然后把 token 和执行路径写入 `~/.aicc/config.json`。

在 `skills/aicc-init` 目录执行：

```bash
node scripts/token-mock.js --token mock-token
```

也可以通过环境变量传入 token：

```bash
AICC_TOKEN=mock-token node scripts/token-mock.js
```

mock 写出的 JSON 结构：

```json
{
  "token": "mock-token",
  "executablePath": "/Users/example/.aicc/bin/aicc",
  "executableFound": true
}
```

## 二进制文件

setup 脚本默认从下面的地址下载平台对应的可执行文件：

```text
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest/<asset>
```

需要上传到 OSS 的文件名：

```text
aicc-darwin-arm64
aicc-darwin-x64
aicc-linux-arm64
aicc-linux-x64
aicc-win32-x64.exe
```

如果要切换 OSS 目录，可以设置 `AICC_DOWNLOAD_BASE_URL`。

## 构建示例 CLI

示例 Go CLI 位于 `cmd/aicc`。它会输出 CLI 名称、版本和运行平台，并支持 `--version`。

构建全部平台产物：

```bash
scripts/build-aicc.sh
```

构建脚本会生成：

```text
dist/aicc-darwin-arm64
dist/aicc-darwin-x64
dist/aicc-linux-arm64
dist/aicc-linux-x64
dist/aicc-win32-x64.exe
```

发布时把这些文件上传到：

```text
https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest/
```

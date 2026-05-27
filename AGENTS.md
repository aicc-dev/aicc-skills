# Repository Guidelines

## 项目结构与模块组织

本仓库是 Telrobot Agent skills 包，核心内容位于 `skills/`。每个技能使用独立目录，目录名采用 kebab-case，例如 `skills/telrobot-init/`、`skills/telrobot-task/`、`skills/telrobot-number/`。每个技能必须包含 `SKILL.md`；初始化技能的辅助脚本放在 `skills/telrobot-init/scripts/`，包括 Node.js、Shell、PowerShell 和 token 配置脚本。根目录的 `README.md` 说明安装与发布思路，`skills/README.md` 说明各技能用途和安全约束。

## 构建、测试与开发命令

- `npx skills add . --list`：检查本地仓库可被识别的技能列表。
- `npx skills add . -a claude-code -g -y`：将本地技能安装到指定 Agent，开发验证时使用。
- `npm run setup`：执行 `skills/telrobot-init/scripts/setup.js`，初始化本地 Telrobot CLI。
- `npm test`：运行 `go test ./...`。当前仓库没有 Go package 时会提示 `no packages to test`，这是现状而非脚本错误。

## 编码风格与命名约定

技能目录保持 kebab-case，公开技能名在 `SKILL.md` 中使用命名空间格式，如 `telrobot:init`。Markdown 文档使用简洁标题、命令示例和明确的错误处理说明。脚本优先保持跨平台兼容；JavaScript 使用 2 空格缩进，Shell 脚本避免依赖用户 shell profile 或全局 `PATH`。

## 测试指南

变更 `SKILL.md` 后，至少运行 `npx skills add . --list` 确认技能可发现。变更初始化脚本后，优先用 `npm run setup` 或直接在 `skills/telrobot-init/` 下执行对应脚本验证。涉及 CLI 路径、token 或环境变量时，覆盖 `TELROBOT_HOME`、`TELROBOT_CONFIG_PATH`、`TELROBOT_TOKEN` 等场景。

## 提交与 Pull Request 指南

当前历史提交多为简短中文说明，如 `skills相关修改`。新提交建议使用更具体的中文动宾结构，例如 `更新 telrobot:init 安装说明`。PR 应说明变更的技能、验证过的命令、兼容性影响；若修改用户可见流程，请附关键终端输出或截图。

## 安全与配置注意事项

Agent 操作必须通过 `telrobot-cli` 执行，不要在技能中加入绕过 CLI 的 HTTP 请求、`curl` 降级或手写 API 调用。不要提交真实 token、用户配置或下载后的二进制文件。配置示例应使用占位值，如 `your-token`。

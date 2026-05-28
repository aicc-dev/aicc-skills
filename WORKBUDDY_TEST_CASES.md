# WorkBuddy 测试用例

本文档用于在 WorkBuddy 中手工验证 `aicc-skills`。除明确说明外，命令均在仓库根目录执行：

```bash
cd /Users/long/projects/aicc-agent/aicc-skills
```

注意：不要把真实 token 写入仓库文件。下面的 `<真实Token>`、`<任务ID>`、`<号码文件路径>` 都需要测试时临时替换。

## 准备工作

1. 安装或软链 skills 到 WorkBuddy：

```bash
npx skills add aicc-dev/aicc-skills -a workbuddy -g -y
```

本地开发可改用当前仓库：

```bash
npx skills add . -a workbuddy -g -y
```

2. 验证 WorkBuddy skills 目录：

```bash
ls -l ~/.workbuddy/skills/telrobot-*
```

预期：能看到 `telrobot-init`、`telrobot-task`、`telrobot-number`。

3. 建议先备份真实配置：

```bash
cp -a ~/.telrobot-cli ~/.telrobot-cli.bak-$(date +%Y%m%d%H%M%S) 2>/dev/null || true
```

## TC-01：Skill 包可被识别

步骤：

```bash
npx skills add . --list
```

预期：
- 输出包含 `telrobot:init`
- 输出包含 `telrobot:task`
- 输出包含 `telrobot:number`
- 不出现 `telrobot-interactive-task-create`

## TC-02：setup 只安装 CLI，不写 config

步骤：

```bash
export TELROBOT_HOME="$(mktemp -d)"
mkdir -p "$TELROBOT_HOME/bin" && : > "$TELROBOT_HOME/bin/telrobot-cli" && chmod +x "$TELROBOT_HOME/bin/telrobot-cli"
node skills/telrobot-init/scripts/setup.js --mode single --profile "张三=ignored"
test -f "$TELROBOT_HOME/bin/telrobot-cli" && echo "CLI_EXISTS"
test -f "$TELROBOT_HOME/config.yaml" && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

预期：
- `TELROBOT_HOME` 对应的临时目录下存在 `bin/telrobot-cli`
- 输出包含 `Telrobot CLI 已存在，跳过下载`
- 输出 `NO_CONFIG`
- setup 不要求 token，不消费 `--mode`/`--profile`，不写 `config.yaml`

## TC-03：用 CLI 创建默认用户配置

步骤：

```bash
export TELROBOT_HOME="$(mktemp -d)"
mkdir -p "$TELROBOT_HOME/bin"
go build -C /Users/long/projects/aicc-agent/telrobot-saas-go/telrobot-saas-cli -o "$TELROBOT_HOME/bin/telrobot-cli" .
"$TELROBOT_HOME/bin/telrobot-cli" config init --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config set-token "<真实Token>" --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config show --config "$TELROBOT_HOME/config.yaml"
```

预期：
- `config.yaml` 由 `telrobot-cli config init` 创建
- 默认 profile 写入 token
- setup 脚本没有参与写配置

## TC-04：用 CLI 新增或更新 profile

步骤：

```bash
export TELROBOT_HOME="$(mktemp -d)"
mkdir -p "$TELROBOT_HOME/bin"
go build -C /Users/long/projects/aicc-agent/telrobot-saas-go/telrobot-saas-cli -o "$TELROBOT_HOME/bin/telrobot-cli" .
"$TELROBOT_HOME/bin/telrobot-cli" config init --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile set-token "张三" "<真实Token>" --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile set-token "李四" "token-for-li" --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile use "张三" --config "$TELROBOT_HOME/config.yaml"
cat "$TELROBOT_HOME/config.yaml"
```

预期：
- `current: 张三`
- `profiles` 下有 `张三` 和 `李四`
- `张三` 和 `李四` 的 token 都非空
- profile 不存在时，`config profile set-token` 自动创建 profile

## TC-05：切换默认用户/profile 必须用 CLI

步骤：

```bash
export TELROBOT_HOME="$(mktemp -d)"
mkdir -p "$TELROBOT_HOME/bin"
go build -C /Users/long/projects/aicc-agent/telrobot-saas-go/telrobot-saas-cli -o "$TELROBOT_HOME/bin/telrobot-cli" .
"$TELROBOT_HOME/bin/telrobot-cli" config init --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile set-token "张三" "<真实Token>" --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile set-token "李四" "token-for-li" --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile use "李四" --config "$TELROBOT_HOME/config.yaml"
grep '^current:' "$TELROBOT_HOME/config.yaml"
```

预期：
- `current` 从默认值改为 `李四`
- 切换通过 `telrobot-cli config profile use 李四` 完成
- 不使用脚本、`sed` 或直接编辑 YAML

## TC-06：切换到不存在的 profile

步骤：

```bash
export TELROBOT_HOME="$(mktemp -d)"
mkdir -p "$TELROBOT_HOME/bin"
go build -C /Users/long/projects/aicc-agent/telrobot-saas-go/telrobot-saas-cli -o "$TELROBOT_HOME/bin/telrobot-cli" .
"$TELROBOT_HOME/bin/telrobot-cli" config init --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile set-token "张三" "<真实Token>" --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile use "不存在" --config "$TELROBOT_HOME/config.yaml"
```

预期：
- 切换命令失败
- 输出包含 `profile 不存在: 不存在`
- 不直接编辑 `config.yaml`

## TC-07：给已有 profile 补 token

步骤：

```bash
export TELROBOT_HOME="$(mktemp -d)"
mkdir -p "$TELROBOT_HOME/bin"
go build -C /Users/long/projects/aicc-agent/telrobot-saas-go/telrobot-saas-cli -o "$TELROBOT_HOME/bin/telrobot-cli" .
"$TELROBOT_HOME/bin/telrobot-cli" config init --config "$TELROBOT_HOME/config.yaml"
"$TELROBOT_HOME/bin/telrobot-cli" config profile set-token "李四" "token-for-li" --config "$TELROBOT_HOME/config.yaml"
cat "$TELROBOT_HOME/config.yaml"
```

预期：
- `李四` profile 被创建或更新
- `李四` 的 token 更新为 `token-for-li`
- 写配置的动作由 `telrobot-cli` 完成

## TC-08：setup check 只检查 CLI

步骤：

```bash
export TELROBOT_HOME="$(mktemp -d)"
mkdir -p "$TELROBOT_HOME/bin" && : > "$TELROBOT_HOME/bin/telrobot-cli" && chmod +x "$TELROBOT_HOME/bin/telrobot-cli"
node skills/telrobot-init/scripts/setup.js --check
```

预期：
- 输出包含 `Telrobot CLI: present`
- 不检查 `config.yaml`
- 不检查 Token

## TC-09：DEV 模式从本地 CLI 编译

步骤：

```bash
export TELROBOT_HOME="$(mktemp -d)"
node skills/telrobot-init/scripts/setup.js \
  --dev \
  --cli-source /Users/long/projects/aicc-agent/telrobot-saas-go/telrobot-saas-cli
ls -l "$TELROBOT_HOME/bin"
```

预期：
- 输出包含 `DEV 模式`
- 本地执行 `go build`
- `$TELROBOT_HOME/bin/telrobot-cli` 存在且可执行
- 不从远程下载二进制

## TC-10：WorkBuddy 对话触发初始化

在 WorkBuddy 中输入：

```text
查看当前账户下的呼叫任务
```

预期：
- 如果 CLI 或配置不存在，WorkBuddy 自动触发 `telrobot:init`
- CLI 缺失时先执行 setup 安装 CLI；配置缺失时执行 `telrobot-cli config init`
- token 缺失时，必须提示：`请提供云蝠系统内配置AI助理下生成的token信息`
- 用户提供 token 后，WorkBuddy 执行 `telrobot-cli config set-token <token>` 或 `telrobot-cli config profile set-token <别名> <token>` 并验证
- 不要求用户手动执行 setup 命令

## TC-11：WorkBuddy 切换默认用户

前置：`config.yaml` 中已有 `张三` 和 `李四` 两个 profile。

在 WorkBuddy 中输入：

```text
把默认用户切换成李四
```

预期：
- WorkBuddy 执行 `telrobot-cli config profile use 李四`
- `current` 变为 `李四`
- 不重新初始化、不重新下载 CLI、不覆盖 token
- 不直接编辑 `~/.telrobot-cli/config.yaml`

验证：

```bash
grep '^current:' ~/.telrobot-cli/config.yaml
```

## TC-12：WorkBuddy 查询任务列表

在 WorkBuddy 中输入：

```text
查看当前账户下前 5 个呼叫任务
```

预期：
- WorkBuddy 执行 `telrobot-cli task list --page 1 --size 5` 或等价 CLI 命令
- 返回结果包含任务名称、任务ID、类型、状态、激活状态等 CLI 输出字段
- 不使用 `curl`、`wget` 或手写 HTTP 请求
- CLI 失败时，原样展示错误，不自动降级为 HTTP

## TC-13：WorkBuddy 查询全部任务

在 WorkBuddy 中输入：

```text
查看当前账户下全部呼叫任务
```

预期：
- WorkBuddy 执行 `telrobot-cli task list --all` 或等价 CLI 命令
- 返回结果包含任务名称、任务ID、类型、状态、激活状态等 CLI 输出字段
- 不只展示第一页，也不使用 memory 中的历史任务列表

## TC-14：WorkBuddy 查看任务详情

在 WorkBuddy 中输入：

```text
查看任务 <任务ID> 的详情
```

预期：
- WorkBuddy 执行 `telrobot-cli task info <任务ID>` 或 `telrobot-cli task info <任务ID> --output json`
- 返回任务ID、任务名称、状态、最大并发、CPS、回收限制、创建时间、修改时间等 CLI 输出字段
- 不用上一次 `task list` 的摘要替代详情查询

## TC-15：WorkBuddy 查看任务运行状态

在 WorkBuddy 中输入：

```text
查看任务 <任务ID> 现在跑到哪了，还有多少没打
```

预期：
- WorkBuddy 执行 `telrobot-cli task status <任务ID>` 或 `telrobot-cli task status <任务ID> --output json`
- 返回任务名称、总号码数、已拨打数量、待拨打数量、完成率
- 不用 `task stat` 替代运行概况查询

## TC-16：WorkBuddy 使用指定 profile 查询任务

在 WorkBuddy 中输入：

```text
用张三这个用户查看任务列表
```

预期：
- WorkBuddy 透传 profile，例如 `telrobot-cli --profile 张三 task list`
- 不修改 `config.yaml` 的 `current`
- 返回张三 profile 对应账户的任务列表或 CLI 错误

## TC-17：WorkBuddy 查看账号/profile 列表

在 WorkBuddy 中输入：

```text
查看下我的账号
```

预期：
- WorkBuddy 执行 `telrobot-cli config profile list`
- 原样展示 profile 列表和当前 profile
- 不直接读取 `~/.telrobot-cli/config.yaml` 替代 CLI 查询

## TC-18：WorkBuddy 删除账号/profile

在 WorkBuddy 中输入：

```text
删除李四这个账号
```

预期：
- WorkBuddy 先执行 `telrobot-cli config profile list`
- 如果 `李四` 完全匹配，先向用户二次确认，再执行 `telrobot-cli config profile remove 李四`
- 如果只是部分匹配或匹配多个候选，必须展示候选并让用户确认完整别名
- 不完全匹配时禁止直接删除
- 删除必须通过 `telrobot-cli config profile remove <完整别名>` 执行
- 禁止直接编辑 `~/.telrobot-cli/config.yaml`，也禁止用脚本、`sed`、文本替换删除 profile

## TC-19：WorkBuddy 禁止用 memory 回答实时任务数据

在 WorkBuddy 中连续输入：

```text
查看当前账户下前 5 个呼叫任务
```

然后再次输入：

```text
再查一次当前账户下前 5 个呼叫任务
```

预期：
- 第二次仍然执行 `telrobot-cli task list --page 1 --size 5` 或等价 CLI 命令
- 不直接复用第一次的任务数量、任务列表或状态
- 回答中说明数据来自刚刚执行的 CLI 命令，或标注本次查询时间
- 不说“根据刚才的结果”并直接给出业务数据

## TC-20：WorkBuddy 状态变更后重新查询确认

在 WorkBuddy 中输入：

```text
停止任务 <任务ID>，然后确认它现在的状态
```

预期：
- WorkBuddy 执行 `telrobot-cli task stop <任务ID>` 或等价 CLI 命令
- 停止后再次执行 `telrobot-cli task info <任务ID>` 或能确认最新状态的等价 CLI 命令
- 最终回答基于停止后的最新 CLI 输出
- 不只根据“已执行 stop 命令”推断任务状态

## TC-21：WorkBuddy 查询号码列表

在 WorkBuddy 中输入：

```text
查看任务 <任务ID> 的号码列表
```

预期：
- WorkBuddy 执行 `telrobot-cli number list <任务ID>` 或等价 CLI 命令
- 返回号码状态、号码、联系人姓名、公司等 CLI 输出字段
- 不绕过 CLI 调后端接口

## TC-22：WorkBuddy 禁止用 memory 回答实时号码数据

在 WorkBuddy 中连续输入：

```text
查看任务 <任务ID> 的号码列表
```

然后再次输入：

```text
再查一次这个任务的号码列表
```

预期：
- 第二次仍然执行 `telrobot-cli number list <任务ID>` 或等价 CLI 命令
- 可以从上下文理解“这个任务”是 `<任务ID>`，但不能复用上一次号码列表作为当前结果
- 回答中说明数据来自刚刚执行的 CLI 命令，或标注本次查询时间

## TC-23：WorkBuddy 从文件导入号码

在 WorkBuddy 中输入：

```text
把 <号码文件路径> 导入到任务 <任务ID>
```

预期：
- WorkBuddy 直接执行 `telrobot-cli number import-file <任务ID> <号码文件路径>`
- 不读取文件内容
- 不解析 Excel
- 不把 Excel 转成 CSV/TXT
- 不从文件中手动提取号码

## TC-24：完整回归命令

步骤：

```bash
npm test
npx skills add . --list
```

预期：
- `npm test` 全部通过
- `npx skills add . --list` 能识别 3 个 skills
- 没有真实 token 或用户配置被写入仓库

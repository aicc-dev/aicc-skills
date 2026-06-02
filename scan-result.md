我对比了 `telrobot-saas-go/telrobot-saas-cli` 的 Cobra 命令和 `aicc-skills` 里的 `telrobot:init/task/number` 文档。没有改代码。当前主要缺口如下。

**Task Skill 缺失**
1. `task add` 创建任务未在 skill 中实现完整引导
CLI 已有 `telrobot-cli task add [任务名称]`，并支持大量非交互参数：`--name`、`--extension`、`--dial-time`、`--max-call`、`--line`、`--enable-type`、`--start-time`、`--stop-time`、`--redial-*`、`--bridge-group-id` 等。
对应 CLI：`telrobot-saas-cli/cmd/task/task_add.go`、注册在 `task.go`。
skills 里目前没有完整“创建任务”业务流程。

2. `task init-data` 未覆盖
CLI 有 `telrobot-cli task init-data`，用于获取创建任务需要的话术组、机器人话术、语音助手、呼叫时间组、转接组、背景音。
这个是 Agent 非交互创建任务前很关键的数据源，但 skill 里没有说明。

3. `task info` 未作为独立能力覆盖
CLI 有 `telrobot-cli task info <任务ID>`。
skill 里只在实时数据规则里提到可以用它确认状态，但没有“查看任务详情”的用户触发、输出字段、执行规则。

4. `task edit-info` 未覆盖
CLI 有 `telrobot-cli task edit-info <任务ID>`，用于获取任务编辑信息。
skill 里没有对应业务场景。

5. `task update` 未覆盖
CLI 有 `telrobot-cli task update <任务ID> --name ...`，支持更新任务名称并输出 table/json。
skill 里没有“修改任务名称/更新任务”的流程。

6. `task delete` 和 `task batch-delete` 未覆盖
CLI 有单个删除和批量删除：
`telrobot-cli task delete <任务ID>`
`telrobot-cli task batch-delete <任务ID1,任务ID2,...>`
skill 里没有删除任务的安全确认、用户触发、失败处理。

7. `task copy` 未覆盖
CLI 有 `telrobot-cli task copy [任务ID或名称]`。
skill 里没有复制任务场景。

8. `task set-top` 未覆盖
CLI 有 `telrobot-cli task set-top <任务ID> on|off`。
skill 里没有置顶/取消置顶任务场景。

9. `task status` 和 `task to-call` 未覆盖
CLI 有：
`telrobot-cli task status [任务ID或名称]` 查看运行概况
`telrobot-cli task to-call <任务ID>` 获取待拨打号码数量
skill 里目前用 `task stat` 做统计，但没有覆盖这两个更直接的运行状态/待拨打数量命令。

10. `task list-lines` 只在配置线路流程里提到，没有作为独立查询能力覆盖
CLI 有 `telrobot-cli task list-lines`。
skill 里只作为 `set-line` 的前置步骤，没有“查看可用线路”的用户触发。

11. 部分已覆盖命令的 flags 不完整
`task list` CLI 支持 `--all`，skill 里没列。
`task stat` CLI 支持 `--status`、`--columns`、`--output`，skill 里主要只写了 `--type`、`--date`。
`customers-by-intention` CLI 支持 `--task`、`--intentions`、`--output`，skill 里描述成全交互式，未覆盖非交互参数。

**Number Skill 缺口较少**
1. `number import-file` 的 `--auto-convert` 未列入 flags
CLI 支持 `--auto-convert`，skill 文档描述了自动转换，但 flags 列表没写这个参数。

2. `number import-file` 的 alias `batch-import` 未提到
CLI 支持别名 `batch-import`，skill 里只写了 `import-file`。这不影响主流程，但属于未记录能力。

3. `number import-job --json` 已提到，但不是 flags 小节形式
skill 里写了“需要机器可读结果时使用 `--json`”，基本覆盖；只是没有像其它命令一样列成 flags。

**Config / Init Skill 缺口**
1. CLI 的配置管理命令没有完整映射到 skill
CLI 有：
`config show`、`config open`、`config path`、`config profile list`、`config profile remove`
skill 目前主要覆盖 init、set-token、profile use/current 切换。
如果用户问“当前有哪些 profile / 配置文件在哪 / 删除某个 profile”，skill 没有明确流程。

**文档不一致 / 风险点**
1. `telrobot-number` 里提到可通过 `telrobot-cli task search` 获取任务 ID，但 CLI 里没有 `task search` 命令。实际应使用 `task list --name <关键词>`。
位置：[telrobot-number/SKILL.md](/Users/long/projects/aicc-agent/aicc-skills/skills/telrobot-number/SKILL.md:148)

2. `telrobot-task` 里有 “Search Tasks” 章节，但实际也是 `task list --name`，不是独立 `task search`。这个本身可接受，但需要避免 agent 误以为有 `task search` 命令。

整体结论：`number` skill 基本覆盖主业务；`task` skill 缺口比较大，主要少了“创建、更新、删除、复制、详情、编辑信息、置顶、运行状态、待拨打数、初始化数据”等 CLI 已有能力。



---

### 需要实现

#### config部分

1. `config profile list`

   查看下我的账号

2. `config profile remove`

   接受一个别名进行删除, 如果不完全匹配的, 需要让用户二次确认



#### task部分

1. task add 暂时不实现
2. task init-data 暂时不实现
3. task info 需要实现
4. task edit-info / update / delete / batch-delete / copy /set-top 暂时不实现

5. task status 需要实现
6. task list-lines 暂时不实现
7. task list --all 需要实现



#### number部分

不需要实现

---

### 处理结果

已按“需要实现”范围更新 skills：

- `config profile list`：已加入 `telrobot:init`，用于“查看我的账号 / 查看 profile 列表”等场景。
- `config profile remove`：已加入 `telrobot:init`，要求先列出 profile；完全匹配也要二次确认，不完全匹配必须让用户确认完整别名。
- `task info`：已加入 `telrobot:task`，用于查看任务详情。
- `task status`：已加入 `telrobot:task`，用于查看运行概况、待拨打数量、完成率。
- `task list --all`：已加入 `telrobot:task` 的 flags、触发词和示例。

同时已补充 `WORKBUDDY_TEST_CASES.md` 中的人工测试用例。

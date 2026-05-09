---
name: telrobot:task
description: Use this skill for Telrobot CLI task management operations including listing, searching, creating, activating, starting, stopping, copying, deleting tasks, configuring lines, and viewing stats.
---

# Telrobot Task

This skill provides comprehensive task management for Telrobot CLI. Configuration is read from `~/.telrobot/config.json`.

## Configuration

The skill reads configuration from `~/.telrobot/config.json`. Initialize with:

```bash
使用 telrobot:init 初始化 Telrobot CLI 环境
```

The config file should contain:

```json
{
  "executablePath": "/Users/example/.telrobot/bin/telrobot-cli",
  "executableFound": true,
  "apiUrl": "https://api.telrobot.com",
  "token": "user-token-here",
  "version": "1.0.0"
}
```

---

## Task Management Commands

### List Tasks

```bash
telrobot-cli task list [--page N] [--size N] [--name 关键词]
```

**Flags**:
- `--page N`：页码，默认 1
- `--size N`：每页数量，默认 20
- `--name 关键词`：按任务名称**模糊过滤**，支持部分名称（如 `--name "哈哈"` 可匹配 "哈哈哈"、"0430-哈哈"）

**Output columns**: 序号、任务ID、任务名称、类型(呼入/呼出)、状态(开启/关闭)、是否激活(激活/休眠)、并发量、AI对话模型、创建时间

**User triggers**: "查看任务列表", "显示所有任务", "列出任务", "任务有哪些"

---

### Search Tasks（按名称搜索）

```bash
telrobot-cli task list --name <关键词>
```

**Agent 使用场景**：当用户说"开启/停止/查看某个任务"时，若用户提供的是任务名称，**必须先用此命令搜索**，将结果原样展示给用户，再让用户确认 UUID。

- 支持部分名称：`--name "你好"` 可匹配所有名称包含"你好"的任务
- 结果展示与 `task list` 完全一致（含状态、类型、并发量等完整信息）

**User triggers**: "搜索任务", "查找任务", "找一下任务"

---

### Create Task

```bash
telrobot-cli task add [任务名称]
```

**完全交互式**，无需任何 flags，运行后进入引导流程：

**创建模式选择**：
- `[1] 默认配置`：全自动，任务名称自动生成（当前时间），所有参数使用系统默认值，一键完成
- `[2] 自定义配置`：交互式逐步选择以下内容：
  1. 话术组类型（AI话术组 / 机器人话术 / 语音助手）及具体话术组
  2. 呼叫时间组（标记 `*` 为默认推荐）
  3. 最大并发数（默认 1）
  4. 运行时间范围（开始时间默认今天 00:00:00，结束时间默认今天 23:59:59；支持 `HH:MM:SS` 或 `YYYY-MM-DD HH:MM:SS` 格式）
  5. 高级参数（可选）：重拨设置（间隔0-60秒、最大次数1-3）、背景音、转接组

> **注意**：任务创建后默认已激活（IsActive=1），无需额外执行 `task activate`。只需配置线路后即可直接启动：`task set-line` → `task start`。

**User triggers**: "创建任务", "新建任务", "添加任务"

---

### Task Info

```bash
telrobot-cli task info <任务ID>
```

显示任务ID、名称、状态（运行中/已停止）、最大并发、CPS、回收限制、创建时间、修改时间。

**User triggers**: "查看任务详情", "任务信息", "任务状态"

---

### Task Stats

```bash
telrobot-cli task stats <任务ID>
```

显示任务名称、总号码数、已拨打数量、待拨打数量、完成率。

**User triggers**: "任务统计", "运行概况", "拨打进度"

---

### Start Task

```bash
telrobot-cli task start <任务UUID>
```

**重要：必须使用 UUID 执行，禁止用名称直接传给命令**（名称会触发交互式终端输入，AI 无法处理）。

**Agent 执行流程**：
1. 若用户提供的是任务名称（非 UUID），先执行 `telrobot-cli task list --name "<关键词>"` 获取匹配任务
2. 将命令输出**原样展示**给用户（含完整状态、类型、并发量等信息）
3. **询问用户确认**："找到以上任务，请问您要启动哪一个？（输入序号）"
4. 用户确认后，使用对应的 UUID 执行：`telrobot-cli task start <UUID>`
5. 若用户提供的已经是 UUID，直接执行

**Error guidance**:
- 报错含"休眠"：提示先执行 `telrobot-cli task activate <任务UUID>`，再重新启动
- 报错含"线路"：**Agent 应自动进入线路配置流程**（见下方 Set Task Line），配置完毕后自动重试启动

**User triggers**: "启动任务", "开始任务", "运行任务"

---

### Stop Task

```bash
telrobot-cli task stop <任务UUID>
```

**重要：必须使用 UUID 执行，禁止用名称直接传给命令**（名称会触发交互式终端输入，AI 无法处理）。

**Agent 执行流程**：
1. 若用户提供的是任务名称（非 UUID），先执行 `telrobot-cli task list --name "<关键词>"` 获取匹配任务
2. 将命令输出**原样展示**给用户（含完整状态、类型、并发量等信息）
3. **询问用户确认**："找到以上任务，请问您要停止哪一个？（输入序号）"
4. 用户确认后，使用对应的 UUID 执行：`telrobot-cli task stop <UUID>`
5. 若用户提供的已经是 UUID，直接执行

**User triggers**: "停止任务", "暂停任务", "关闭任务"

---

### Activate Task

```bash
telrobot-cli task activate [任务ID或名称]
```

激活休眠中的任务，激活后才能启动。若任务已激活，会提示无需重复操作。

- 不传参数：交互式展示所有任务并选择
- 传任务名称（非 UUID）：按名称模糊搜索
- 传任务 ID（UUID 格式）：直接激活

> **注意**：新建任务默认已激活，此命令主要用于激活**复制任务**（复制后默认休眠）或被手动停用的任务。

**User triggers**: "激活任务", "唤醒任务"

---

### Update Task

```bash
telrobot-cli task update <任务ID> --name="新名称"
```

当前仅支持更新任务名称（`--name / -n`）。

**User triggers**: "更新任务", "修改任务名称", "重命名任务"

---

### Copy Task

```bash
telrobot-cli task copy [任务ID或名称]
```

复制任务，返回新任务 ID 和名称。复制后新任务默认处于**休眠**状态，需执行 `task activate` 激活后才能启动。

- 不传参数：交互式展示所有任务并选择
- 传任务名称（非 UUID）：按名称模糊搜索
- 传任务 ID（UUID 格式）：直接复制

**User triggers**: "复制任务", "克隆任务"

---

### Delete Task

```bash
telrobot-cli task delete <任务ID>
```

删除单个任务（不可恢复）。

**User triggers**: "删除任务"

---

### Batch Delete Tasks

```bash
telrobot-cli task batch-delete "任务ID1,任务ID2,任务ID3"
```

批量删除，执行前会要求 y/n 确认。

**User triggers**: "批量删除任务"

---

### Set Task Line（配置外呼线路）

```bash
# 交互式（终端使用）
telrobot-cli task set-line [任务ID或名称]

# 非交互式（Agent 使用）
telrobot-cli task set-line <任务UUID> --line "序号:并发数"

# 查看可用线路列表（Agent 必须先执行这步）
telrobot-cli task list-lines
```

**`--line` 参数格式**：
- `"1"` — 使用第1条线路，并发数取剩余最大值
- `"1:5"` — 使用第1条线路，并发数为5
- `"1,2:3"` — 使用第1条和第2条线路，第2条并发数为3
- `"线路ID:5"` — 用线路ID精确指定

**Agent 完整执行流程（当用户请求启动任务报"线路"错误时）**：

1. 执行 `telrobot-cli task list-lines` 获取线路列表
2. 将线路列表以表格形式展示给用户（序号、线路名称、剩余并发）
3. **询问用户**："请选择要使用的线路序号，以及并发数（可留空使用全部剩余并发）"
   - 示例："选第1条，并发2" → 转为 `--line "1:2"`
   - 示例："选第1条" → 转为 `--line "1"`
4. 执行：`telrobot-cli task set-line <任务UUID> --line "<用户选择>"`
5. 配置成功后**自动重试**：`telrobot-cli task start <任务UUID>`

> **交互式模式说明**（仅终端使用，Agent 不适用）：
> 不传 `--line` 时进入方向键+空格多选界面（最多5条），每条线路逐一输入并发数。

**User triggers**: "配置线路", "设置外呼线路", "给任务配线路", "任务没有线路"

---

### Set Task Top（置顶）

```bash
telrobot-cli task set-top <任务ID> on
telrobot-cli task set-top <任务ID> off
```

**User triggers**: "任务置顶", "取消置顶"

---

### To-Call Count（待拨打数量）

```bash
telrobot-cli task to-call <任务ID>
```

显示该任务的待拨打号码数量。

**User triggers**: "待拨数量", "剩余号码", "还有多少没拨"

---

### Edit Info（编辑信息）

```bash
telrobot-cli task edit-info <任务ID>
```

显示任务编辑信息（ID、名称、并发、CPS、回收限制）。

---

## Task Operation Workflow

典型操作流程：

```
1. 创建任务（task add）         ← 创建后任务默认已激活（无需手动激活）
2. 配置线路（task set-line）    ← 新建任务默认无线路，必须先配置
3. 启动任务（task start）
4. 查看进度（task stats）
5. 停止任务（task stop）
```

---

## Error Handling

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 任务处于休眠状态，无法操作 | 任务未激活 | 先执行 `task activate <任务ID>` |
| 任务未配置外呼线路 | 未设置线路 | 先执行 `task set-line` |
| 并发数异常 | 线路并发之和不等于总并发 | 重新配置线路 |
| 401 Unauthorized | Token 无效 | 执行 `config set-token` 更新 Token |
| 任务不存在 | ID 错误 | 先执行 `task list` 确认 ID |

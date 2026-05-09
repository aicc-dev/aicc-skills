---
name: telrobot:number
description: Use this skill for Telrobot CLI number management operations including listing, searching, adding, updating, deleting, batch importing, batch resetting, and batch deleting numbers within a task.
---

# Telrobot Number

This skill provides comprehensive number (contact) management for Telrobot CLI. All number operations are scoped to a specific task by task ID.

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

## Number Management Commands

> **注意**：所有号码操作均需要提供 `任务ID`（UUID 格式）作为第一个参数。可通过 `telrobot-cli task list` 或 `telrobot-cli task search` 获取任务ID。

### Global Flags（所有子命令可用）

- `--page / -p N`：页码，默认 1
- `--per-page / -s N`：每页数量，默认 50

---

### List Numbers

```bash
telrobot-cli number list <任务ID> [--page N] [--per-page N]
```

列出指定任务下的所有号码，显示状态、号码、联系人姓名、公司等信息。

**Output**: 号码状态、号码、联系人姓名（可选）、公司（可选）；底部显示总计和当前页码。

**User triggers**: "查看号码列表", "任务的号码", "列出号码"

---

### Search Numbers

```bash
telrobot-cli number search <任务ID> <关键词> [--interactive] [--exec <操作>]
```

通过号码、姓名或公司模糊搜索，支持交互式选择和直接执行操作。

**Flags**:
- `--interactive / -i`：交互式选择模式
- `--exec <操作>`：搜索后直接执行操作，支持 `delete / update / info`

**Behavior**:
- 返回多条结果时交互式展示，输入序号选择后显示操作菜单
- 只有一条结果时直接显示操作菜单（含查看详情/更新信息/删除）
- `--exec` 模式下自动对第一条结果执行指定操作

**User triggers**: "搜索号码", "查找号码", "找号码"

---

### Add Number

```bash
telrobot-cli number add <任务ID> <号码> [--name "姓名"] [--company "公司"]
```

向指定任务添加单个号码。

**Flags**:
- `--name / -n "姓名"`：联系人姓名（可选）
- `--company / -c "公司"`：公司名称（可选）

**Output**: 号码ID、号码、联系人姓名（若有）、创建时间。

**User triggers**: "添加号码", "新增号码", "导入单个号码"

---

### Batch Add Numbers

```bash
telrobot-cli number batch-add <任务ID> "号码1,号码2,号码3" [--to-crm]
```

批量添加多个号码到指定任务，号码之间用英文逗号分隔。

**Flags**:
- `--to-crm / -r`：是否同步到CRM，默认 true

**User triggers**: "批量添加号码", "批量导入号码"

---

### Number Info

```bash
telrobot-cli number info <任务ID> <号码>
```

查看指定号码的详细信息。

**Output**: 号码ID、号码、状态、联系人姓名、公司、通话ID、呼叫时间、通话时长（秒）、挂断原因、创建时间。

**User triggers**: "查看号码详情", "号码信息", "号码状态"

---

### Update Number

```bash
telrobot-cli number update <任务ID> <号码> [--name "新姓名"] [--company "新公司"]
```

更新指定号码的联系人姓名或公司信息。

**Flags**:
- `--name / -n "姓名"`：联系人姓名
- `--company / -c "公司"`：公司名称

**User triggers**: "更新号码", "修改号码信息", "编辑号码"

---

### Delete Number

```bash
telrobot-cli number delete <任务ID> <号码>
```

删除指定任务中的单个号码（不可恢复）。

**User triggers**: "删除号码", "移除号码"

---

### Batch Reset Numbers（批量重置号码状态）

```bash
telrobot-cli number batch-reset <任务ID> [--phones "号码1,号码2"] [--status "状态码1,状态码2"]
```

批量重置任务中号码的状态，使其可以重新呼叫。可指定号码范围或状态范围。

**Flags**:
- `--phones / -p "号码1,号码2"`：指定要重置的号码列表（逗号分隔），不指定则重置所有
- `--status / -s "状态码1,状态码2"`：按状态筛选要重置的号码（逗号分隔的状态码整数）

**Output**: 已重置的号码数量。

**User triggers**: "重置号码", "号码重置", "重拨号码", "重置号码状态"

---

### Batch Delete Numbers（批量删除号码）

```bash
telrobot-cli number batch-delete <任务ID> "号码1,号码2,号码3" [--to-crm]
```

批量删除指定任务中的多个号码，号码之间用英文逗号分隔。

**Flags**:
- `--to-crm / -r`：是否同步到CRM，默认 true

**User triggers**: "批量删除号码", "批量移除号码"

---

## Common Workflow

典型操作流程：

```
1. 查看任务ID（task list）
2. 添加号码（number add 或 number batch-add）
3. 查看号码列表（number list）
4. 搜索号码（number search）
5. 重置号码状态（number batch-reset）← 需要重新呼叫时使用
6. 删除号码（number delete 或 number batch-delete）
```

---

## Error Handling

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 号码格式错误 | 号码不是合法整数 | 检查号码格式，确保为纯数字 |
| 获取号码列表失败 | 任务ID不存在或无权限 | 先执行 `task list` 确认任务ID |
| 401 Unauthorized | Token 无效 | 执行 `config set-token` 更新 Token |
| 未找到匹配的号码 | 搜索关键词无匹配 | 尝试不同关键词或执行 `number list` 浏览 |

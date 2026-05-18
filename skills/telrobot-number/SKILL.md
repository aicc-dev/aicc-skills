---
name: telrobot:number
description: Use this skill for Telrobot CLI number management operations including listing, searching, adding, updating, deleting, batch importing (Excel/CSV/TXT supported with old template compatibility), batch resetting, and batch deleting numbers within a task. Automatically initializes CLI environment on first use.
---

# Telrobot Number

This skill provides comprehensive number (contact) management for Telrobot CLI. All number operations are scoped to a specific task by task ID.

## 🚀 安装后使用方式（CRITICAL）

**安装此 Skill 后，Agent 应立即检查 CLI 环境是否已初始化**。如果未初始化，自动执行环境初始化流程。

**正确用法**：直接描述你的需求，Agent 会自动处理一切：
```
用户："帮我导入一批号码到营销任务"
→ Agent 自动检测环境
→ 环境未初始化 → Agent 自动执行 setup.js
→ Agent 输出：请提供云蝠系统内配置AI助理下生成的token信息
→ 用户提供 Token
→ Agent 自动配置并验证
→ Agent 继续处理号码导入请求
```

**错误用法**：
```
❌ 用户："@skill:telrobot-init"
❌ 用户："帮我初始化 telrobot"
❌ 用户："执行 setup.js"
```

**安装后立即触发**：如果用户安装完 Skill 后没有输入任何内容，Agent 应主动检查环境并引导初始化：
```
Agent 自动检测：~/.telrobot-cli/bin/telrobot-cli 是否存在
 → 不存在：自动执行 setup 脚本
 → 存在但无 Token：提示用户提供 Token
 → 环境就绪：告知用户可以开始使用
```

## ⚠️ 前置环境检查（MUST CHECK）

**每次使用此 Skill 前，Agent 必须自动检查 CLI 环境状态**：

1. 检查 `~/.telrobot-cli/bin/telrobot-cli` 是否存在
2. 检查 `~/.telrobot-cli/config.yaml` 是否存在
3. 检查配置中 Token 是否已配置

**如果环境未初始化**（CLI 或配置缺失）：
- **Agent 自动执行初始化**：使用 `telrobot-init` skill 的 `scripts/setup.js` 或 `scripts/setup.sh`
- 下载 CLI 二进制 + 生成基础配置（Token 留空）
- **Agent 在对话中输出**：`请提供云蝠系统内配置AI助理下生成的token信息`
- 等待用户提供 Token，然后自动配置并验证

**用户无需手动调用 `@skill:telrobot-init`**，Agent 会自动处理环境初始化。

## 🚫 严格安全限制（MUST OBEY）

### 禁止行为（STRICTLY PROHIBITED）

1. **禁止绕过 CLI 封装逻辑**：所有操作必须通过 `telrobot-cli` 命令执行，**严禁**直接调用后端 API
2. **禁止降级到 HTTP 请求**：命令执行出错时，**严禁**自动降级使用 `curl`、`wget` 或其他 HTTP 工具绕过 CLI 封装
3. **禁止手动构造 API 请求**：**严禁**尝试构造 POST/GET/PUT/DELETE 等 HTTP 请求直接调用后端接口
4. **禁止错误自动修复**：命令失败时，**严禁**尝试通过 HTTP 请求"自动修复"或"绕过"错误

### 强制行为（MANDATORY BEHAVIOR）

1. **CLI 命令优先**：所有操作必须通过 `telrobot-cli` 命令执行，无例外
2. **错误透明报告**：命令执行出错时，**必须**将错误信息原样展示给用户，禁止静默降级
3. **按文档处理错误**：严格按照下方的 "Error Handling" 表格处理错误，禁止自定义绕过方案
4. **依赖 CLI 实现细节**：CLI 未提供的功能视为不可用，禁止通过 HTTP 请求补充功能

### 错误处理原则

当 `telrobot-cli` 命令执行失败时：
1. **立即停止**当前操作，向用户展示错误信息
2. **参考 "Error Handling" 表格**提供标准解决方案
3. **禁止尝试**任何形式的 HTTP 降级或绕过
4. **禁止修改**命令参数重新尝试，除非用户明确要求

### 文件导入特殊约束（IMPORT-FILE SPECIFIC）

当处理号码文件导入时，**额外遵守以下规则**：

1. **禁止读取文件内容**：Agent **严禁**使用 `cat`、`read`、`head` 或任何工具读取号码文件内容
2. **禁止解析 Excel**：Agent **严禁**尝试解析 `.xlsx`/`.xls` 文件的内部结构或单元格内容
3. **禁止转换格式**：Agent **严禁**将 Excel 文件转换为 `.txt` 或 `.csv` 格式后再导入
4. **禁止数据提取**：Agent **严禁**从文件中提取号码、姓名等信息，必须交由 CLI 处理
5. **直接传递路径**：Agent 收到文件路径后，**必须直接**调用 `telrobot-cli number import-file <任务ID> <文件路径>`
6. **信任 CLI 能力**：CLI 内置完整的文件解析能力（支持旧模板、智能表头检测、多列名识别），无需 Agent 预处理

**正确流程**：
```
用户提供: /path/to/numbers.xlsx
    ↓
Agent 直接调用: telrobot-cli number import-file <任务ID> /path/to/numbers.xlsx
    ↓
Agent 展示 CLI 输出的进度和结果
```

**错误流程**：
```
❌ Agent 读取文件: cat /path/to/numbers.xlsx
❌ Agent 尝试解析: 使用 Python/Node.js 解析 Excel
❌ Agent 转换格式: 将 Excel 转为 CSV 再导入
❌ Agent 提取数据: 从文件中提取号码列表，改用 batch-add
```

---

## Configuration

The skill reads configuration from `~/.telrobot-cli/config.yaml`. Initialize with:

```bash
telrobot-cli config init
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

### Import Numbers From File（文件导入号码）

> ⚠️ **Agent 强约束**：当用户提供文件路径时，**严禁读取/解析/转换文件内容**，必须直接将路径传给 CLI。CLI 内置完整的文件解析能力（Excel/CSV/TXT），支持旧模板自动兼容。详见上方「文件导入特殊约束」章节。

当用户输入“导入号码”“从文件导入号码”“上传号码文件”等意图时，按以下流程执行。

#### 1. 确认导入任务

如果当前上下文中已有明确的任务 UUID，可直接向用户确认该任务后继续。

如果上下文中没有明确任务，必须先执行：

```bash
telrobot-cli task list
```

将 CLI 输出的任务列表完整展示给用户，并要求用户通过单选确认导入目标。用户确认后，只使用被选中的任务 UUID 执行后续导入。

#### 2. 提示上传文件格式

提示用户提供号码文件路径，支持：

- `.xlsx/.xls/.excel`：**首选格式**，由 CLI 内置 Excel 解析能力处理。兼容以下格式：
  - **旧模板格式**：第1行=说明/描述行，第2行=表头行（如 `号码`/`姓名`/`公司`），第3行起=数据行。CLI 会智能检测表头位置，自动跳过说明行
  - **新格式**：第1行=表头行，第2行起=数据行
  - **无表头格式**：纯号码列，每行一个号码
  - 旧模板中的额外列（如 `task_name`、`sex`、`email`、`custom_variables`、`control_select_robot` 等 CRM 字段）会被安全忽略，仅提取号码、姓名、公司
  - 号码列识别表头：`phone`、`mobile`、`number`、`号码`、`手机号`、`联系电话`、`手机`、`联系方式` 等
  - 姓名列识别表头：`name`、`姓名`、`联系人`、`客户名称` 等
  - 公司列识别表头：`company`、`公司`、`公司名称`、`所属公司` 等
- `.csv`：包含 `phone`、`mobile`、`number`、`号码`、`手机号` 等表头；可附带 `name`、`company`
- `.txt`：每行一个号码，或用逗号、空格、分号分隔

**重要提示**：当用户提供 Excel 文件时，Agent **必须直接将文件路径传给 CLI**，不要尝试自行读取或解析 Excel 内容。CLI 的 `import-file` 命令内置了完整的 Excel 解析能力，包括旧模板兼容。

#### 3. 调用 CLI 导入文件

使用 CLI 内置导入命令处理文件解析、origin JSON 生成、批次导入和进度记录：

```bash
telrobot-cli number import-file <任务ID> <用户号码文件> \
  --batch-size 500 \
  --user-id <用户ID或当前操作者标识> \
  --job-id <本次导入任务ID，可选>
```

**CRM 导入说明**：当 `--to-crm=true`（默认开启）时，CLI 会将文件中解析出的 **姓名（name）**、**公司（company）** 和额外列数据一并传给服务端，CRM 客户将使用文件中的真实姓名而非自动生成的占位名。

**Excel 文件处理说明**：
- CLI 内置 Excel 解析，支持 `.xlsx`、`.xls` 格式
- 自动智能检测表头行位置（兼容旧模板第1行说明+第2行表头的格式）
- 仅提取 **号码（必填）**、**姓名（可选）**、**公司（可选）**，其余列安全忽略
- 用户使用旧版号码导入模板时，无需任何额外操作，CLI 会自动跳过模板说明行
- Agent **严禁**自行读取/解析 Excel 文件内容，必须将文件路径直接传给 CLI

**常见错误示例**（Agent 严禁执行以下操作）：
```bash
# ❌ 错误1: 尝试读取文件内容
$ cat /path/to/numbers.xlsx  # Agent 不要这样做

# ❌ 错误2: 尝试转换格式
$ python -c "import pandas; df.to_csv('numbers.csv')"  # Agent 不要这样做

# ❌ 错误3: 从文件中提取号码，改用 batch-add
$ telrobot-cli number batch-add <任务ID> "13800138000,13900139000"  # Agent 不要这样做

# ✅ 正确: 直接传递路径给 CLI
$ telrobot-cli number import-file <任务ID> /path/to/numbers.xlsx  # Agent 应该这样做
```

CLI 会生成 origin 文件，文件名格式：

```text
origin_userid_task_id_job_id_时间.json
```

JSON 内容格式：

```json
[
  {
    "phone": "13800138001",
    "source_row": 1
  }
]
```

CSV/Excel 有姓名、公司或额外列时，CLI 会保留到同一条记录中。

#### 4. CLI 导入行为

`number import-file` 会在 CLI 内部按批次调用现有批量导入能力。默认每批 500 条：

```bash
telrobot-cli number import-file <任务ID> <用户号码文件> --batch-size 500
```

可用 flags：

- `--batch-size`：每批导入数量，默认 `500`
- `--user-id`：导入文件名中的用户标识，默认 `user`
- `--job-id`：本次导入任务 ID，不传时 CLI 自动生成 UUID
- `--to-crm / -r`：是否同步到 CRM，默认 `true`
- `--skip-error`：跳过错误号码并继续导入，默认 `true`
- `--dry-run`：只生成文件和进度，不写入服务端，测试时使用

CLI 会生成并维护以下文件：

过程文件强制放在 `~/.telrobot/tmp`：

- `origin_userid_task_id_job_id_时间.json`：origin 标准化输入
- `origin_userid_task_id_job_id_时间_tmp.json`：origin 文件备份/执行输入快照
- `userid_task_id_job_id_时间_fail.json`：导入失败的号码和失败原因
- `userid_task_id_job_id_时间_progress.json`：导入进度、成功数、失败数、当前批次

最终报告强制放在 `~/.telrobot/import_results`：

- `userid_task_id_job_id_时间_report.json`：最终导入报告，包含 `job_id`、总数、成功数、失败数、批次、输入文件、origin/tmp/fail/progress 路径等信息

导入完成后，CLI 会移除中间文件 `userid_task_id_job_id_时间_success.json`，成功数量以 `progress.json` 和最终 `report.json` 为准。

#### 5. 实时展示要求

Agent 必须实时展示 `telrobot-cli number import-file` 的 stdout/stderr 进度输出。CLI 输出包含：

- 当前处理数量 / 总数量
- 百分比
- 成功数量
- 失败数量
- 当前批次 / 总批次

如果某个批次失败，CLI 会把该批次号码写入 fail 文件，并立即中断后续批次，不再继续调用导入接口。最终如果存在失败记录，CLI 退出码力“2，Agent+必须将失败文件路径展示给用户。

导入完成后，Agent 必须优先展示最终 `report.json` 路径；如存在失败记录，同时展示 `fail.json` 路径和失败数量。

#### 6. 按 job_id 查询导入结果

如果用户要查看某次导入任务结果，执行：

```bash
telrobot-cli number import-job <job_id>
```

该命令固定读取 `~/.telrobot/import_results/*_report.json`，展示总号码数、已处理数量、成功数量、失败数量、批次大小、总批次数、报告文件、失败文件和进度文件。需要机器可读结果时使用 `--json`。

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
|---------|------|----------|
| 号码格式错误 | 号码不是合法整数 | 检查号码格式，确保为纯数字 |
| 获取号码列表失败 | 任务ID不存在或无权限 | 先执行 `task list` 确认任务ID |
| 401 Unauthorized | Token 无效 | 执行 `config set-token` 更新 Token |
| 未找到匹配的号码 | 搜索关键词无匹配 | 尝试不同关键词或执行 `number list` 浏览 |
| 不支持的文件格式 | 文件扩展名不在 .txt/.csv/.xlsx/.xls/.excel 中 | 转换文件为支持的格式后重试 |
| 没有解析到有效号码 | Excel 中无有效号码或表头无法识别 | 检查号码列是否包含 `phone`/`number`/`号码` 等表头，或确认号码列有数据 |

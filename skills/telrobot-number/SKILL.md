---
name: telrobot:number
description: Use this skill for Telrobot CLI number management operations including listing, searching, adding, updating, and batch importing (.xlsx/.excel/CSV/TXT supported with old template compatibility and --auto-convert intelligent column mapping; .xls must be converted to standard .xlsx first) numbers within a task. Automatically initializes CLI environment on first use.
---

# Telrobot Number

This skill provides comprehensive number (contact) management for Telrobot CLI. All number operations are scoped to a specific task by task ID.

## Profile 选择

Telrobot CLI 支持多个用户身份 profile。用户指定身份时，命令必须透传 `--profile <name>`，也可以通过 `TELROBOT_PROFILE=<name>` 选择；未指定时使用配置文件中的 `current`。示例：

```bash
telrobot-cli --profile 张三 number list <task-id>
TELROBOT_PROFILE=李四 telrobot-cli number list <task-id>
```

## 实时数据与 Memory 规则（CRITICAL）

Agent 必须把 Telrobot CLI 作为号码、联系人、导入结果等业务数据的唯一实时数据源。Agent memory、历史对话、上一次命令输出只能用于理解用户意图，不能用于回答当前业务数据。

**强制规则**：

1. **每次业务查询必须执行 CLI**：用户要求查看号码、搜索号码、查看号码详情、导入结果时，必须实时执行对应 `telrobot-cli` 命令。
2. **禁止用 memory 回答业务结果**：不得根据历史记忆直接回答某个号码是否存在、号码状态、联系人姓名、公司、导入数量或失败原因。
3. **上下文只能解析对象，不能复用数据**：用户说“刚才那个号码/任务”时，可以从上下文提取号码或任务 ID，但仍必须执行 `telrobot-cli number ...` 获取最新状态。
4. **状态变更后必须重新查询确认**：执行 `number add`、`number update`、`number import-file` 等修改操作后，必须基于 CLI 返回结果回答；如果用户继续追问当前状态，必须再次查询。
5. **回答应说明实时来源**：回答实时号码结果时，简要说明“数据来源：刚刚执行 `<命令>`”，或说明查询时间。
6. **精确判断优先使用 JSON**：当 CLI 支持 JSON 输出且需要筛选、比对或后续操作时，优先使用 JSON 输出；否则原样转述 CLI 表格结果。

**允许 memory 保存**：常用 profile、上次用户提到的任务 ID、默认分页大小、用户偏好的展示格式。

**禁止 memory 保存并复用为事实**：号码列表、号码状态、联系人信息、公司信息、导入结果、失败号码、任务内号码总数。

## 🚀 安装后使用方式（CRITICAL）

**安装此 Skill 后，Agent 应立即检查 CLI 环境是否已初始化**。如果未初始化，自动执行环境初始化流程。

**正确用法**：直接描述你的需求，Agent 会自动处理一切：
```
用户："帮我导入一批号码到营销任务"
→ Agent 自动检测环境
→ 环境未初始化 → Agent 自动执行 setup.js
→ Agent 输出：请提供系统内配置 AI 助理下生成的 token 信息
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

**每次使用此 Skill 前，Agent 必须自动检查 CLI 环境和终端编码状态**：

**第一步：检查 CLI 环境**（下列 3 项允许并行）：
1. 检查 `~/.telrobot-cli/bin/telrobot-cli` 是否存在
2. 检查 `~/.telrobot-cli/config.yaml` 是否存在
3. 检查配置中 Token 是否已配置

**第二步：同时检查终端编码**（合并到初始化阶段，不额外增加步骤）：

```bash
echo "LANG=${LANG:-unset} LC_ALL=${LC_ALL:-unset}"
```

**根据检测结果，Agent 在本次会话内确定执行模式，后续所有命令统一使用该模式，不再重复检测**：

| 检测结果 | 执行模式 | 命令示例 |
|---|---|---|
| 输出包含 `UTF-8` 或 `utf8` | ✅ **正常模式**：直接执行 | `telrobot-cli number list <任务ID>` |
| 输出不包含上述内容 | ⚠️ **防乱码模式**：加 `env` 前缀 | `env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli number list <任务ID>` |

**如果环境未初始化**（CLI 或配置缺失）：
- **Agent 自动执行初始化**：使用 `telrobot-init` skill 的 `scripts/setup.js` 或 `scripts/setup.sh`
- 下载 CLI 二进制 + 生成基础配置（Token 留空）
- **Agent 在对话中输出**：`请提供系统内配置 AI 助理下生成的 token 信息`
- 等待用户提供 Token，然后自动配置并验证

**用户无需手动调用 `@skill:telrobot-init`**，Agent 会自动处理环境初始化。

## 🔤 防乱码模式说明

防乱码模式下，所有命令统一使用 `env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` 前缀，**仅影响当前命令进程，不污染用户全局 shell 环境**。

**防乱码模式执行后，Agent 必须主动检查输出是否包含乱码字符（如 `\xef\xbf\xbd`、`?`、无意义符号序列）**：
- 输出正常 → 继续使用防乱码模式执行后续命令
- 输出仍乱码 → **立即切换为 `--output json` 模式**，不得继续使用表格输出：

```bash
env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli number list <任务ID> --output json
```

Agent 拿到 JSON 数据后，**必须自行解析并以格式化表格展示给用户**，不得将原始 JSON 直接输出。

如果三层均无法解决，提示用户可能是 IDE/终端面板本身的编码配置问题，建议检查终端字符集设置。

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
3. **禁止错误转换格式**：Agent **严禁**将 Excel 文件转换为 `.txt` 或 `.csv` 格式后再导入；`.xls` 旧格式必须先转换为标准 `.xlsx` Excel 文件，再进入 CLI 导入流程
4. **禁止数据提取**：Agent **严禁**从文件中提取号码、姓名等信息，必须交由 CLI 处理
5. **直接传递路径**：Agent 收到文件路径后，**必须直接**把原始文件路径传给后续 CLI 编排命令，禁止先读文件或改写文件内容；如果是 `.xls`，必须先取得转换后的标准 `.xlsx` 文件路径
6. **按导入流程选择 CLI 入口**：优先按下方流程执行 `format-template`，再调用 `import-number` 导入标准模板；`import-file` 仅作为兼容旧流程入口
7. **信任 CLI 能力**：CLI 内置完整的 `.xlsx/.excel` 文件解析能力（支持旧模板、智能表头检测、多列名识别），以及 `--auto-convert`（默认开启）自动转换任意格式 `.xlsx/.excel` 为标准模板，无需 Agent 预处理；`.xls` 必须先转换为标准 `.xlsx`

**正确流程**：
```
用户提供: /path/to/numbers.xlsx
    ↓
Agent 直接传路径给 CLI: telrobot-cli number format-template <任务ID> /path/to/numbers.xlsx
    ↓
Agent 调用: telrobot-cli number import-number <任务ID> <标准模板文件>
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

> **注意**：所有号码操作均需要提供 `任务ID`（UUID 格式）作为第一个参数。可通过 `telrobot-cli task list` 或 `telrobot-cli task list --name <关键词>` 获取任务ID。

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
- `--exec <操作>`：搜索后直接执行操作，支持 `update / info`

**Behavior**:
- 返回多条结果时交互式展示，输入序号选择后显示操作菜单
- 只有一条结果时直接显示操作菜单（含查看详情/更新信息）
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

> ⚠️ **Agent 强约束**：当用户提供文件路径时，**严禁读取/解析/转换文件内容**，必须直接将路径传给 CLI 编排命令。CLI 内置 `.xlsx/.excel`、CSV、TXT 解析能力，支持旧模板自动兼容；`.xls` 必须先转换为标准 `.xlsx`。详见上方「文件导入特殊约束」章节。

当用户输入“导入号码”“从文件导入号码”“上传号码文件”等意图时，按以下流程执行。

#### 1. 确认导入任务

如果当前上下文中已有明确的任务 UUID，可直接向用户确认该任务后继续。

如果上下文中没有明确任务，必须先执行：

```bash
telrobot-cli task list
```

将 CLI 输出的任务列表完整展示给用户，并要求用户通过单选确认导入目标。用户确认后，只使用被选中的任务 UUID 执行后续导入。

**呼入任务限制**：选择导入目标时必须关注任务列表中的呼叫类型。若用户选择的是呼入任务（`is_call_in=1` 或列表显示“呼入”），必须提示“呼入任务不能导入号码，请选择外呼任务后再导入”，并停止导入流程，不得执行 `number batch-add`、`number import-number`、`number import-file` 或 `number import-async`。若无法从上下文判断任务是否呼入，先执行 `telrobot-cli task info <任务ID>` 或重新查看任务列表确认后再继续。

#### 2. 提示上传文件格式

提示用户提供号码文件路径，支持：

- `.xlsx/.excel`：**首选格式**，由 CLI 内置 Excel 解析能力处理。兼容以下格式：
  - **标准模板格式**：第1行=说明/描述行，第2行=表头行（如 `号码`/`姓名`/`公司`），第3行起=数据行
  - **新格式**：第1行=表头行，第2行起=数据行
  - **任意格式**：用户可以上传任意格式的 `.xlsx/.excel` 文件，CLI 会先通过 `format-template` 智能识别号码列和 CRM 字段，并转换为动态标准模板，再通过 `import-number` 导入
  - **无表头格式**：纯号码列，每行一个号码
  - 任意格式的额外列会按 `template` 接口返回的动态表头匹配，无法匹配的字段会忽略并在转换结果中输出
  - 号码列识别规则：支持多个号码列（`phone`、`mobile`、`number`、`tel`、`号码`、`手机`、`电话`、`手机号`、`有效手机号`、`手机号码`、`电话号码`、`联系电话`、`联系电话2`、`更多电话` 等）；同一单元格内支持用 `；`、`;`、`/`、`、`、`,`、空格、换行分隔多个号码，并展开为多行标准数据，其他字段复制
  - 姓名列识别规则：支持表头关键词（`name`、`姓名`、`联系人`、`客户名称`、`法定代表人` 等）
  - 公司列识别规则：支持表头关键词（`company`、`公司`、`公司名称`、`所属公司`、`企业名称` 等）
- `.xls`：旧版 Excel 格式，**不作为直接导入格式**。必须先转换为标准 `.xlsx` Excel 文件，再按 `.xlsx` 流程执行 `format-template -> import-number`
- `.csv`：包含 `phone`、`mobile`、`number`、`号码`、`手机号` 等表头；可附带 `name`、`company`
- `.txt`：每行一个号码，或用逗号、空格、分号分隔

**智能转换功能说明**：CLI 将 `.xlsx/.excel` 处理拆成多个入口。当用户上传任意格式的 `.xlsx/.excel` 文件时，先生成或验证标准模板，再导入标准模板；`.xls` 先转换为标准 `.xlsx` 后再进入此流程：
1. `format-template` 调用 `template` 接口获取动态字段
2. 智能识别表头行位置、号码列和数据行
3. 将识别到的数据重新排列为动态标准模板格式
4. `import-number` 本地分批导入，生成 origin JSON、批次导入和进度文件

**重要提示**：当用户提供 `.xlsx/.excel` 文件时，Agent **必须直接将文件路径传给 CLI**，不要尝试自行读取或解析 Excel 内容。CLI 的 `format-template` 和 `import-number` 命令内置完整处理能力；`import-file` 仅作为兼容入口。`.xls` 需先转换为标准 `.xlsx`，再把转换后的 `.xlsx` 路径传给 CLI。

**大文件导入规则**：如果 CLI 转换/解析结果显示本批次需要导入的号码数量 `>= 50000`，必须选择后台异步文件导入，不得继续本地分批同步导入。CLI 的 `number import-file` / `number import-number` 会在解析出数量后自动切换到异步导入；Agent 看到“达到 50000 条阈值，自动切换为后台异步文件导入”提示时，应向用户展示导入任务 ID，并提示可用 `telrobot-cli number import-status <导入任务ID>` 查询进度。

#### 3. 调用 CLI 整理并导入文件

优先使用两个入口编排。先整理标准模板：

```bash
telrobot-cli number format-template <任务ID> <用户号码文件或xls转换后的xlsx文件> \
  --output <标准模板输出路径，可选>
```

确认转换结果无明显风险后，直接导入标准模板：

```bash
telrobot-cli number import-number <任务ID> <标准模板文件> \
  --batch-size 500 \
  --user-id <用户ID或当前操作者标识> \
  --job-id <本次导入任务ID，可选>
```

如果转换统计中的输出标准数据达到或超过 50000 条，也可以直接提交后台异步导入：

```bash
telrobot-cli number import-async <任务ID> <标准模板文件>
```

兼容旧流程时，可以继续使用 `import-file`，它内部会按 “整理标准模板 -> 导入标准模板” 编排：

```bash
telrobot-cli number import-file <任务ID> <用户号码文件或xls转换后的xlsx文件> \
  --batch-size 500 \
  --user-id <用户ID或当前操作者标识> \
  --job-id <本次导入任务ID，可选>
# --auto-convert 默认已开启（true），无需手动添加
```

**智能转换说明（`--auto-convert`，默认 `true`）**：
- `--auto-convert=true` 时，`import-file` 对 `.xlsx/.excel` 文件运行 `format-template` 流程，自动识别列位置并生成标准模板再导入；`.xls` 必须先转换为标准 `.xlsx`
- 支持以下所有常见模式：标准模板（第1行说明+第2行表头）、新格式（第1行表头）、任意自定义格式（通过内容特征识别列）
- 智能转换流程：解析 `.xlsx/.excel` → 识别说明行/表头行/数据行 → 识别多个号码列和动态字段 → 生成由 `template` 接口决定表头的新 Excel → 导入
- 如需禁用自动转换，可显式传入 `--auto-convert=false`（此时仅支持标准模板格式）

**CRM 导入说明**：当 `--to-crm=true`（默认开启）时，CLI 会将文件中解析出的 **姓名（name）**、**公司（company）** 和额外列数据一并传给服务端，CRM 客户将使用文件中的真实姓名而非自动生成的占位名。

**Excel 文件处理说明**：
- CLI 内置 Excel 解析用于 `.xlsx` / `.excel` 标准 Excel 文件；`.xls` 旧格式必须先转换为标准 `.xlsx`，不能直接导入
- 智能格式转换（默认启用）：自动识别任意格式的 `.xlsx/.excel` 并转换为标准模板
- 自动智能检测表头行位置（兼容旧模板第1行说明+第2行表头的格式）
- 智能列识别：通过表头关键词识别多个号码列、姓名列、公司列和动态 CRM 字段
- 自动生成标准模板：将识别到的数据重新排列为符合服务器要求的动态标准格式
- 号码为必填；姓名、公司、邮箱、性别和动态 CRM 字段按模板匹配写入，未匹配字段安全忽略
- 用户使用任意格式的 `.xlsx` / `.excel` 文件时，无需任何额外操作，CLI 会自动处理标准模板整理；`.xls` 必须先转换为 `.xlsx`
- Agent **严禁**自行读取/解析 Excel 文件内容，必须将文件路径直接传给 CLI

**常见错误示例**（Agent 严禁执行以下操作）：
```bash
# ❌ 错误1: 尝试读取文件内容
$ cat /path/to/numbers.xlsx  # Agent 不要这样做

# ❌ 错误2: 尝试转换格式
$ python -c "import pandas; df.to_csv('numbers.csv')"  # Agent 不要这样做

# ❌ 错误3: 从文件中提取号码，改用 batch-add
$ telrobot-cli number batch-add <任务ID> "13800138000,13900139000"  # Agent 不要这样做

# ✅ 正确: 直接传递路径给 CLI，先整理标准模板
$ telrobot-cli number format-template <任务ID> /path/to/numbers.xlsx  # Agent 应该这样做
```

标准导入会生成 origin 文件，文件名格式：

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

#### 4. CLI 兼容导入行为

优先使用上方 `format-template -> import-number` 流程。兼容旧流程时，`number import-file` 会在 CLI 内部按批次调用现有批量导入能力。默认每批 500 条：

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

执行标准导入或兼容导入时，Agent 必须实时展示 CLI 的 stdout/stderr 进度输出。CLI 输出包含：

- 当前处理数量 / 总数量
- 百分比
- 成功数量
- 失败数量
- 当前批次 / 总批次

如果某个批次失败，CLI 会把该批次号码写入 fail 文件，并立即中断后续批次，不再继续调用导入接口。最终如果存在失败记录，CLI 退出码为 2，Agent **必须**将失败文件路径展示给用户。

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

### 暂不可用操作

以下 CLI 操作接口尚未完全验证，当前 skill 不得调用：

- `telrobot-cli number delete`
- `telrobot-cli number reset`
- `telrobot-cli number batch-reset`
- `telrobot-cli number batch-delete`

当用户提出“删除号码”“移除号码”“批量删除号码”“重置号码”“号码重置”“重拨号码”“重置号码状态”等需求时，Agent 必须提示：`该号码操作接口尚未完全验证，当前暂不可用`，并停止流程，不得通过 CLI、HTTP 或其他方式绕过执行。

---

## Common Workflow

典型操作流程：

```
1. 查看任务ID（task list）
2. 添加号码（number add 或 number batch-add）
3. 查看号码列表（number list）
4. 搜索号码（number search）
```

---

## Error Handling

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| 号码格式错误 | 号码不是合法整数 | 检查号码格式，确保为纯数字 |
| 获取号码列表失败 | 任务ID不存在或无权限 | 先执行 `task list` 确认任务ID |
| 401 Unauthorized | Token 无效 | 执行 `config set-token` 更新 Token |
| 未找到匹配的号码 | 搜索关键词无匹配 | 尝试不同关键词或执行 `number list` 浏览 |
| 不支持的文件格式 | 文件扩展名不在 `.txt`/`.csv`/`.xlsx`/`.excel` 中，或传入了未先转换的 `.xls` 文件 | `.xls` 先转换为标准 `.xlsx`；其他格式转换为支持的格式后重试 |
| 没有解析到有效号码 | Excel 中无有效号码或列无法识别 | 检查号码列是否包含 `号码`/`手机`/`电话`/`phone`/`mobile` 等关键词；如无表头，CLI 会按内容特征（11位号码等）自动判断，请确认号码列有数据 |

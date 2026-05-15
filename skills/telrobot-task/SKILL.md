----
name: telrobot:task
description: Use this skill for Telrobot CLI task management operations including listing tasks, starting/stopping tasks, viewing call statistics summaries, and querying customers by intention.
---

# Telrobot Task

This skill provides task management for Telrobot CLI. Configuration is read from `~/.telrobot-cli/config.yaml`.

## 🚀 安装后使用方式（CRITICAL）

**安装此 Skill 后，用户不需要执行任何初始化命令，也不需要调用 `@skill:xxx`。**

**正确用法**：直接描述你的需求，Agent 会自动处理一切：
```
用户："查看当前账户下的呼叫任务"
→ Agent 自动检测环境
→ 环境未初始化 → Agent 自动执行 setup.js
→ Agent 输出：请提供云蝠系统内配置AI助理下生成的token信息
→ 用户提供 Token
→ Agent 自动配置并验证
→ Agent 查询任务并用自然语言回答
```

**错误用法**：
```
❌ 用户："@skill:telrobot-init"
❌ 用户："帮我初始化 telrobot"
❌ 用户："执行 setup.js"
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

1. **禁止绕过 CLI 封装逻辑**：所有操作必须通过 `telrobot-cli` 命令执行，**严禁**直接调用后端 API
2. **禁止降级到 HTTP 请求**：命令执行出错时，**严禁**自动降级使用 `curl`、`wget` 或其他 HTTP 工具绕过 CLI 封装
3. **禁止手动构造 API 请求**：**严禁**尝试构造 POST/GET/PUT/DELETE 等 HTTP 请求直接调用后端接口
4. **错误透明报告**：命令执行出错时，**必须**将错误信息原样展示给用户，禁止静默降级
5. **按文档处理错误**：严格按照 "Error Handling" 表格处理错误，禁止自定义绕过方案

---

## ⚠️ 关键决策指南（Agent 必读）

### `task stat` vs `task customers-by-intention` — 绝不能混淆！

| | `task stat` | `task customers-by-intention` |
|---|---|---|
| **用途** | 统计**数据/报表**（数字、比率、分布） | 查询**客户信息**（公司、联系人、手机号） |
| **返回内容** | 意向分布数字（A级3个、B级5个...）、接通率、地区分布等 | 具体客户详情（公司名、联系人姓名、手机号码、通话时长） |
| **输出形态** | 📊 统计报表、百分比、汇总数字 | 📋 客户列表、联系方式明细 |
| **典型场景** | "今天拨打情况总结"、"意向分布"、"接通率统计" | "查A级客户"、"获取意向客户联系方式"、"高意向客户有哪些" |

**判断口诀**：
- 用户要**数字/比率/总结** → `task stat`
- 用户要**人名/公司/手机号** → `task customers-by-intention`

**⚠️ 常见错误示例**：
```
❌ 用户说"查A级客户"，Agent 却调用 task stat --type intention
   （task stat --type intention 只返回意向分布数字，不返回客户联系方式）

❌ 用户说"今天拨打情况总结"，Agent 却调用 task customers-by-intention
   （customers-by-intention 只返回客户详情，不返回统计报表）

✅ 正确：
   "今天拨打情况总结" → task stat <任务ID> --type over_all --date "..."
   "意向分布(数字)"     → task stat <任务ID> --type intention --date "..."
   "查A级客户联系方式" → task customers-by-intention
```

### 决策流程图

```
用户意图
  ├─ "拨打情况总结" / "接通率" / "意向分布(数字)" / "地区分布" / "统计报表"
  │   → task stat [任务ID] --type <统计类型> [--date "..."]
  │
  └─ "A级客户有哪些" / "查意向客户" / "获取客户联系方式" / "意向客户列表"
      → task customers-by-intention [--output table]
```

---

## Task Management Commands

## Configuration

The skill reads configuration from `~/.telrobot-cli/config.yaml`. Initialize with:

```bash
telrobot-cli config init
```

---

## Task Management Commands

### List Tasks

```bash
telrobot-cli task list [--page N] [--size N] [--name 关键词] [--active N] [--call-in N] [--date-start YYYY-MM-DD] [--date-end YYYY-MM-DD] [--status N] [--group-type 类型] [--groups ID] [--category ID]
```

**Flags**:

- `--page N`：页码，默认 1
- `--size N`：每页数量，默认 20
- `--name 关键词`：按任务名称**模糊过滤**，支持部分名称（如 `--name "哈哈"` 可匹配 "哈哈哈"、"0430-哈哈"）
- `--active N`：按激活状态筛选（-1: 不筛选, 0: 休眠, 1: 激活）
- `--call-in N`：按呼叫类型筛选（-1: 不筛选, 0: 呼出, 1: 呼入）
- `--date-start YYYY-MM-DD`：按创建时间筛选-开始日期
- `--date-end YYYY-MM-DD`：按创建时间筛选-结束日期
- `--status N`：按任务状态筛选（0: 不筛选, 1: 暂停, 2: 启动）
- `--group-type 类型`：按话术组类型筛选（'': 不筛选, 'group': 1.0话术, 'robot': 2.0话术, 'llm': LLM话术）
- `--groups ID`：按话术分组ID筛选（0: 不筛选）
- `--category ID`：按分类ID筛选（'': 不筛选）

**⚠️ 重要行为说明**：
- **不加筛选条件时**：默认分页显示（第1页，20条/页）
- **使用任何筛选条件时**（`--name`/`--active`/`--call-in`/`--date-*`/`--status`/`--group-type`/`--groups`/`--category`）：**自动获取所有分页数据**，展示完整筛选结果
- 这样确保筛选结果不会因分页而遗漏

**Output columns**: 序号、任务ID、任务名称、类型(呼入/呼出)、状态(开启/关闭)、是否激活(激活/休眠)、并发量、AI对话模型、创建时间

**⚠️ Agent 执行规范（CRITICAL）**：

1. **必须实际执行 CLI 命令**，不得使用缓存或其他方式

   ```bash
   # ✅ 正确：实际执行命令
   telrobot-cli task list
   telrobot-cli task list --name "营销"  # 自动获取所有筛选结果
   
   # ❌ 错误：读取缓存或配置文件
   cat ~/.telrobot-cli/tasks.json
   ```

2. **必须完整展示命令输出**，不得过滤或省略字段

   - CLI 输出包含：任务名称、任务ID、状态、类型、并发量等
   - Agent 必须**原样展示**或**以表格形式重新整理**
   - **禁止**只显示 UUID 而不显示任务名称

3. **输出格式要求**：

   ```
   ✅ 正确示例：
   序号  任务ID                                  任务名称        类型    状态    激活    并发量   AI对话模型    创建时间
   1     abc-123-def-456                        营销活动        呼出    开启    激活    10       GPT-4        2024-01-01
   2     xyz-789-uvw-012                        客户回访        呼入    关闭    休眠    5        Claude       2024-01-02
   
   ❌ 错误示例：
   找到2个任务：
   - abc-123-def-456
   - xyz-789-uvw-012
   ```

4. **必须包含的关键字段**：

   - ✅ 任务名称（Name）- **必须显示**
   - ✅ 任务ID（UUID）
   - ✅ 状态（开启/关闭）
   - ✅ 类型（呼入/呼出）
   - ✅ 激活状态（激活/休眠）
   - ✅ 其他 CLI 输出的字段

**User triggers**: "查看任务列表", "显示所有任务", "列出任务", "任务有哪些","查看我的任务","查看全部任务"

**使用示例**：
```bash
# 查看任务列表（分页显示）
telrobot-cli task list

# 按名称搜索（自动获取全部结果）
telrobot-cli task list --name "营销"

# 查看已激活的任务（自动获取全部结果）
telrobot-cli task list --active 1

# 查看休眠的任务（自动获取全部结果）
telrobot-cli task list --active 0

# 查看呼入任务（自动获取全部结果）
telrobot-cli task list --call-in 1

# 查看呼出任务（自动获取全部结果）
telrobot-cli task list --call-in 0

# 按时间范围筛选（自动获取全部结果）
telrobot-cli task list --date-start "2024-05-01" --date-end "2024-05-31"

# 查看启动的任务（自动获取全部结果）
telrobot-cli task list --status 2

# 查看暂停的任务（自动获取全部结果）
telrobot-cli task list --status 1

# 查看LLM话术任务（自动获取全部结果）
telrobot-cli task list --group-type llm

# 查看2.0机器人话术任务（自动获取全部结果）
telrobot-cli task list --group-type robot

# 按话术分组ID筛选（自动获取全部结果）
telrobot-cli task list --groups 123

# 按分类ID筛选（自动获取全部结果）
telrobot-cli task list --category 456

# 组合筛选（自动获取全部结果）
telrobot-cli task list --name "营销" --active 1 --call-in 0 --status 2

# 手动翻页查看（不使用筛选时）
telrobot-cli task list --page 2 --size 50
```

---

### Search Tasks（按名称搜索）

```bash
telrobot-cli task list --name <关键词>
```

**Agent 使用场景**：当用户说“开启/停止/查看某个任务”时，若用户提供的是任务名称，**必须先用此命令搜索**，将结果**完整展示**给用户，再让用户确认 UUID。

**⚠️ Agent 执行规范（CRITICAL）**：

1. **执行搜索命令**：

   ```bash
   telrobot-cli task list --name "用户提供的关键词"
   ```

2. **完整展示搜索结果**：

   - 必须展示所有匹配的任务
   - 必须包含任务名称、UUID、状态等完整信息
   - 不得只显示 UUID

3. **询问用户确认**：

   ```
   ✅ 正确示例：
   找到以下任务：
   序号  任务ID                                  任务名称        状态    类型
   1     abc-123-def-456                        营销活动V1      开启    呼出
   2     xyz-789-uvw-012                        营销活动V2      关闭    呼出
   
   请问您要操作哪一个任务？（输入序号）
   
   ❌ 错误示例：
   找到2个任务，请确认：
   - abc-123-def-456
   - xyz-789-uvw-012
   ```

- 支持部分名称：`--name "你好"` 可匹配所有名称包含“你好”的任务
- 结果展示与 `task list` 完全一致（含状态、类型、并发量等完整信息）

**User triggers**: "搜索任务", "查找任务", "找一下任务，查看任务"

### 2. 开启某个任务（task start）

### Start Task

```bash
telrobot-cli task start [任务ID或名称] [--force]
```

- 不传参数：交互式展示所有任务并选择
- 传任务名称（非 UUID）：按名称模糊搜索
- 传任务 ID（UUID 格式）：直接启动
- `--force`：跳过线路预检，强制启动（**无线路启动将无法呼出，慎用**）

**⚠️ 启动前线路预检（IMPORTANT）**：

`task start` 命令在启动前会自动调用 `edit-info-pro` 接口检查 `task_extras.extras.line` 是否为空：
- **呼入任务**（is_call_in=1）：无需线路，预检直接通过
- **外呼任务**：无线路时预检拦截，提示先配置线路
- 使用 `--force` 可跳过预检强制启动（不推荐，会导致“假成功”：任务显示已启动但无法呼出）

**⚠️ Agent 执行规范（CRITICAL）**：

1. **确认任务**：

   - 若用户提供的是任务名称（非 UUID），先执行 `telrobot-cli task list --name "<关键词>"` 获取匹配任务
   - **完整展示搜索结果**（包含任务名称、UUID、状态等）

   ```
   ✅ 正确示例：
   找到以下任务：
   序号  任务ID                                  任务名称        状态    类型
   1     abc-123-def-456                        营销活动        关闭    呼出
   2     xyz-789-uvw-012                        营销测试        关闭    呼出
   
   请问您要启动哪一个任务？（输入序号）
   
   ❌ 错误示例：
   找到2个任务：
   - abc-123-def-456
   - xyz-789-uvw-012
   ```

2. **执行启动命令**：

   - 用户确认后，使用对应的 UUID 执行：`telrobot-cli task start <UUID>`
   - 若用户提供的已经是 UUID，直接执行
   - **禁止**使用 `--force` 标志，除非用户明确要求强制启动

3. **错误处理**：

   - 报错含“休眠”：提示先执行 `telrobot-cli task activate <任务UUID>`，再重新启动
   - 报错含“线路”或“未配置外呼线路”：**Agent 应自动进入线路配置流程**（见下方 Set Task Line），配置完毕后自动重试启动
   - **禁止**静默处理错误或自动降级为 HTTP 请求

**User triggers**: "启动任务", "开始任务", "运行任务"



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


### 3. 暂停某个任务（task stop）

### Stop Task

```bash
telrobot-cli task stop [任务ID或名称]
```

- 不传参数：交互式展示所有任务并选择
- 传任务名称（非 UUID）：按名称模糊搜索
- 传任务 ID（UUID 格式）：直接停止

**⚠️ Agent 执行规范（CRITICAL）**：

1. **确认任务**：

   - 若用户提供的是任务名称（非 UUID），先执行 `telrobot-cli task list --name "<关键词>"` 获取匹配任务
   - **完整展示搜索结果**（包含任务名称、UUID、状态等）

   ```
   ✅ 正确示例：
   找到以下任务：
   序号  任务ID                                  任务名称        状态    类型
   1     abc-123-def-456                        营销活动        开启    呼出
   2     xyz-789-uvw-012                        营销测试        开启    呼出
   
   请问您要停止哪一个任务？（输入序号）
   
   ❌ 错误示例：
   找到2个任务：
   - abc-123-def-456
   - xyz-789-uvw-012
   ```

2. **执行停止命令**：

   - 用户确认后，使用对应的 UUID 执行：`telrobot-cli task stop <UUID>`
   - 若用户提供的已经是 UUID，直接执行

3. **禁止静默处理错误**：

   - 命令失败时必须展示错误信息
   - **禁止**自动降级为 HTTP 请求

**User triggers**: "停止任务", "暂停任务", "关闭任务"
---

### 4. 对某个任务的拨打情况进行总结归纳（task stat）

> **⚠️ 关键区分**：此命令返回**统计数据和报表**（数字、比率、分布）。如需查询**具体客户联系方式**（公司、联系人、手机号），请使用 `task customers-by-intention`。

```bash
telrobot-cli task stat [任务ID或名称] --type <统计类型> [--date "开始日期,结束日期"]
```

获取任务的详细统计数据，**必须通过 `--type` 指定统计类型**，不再支持交互式选择。

**Flags**:
- `--type, -t`：**必填**，统计类型，常用：
  - `over_all` - 综合总览（**用于拨打情况总结**）
  - `intention` - 意向分布（返回各意向等级的数字，**不是客户联系方式**）
  - `answer_rate` - 接通率统计
  - `number_status` - 号码状态分布
  - `area` - 地区分布
  - `operator` - 运营商分布
  - `call_peak` - 呼叫高峰时段
  - 其他类型：`bill`、`rounds`、`realtime_rate`、`task_progress`、`hangup_disposition`、`customer_level` 等
- `--date, -d`：日期范围，格式 `YYYY-MM-DD,YYYY-MM-DD`（**默认今天**）

**Agent 执行流程**：

**第一步：确认任务**
- 执行 `telrobot-cli task list` 获取所有任务列表
- 以表格形式展示所有任务（序号、任务ID、任务名称、状态、创建时间）
- 询问用户选择要查询的任务序号

**第二步：确定查询时间**
- 询问用户查询的时间范围：
  ```
  请选择查询时间范围：
  1. 今天
  2. 昨天
  3. 本周
  4. 上周
  5. 本月
  6. 自定义日期范围（如：2024-05-01,2024-05-31）
  ```

**第三步：执行综合统计**
```bash
telrobot-cli task stat <任务UUID> --type over_all --date "<日期范围>"
```
- 以**中文可读报表形式**展示总结
- 必须包含：总拨打数、接通数、接通率、各意向等级分布（A/B/C/D级客户数量）、通话时长统计

**使用示例**：
```bash
# 查看今天的拨打情况总结（最常用）
telrobot-cli task stat <任务ID> --type over_all

# 查看指定日期的拨打情况总结
telrobot-cli task stat <任务ID> --type over_all --date "2024-05-01,2024-05-31"

# 查看意向分布（返回数字，不是客户联系方式）
telrobot-cli task stat <任务ID> --type intention

# 查看接通率
telrobot-cli task stat <任务ID> --type answer_rate --date "2024-05-01,2024-05-31"
```

**⚠️ Agent 展示要求**：
- ✅ 必须完整展示命令输出的所有统计数据
- ✅ 关键指标加注：✅ 正常 ⚠️ 偏低 ❌ 异常

**User triggers**: "任务总结", "拨打情况总结", "今天拨打情况", "本周数据总结", "任务报表", "查看任务统计", "接通率", "意向分布"

---

### 5. 对某个任务的某类意向客户进行获取（task customers-by-intention）

> **⚠️ 关键区分**：此命令返回**具体客户详情**（公司名、联系人姓名、手机号码）。如需查看**意向分布统计数字**（A级X个、B级Y个），请使用 `task stat --type intention`。

```bash
telrobot-cli task customers-by-intention [--output <格式>]
```

**命令特性**：此命令为**全交互式**，运行后自动完成以下流程：
1. 自动获取任务列表 → 用户选择目标任务
2. 自动获取意向标签 → 用户选择意向标签（支持多选）
3. 自动查询并展示客户信息

> **Agent 只需直接执行此命令**，无需预先调用 `task stat --type intention` 获取意向标签，命令内部会自动完成。

**Flags**:
- `--output, -o`：输出格式，默认 `table`，可选 `json`、`csv`

**表格格式输出字段**：
| 序号 | 公司 | 联系人 | 手机号 | 意向标签 | 通话时间 | 通话时长 |
|------|------|--------|--------|----------|----------|----------|


### 6. Activate Task

```bash
telrobot-cli task activate [任务ID或名称]
```

激活休眠中的任务，激活后才能启动。若任务已激活，会提示无需重复操作。

- 不传参数：交互式展示所有任务并选择
- 传任务名称（非 UUID）：按名称模糊搜索
- 传任务 ID（UUID 格式）：直接激活

> **注意**：新建任务默认已激活，此命令主要用于激活**复制任务**（复制后默认休眠）或被手动停用的任务。

**User triggers**: "激活任务", "唤醒任务"



**⚠️ Agent 执行规范（CRITICAL）**：

1. **直接执行命令**：
   ```bash
   telrobot-cli task customers-by-intention --output table
   ```
   命令会自动引导用户完成：选择任务 → 选择意向标签 → 展示客户信息

2. **禁止多余步骤**：
   ```bash
   # ❌ 错误：预先调用 task stat 获取意向标签（命令内部已自动获取）
   telrobot-cli task stat <UUID> --type intention

   # ✅ 正确：直接运行 customers-by-intention，一步到位
   telrobot-cli task customers-by-intention --output table
   ```

3. **结果展示**：以表格形式展示客户信息，如果查询结果为空则告知用户

**注意事项**：
1. 意向标签完全由接口动态返回，支持任意扩展（A-Z、1-26等）
2. 如果任务列表为空，命令会自动退出
3. 如果意向标签为空，命令会自动退出

**User triggers**: "按意向查客户", "查询意向客户", "A级客户有哪些", "高意向客户", "意向客户列表", "获取某类意向客户", "意向客户联系方式"

---

## Error Handling

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 任务处于休眠状态，无法操作 | 任务未激活 | 先执行 `task activate <任务ID>` |
| 任务未配置外呼线路 | 未设置线路 | 先执行 `task set-line` |
| 并发数异常 | 线路并发之和不等于总并发 | 重新配置线路 |
| 401 Unauthorized | Token 无效 | 执行 `config set-token` 更新 Token |
| 任务不存在 | ID 错误 | 先执行 `task list` 确认 ID |

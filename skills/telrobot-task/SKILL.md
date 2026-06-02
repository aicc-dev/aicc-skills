---
name: telrobot:task
description: Use this skill for Telrobot CLI task management operations including listing tasks, starting/stopping tasks, viewing call statistics summaries, and querying customers by intention. Automatically initializes CLI environment on first use.
---

# Telrobot Task

This skill provides task management for Telrobot CLI. Configuration is read from `~/.telrobot-cli/config.yaml`.

## Profile 选择

Telrobot CLI 支持同一生产环境下的多个用户身份 profile。用户指定身份时，命令必须透传 `--profile <name>`，也可以通过 `TELROBOT_PROFILE=<name>` 选择；未指定时使用配置文件中的 `current`。示例：

```bash
telrobot-cli --profile 张三 task list
TELROBOT_PROFILE=李四 telrobot-cli task list
```

## 实时数据与 Memory 规则（CRITICAL）

Agent 必须把 Telrobot CLI 作为任务、客户、统计等业务数据的唯一实时数据源。Agent memory、历史对话、上一次命令输出只能用于理解用户意图，不能用于回答当前业务数据。

**强制规则**：

1. **每次业务查询必须执行 CLI**：用户要求查看任务、查询任务详情、统计拨打情况、查询意向客户时，必须实时执行对应 `telrobot-cli` 命令。
2. **禁止用 memory 回答业务结果**：不得说“根据之前的数据”“我记得有几个任务”并直接给出任务数量、状态、统计数字或客户列表。
3. **上下文只能解析对象，不能复用数据**：用户说“刚才那个任务”时，可以从上下文提取任务 ID，但仍必须执行 `telrobot-cli task info <任务ID>` 或对应命令获取最新状态。
4. **状态变更后必须重新查询确认**：执行 `task start`、`task stop`、`task update`、`task delete`、`task activate` 等修改操作后，必须再执行查询命令确认最终状态，并基于最新 CLI 输出回答。
5. **回答应说明实时来源**：回答实时结果时，简要说明“数据来源：刚刚执行 `<命令>`”，或说明查询时间，避免用户误以为是历史记忆。
6. **精确判断优先使用 JSON**：当需要筛选、比对、后续操作或终端表格中文乱码时，优先追加 `--output json`，用结构化输出判断，再用自然语言或表格转述。

**允许 memory 保存**：常用 profile、默认分页大小、用户偏好的输出格式、上次用户提到的任务 ID。

**禁止 memory 保存并复用为事实**：任务数量、任务状态、任务名称列表、客户联系方式、意向统计、拨打统计、号码状态。

## 🚀 安装后使用方式（CRITICAL）

**安装此 Skill 后，Agent 应立即检查 CLI 环境是否已初始化**。如果未初始化，自动执行环境初始化流程。

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
| 输出包含 `UTF-8` 或 `utf8` | ✅ **正常模式**：直接执行 | `telrobot-cli task list` |
| 输出不包含上述内容 | ⚠️ **防乱码模式**：加 `env` 前缀 | `env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli task list` |

**如果环境未初始化**（CLI 或配置缺失）：
- **Agent 自动执行初始化**：使用 `telrobot-init` skill 的 `scripts/setup.js` 或 `scripts/setup.sh`
- 下载 CLI 二进制 + 生成基础配置（Token 留空）
- **Agent 在对话中输出**：`请提供云蝠系统内配置AI助理下生成的token信息`
- 等待用户提供 Token，然后自动配置并验证

**用户无需手动调用 `@skill:telrobot-init`**，Agent 会自动处理环境初始化。

## 🔤 防乱码模式说明

防乱码模式下，所有命令统一使用 `env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` 前缀，**仅影响当前命令进程，不污染用户全局 shell 环境**。

**防乱码模式执行后，Agent 必须主动检查输出是否包含乱码字符（如 `\xef\xbf\xbd`、`?`、无意义符号序列）**：
- 输出正常 → 继续使用防乱码模式执行后续命令
- 输出仍乱码 → **立即切换为 `--output json` 模式**，不得继续使用表格输出：

```bash
env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli task list --output json
```

Agent 拿到 JSON 数据后，**必须自行解析并以格式化表格展示给用户**，不得将原始 JSON 直接输出。

如果三层均无法解决，提示用户可能是 IDE/终端面板本身的编码配置问题，建议检查终端字符集设置。

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

## Configuration

The skill reads configuration from `~/.telrobot-cli/config.yaml`. Initialize with:

```bash
telrobot-cli config init
```

---

## Task Management Commands

### List Tasks

```bash
telrobot-cli task list [--page N] [--size N] [--all] [--name 关键词] [--active N] [--call-in N] [--date-start YYYY-MM-DD] [--date-end YYYY-MM-DD] [--status N] [--group-type 类型] [--groups ID] [--category ID]
```

**Flags**:

- `--page N`：页码，默认 1
- `--size N`：每页数量，默认 20
- `--all`：获取所有任务，自动遍历所有分页
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

2. **必须将 CLI 输出原样转述**，严禁自行重构表格或省略字段

   - CLI 完整输出列：序号、任务ID、**任务名称**、类型、状态、是否激活、并发量、AI对话模型、创建时间
   - Agent 必须**原样转述 CLI 的完整输出**
   - **严禁**自己重新构造表格（会导致任务名称等字段丢失）
   - **严禁**只输出共N个任务等摘要而不展示完整列表
   - **严禁**只显示 UUID 而不显示任务名称（任务名称是最重要的字段）

3. **终端编码与输出质量保证（IMPORTANT）**：

   Agent 应先检测 locale 再执行（详见上方「终端编码检测与防乱码处理」章节）：
   - **locale 包含 UTF-8**：直接正常执行
     ```bash
     telrobot-cli task list
     telrobot-cli task list --name "营销"
     ```
   - **locale 不包含 UTF-8**：加 `env` 前缀防乱码
     ```bash
     env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli task list
     env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli task list --name "营销"
     ```

   如果防乱码模式仍无效，**必须**改用 JSON 输出作为兜底：
   ```bash
   env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli task list --output json
   env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 telrobot-cli task list --name "营销" --output json
   ```

4. **输出格式要求**：

   ```
   ✅ 正确示例（原样转述 CLI 输出）：
   📋 任务列表 (共 7 个, 第 1 页，每页 20 条)
   ─────────────────────────────────────────────────
   序号  任务ID                  任务名称              类型  状态  是否激活  并发量  AI模型     创建时间
   1     abc-123-def-456        营销活动 2024-05   呼出  关闭  激活      10      GPT-4      2024-05-01 10:00
   2     xyz-789-uvw-012        客户回访测试       呼入  开启  激活      5       Claude     2024-04-16 21:01

   ❌ 错误示例（Agent 自行重构，任务名称丢失）：
   当前账户北7个任务，全部已暂停：
   # | UUID | 状态 | 并发
   1 | abc-123-def-456 | 暂停 | 0
   2 | xyz-789-uvw-012 | 暂停 | 0
   ```

4. **必须包含的关键字段**：

   - ✅ 任务名称（Name）- **必须显示，这是最重要的字段**
   - ✅ 任务ID（UUID）
   - ✅ 状态（开启/关闭）
   - ✅ 类型（呼入/呼出）
   - ✅ 激活状态（激活/休眠）
   - ✅ 其他 CLI 输出的字段

**User triggers**: "查看任务列表", "显示所有任务", "列出任务", "任务有哪些","查看我的任务","查看全部任务", "查看所有任务", "导出全部任务"

**使用示例**：
```bash
# 查看任务列表（分页显示）
telrobot-cli task list

# 查看所有任务（自动遍历分页）
telrobot-cli task list --all

# 按名称搜索（自动获取全部结果）
telrobot-cli task list --name "营销"

# 终端编码乱码时使用 JSON 输出（Agent 自动解析）
telrobot-cli task list --output json
telrobot-cli task list --name "营销" --output json

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
   序号  任务ID                                  任务名称        类型    状态    是否激活  并发量  AI对话模型   创建时间
   1     abc-123-def-456                        营销活动V1      呼出    开启    激活      10     GPT-4       2024-01-01
   2     xyz-789-uvw-012                        营销活动V2      呼出    关闭    休眠      5      Claude      2024-01-02
   
   请问您要操作哪一个任务？（输入序号）
   
   ❌ 错误示例：
   找到2个任务，请确认：
   - abc-123-def-456
   - xyz-789-uvw-012
   ```

- 支持部分名称：`--name "你好"` 可匹配所有名称包含“你好”的任务
- 结果展示与 `task list` 完全一致（含状态、类型、并发量等完整信息）

**User triggers**: "搜索任务", "查找任务", "找一下任务，查看任务"

### Task Info

```bash
telrobot-cli task info <任务ID> [--output table|json]
```

查看单个任务详情，返回任务ID、任务名称、状态、最大并发、CPS、回收限制、创建时间、修改时间。

**Agent 执行规范**：
- 用户提供 UUID 时，直接执行 `telrobot-cli task info <UUID>`。
- 用户提供任务名称时，先执行 `telrobot-cli task list --name "<关键词>"`，完整展示匹配结果并让用户确认 UUID。
- 需要精确解析或后续继续操作时，使用 `--output json`。
- 该命令用于获取实时任务详情，禁止用 memory 或上一次列表结果直接回答。

**User triggers**: "查看任务详情", "任务详情", "这个任务的信息", "查看任务状态详情", "任务配置摘要"

### Task Status

```bash
telrobot-cli task status [任务ID或名称] [--output table|json]
```

查看任务运行概况，返回任务名称、总号码数、已拨打数量、待拨打数量、完成率。

**Agent 执行规范**：
- 用户提供 UUID 或明确名称时可直接执行；名称存在歧义时先用 `task list --name` 让用户确认。
- 用户问“现在跑到哪了”、“还有多少没打”、“任务进度”、“运行概况”时优先使用此命令，而不是 `task stat`。
- 如果用户只问“待拨打数量”，也使用 `task status` 展示完整运行概况。
- 修改任务状态后用户要求确认当前状态时，可使用 `task status` 或 `task info` 重新查询，不能只根据修改命令推断。

**User triggers**: "任务运行状态", "任务进度", "还有多少没打", "待拨打数量", "执行概况", "跑到哪了", "完成率"

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
   序号  任务ID                                  任务名称        类型    状态    是否激活  并发量  AI对话模型   创建时间
   1     abc-123-def-456                        营销活动        呼出    关闭    休眠      10     GPT-4       2024-01-01
   2     xyz-789-uvw-012                        营销测试        呼出    关闭    休眠      5      Claude      2024-01-02
   
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
   序号  任务ID                                  任务名称        类型    状态    是否激活  并发量  AI对话模型   创建时间
   1     abc-123-def-456                        营销活动        呼出    开启    激活      10     GPT-4       2024-01-01
   2     xyz-789-uvw-012                        营销测试        呼出    开启    激活      5      Claude      2024-01-02
   
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

### Task Statistics（task stat）

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
- 以表格形式展示所有任务（序号、任务ID、任务名称、类型、状态、是否激活、并发量、AI对话模型、创建时间）
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

### Customers by Intention

> **⚠️ 关键区分**：此命令返回**具体客户详情**（公司名、联系人姓名、手机号码）。如需查看**意向分布统计数字**（A级X个、B级Y个），请使用 `task stat --type intention`。

```bash
# 交互式（终端使用）
telrobot-cli task customers-by-intention [--output <格式>]

# 非交互式（Agent 使用）
telrobot-cli task customers-by-intention --task <任务UUID> --intentions <标签> [--output <格式>]
```

**命令特性**：
- **交互式模式**：不传 `--task` 时，终端会提示选择任务和意向标签
- **非交互式模式**：通过 `--task` 和 `--intentions` 直接传参，无需人工交互

> **⚠️ Agent 必须使用非交互式模式**。Agent 环境无法响应终端交互式提示（如 "请选择任务编号"），**必须**通过 flag 传参。

**Flags**:
- `--task, -t <UUID>`：**Agent 必填**，指定任务 UUID，跳过交互式任务选择
- `--intentions, -i <标签>`：**Agent 必填**，指定意向标签，逗号分隔。支持两种方式：
  - **标签名称**：如 `--intentions "A级"`、`--intentions "A级,B级"`（推荐，Agent 可直接使用）
  - **TagType 数字**：如 `--intentions "1"`、`--intentions "1,2"`
- `--output, -o`：输出格式，默认 `table`，可选 `json`、`csv`

**表格格式输出字段**：

| 序号 | 公司 | 联系人 | 手机号 | 意向标签 | 通话时间 | 通话时长 |
|------|------|--------|--------|----------|----------|----------|

**⚠️ Agent 执行规范（CRITICAL）**：

**第一步：获取任务列表**

执行 `telrobot-cli task list [--name 关键词]` 获取任务列表，展示给用户并确认要查询的任务。

**第二步：获取意向分布（用于确认标签信息）**

```bash
telrobot-cli task stat <任务UUID> --type intention --date "YYYY-MM-DD,YYYY-MM-DD"
```

- 此命令返回各意向等级的**数量分布**，帮助用户确认要查询的标签
- 同时可以获取到标签的**名称**（如 A级、B级、C级）

**第三步：执行客户详情查询（非交互式）**

```bash
# ✅ 正确：使用非交互式参数直接查询
telrobot-cli task customers-by-intention --task <任务UUID> --intentions "A级" --output table

# 查询多个意向等级
telrobot-cli task customers-by-intention --task <任务UUID> --intentions "A级,B级" --output table

# 输出为 CSV 文件
telrobot-cli task customers-by-intention --task <任务UUID> --intentions "A级" --output csv
```

**❌ 错误示例（Agent 使用交互式命令会卡住）**：
```bash
# 错误：不传 --task 和 --intentions，命令会等待终端输入
telrobot-cli task customers-by-intention --output table
```

**第四步：结果展示**

以表格形式完整展示客户信息，不得遗漏字段。

```
A级（有明确意向）客户详情 - 测试-外呼导入
共找到 6 条客户记录

序号  公司          联系人  手机号        意向标签  通话时间           通话时长
1     -             -       13196520048   A级      2026-05-19 12:02:36  5秒
2     -             -       13196520049   A级      2026-05-19 12:01:47  4秒
3     ai_7995605    -       434242424     A级      2026-04-30 17:03:19  37秒
4     ai_7995605    -       434242424     A级      2026-04-29 20:52:00  23秒
5     ai_3229397    -       42342423424   A级      2026-04-29 20:51:58  24秒
6     ai_8164855    -       42424234242   A级      2026-04-29 20:51:57  26秒
```

**第五步：展示后的交互引导**

Agent 展示客户列表后，应主动提供后续操作选项：

```
需要我做什么？
• 导出客户联系方式到文件？
• 查看其他意向等级客户？
```

- 用户选择导出：调用 `customers-by-intention --task <UUID> --intentions "A级" --output csv`
- 用户选择查看其他意向：更换 `--intentions` 参数重新执行

**注意事项**：
1. **Agent 严禁使用交互式模式**：必须传 `--task` 和 `--intentions`
2. `--intentions` 支持标签名称模糊匹配（如 `--intentions "A"` 可匹配 "A级（有明确意向）"）
3. 意向标签完全由接口动态返回，支持任意扩展（A-Z、1-26等）
4. 如果查询结果为空则告知用户
5. **严禁自行构造表格或省略字段**：必须原样转述 CLI 输出

**User triggers**: "按意向查客户", "查询意向客户", "A级客户有哪些", "高意向客户", "意向客户列表", "获取某类意向客户", "意向客户联系方式"

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

## Error Handling

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 任务处于休眠状态，无法操作 | 任务未激活 | 先执行 `task activate <任务ID>` |
| 任务未配置外呼线路 | 未设置线路 | 先执行 `task set-line` |
| 并发数异常 | 线路并发之和不等于总并发 | 重新配置线路 |
| 401 Unauthorized | Token 无效 | 执行 `config set-token` 更新 Token |
| 任务不存在 | ID 错误 | 先执行 `task list` 确认 ID |

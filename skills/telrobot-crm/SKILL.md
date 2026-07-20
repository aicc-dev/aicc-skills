---
name: telrobot:crm
description: 用于通过 Telrobot CLI 向 CRM 公海导入客户。用户要求从图片、包含姓名手机号的纯文本或 .xlsx/.excel 文件导入 CRM 客户，或查询 CRM 文件导入进度和结果时使用。图片由多模态模型结构化识别，文本逐条导入，Excel 必须完全交给 CLI 检查和整理；.xls 必须先转换为 .xlsx。
---

# Telrobot CRM

通过 `telrobot-cli crm` 识别、确认和编排 CRM 公海客户导入。

## 使用前版本检查（MUST CHECK）

**每次使用此 Skill 处理 CRM 请求前，Agent 必须先检查本地 Skill 版本和仓库版本**：

```bash
node scripts/setup.js --skill-update-check
```

执行规则：

- 该检查只比较当前已安装 Skill 版本与仓库 `package.json` 版本，不安装或覆盖文件。
- 只有仓库存在新版时才会输出：`skill版本已更新，是否需要帮您更新？`；当前版本已是最新或检查失败时保持静默。
- Agent 必须把更新提示原样展示给用户，并询问是否更新。
- 用户同意后执行：

  ```bash
  node scripts/setup.js --skill-update-apply --agent <agent-name>
  ```

  `<agent-name>` 使用当前宿主 Agent 名称，例如 `workbuddy`、`claude-code`、`cursor`、`qoder`、`github-copilot` 或 `windsurf`。如果无法确定，先询问用户。
- 用户拒绝或暂不更新时，继续当前 CRM 请求；当天后续请求不再重复提醒。
- 更新完成后再继续原始 CRM 请求。版本检查或更新失败时，必须报告真实原因，不得绕过 CLI 或直接调用后端接口。

## 强制安全边界

- 所有 CRM 写入必须执行 `telrobot-cli crm add` 或 `telrobot-cli crm import-file`。
- 禁止直接调用后端接口，禁止使用 `curl`、`wget`、HTTP 客户端或其他命令降级写入。
- 禁止读取、解析或转换 Excel 内容。只把用户提供的文件路径传给 CLI。
- 禁止自动创建 CRM 字段。CLI 返回的 `ignored_fields` 只能展示为已忽略字段。
- CLI 失败时原样报告真实原因，不得把失败隐藏为成功，也不得绕过 CLI 重试写入。
- 每次查询导入状态都实时执行 CLI，不使用历史对话或 memory 代替。

如 CLI、配置或 Token 未就绪，先使用 `telrobot:init` 完成初始化。用户指定 profile 时，在命令根部透传 `--profile <name>`。

## 路由决策

按输入类型选择且只选择一条流程：

1. 图片：多模态结构化识别 -> 校验/确认 -> `crm add`。
2. 纯文本：抽取所有姓名手机号对 -> 规范化 -> 逐条 `crm add`。
3. Excel：不读取文件 -> `crm prepare-file` -> 标准文件直接导入；非标准文件确认后导入。

## 图片流程

仅使用多模态能力读取图片，输出内部结构：

```json
{
  "customers": [
    {
      "name": "张三",
      "phone": "18200000000",
      "name_confidence": "high",
      "phone_confidence": "high"
    }
  ]
}
```

执行规则：

- 只有识别出恰好一名客户，且姓名、手机号都完整并为高置信度时，才执行一次 `crm add`。
- 姓名或手机号缺失、模糊、低置信度时停止写入，展示识别值并要求用户确认或补充。
- 识别出多名客户时停止写入，逐名展示结构化结果并要求用户确认导入对象；确认后对选中的每名客户分别执行一次 `crm add`。
- 不把图片交给 OCR 脚本后再绕过 CLI 写入。

```bash
telrobot-cli crm add --name "张三" --phone "18200000000" --output json
```

## 纯文本流程

1. 抽取文本中所有明确的姓名/手机号对，不把孤立姓名或孤立手机号自动配对。
2. 去除手机号中的 `+86`/`0086`、空格、括号和连字符，保留规范号码。
3. 对缺失或含糊的记录先要求用户确认；不写入该记录。
4. 对每个完整记录独立执行一次命令。某条失败后继续处理其他明确记录。

```bash
telrobot-cli crm add --name "张三" --phone "18200000000" --output json
telrobot-cli crm add --name "李四" --phone "18300000000" --output json
```

逐条报告姓名、手机号、`成功`或`失败`及 CLI 原因，最后汇总总数、成功数和失败数。不得把两名客户合并为一次请求。

## Excel 流程

首期仅支持 `.xlsx` 和 `.excel`。遇到 `.xls` 时停止并明确提示用户先转换为标准 `.xlsx`。

第一步始终执行：

```bash
telrobot-cli crm prepare-file "/path/customers.xlsx" --flow pool --output json
```

Agent 不得在执行前后自行打开表格、读取单元格、转成 CSV 或推断表头。

检查 JSON 中的以下字段并展示给用户：

- `is_standard`
- `standard_file`
- `original_rows`、`valid_records`
- `phone_columns`
- `matched_fields`
- `ignored_fields`
- `validation_errors`

当 `is_standard=true` 时，直接使用返回的原文件路径提交并等待终态：

```bash
telrobot-cli crm import-file "/path/customers.xlsx" --flow pool --wait --output json
```

当 `is_standard=false` 时：

1. 展示标准文件路径、匹配字段、忽略字段和校验错误。
2. 明确询问用户是否按该结果导入。
3. 用户确认前停止；禁止执行 `import-file`，此时服务端必须没有上传或导入请求。
4. 用户确认后只使用 `standard_file` 返回的路径：

```bash
telrobot-cli crm import-file "~/.telrobot-cli/excel/standard_customers_....xlsx" --flow pool --wait --output json
```

不得使用原非标准文件替代 `standard_file`，也不得为 `ignored_fields` 创建 CRM 字段。

## 状态与结果

提交后台任务只表述为 `处理中`，禁止表述为“导入成功”。

- 单条：`成功`或`失败`。
- 文件：`处理中`、`全部成功`、`部分成功`或`失败`。
- 汇总：总数、成功数、失败数、过滤数、失败原因、任务 ID。

`--wait` 超时后仍返回 `处理中`。展示 CLI 返回的 `query_command`，或执行：

```bash
telrobot-cli crm import-status <导入任务ID> --output json
```

只有查询到后台终态后才能使用 `全部成功`、`部分成功`或`失败`。认证失败、非法手机号、重复处理和后台部分失败均按 CLI 原因原样报告。

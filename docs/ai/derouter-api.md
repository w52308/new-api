# derouter.ai API 文档

> 来源：https://derouter.ai/docs/api
> 抓取时间：2026-08-17
> 说明：管理接口参考 —— 余额、Sub-Key、用量日志

derouter.ai 提供 REST API，用于账户管理、客户密钥管理和用量查询。

---

## 鉴权

所有请求通过 `Authorization` 请求头鉴权。系统支持 **两种密钥**，权限不同：

| 维度 | 账户密钥 | 客户密钥 |
|------|---------|---------|
| 获取方式 | [API 页面](https://derouter.ai/api) → 账户密钥 标签页 | [API 页面](https://derouter.ai/api) → 客户密钥 标签页，或由你的分销商发放 |
| 可调用 | 所有管理接口 + OpenAI 兼容代理 | 自助查询接口 + OpenAI 兼容代理 |
| 请求头格式 | `Authorization: Bearer sk-ant-xxx...` | `Authorization: Bearer sk-ant-xxx...` |

---

## Base URL

```
https://cf-api.derouter.ai
```

---

## 接口总览

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/balance` | 账户密钥 | 查询账户余额 |
| GET | `/sub-keys` | 账户密钥 | 列出所有客户密钥 |
| POST | `/sub-keys` | 账户密钥 | 创建客户密钥 |
| PUT | `/sub-keys/:id` | 账户密钥 | 更新客户密钥 |
| DELETE | `/sub-keys/:id` | 账户密钥 | 删除客户密钥 |
| GET | `/usage-logs` | 账户密钥 | 用量日志（全账户） |
| GET | `/sub-key/balance` | 客户密钥 | 查询客户密钥余额 |
| GET | `/sub-key/usage-logs` | 客户密钥 | 查询客户密钥日志 |

---

## 账户

> 需要 **账户密钥**

### GET /balance

返回账户余额、锁定余额和可用余额。

```bash
curl https://cf-api.derouter.ai/balance \
  -H "Authorization: Bearer sk-ant-ACCOUNT_KEY"
```

**响应：**

```json
{
  "balance": "100.0000",
  "locked_balance": "20.0000",
  "available": "80.0000"
}
```

---

## 客户密钥管理

> 需要 **账户密钥**

### GET /sub-keys

列出所有活跃客户密钥，包含余额和用量。

```bash
curl https://cf-api.derouter.ai/sub-keys \
  -H "Authorization: Bearer sk-ant-ACCOUNT_KEY"
```

**响应：**

```json
{
  "subKeys": [
    {
      "id": "uuid",
      "label": "客户 A",
      "keyId": "sk-ant-abc...",
      "key": "sk-ant-abc...full",
      "budgetVirtual": 50,
      "spentVirtual": 12.5,
      "remainingVirtual": 37.5,
      "rpmLimit": 60,
      "concurrentLimit": 5,
      "displayMultiplier": 1,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST /sub-keys

创建一个新的客户密钥，从你的主余额中分配预算。

```bash
curl -X POST https://cf-api.derouter.ai/sub-keys \
  -H "Authorization: Bearer sk-ant-ACCOUNT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"budgetVirtual": 25, "label": "客户 B"}'
```

**参数：**

- `budgetVirtual`（必填）— 分配的预算金额（USD）。
- `label`（可选）— 密钥名称。
- `rpmLimit`（可选）— 每分钟请求数限制（默认 60）。

**响应：**

```json
{
  "id": "uuid",
  "key": "sk-ant-new-key-full",
  "keyId": "sk-ant-new...",
  "label": "客户 B",
  "budgetVirtual": 25,
  "rpmLimit": 30,
  "concurrentLimit": 5
}
```

### PUT /sub-keys/:id

更新客户密钥的标签、速率限制或追加预算。

```bash
curl -X PUT https://cf-api.derouter.ai/sub-keys/:id \
  -H "Authorization: Bearer sk-ant-ACCOUNT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"addBudgetVirtual": 10, "label": "客户 B Pro"}'
```

**参数：**

- `:id`（必填，在 URL 中）— 要更新的客户密钥 ID。
- `label`（可选）— 新标签名。
- `rpmLimit`（可选）— 新的 RPM 限制（1–60）。
- `addBudgetVirtual`（可选）— 追加预算金额（从主余额扣除）。
- `displayMultiplier`（可选）— 显示倍率（最小 1）。

### DELETE /sub-keys/:id

删除客户密钥。未消耗的预算将退回主余额。

```bash
curl -X DELETE https://cf-api.derouter.ai/sub-keys/:id \
  -H "Authorization: Bearer sk-ant-ACCOUNT_KEY"
```

### GET /usage-logs

获取分页的用量日志。可按客户密钥筛选或仅显示主账户用量。

```bash
curl "https://cf-api.derouter.ai/usage-logs?page=1&limit=20" \
  -H "Authorization: Bearer sk-ant-ACCOUNT_KEY"
```

**查询参数：**

- `page`（可选）— 页码，默认 1。
- `limit`（可选）— 每页条数，默认 20，最大 100。
- `subKeyId`（可选）— 按特定客户密钥 ID 筛选。
- `accountOnly`（可选）— 设为 true 时仅显示账户级用量（排除客户密钥）。

**响应：**

```json
{
  "data": [
    {
      "request_id": "req_abc123",
      "model": "claude-sonnet-4-6-20250514",
      "input_tokens": 1500,
      "output_tokens": 800,
      "cache_read_tokens": 0,
      "cache_write_tokens": 0,
      "cost_usdc": 0.0023,
      "duration_ms": 2100,
      "created_at": "2025-06-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## 客户密钥自助查询

> 需要 **客户密钥** — 供下游客户查询自己的数据

### GET /sub-key/balance

查询当前客户密钥的余额、速率限制和用量概览。

```bash
curl https://cf-api.derouter.ai/sub-key/balance \
  -H "Authorization: Bearer sk-ant-SUB_KEY"
```

**响应：**

```json
{
  "budget": 200.0000,
  "spent": 50.0000,
  "remaining": 150.0000,
  "rpmLimit": 60,
  "concurrentLimit": 5,
  "label": "客户 A",
  "usage": {
    "today": {
      "requests": 5,
      "inputTokens": 1000,
      "outputTokens": 500,
      "totalTokens": 1500,
      "cost": 1.00
    },
    "week": {
      "requests": 30,
      "inputTokens": 8000,
      "outputTokens": 4000,
      "totalTokens": 12000,
      "cost": 7.20
    },
    "month": {
      "requests": 120,
      "inputTokens": 50000,
      "outputTokens": 25000,
      "totalTokens": 75000,
      "cost": 34.00
    },
    "total": {
      "requests": 120,
      "inputTokens": 50000,
      "outputTokens": 25000,
      "totalTokens": 75000,
      "cost": 34.00
    }
  }
}
```

### GET /sub-key/usage-logs

获取当前客户密钥的分页请求日志。

```bash
curl "https://cf-api.derouter.ai/sub-key/usage-logs?page=1&limit=20" \
  -H "Authorization: Bearer sk-ant-SUB_KEY"
```

**查询参数：**

- `page`（可选）— 页码，默认 1。
- `limit`（可选）— 每页条数，默认 20，最大 100。

**响应：**

```json
{
  "data": [
    {
      "request_id": "req_abc123",
      "model": "claude-sonnet-4-6-20250514",
      "input_tokens": 1500,
      "output_tokens": 800,
      "cache_read_tokens": 0,
      "cache_write_tokens": 0,
      "cost_usdc": 0.0092,
      "duration_ms": 2100,
      "key_id": "sk-ant-abc...",
      "created_at": "2025-06-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## 错误处理

所有接口返回标准 HTTP 状态码：

- **200** — 成功。
- **401** — 缺少或无效的 API 密钥。
- **400** — 请求体或参数无效。
- **500** — 服务器内部错误。

错误响应包含 JSON 格式的错误信息：

```json
{
  "error": "Invalid API key"
}
```

---

## 快速开始

选择你喜欢的工具或客户端，快速接入 derouter.ai。

可用的 Base URL：

- `api.derouter.ai`
- `api.apikey.cloud`
- `api-direct.derouter.ai`
- `api-direct.apikey.cloud`

接入方式：OpenAI API / Claude API / Claude Code / Codex CLI / Image / Chat Apps / OpenClaw

### OpenAI API

使用标准 OpenAI SDK 或任何 OpenAI 兼容客户端，只需修改 `base_url` 和 `api_key`。

**Python (OpenAI SDK)：**

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-ant-YOUR_KEY",
    base_url="https://api.derouter.ai/openai/v1"
)

response = client.chat.completions.create(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

**cURL：**

```bash
curl https://api.derouter.ai/openai/v1/chat/completions \
  -H "Authorization: Bearer sk-ant-YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet-4-6", "messages": [{"role": "user", "content": "Hello!"}]}'
```

**查看可用模型：**

```bash
curl https://api.derouter.ai/openai/v1/models \
  -H "Authorization: Bearer sk-ant-YOUR_KEY"
```

---

更多关于客户密钥管理、推荐返佣和分销策略的信息，请参阅 [分销指南](https://derouter.ai/docs/reseller)。

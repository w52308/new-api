# Derouter 渠道接入与管理子系统设计

日期：2026-08-19

状态：交互式设计已逐节确认，等待用户审阅书面规格

## 1. 背景与目标

在 new-api 中接入 derouter.ai，作为一个一等公民渠道类型（type 61），并附带一个管理子系统，覆盖 derouter 的全部 8 个管理接口。

derouter.ai 是 OpenAI/Claude 兼容的上游。它对外提供两类能力：

- **Relay 端点**（`api.derouter.ai`）：OpenAI 兼容 `/openai/v1/...` 与 Anthropic 原生 `/proxy/v1/messages` 两种路径前缀，分别服务 OpenAI 客户端与 Claude Code。
- **管理端点**（`cf-api.derouter.ai`）：8 个 REST 接口，分为 Account Key 6 个与 Sub Key 2 个，用于余额查询、客户密钥（subkey）生命周期管理与用量日志。

本设计的目标：

1. 新增 type 61 Derouter 渠道，同时原生支持 OpenAI 格式与 Claude Code 原生格式，一个渠道服务两种格式。
2. 在该渠道下挂载 8 个管理接口，运营可在后台查询余额、创建/编辑/删除 subkey、查看用量日志。
3. 复用 new-api 现有渠道密钥加密、权限、计费机制，不引入新的加密存储、不改动 new-api 计费核心。

## 2. 非目标

明确不做，防止范围蔓延：

- **不做 derouter 计费**。不读取 `cost_usdc` 作为扣费依据，不引入异步对账、预授权 hold、钱包 ledger 等 feixiao 式结算子系统。relay 计费 100% 走 new-api 现有 `PreConsume`/`PostConsume` + token × 模型倍率。
- **不做 subkey 级 relay 计费/轮询**（Approach B）。relay 流量用渠道 Key 字段里的密钥，走主账户；subkey 不进 `channel.Key` 多 Key 轮询池。
- **不落库 subkey 与消费数据**。余额、用量、subkey 列表全部实时调 derouter 接口展示，不在 new-api 数据库存副本、不做同步、不做对账。
- **不做完整上游结构体建模**。管理接口的返回按 derouter 原生 JSON 透传，仅在 create/update subkey 的输入 payload 上做强类型。
- **不接入 derouter 的分销/返佣/推荐**体系。
- **不改 relaykit 模块**。

## 3. 关键事实

来自 `feixiao-ai/docs`（derouter 文档抓取）与 new-api 源码核对：

- derouter OpenAI 兼容端点：`https://api.derouter.ai/openai/v1/chat/completions`、`/openai/v1/models`。
- derouter Anthropic 原生端点：`https://api.derouter.ai/proxy/v1/messages`（`derouter-partners.md`：把 `/openai/v1` 换成 `/proxy/v1`）。
- derouter 管理端点 host：`https://cf-api.derouter.ai`，全部用 `Authorization: Bearer sk-ant-...`。
- derouter 所有密钥统一 `sk-ant-` 前缀，Bearer 鉴权。
- new-api openai adapter 的 `ConvertClaudeRequest` 会把 Claude 请求**转换**为 OpenAI 格式（非原生）；claude adapter 硬编码 `x-api-key` + `/v1/messages`。二者都不能直接复用为 derouter 的双格式原生支持，故 type 61 需要专用 adapter。
- new-api codex 渠道（type 57）已有「渠道挂载管理接口」的范式：路由 `/:id/codex/usage` 等 + service 层 `FetchCodexWham*` 纯函数 + controller `fetchCodexChannelWhamData` 从渠道读 Key。本设计照搬。
- new-api 渠道模型 `Channel` 的 `Key` 字段已支持密钥加密与受控展示（`/:id/key` 路由 + `SecureVerificationRequired`）。Account Key 直接存此字段，无需新加密。

## 4. 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      new-api                                 │
│                                                               │
│  Relay 流程 A                                                  │
│  客户端 /v1/chat/completions | /v1/messages                   │
│    → 鉴权 + 计费预扣(现有 PreConsume)                          │
│    → 分发到 type=61 渠道                                       │
│    → GetAdaptor(APITypeDerouter) → &derouter.Adaptor{}        │
│    → adapter 按 RelayFormat 选前缀:                            │
│        OpenAI → api.derouter.ai/openai/v1/...                 │
│        Claude → api.derouter.ai/proxy/v1/messages             │
│    → Bearer <渠道Key>                                          │
│    → 委派 openai/claude handler 解析 usage                     │
│    → 计费结算(现有 PostConsume, token×倍率)                    │
│                                                               │
│  管理/消费流程 B                                                │
│  管理员前端 → /api/channel/:id/derouter/*                      │
│    → AdminAuth + ChannelRead/ChannelSensitiveWrite            │
│    → loadDerouterChannel: GetChannelById(id,true) → AccountKey│
│    → service.Derouter*(client, cf-api.derouter.ai, key, ...)  │
│    → derouter 管理接口                                          │
│    → body 透传前端                                              │
└─────────────────────────────────────────────────────────────┘
```

两个流程共用同一个 type 61 渠道：渠道 Key 存 Account Key，既供 relay（主账户余额）也供管理。relay 域名 `api.derouter.ai` 与管理域名 `cf-api.derouter.ai` 独立。

## 5. 组件设计

### 5.1 Relay：渠道类型 61 + derouter adapter

**常量与注册（5 处后端改动，纯新增）：**

- `constant/channel.go`
  - `ChannelTypeDerouter = 61`（置于 `ChannelTypeDummy` 之前，Dummy 必须保持最后）。
  - `ChannelBaseURLs` 追加 `"https://api.derouter.ai"`。
  - `ChannelTypeNames` 追加 `ChannelTypeDerouter: "Derouter"`。
- `constant/api_type.go`：在 `APITypeDummy` 前加 `APITypeDerouter`。
- `common/api_type.go`：`ChannelType2APIType` 加 `case constant.ChannelTypeDerouter: apiType = constant.APITypeDerouter`。
- `relay/relay_adaptor.go`：`GetAdaptor` 加 `case constant.APITypeDerouter: return &derouter.Adaptor{}`。
- `relay/common/relay_info.go`：`streamSupportedChannels` 加 `constant.ChannelTypeDerouter: true`（先加，联调验证 derouter 流式是否返回 usage，不返回则移除）。

**新 adapter `relay/channel/derouter/adaptor.go`：** 组合现有 adapter，不重写逻辑。

- `type Adaptor struct { openai openai.Adaptor; claude claude.Adaptor }`。
- `Init(info)`：设置 `info.ChannelType`，按格式委派。
- `GetRequestURL(info)`：按 `info.RelayFormat` 选前缀。
  - Claude 格式（Messages）：`fmt.Sprintf("%s/proxy/v1/messages", base)`，镜像 claude adapter 的 `%s/v1/messages`，处理 `ClaudeBetaQuery` 附加 `?beta=true`。
  - OpenAI 格式：`fmt.Sprintf("%s/openai/v1/chat/completions", base)`（以及 Responses 路径按需）。
  - base 去尾斜杠归一化。
  - MVP 只覆盖 Chat + Messages；Realtime/Azure 等特殊情况 derouter 不涉及，不实现。
- `SetupRequestHeader`：
  - **始终设 `Authorization: Bearer <info.ApiKey>`**（derouter 全端点 Bearer）。
  - Claude 格式额外设 `anthropic-version`（默认 `2023-06-01`，可被入站头覆盖）、`anthropic-beta`（复用 `claude.CommonClaudeHeadersOperation`）。**不设 `x-api-key`**。
  - 联调验证点：若 derouter `/proxy/v1` 拒收 Bearer、只认 `x-api-key`，则改为按格式条件设置鉴权头。
- `ConvertOpenAIRequest`：委派 `a.openai.ConvertOpenAIRequest`（OpenAI 请求直通，原生）。
- `ConvertClaudeRequest`：委派 `a.claude.ConvertClaudeRequest`（返回 request 原样，原生，不转 OpenAI）。
- `ConvertGeminiRequest` / `ConvertOpenAIResponsesRequest` / `ConvertRerankRequest` / `ConvertEmbeddingRequest` / `ConvertAudioRequest` / `ConvertImageRequest`：MVP 返回 `not implemented`，与 mokaai 风格一致。
- `DoRequest`：`channel.DoApiRequest(a, c, info, requestBody)`。
- `DoResponse`：按最终格式委派 —— Claude 格式设 `info.FinalRequestRelayFormat = RelayFormatClaude` 后调 `claude.ClaudeStreamHandler`/`ClaudeHandler`；OpenAI 格式调 openai 的对应 handler。
- `GetModelList()`：返回 `ModelList`。
- `GetChannelName()`：返回 `ChannelName = "derouter"`。
- `var ModelList = []string{}`：MVP 空，用手填模型（claude-sonnet-4-6 等），后续可由"获取上游模型"填充。

**为何用组合而非复用 `&openai.Adaptor{}`：** openai adapter 会把 Claude 请求转成 OpenAI 格式（非原生），claude adapter 硬编码 `x-api-key` + `/v1/messages`。derouter 需要二者的混合：原生路径选择 + Bearer。薄组合层保持既有逻辑不动，符合 adapter 约定。

### 5.2 管理 service 层 `service/derouter_*`

镜像 `FetchCodexWham*`：纯函数，入参 `(ctx, client, baseURL, accountKey, ...)`，不耦合 Channel。

**`service/derouter_client.go`：**

- `defaultDerouterMgmtBaseURL = "https://cf-api.derouter.ai"`，可按渠道覆盖。
- `derouterMgmtBaseURL(ch)`：读渠道覆盖或默认。
- `newDerouterMgmtClient()`：带 timeout 的 `*http.Client`。
- `doDerouterMgmt(ctx, client, method, baseURL, path, authKey, body, query)`：统一构造请求、设 `Authorization: Bearer`、执行、读 body、返回 `(statusCode, body, err)`。derouter 业务错误（401/402/400）不视为 `err`，连同 body 返回。

**`service/derouter_account.go`（6 个 Account Key 接口）：**

- `DerouterGetBalance(ctx, client, baseURL, accountKey)` → `GET /balance`
- `DerouterListSubKeys(...)` → `GET /sub-keys`
- `DerouterCreateSubKey(ctx, client, baseURL, accountKey, payload)` → `POST /sub-keys`，payload 强类型：`{BudgetVirtual float64; Label string; RPMLimit int}`
- `DerouterUpdateSubKey(ctx, client, baseURL, accountKey, id, payload)` → `PUT /sub-keys/:id`，payload：`{Label; RPMLimit; AddBudgetVirtual; DisplayMultiplier}`
- `DerouterDeleteSubKey(...)` → `DELETE /sub-keys/:id`
- `DerouterListUsageLogs(ctx, client, baseURL, accountKey, page, limit, subKeyId, accountOnly)` → `GET /usage-logs`（带 query）

**`service/derouter_subkey.go`（2 个 Sub Key 接口，用 sub key 自身鉴权）：**

- `DerouterGetSubKeyBalance(ctx, client, baseURL, subKey)` → `GET /sub-key/balance`
- `DerouterListSubKeyUsageLogs(ctx, client, baseURL, subKey, page, limit)` → `GET /sub-key/usage-logs`

**设计要点：**

- 返回 `body []byte` 透传，不对完整上游 schema 建模（与 codex 一致）。仅 create/update 的输入 payload 强类型。
- service 层不解密 `channel.Key`，controller 传明文 Account Key 进来。
- subkey 不落库，每次实时查 derouter。

### 5.3 Controller + 路由

**新 `controller/derouter.go`：**

- `loadDerouterChannel(c) (*model.Channel, string, error)`：从 `:id` 取渠道（`GetChannelById(id, true)`），校验 `ch.Type == ChannelTypeDerouter`，拒绝多 Key 渠道（`ch.ChannelInfo.IsMultiKey`），返回 `(channel, strings.TrimSpace(ch.Key))`，Key 空则报错。derouter 版的 `fetchCodexChannelWhamData` 前半段。
- 8 个 handler，薄封装调 service，透传 body。

| 路由 | 方法 | 权限 | handler | service |
|---|---|---|---|---|
| `/channel/:id/derouter/balance` | GET | `ChannelRead` | `GetDerouterBalance` | `DerouterGetBalance` |
| `/channel/:id/derouter/subkeys` | GET | `ChannelRead` | `ListDerouterSubKeys` | `DerouterListSubKeys` |
| `/channel/:id/derouter/subkeys` | POST | `ChannelSensitiveWrite` | `CreateDerouterSubKey` | `DerouterCreateSubKey` |
| `/channel/:id/derouter/subkeys/:sid` | PUT | `ChannelSensitiveWrite` | `UpdateDerouterSubKey` | `DerouterUpdateSubKey` |
| `/channel/:id/derouter/subkeys/:sid` | DELETE | `ChannelSensitiveWrite` | `DeleteDerouterSubKey` | `DerouterDeleteSubKey` |
| `/channel/:id/derouter/usage-logs` | GET | `ChannelRead` | `ListDerouterUsageLogs` | `DerouterListUsageLogs` |
| `/channel/:id/derouter/sub-key/balance` | GET | `ChannelRead` | `GetDerouterSubKeyBalance` | `DerouterGetSubKeyBalance` |
| `/channel/:id/derouter/sub-key/usage-logs` | GET | `ChannelRead` | `ListDerouterSubKeyUsageLogs` | `DerouterListSubKeyUsageLogs` |

- 路由注册到 `router/channel-router.go` 的 `channelPermissionRoutes` 切片，与 codex 路由平行。`AdminAuth` 已在 `registerChannelRoutes` 统一挂载。
- 权限：只读 4 个 `ChannelRead`；写操作 3 个 `ChannelSensitiveWrite`（与 codex refresh、AddChannel 同级，符合"操作资金/密钥"语义）。
- **sub-key 自查接口**（`/sub-key/balance`、`/sub-key/usage-logs`）在 derouter 侧用 sub key 鉴权。前端传 keyId/选中行，后端据此取 sub key 转发 derouter —— 不经前端直连 derouter，统一 proxy 与审计。
- 错误：2xx → `c.Data(statusCode, "application/json", body)` 透传；非 2xx → `c.JSON(http.StatusOK, gin.H{"success":false, "message":<derouter error 文案>, "upstream_status":statusCode})`，不暴露 Account Key 与内部细节。

### 5.4 数据流

**流程 A（relay）**：type 61 走 new-api 现有同步计费（`PreConsume`→`PostConsume`，token × 倍率），adapter 委派 openai/claude handler 返回 usage。不引入 derouter `cost_usdc` 计费、不对账。

**流程 B（管理/消费）**：后台看到的余额、用量、成本全部实时调 derouter 接口展示，不读 new-api 日志、不落库、不对账。

**创建渠道交互**：new-api 现有渠道创建表单按 `Type` 渲染。选 Type=61(Derouter) 即声明这是 Derouter 账号（与 codex/openrouter 同范式，无额外"是否 Derouter"开关字段）：
- `base_url` 默认 `https://api.derouter.ai`（relay 用，可改 mirror）。
- `key` 提示填 derouter Account Key（`sk-ant-...`）。
- `models` 手填（MVP 空列表）。

**密钥可见性**：Account Key 在 `channel.Key`，复用 new-api 现有渠道密钥加密/展示规则（创建时可见、之后脱敏、`SecureVerificationRequired` 才能再取）。subkey 完整值：`CreateDerouterSubKey` 透传 derouter 返回的完整 key 给前端展示一次；之后 list 时 derouter 只返回 `keyId`（截断）。不在 new-api 落库 subkey 全文。

**计费边界**：type 61 不碰 billing expression / quota_math。relay 计费完全走 new-api 现有模型定价 + token usage。derouter `cost_usdc` 是 derouter 侧成本，不接入 new-api 计费。

### 5.5 前端

**API 层 `web/src/features/channels/api.ts`**（追加，镜像 `getCodexUsage`）：8 个 fetch 函数，返回类型 MVP 用 `unknown`/`Record<string,unknown>` 透传 derouter 原生 JSON，仅 create/update payload 强类型。

**Dialog 组件 `web/src/features/channels/components/dialogs/`**：
- `derouter-balance-dialog.tsx`：展示 balance/locked/available。
- `derouter-subkeys-dialog.tsx`：subkey 列表表格（label、keyId 截断、budget/spent/remaining、rpm），含创建/编辑（追加预算、改 label/rpm）/删除操作。
- `derouter-usage-logs-dialog.tsx`：usage-logs 分页表格（model、tokens、cost_usdc、duration、时间），支持 subKeyId/accountOnly 筛选。
- sub-key 自查复用上述 dialog：选中 subkey 后用其数据调 `/sub-key/balance` 与 `/sub-key/usage-logs`，前端只传 keyId/选中行，不持完整 sub key 明文。

**渠道行操作 `channels-columns.tsx`**：`type === 61` 判断，挂"Derouter 管理""余额""用量"入口，镜像 codex 的 `type === 57`。`balance-query-dialog.tsx` 旁加 `isDerouter = type===61` 复用余额查询。

**渠道创建表单**：Section 5.1 的 `channel-type-config.ts` type 61 配置已覆盖（`defaultBaseUrl`、key/models hints），drawer 自动渲染，无需特殊分支。

**i18n**：用户可见文案用 `t('English key')`，en + zh 加键。遵循 `web/AGENTS.md` flat JSON 约定。

**图标**：`getChannelTypeIcon` 加 `61: 'OpenAI'`（Lobe 无 derouter 图标，回退 OpenAI）。

## 6. 错误处理与测试

**错误处理：** 三层透传 derouter 原始错误，不发明新错误码（详见 5.3）。

**计费安全边界（AGENTS.md 红线，不触碰）：** type 61 不引入 billing 表达式、不读 `cost_usdc` 计费、不对账。relay 计费 100% 走 new-api 现有链路。quota_math、饱和、负额、multiplier bound 等不变量不受影响。spec 第 2 节已写成显式非目标。

**测试矩阵：**

| 层 | 测试 | 风格 |
|---|---|---|
| derouter adapter | `GetRequestURL` table：Claude→`/proxy/v1/messages`、OpenAI→`/openai/v1/chat/completions`、尾斜杠归一化 | `testify require` + table |
| derouter adapter | `SetupRequestHeader`：两格式设 Bearer；Claude 设 `anthropic-version`/`anthropic-beta`，不设 `x-api-key` | `require` |
| `service/derouter_*` | `doDerouterMgmt` URL/header/query 构造 table（`httptest.Server` stub，断言 path、Bearer、分页/筛选 query） | `require` + httptest stub |
| `common/api_type.go` | `ChannelType2APIType(61)`→`APITypeDerouter`；`GetAdaptor(APITypeDerouter)`→`&derouter.Adaptor{}`（非 openai） | `require` 直值 |

**不写的测试：** controller 单测（薄转发）、前端单测（展示组件）、fake fuzz/stress/计时/大循环、只验证"能跑"的覆盖测试、derouter 真实网络测试（CI 无凭证）。

**构建校验：**
- `cd relaykit && GOWORK=off go build ./...`（不改 relaykit，确认未误伤）。
- `go build ./...` + `go test ./relay/channel/derouter/... ./service/... ./common/...`
- `cd web && bun run lint && bun run build`

## 7. 联调验证点

以下需真实 derouter 凭证联调确认，无法在 CI 覆盖：

1. derouter `/proxy/v1/messages` 是否接受 `Authorization: Bearer`（而非 `x-api-key`）。若拒收，adapter 改为按格式条件设置鉴权头。
2. derouter 流式响应是否返回 usage，决定 `streamSupportedChannels` 保留或移除。
3. derouter 管理域名 `cf-api.derouter.ai` 的 8 接口字段与本文档（基于 `feixiao-ai/docs` 抓取）是否一致。
4. OpenAI 与 Claude 两种格式在同一渠道下的真实请求/响应往返。

## 8. 实施边界

本设计适合一个实施计划完成，按模块分阶段交付：

1. 常量 + adapter + relay 注册（5.1）。
2. 管理 service 层（5.2）。
3. controller + 路由（5.3）。
4. 前端 API + dialog + 渠道入口（5.5）。
5. 测试与构建校验（6）。
6. 联调验证点（7）。

实现前必须先编写逐任务实施计划，并在每个阶段运行针对性测试。

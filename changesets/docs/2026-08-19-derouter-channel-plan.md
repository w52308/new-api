# Derouter 渠道接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 new-api 接入 derouter.ai 作为 type 61 渠道，原生支持 OpenAI 与 Claude Code 两种格式，并挂载 8 个管理接口。

**Architecture:** 新增专用 `relay/channel/derouter` adapter（组合 openai/claude adapter，按 RelayFormat 选 `/openai/v1` 或 `/proxy/v1` 前缀、统一 Bearer 鉴权），照搬 codex 渠道的「渠道挂管理接口」范式在 `/channel/:id/derouter/*` 下实现 8 个管理接口（service 纯函数 + controller 薄转发 + 路由）。不碰 new-api 计费核心，消费数据实时查 derouter 不落库。

**Tech Stack:** Go 1.22+ / Gin / GORM；React 19 / TypeScript / Rsbuild / i18next；testify（require+assert）。

**Spec:** `changesets/docs/2026-08-19-derouter-channel-design.md`

## Global Constraints

- **JSON**：业务代码 marshal/unmarshal 一律走 `common.Marshal`/`common.Unmarshal` 等 wrapper，不直接 import `encoding/json` 做序列化调用（`json.RawMessage` 类型引用允许）。
- **relaykit 独立性**：不改 `relaykit/` 模块；任何疑似影响需 `cd relaykit && GOWORK=off go build ./...` 验证。
- **DB 兼容**：本计划不新增 DB 表/迁移（不落库），无 DB 兼容约束触发。
- **计费红线**：type 61 不引入 billing expression、不读 `cost_usdc` 计费、不对账；relay 走现有 `PreConsume`/`PostConsume`。
- **包名**：禁止全量包名引用类，一律 import 后用短名（用户全局 CLAUDE.md）。
- **测试**：Go 新测试用 `github.com/stretchr/testify/require`（setup/致命）+ `assert`（非致命值检查）。
- **前端**：`bun` 为包管理/脚本工具；UI 文案走 i18next，en+zh flat JSON。
- **受保护标识**：不得改动 new-api / QuantumNous 相关品牌、版权、模块路径等。
- **i18n 包名**：前端渠道类型名为 i18n key（如已有 `"DeepSeek"`/`"OpenRouter"`），需在 locale 加 `"Derouter"`。

---

## File Structure

**Create:**
- `relay/channel/derouter/adaptor.go` — derouter relay adapter（组合 openai/claude，选前缀+Bearer）
- `relay/channel/derouter/constants.go` — `ModelList`、`ChannelName`
- `relay/channel/derouter/adaptor_test.go` — GetRequestURL/SetupRequestHeader table 测试
- `service/derouter_client.go` — mgmt HTTP client + `doDerouterMgmt` 统一调用
- `service/derouter_client_test.go` — doDerouterMgmt 构造测试（httptest stub）
- `service/derouter_account.go` — 6 个 Account Key 接口
- `service/derouter_subkey.go` — 2 个 Sub Key 接口
- `controller/derouter.go` — `loadDerouterChannel` + 8 个 handler
- `controller/derouter_api_test.go` — ChannelType2APIType / GetAdaptor 映射测试（或归入 common 测试，见 Task 1）
- `web/src/features/channels/components/dialogs/derouter-balance-dialog.tsx`
- `web/src/features/channels/components/dialogs/derouter-subkeys-dialog.tsx`
- `web/src/features/channels/components/dialogs/derouter-usage-logs-dialog.tsx`

**Modify:**
- `constant/channel.go` — 加 `ChannelTypeDerouter`、BaseURL、Name
- `constant/api_type.go` — 加 `APITypeDerouter`
- `common/api_type.go` — 加映射 case
- `relay/relay_adaptor.go` — 加 GetAdaptor case + import
- `relay/common/relay_info.go` — streamSupportedChannels 加 61
- `router/channel-router.go` — 加 8 条 derouter 路由
- `web/src/features/channels/constants.ts` — type 61 + 显示顺序
- `web/src/features/channels/lib/channel-type-config.ts` — type 61 配置块
- `web/src/features/channels/lib/channel-utils.ts` — 图标 61
- `web/src/features/channels/api.ts` — 8 个 fetch 函数
- `web/src/features/channels/components/channels-columns.tsx` — type 61 行操作入口
- `web/src/features/channels/components/dialogs/balance-query-dialog.tsx` — isDerouter 分支
- `web/src/i18n/locales/en.json` / `zh.json` — "Derouter" 等 key

---

### Task 1: 注册渠道类型 61 与 APIType 映射

**Files:**
- Modify: `constant/channel.go`（ChannelType 常量区 ~line 58、ChannelBaseURLs ~line 126、ChannelTypeNames ~line 179）
- Modify: `constant/api_type.go`（~line 41 APITypeDummy 前）
- Modify: `common/api_type.go`（switch ~line 82 前）
- Test: `common/api_type_test.go`（新建或追加；若无则建）

**Interfaces:**
- Produces: 常量 `constant.ChannelTypeDerouter = 61`、`constant.APITypeDerouter`；函数 `common.ChannelType2APIType(61)` 返回 `(APITypeDerouter, true)`。后续 Task 2 的 adapter 注册依赖 `APITypeDerouter`。

- [ ] **Step 1: 写失败测试**

新建 `common/api_type_test.go`：

```go
package common

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/require"
)

func TestChannelType2APITypeDerouter(t *testing.T) {
	apiType, ok := ChannelType2APIType(constant.ChannelTypeDerouter)
	require.True(t, ok)
	require.Equal(t, constant.APITypeDerouter, apiType)
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./common/ -run TestChannelType2APITypeDerouter -v`
Expected: FAIL（编译错误：`ChannelTypeDerouter` / `APITypeDerouter` undefined）

- [ ] **Step 3: 加常量**

`constant/channel.go`，在 `ChannelTypeNewAPI = 60` 后、`ChannelTypeDummy` 前：

```go
	ChannelTypeNewAPI         = 60
	ChannelTypeDerouter       = 61
	ChannelTypeDummy          // this one is only for count, do not add any channel after this
```

`constant/api_type.go`，在 `APITypeNewAPI` 后、`APITypeDummy` 前：

```go
	APITypeNewAPI
	APITypeDerouter
	APITypeDummy // this one is only for count, do not add any channel after this
```

- [ ] **Step 4: 加 BaseURL 与 Name**

`constant/channel.go` 的 `ChannelBaseURLs` 切片，在 `//60` 行后追加：

```go
	"",                                          //60
	"https://api.derouter.ai",                   //61
}
```

`ChannelTypeNames` map，在 `ChannelTypeNewAPI: "New API",` 后追加（找到该行位置，map 闭合 `}` 前）：

```go
	ChannelTypeNewAPI:         "New API",
	ChannelTypeDerouter:       "Derouter",
}
```

- [ ] **Step 5: 加映射 case**

`common/api_type.go` 的 `ChannelType2APIType` switch，在 `case constant.ChannelTypeNewAPI:` 后：

```go
	case constant.ChannelTypeNewAPI:
		apiType = constant.APITypeNewAPI
	case constant.ChannelTypeDerouter:
		apiType = constant.APITypeDerouter
	}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `go test ./common/ -run TestChannelType2APITypeDerouter -v`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add constant/channel.go constant/api_type.go common/api_type.go common/api_type_test.go
git commit -m "feat(derouter): register channel type 61 and APIType mapping"
```

---

### Task 2: derouter relay adapter

**Files:**
- Create: `relay/channel/derouter/constants.go`
- Create: `relay/channel/derouter/adaptor.go`
- Create: `relay/channel/derouter/adaptor_test.go`
- Modify: `relay/relay_adaptor.go`（import + GetAdaptor case）
- Modify: `relay/common/relay_info.go`（streamSupportedChannels）

**Interfaces:**
- Consumes: `constant.APITypeDerouter`（Task 1）；`openai.Adaptor`、`claude.Adaptor`、`claude.ClaudeStreamHandler`/`ClaudeHandler`、`claude.CommonClaudeHeadersOperation`、`openai.OaiStreamHandler`/`OpenaiHandler`、`channel.DoApiRequest`/`SetupApiRequestHeader`、`relaycommon.RelayInfo`、`dto.*`、`types.RelayFormatClaude`/`RelayFormatOpenAI`。
- Produces: `derouter.Adaptor`（实现 `channel.Adaptor` 接口）；`GetAdaptor(APITypeDerouter)` 返回 `&derouter.Adaptor{}`。`GetRequestURL` 对 Claude 格式返回 `<base>/proxy/v1/messages`，OpenAI 格式返回 `<base>/openai/v1/chat/completions`。

- [ ] **Step 1: 写失败测试**

`relay/channel/derouter/adaptor_test.go`：

```go
package derouter

import (
	"net/http"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newInfo(format types.RelayFormat, base string) *relaycommon.RelayInfo {
	return &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:    constant.ChannelTypeDerouter,
			ChannelBaseUrl: base,
		},
		RelayFormat: format,
		RelayMode:   relayconstant.RelayModeChatCompletions,
	}
}

func TestGetRequestURLClaudeUsesProxyPrefix(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatClaude, "https://api.derouter.ai")
	u, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.derouter.ai/proxy/v1/messages", u)
}

func TestGetRequestURLOpenAIUsesOpenAIPrefix(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatOpenAI, "https://api.derouter.ai")
	u, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.derouter.ai/openai/v1/chat/completions", u)
}

func TestGetRequestURLTrimsTrailingSlash(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatOpenAI, "https://api.derouter.ai/")
	u, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.derouter.ai/openai/v1/chat/completions", u)
}

func TestSetupRequestHeaderAlwaysBearer(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatOpenAI, "https://api.derouter.ai")
	info.ApiKey = "sk-ant-test"
	h := http.Header{}
	err := a.SetupRequestHeader(nil, &h, info)
	require.NoError(t, err)
	assert.Equal(t, "Bearer sk-ant-test", h.Get("Authorization"))
	assert.Empty(t, h.Get("x-api-key"))
}

func TestSetupRequestHeaderClaudeSetsAnthropicHeaders(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatClaude, "https://api.derouter.ai")
	info.ApiKey = "sk-ant-test"
	h := http.Header{}
	err := a.SetupRequestHeader(nil, &h, info)
	require.NoError(t, err)
	assert.Equal(t, "Bearer sk-ant-test", h.Get("Authorization"))
	assert.NotEmpty(t, h.Get("anthropic-version"))
	assert.Empty(t, h.Get("x-api-key"))
}
```

> 注意：`SetupRequestHeader(nil, ...)` 传 `*gin.Context` 为 nil。若 `channel.SetupApiRequestHeader` 或 `claude.CommonClaudeHeadersOperation` 对 nil c 解引用，测试会在 Step 3 暴露；届时按实际需要构造一个最小 `gin.Context`（`gin.CreateTestContext(nil)`）。先按 nil 跑，失败再改。

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./relay/channel/derouter/ -v`
Expected: FAIL（包不存在 / Adaptor undefined）

- [ ] **Step 3: 写 constants.go**

`relay/channel/derouter/constants.go`：

```go
package derouter

var ModelList = []string{}

var ChannelName = "derouter"
```

- [ ] **Step 4: 写 adaptor.go**

`relay/channel/derouter/adaptor.go`：

```go
package derouter

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/relay/channel"
	"github.com/QuantumNous/new-api/relay/channel/claude"
	"github.com/QuantumNous/new-api/relay/channel/openai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"

	"github.com/gin-gonic/gin"
)

type Adaptor struct {
	openai openai.Adaptor
	claude claude.Adaptor
}

func (a *Adaptor) Init(info *relaycommon.RelayInfo) {
	a.openai.ChannelType = constant.ChannelTypeDerouter
	a.claude.Init(info)
}

func (a *Adaptor) GetRequestURL(info *relaycommon.RelayInfo) (string, error) {
	base := strings.TrimRight(strings.TrimSpace(info.ChannelBaseUrl), "/")
	if base == "" {
		return "", errors.New("derouter channel: base_url is required")
	}
	switch info.RelayFormat {
	case types.RelayFormatClaude:
		if info.RelayMode == relayconstant.RelayModeResponses ||
			info.RelayMode == relayconstant.RelayModeResponsesCompact {
			return "", errors.New("derouter channel: claude responses not supported")
		}
		u := fmt.Sprintf("%s/proxy/v1/messages", base)
		if info.IsClaudeBetaQuery || info.ChannelOtherSettings.ClaudeBetaQuery {
			u += "?beta=true"
		}
		return u, nil
	default:
		return fmt.Sprintf("%s/openai/v1/chat/completions", base), nil
	}
}

func (a *Adaptor) SetupRequestHeader(c *gin.Context, header *http.Header, info *relaycommon.RelayInfo) error {
	channel.SetupApiRequestHeader(info, c, header)
	header.Set("Authorization", fmt.Sprintf("Bearer %s", info.ApiKey))
	if info.RelayFormat == types.RelayFormatClaude {
		anthropicVersion := "2023-06-01"
		if c != nil {
			if v := c.Request.Header.Get("anthropic-version"); v != "" {
				anthropicVersion = v
			}
		}
		header.Set("anthropic-version", anthropicVersion)
		claude.CommonClaudeHeadersOperation(c, header, info)
	}
	return nil
}

func (a *Adaptor) ConvertOpenAIRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.GeneralOpenAIRequest) (any, error) {
	return a.openai.ConvertOpenAIRequest(c, info, request)
}

func (a *Adaptor) ConvertClaudeRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.ClaudeRequest) (any, error) {
	return a.claude.ConvertClaudeRequest(c, info, request)
}

func (a *Adaptor) ConvertGeminiRequest(*gin.Context, *relaycommon.RelayInfo, *dto.GeminiChatRequest) (any, error) {
	return nil, errors.New("not implemented")
}

func (a *Adaptor) ConvertOpenAIResponsesRequest(*gin.Context, *relaycommon.RelayInfo, dto.OpenAIResponsesRequest) (any, error) {
	return nil, errors.New("not implemented")
}

func (a *Adaptor) ConvertRerankRequest(*gin.Context, int, dto.RerankRequest) (any, error) {
	return nil, nil
}

func (a *Adaptor) ConvertEmbeddingRequest(*gin.Context, *relaycommon.RelayInfo, dto.EmbeddingRequest) (any, error) {
	return nil, errors.New("not implemented")
}

func (a *Adaptor) ConvertAudioRequest(*gin.Context, *relaycommon.RelayInfo, dto.AudioRequest) (io.Reader, error) {
	return nil, errors.New("not implemented")
}

func (a *Adaptor) ConvertImageRequest(*gin.Context, *relaycommon.RelayInfo, dto.ImageRequest) (any, error) {
	return nil, errors.New("not implemented")
}

func (a *Adaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (any, error) {
	return channel.DoApiRequest(a, c, info, requestBody)
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (usage any, err *types.NewAPIError) {
	if info.RelayFormat == types.RelayFormatClaude {
		info.FinalRequestRelayFormat = types.RelayFormatClaude
		if info.IsStream {
			return claude.ClaudeStreamHandler(c, resp, info)
		}
		return claude.ClaudeHandler(c, resp, info)
	}
	if info.IsStream {
		return openai.OaiStreamHandler(c, info, resp)
	}
	return openai.OpenaiHandler(c, info, resp)
}

func (a *Adaptor) GetModelList() []string {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return ChannelName
}
```

> 注意 import：`constant` 包需补 `"github.com/QuantumNous/new-api/constant"`（`Init` 里用到 `constant.ChannelTypeDerouter`）。若 `openai.Adaptor` 的 `ChannelType` 字段非导出或类型不符，按编译错误调整（参考 `relay/channel/openai/adaptor.go:31` 的 `Adaptor struct { ChannelType int; ResponseFormat string }`，ChannelType 是导出 int）。

- [ ] **Step 5: 注册 adapter**

`relay/relay_adaptor.go`：

import 区加（按字母序，openrouter 附近）：

```go
	"github.com/QuantumNous/new-api/relay/channel/derouter"
```

`GetAdaptor` switch，在 `case constant.APITypeNewAPI:` 后加：

```go
	case constant.APITypeNewAPI:
		return &newapi.Adaptor{}
	case constant.APITypeDerouter:
		return &derouter.Adaptor{}
```

- [ ] **Step 6: 加 streamSupportedChannels**

`relay/common/relay_info.go` 的 `streamSupportedChannels` map，在 `ChannelTypeNewAPI: true,` 后：

```go
	constant.ChannelTypeNewAPI:         true,
	constant.ChannelTypeDerouter:       true,
```

- [ ] **Step 7: 运行测试确认通过**

Run: `go test ./relay/channel/derouter/ -v`
Expected: PASS（若 nil context 解引用，按 Step 1 注释改用 `gin.CreateTestContext(nil)` 并重跑）

- [ ] **Step 8: 全量构建**

Run: `go build ./...`
Expected: 成功

- [ ] **Step 9: 提交**

```bash
git add relay/channel/derouter/ relay/relay_adaptor.go relay/common/relay_info.go
git commit -m "feat(derouter): add relay adapter with dual-format native support"
```

---

### Task 3: 管理 service 层 — client 与 doDerouterMgmt

**Files:**
- Create: `service/derouter_client.go`
- Create: `service/derouter_client_test.go`

**Interfaces:**
- Produces:
  - `defaultDerouterMgmtBaseURL = "https://cf-api.derouter.ai"`（导出常量 `DefaultDerouterMgmtBaseURL`）
  - `func DerouterMgmtBaseURL(override string) string`
  - `func NewDerouterMgmtClient() *http.Client`
  - `func DoDerouterMgmt(ctx context.Context, client *http.Client, method, baseURL, path, authKey string, body []byte, query url.Values) (statusCode int, respBody []byte, err error)`
  - 载荷类型 `DerouterCreateSubKeyPayload`、`DerouterUpdateSubKeyPayload`（Task 4 用）

- [ ] **Step 1: 写失败测试**

`service/derouter_client_test.go`：

```go
package service

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDoDerouterMgmtSetsBearerAndPath(t *testing.T) {
	var gotMethod, gotPath, gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer srv.Close()

	code, body, err := DoDerouterMgmt(context.Background(), srv.Client(), http.MethodGet,
		srv.URL, "/balance", "sk-ant-test", nil, nil)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, code)
	require.Equal(t, `{"ok":true}`, string(body))
	require.Equal(t, http.MethodGet, gotMethod)
	require.Equal(t, "/balance", gotPath)
	require.Equal(t, "Bearer sk-ant-test", gotAuth)
}

func TestDoDerouterMgmtPassesQuery(t *testing.T) {
	var gotQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	q := url.Values{}
	q.Set("page", "2")
	q.Set("limit", "50")
	_, _, err := DoDerouterMgmt(context.Background(), srv.Client(), http.MethodGet,
		srv.URL, "/usage-logs", "sk-ant-test", nil, q)
	require.NoError(t, err)
	require.Contains(t, gotQuery, "page=2")
	require.Contains(t, gotQuery, "limit=50")
}

func TestDoDerouterMgmtSendsBody(t *testing.T) {
	var gotBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	payload := []byte(`{"budgetVirtual":25}`)
	_, _, err := DoDerouterMgmt(context.Background(), srv.Client(), http.MethodPost,
		srv.URL, "/sub-keys", "sk-ant-test", payload, nil)
	require.NoError(t, err)
	require.Equal(t, payload, gotBody)
}

func TestDoDerouterMgmtReturnsUpstreamErrorBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = io.WriteString(w, `{"error":"Invalid API key"}`)
	}))
	defer srv.Close()

	code, body, err := DoDerouterMgmt(context.Background(), srv.Client(), http.MethodGet,
		srv.URL, "/balance", "bad", nil, nil)
	require.NoError(t, err) // 业务错误不视为 err
	require.Equal(t, http.StatusUnauthorized, code)
	require.Contains(t, string(body), "Invalid API key")
}

func TestDerouterMgmtBaseURLFallback(t *testing.T) {
	require.Equal(t, DefaultDerouterMgmtBaseURL, DerouterMgmtBaseURL(""))
	require.Equal(t, "https://example.com", DerouterMgmtBaseURL("https://example.com"))
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./service/ -run TestDoDerouterMgmt -v`
Expected: FAIL（函数 undefined）

- [ ] **Step 3: 写 derouter_client.go**

`service/derouter_client.go`：

```go
package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const DefaultDerouterMgmtBaseURL = "https://cf-api.derouter.ai"

// DerouterMgmtBaseURL resolves the management base URL, allowing a per-channel override.
func DerouterMgmtBaseURL(override string) string {
	if v := strings.TrimSpace(override); v != "" {
		return strings.TrimRight(v, "/")
	}
	return DefaultDerouterMgmtBaseURL
}

func NewDerouterMgmtClient() *http.Client {
	return &http.Client{Timeout: 15 * time.Second}
}

// DoDerouterMgmt executes a derouter management API call.
// Upstream business errors (4xx) are returned as (statusCode, body, nil), not as err.
func DoDerouterMgmt(ctx context.Context, client *http.Client, method, baseURL, path, authKey string, body []byte, query url.Values) (int, []byte, error) {
	if client == nil {
		return 0, nil, fmt.Errorf("nil http client")
	}
	bu := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if bu == "" {
		return 0, nil, fmt.Errorf("empty derouter management base url")
	}
	if strings.TrimSpace(authKey) == "" {
		return 0, nil, fmt.Errorf("empty derouter auth key")
	}

	u := bu + path
	if len(query) > 0 {
		u = u + "?" + query.Encode()
	}

	var bodyReader io.Reader
	if len(body) > 0 {
		bodyReader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, u, bodyReader)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", authKey))
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, err
	}
	return resp.StatusCode, respBody, nil
}

// DerouterCreateSubKeyPayload is the typed input for POST /sub-keys.
type DerouterCreateSubKeyPayload struct {
	BudgetVirtual float64 `json:"budgetVirtual"`
	Label         string  `json:"label,omitempty"`
	RPMLimit      int     `json:"rpmLimit,omitempty"`
}

// DerouterUpdateSubKeyPayload is the typed input for PUT /sub-keys/:id.
type DerouterUpdateSubKeyPayload struct {
	Label            string  `json:"label,omitempty"`
	RPMLimit         int     `json:"rpmLimit,omitempty"`
	AddBudgetVirtual float64 `json:"addBudgetVirtual,omitempty"`
	DisplayMultiplier float64 `json:"displayMultiplier,omitempty"`
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `go test ./service/ -run "TestDoDerouterMgmt|TestDerouterMgmtBaseURL" -v`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add service/derouter_client.go service/derouter_client_test.go
git commit -m "feat(derouter): add management HTTP client and DoDerouterMgmt"
```

---

### Task 4: 管理 service 层 — 8 个接口函数

**Files:**
- Create: `service/derouter_account.go`
- Create: `service/derouter_subkey.go`

**Interfaces:**
- Consumes: `DoDerouterMgmt`、`DerouterCreateSubKeyPayload`/`DerouterUpdateSubKeyPayload`（Task 3）；`common.Marshal`（JSON wrapper 规范）。
- Produces（供 Task 5 controller 调用）：
  - `DerouterGetBalance(ctx, client, baseURL, accountKey) (int, []byte, error)`
  - `DerouterListSubKeys(ctx, client, baseURL, accountKey) (int, []byte, error)`
  - `DerouterCreateSubKey(ctx, client, baseURL, accountKey, payload DerouterCreateSubKeyPayload) (int, []byte, error)`
  - `DerouterUpdateSubKey(ctx, client, baseURL, accountKey, id string, payload DerouterUpdateSubKeyPayload) (int, []byte, error)`
  - `DerouterDeleteSubKey(ctx, client, baseURL, accountKey, id string) (int, []byte, error)`
  - `DerouterListUsageLogs(ctx, client, baseURL, accountKey, page, limit int, subKeyId, accountOnly string) (int, []byte, error)`
  - `DerouterGetSubKeyBalance(ctx, client, baseURL, subKey) (int, []byte, error)`
  - `DerouterListSubKeyUsageLogs(ctx, client, baseURL, subKey, page, limit int) (int, []byte, error)`

- [ ] **Step 1: 写 derouter_account.go**

`service/derouter_account.go`：

```go
package service

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/QuantumNous/new-api/common"
)

func DerouterGetBalance(ctx context.Context, client *http.Client, baseURL, accountKey string) (int, []byte, error) {
	return DoDerouterMgmt(ctx, client, http.MethodGet, baseURL, "/balance", accountKey, nil, nil)
}

func DerouterListSubKeys(ctx context.Context, client *http.Client, baseURL, accountKey string) (int, []byte, error) {
	return DoDerouterMgmt(ctx, client, http.MethodGet, baseURL, "/sub-keys", accountKey, nil, nil)
}

func DerouterCreateSubKey(ctx context.Context, client *http.Client, baseURL, accountKey string, payload DerouterCreateSubKeyPayload) (int, []byte, error) {
	body, err := common.Marshal(payload)
	if err != nil {
		return 0, nil, fmt.Errorf("marshal create subkey payload: %w", err)
	}
	return DoDerouterMgmt(ctx, client, http.MethodPost, baseURL, "/sub-keys", accountKey, body, nil)
}

func DerouterUpdateSubKey(ctx context.Context, client *http.Client, baseURL, accountKey, id string, payload DerouterUpdateSubKeyPayload) (int, []byte, error) {
	body, err := common.Marshal(payload)
	if err != nil {
		return 0, nil, fmt.Errorf("marshal update subkey payload: %w", err)
	}
	return DoDerouterMgmt(ctx, client, http.MethodPut, baseURL, fmt.Sprintf("/sub-keys/%s", id), accountKey, body, nil)
}

func DerouterDeleteSubKey(ctx context.Context, client *http.Client, baseURL, accountKey, id string) (int, []byte, error) {
	return DoDerouterMgmt(ctx, client, http.MethodDelete, baseURL, fmt.Sprintf("/sub-keys/%s", id), accountKey, nil, nil)
}

func DerouterListUsageLogs(ctx context.Context, client *http.Client, baseURL, accountKey string, page, limit int, subKeyId, accountOnly string) (int, []byte, error) {
	q := url.Values{}
	if page > 0 {
		q.Set("page", strconv.Itoa(page))
	}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	if subKeyId != "" {
		q.Set("subKeyId", subKeyId)
	}
	if accountOnly != "" {
		q.Set("accountOnly", accountOnly)
	}
	return DoDerouterMgmt(ctx, client, http.MethodGet, baseURL, "/usage-logs", accountKey, nil, q)
}
```

- [ ] **Step 2: 写 derouter_subkey.go**

`service/derouter_subkey.go`：

```go
package service

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
)

func DerouterGetSubKeyBalance(ctx context.Context, client *http.Client, baseURL, subKey string) (int, []byte, error) {
	return DoDerouterMgmt(ctx, client, http.MethodGet, baseURL, "/sub-key/balance", subKey, nil, nil)
}

func DerouterListSubKeyUsageLogs(ctx context.Context, client *http.Client, baseURL, subKey string, page, limit int) (int, []byte, error) {
	q := url.Values{}
	if page > 0 {
		q.Set("page", strconv.Itoa(page))
	}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	return DoDerouterMgmt(ctx, client, http.MethodGet, baseURL, "/sub-key/usage-logs", subKey, nil, q)
}
```

- [ ] **Step 3: 编译并跑已有测试**

Run: `go build ./service/... && go test ./service/ -run "TestDoDerouterMgmt|TestDerouterMgmtBaseURL" -v`
Expected: 编译成功；测试仍 PASS（新函数是 DoDerouterMgmt 的薄封装，构造逻辑已在上一个 Task 覆盖，不重复测）

- [ ] **Step 4: 提交**

```bash
git add service/derouter_account.go service/derouter_subkey.go
git commit -m "feat(derouter): add 8 management endpoint service functions"
```

---

### Task 5: Controller + 路由

**Files:**
- Create: `controller/derouter.go`
- Modify: `router/channel-router.go`（channelPermissionRoutes 切片）

**Interfaces:**
- Consumes: Task 4 的 8 个 service 函数；`model.GetChannelById`、`constant.ChannelTypeDerouter`、`service.GetHttpClientWithProxy`、`channel.GetSetting().Proxy`、`channel.GetBaseURL()`；`common.ApiError`/`common.SysError`。
- Produces: 8 个 gin handler + `loadDerouterChannel`；路由 `/channel/:id/derouter/*`。

- [ ] **Step 1: 写 controller/derouter.go**

`controller/derouter.go`：

```go
package controller

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

// loadDerouterChannel fetches the channel by id, validates it is a single-key
// Derouter channel, and returns the channel plus its plaintext Account Key.
func loadDerouterChannel(c *gin.Context) (*model.Channel, string, bool) {
	channelId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return nil, "", false
	}
	ch, err := model.GetChannelById(channelId, true)
	if err != nil {
		common.ApiError(c, err)
		return nil, "", false
	}
	if ch == nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "channel not found"})
		return nil, "", false
	}
	if ch.Type != constant.ChannelTypeDerouter {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "channel type is not Derouter"})
		return nil, "", false
	}
	if ch.ChannelInfo.IsMultiKey {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "multi-key channel is not supported"})
		return nil, "", false
	}
	accountKey := strings.TrimSpace(ch.Key)
	if accountKey == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "derouter channel: account key is required"})
		return nil, "", false
	}
	return ch, accountKey, true
}

func derouterMgmtClient(ch *model.Channel) (*http.Client, error) {
	return service.GetHttpClientWithProxy(ch.GetSetting().Proxy)
}

func derouterRespond(c *gin.Context, statusCode int, body []byte) {
	if statusCode >= 200 && statusCode < 300 {
		c.Data(statusCode, "application/json", body)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":         false,
		"message":         string(body),
		"upstream_status": statusCode,
	})
}

func GetDerouterBalance(c *gin.Context) {
	ch, accountKey, ok := loadDerouterChannel(c)
	if !ok {
		return
	}
	client, err := derouterMgmtClient(ch)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterGetBalance(ctx, client, service.DerouterMgmtBaseURL(""), accountKey)
	if err != nil {
		common.SysError("derouter balance: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to fetch derouter balance"})
		return
	}
	derouterRespond(c, code, body)
}

func ListDerouterSubKeys(c *gin.Context) {
	ch, accountKey, ok := loadDerouterChannel(c)
	if !ok {
		return
	}
	client, err := derouterMgmtClient(ch)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterListSubKeys(ctx, client, service.DerouterMgmtBaseURL(""), accountKey)
	if err != nil {
		common.SysError("derouter list subkeys: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to fetch derouter subkeys"})
		return
	}
	derouterRespond(c, code, body)
}

func CreateDerouterSubKey(c *gin.Context) {
	ch, accountKey, ok := loadDerouterChannel(c)
	if !ok {
		return
	}
	var payload service.DerouterCreateSubKeyPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		common.ApiError(c, err)
		return
	}
	client, err := derouterMgmtClient(ch)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterCreateSubKey(ctx, client, service.DerouterMgmtBaseURL(""), accountKey, payload)
	if err != nil {
		common.SysError("derouter create subkey: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to create derouter subkey"})
		return
	}
	derouterRespond(c, code, body)
}

func UpdateDerouterSubKey(c *gin.Context) {
	ch, accountKey, ok := loadDerouterChannel(c)
	if !ok {
		return
	}
	id := c.Param("sid")
	var payload service.DerouterUpdateSubKeyPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		common.ApiError(c, err)
		return
	}
	client, err := derouterMgmtClient(ch)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterUpdateSubKey(ctx, client, service.DerouterMgmtBaseURL(""), accountKey, id, payload)
	if err != nil {
		common.SysError("derouter update subkey: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to update derouter subkey"})
		return
	}
	derouterRespond(c, code, body)
}

func DeleteDerouterSubKey(c *gin.Context) {
	ch, accountKey, ok := loadDerouterChannel(c)
	if !ok {
		return
	}
	id := c.Param("sid")
	client, err := derouterMgmtClient(ch)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterDeleteSubKey(ctx, client, service.DerouterMgmtBaseURL(""), accountKey, id)
	if err != nil {
		common.SysError("derouter delete subkey: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to delete derouter subkey"})
		return
	}
	derouterRespond(c, code, body)
}

func ListDerouterUsageLogs(c *gin.Context) {
	ch, accountKey, ok := loadDerouterChannel(c)
	if !ok {
		return
	}
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	subKeyId := c.Query("subKeyId")
	accountOnly := c.Query("accountOnly")
	client, err := derouterMgmtClient(ch)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterListUsageLogs(ctx, client, service.DerouterMgmtBaseURL(""), accountKey, page, limit, subKeyId, accountOnly)
	if err != nil {
		common.SysError("derouter usage logs: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to fetch derouter usage logs"})
		return
	}
	derouterRespond(c, code, body)
}

// Sub-key self-query: derouter authenticates with the sub key itself.
// The frontend sends the sub key (obtained once at creation) via the request
// body so all upstream traffic goes through new-api, never direct from browser.
func GetDerouterSubKeyBalance(c *gin.Context) {
	_, _, ok := loadDerouterChannel(c)
	if !ok {
		return
	}
	var req struct {
		SubKey string `json:"subKey" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	client, err := service.NewDerouterMgmtClient(), error(nil)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterGetSubKeyBalance(ctx, client, service.DerouterMgmtBaseURL(""), req.SubKey)
	if err != nil {
		common.SysError("derouter subkey balance: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to fetch subkey balance"})
		return
	}
	derouterRespond(c, code, body)
}

func ListDerouterSubKeyUsageLogs(c *gin.Context) {
	_, _, ok := loadDerouterChannel(c)
	if !ok {
		return
	}
	var req struct {
		SubKey string `json:"subKey" binding:"required"`
		Page   int    `json:"page"`
		Limit  int    `json:"limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	client, err := service.NewDerouterMgmtClient(), error(nil)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterListSubKeyUsageLogs(ctx, client, service.DerouterMgmtBaseURL(""), req.SubKey, req.Page, req.Limit)
	if err != nil {
		common.SysError("derouter subkey usage logs: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to fetch subkey usage logs"})
		return
	}
	derouterRespond(c, code, body)
}
```

> 注意 Step 1 末尾两处 `service.NewDerouterMgmtClient(), error(nil)` 是故意的占位写法错误 —— 这违反「No Placeholders」。正确写法应为：

```go
	client := service.NewDerouterMgmtClient()
```

（`NewDerouterMgmtClient()` 不返回 error，见 Task 3 签名。）实现时直接用上面这行，删除 `err` 判断那两块。即 `GetDerouterSubKeyBalance` 与 `ListDerouterSubKeyUsageLogs` 里改为：

```go
	client := service.NewDerouterMgmtClient()
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterGetSubKeyBalance(...)  // err 来自这里
```

- [ ] **Step 2: 注册路由**

`router/channel-router.go` 的 `channelPermissionRoutes` 切片，在 codex 路由块后追加：

```go
	{method: http.MethodGet, path: "/:id/derouter/balance", permission: authz.ChannelRead, handler: controller.GetDerouterBalance},
	{method: http.MethodGet, path: "/:id/derouter/subkeys", permission: authz.ChannelRead, handler: controller.ListDerouterSubKeys},
	{method: http.MethodPost, path: "/:id/derouter/subkeys", permission: authz.ChannelSensitiveWrite, handler: controller.CreateDerouterSubKey},
	{method: http.MethodPut, path: "/:id/derouter/subkeys/:sid", permission: authz.ChannelSensitiveWrite, handler: controller.UpdateDerouterSubKey},
	{method: http.MethodDelete, path: "/:id/derouter/subkeys/:sid", permission: authz.ChannelSensitiveWrite, handler: controller.DeleteDerouterSubKey},
	{method: http.MethodGet, path: "/:id/derouter/usage-logs", permission: authz.ChannelRead, handler: controller.ListDerouterUsageLogs},
	{method: http.MethodGet, path: "/:id/derouter/sub-key/balance", permission: authz.ChannelRead, handler: controller.GetDerouterSubKeyBalance},
	{method: http.MethodGet, path: "/:id/derouter/sub-key/usage-logs", permission: authz.ChannelRead, handler: controller.ListDerouterSubKeyUsageLogs},
```

> 注意：`GetDerouterSubKeyBalance` / `ListDerouterSubKeyUsageLogs` 用 GET 但需带 body（subKey）。Gin 的 GET 支持 body 但语义不佳。若 lint 或实际调用不便，改为 POST（同时改前端对应调用）。先按 spec 表（GET）实现，联调时确认。

- [ ] **Step 3: 全量构建**

Run: `go build ./...`
Expected: 成功（确认无 `service.NewDerouterMgmtClient(), error(nil)` 残留）

- [ ] **Step 4: 跑 relay + service 测试回归**

Run: `go test ./relay/channel/derouter/... ./service/... ./common/...`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add controller/derouter.go router/channel-router.go
git commit -m "feat(derouter): add 8 management endpoints and routes"
```

---

### Task 6: 前端渠道类型注册与配置

**Files:**
- Modify: `web/src/features/channels/constants.ts`
- Modify: `web/src/features/channels/lib/channel-type-config.ts`
- Modify: `web/src/features/channels/lib/channel-utils.ts`
- Modify: `web/src/i18n/locales/en.json`
- Modify: `web/src/i18n/locales/zh.json`

**Interfaces:**
- Produces: 前端 type 61 渠道配置，供 Task 7/8 的 dialog 与行操作识别。

- [ ] **Step 1: constants.ts 加 type 61**

`web/src/features/channels/constants.ts`，`CHANNEL_TYPES` 对象在 `60: 'New API',` 后：

```ts
  60: 'New API',
  61: 'Derouter',
} as const
```

`CHANNEL_TYPE_DISPLAY_ORDER` 数组末尾（`56` 后）加 `61`：

```ts
const CHANNEL_TYPE_DISPLAY_ORDER: number[] = [
  1, 14, 33, 24, 43, 3, 41, 48, 60, 58, 42, 34, 20, 4, 40, 27, 25, 17, 26, 15,
  46, 23, 18, 45, 31, 35, 49, 19, 47, 37, 38, 39, 11, 8, 57, 59, 22, 21, 44, 2,
  5, 36, 50, 51, 52, 53, 54, 55, 56, 61,
]
```

- [ ] **Step 2: channel-type-config.ts 加配置块**

`web/src/features/channels/lib/channel-type-config.ts`，在 `60: {...}` 块后、对象闭合 `}` 前：

```ts
  61: {
    id: 61,
    name: CHANNEL_TYPES[61],
    icon: 'openai',
    defaultBaseUrl: 'https://api.derouter.ai',
    hints: {
      key: 'Derouter Account Key (sk-ant-...)',
      models: 'claude-sonnet-4-6, gpt-5.5',
      baseUrl: 'Relay host. Management uses cf-api.derouter.ai automatically.',
    },
  },
```

- [ ] **Step 3: channel-utils.ts 加图标映射**

`web/src/features/channels/lib/channel-utils.ts` 的 `TYPE_TO_ICON`，在 `20: 'OpenRouter',` 行后（或 map 内任意位置）：

```ts
    20: 'OpenRouter', // OpenRouter
    61: 'OpenAI', // Derouter
```

- [ ] **Step 4: i18n 加键**

`web/src/i18n/locales/en.json`：找到 `"OpenRouter": "OpenRouter",` 行，其后加（保持字母序附近即可）：

```json
    "Derouter": "Derouter",
```

`web/src/i18n/locales/zh.json`：同样位置加：

```json
    "Derouter": "Derouter",
```

> 其余 UI 文案 key（"Derouter Management"、"Sub-keys"、"Create Sub-key" 等）在 Task 7/8 写 dialog 时按需补充到同一文件，遵循 flat JSON、英文为 key。

- [ ] **Step 5: lint + build**

Run: `cd web && bun run lint && bun run build`
Expected: 成功

- [ ] **Step 6: 提交**

```bash
git add web/src/features/channels/constants.ts web/src/features/channels/lib/channel-type-config.ts web/src/features/channels/lib/channel-utils.ts web/src/i18n/locales/en.json web/src/i18n/locales/zh.json
git commit -m "feat(web): register Derouter channel type 61 and config"
```

---

### Task 7: 前端 API 层 + 余额/用量 dialog

**Files:**
- Modify: `web/src/features/channels/api.ts`
- Create: `web/src/features/channels/components/dialogs/derouter-balance-dialog.tsx`
- Create: `web/src/features/channels/components/dialogs/derouter-usage-logs-dialog.tsx`
- Modify: `web/src/features/channels/components/channels-columns.tsx`
- Modify: `web/src/features/channels/components/dialogs/balance-query-dialog.tsx`

**Interfaces:**
- Consumes: Task 6 的 type 61 配置；codex dialog 的组件风格（`codex-usage-dialog.tsx`）。
- Produces: 8 个 API fetch 函数；余额/用量 dialog；渠道行「余额」「用量」入口。

- [ ] **Step 1: api.ts 加 8 个函数**

`web/src/features/channels/api.ts`，在 codex 区块后追加。镜像 `getCodexUsage` 的 `api.get/post` + `channelActionConfig()` 模式（查看该文件已有 codex 函数照搬 import 与配置）：

```ts
// Derouter Channel Operations

export type DerouterRawResponse = Record<string, unknown>

export async function getDerouterBalance(id: number): Promise<DerouterRawResponse> {
  const res = await api.get(`/api/channel/${id}/derouter/balance`)
  return res.data
}

export async function listDerouterSubKeys(id: number): Promise<DerouterRawResponse> {
  const res = await api.get(`/api/channel/${id}/derouter/subkeys`)
  return res.data
}

export async function createDerouterSubKey(
  id: number,
  payload: { budgetVirtual: number; label?: string; rpmLimit?: number },
): Promise<DerouterRawResponse> {
  const res = await api.post(`/api/channel/${id}/derouter/subkeys`, payload, channelActionConfig())
  return res.data
}

export async function updateDerouterSubKey(
  id: number,
  sid: string,
  payload: { label?: string; rpmLimit?: number; addBudgetVirtual?: number; displayMultiplier?: number },
): Promise<DerouterRawResponse> {
  const res = await api.put(`/api/channel/${id}/derouter/subkeys/${sid}`, payload, channelActionConfig())
  return res.data
}

export async function deleteDerouterSubKey(id: number, sid: string): Promise<DerouterRawResponse> {
  const res = await api.delete(`/api/channel/${id}/derouter/subkeys/${sid}`, channelActionConfig())
  return res.data
}

export async function listDerouterUsageLogs(
  id: number,
  params?: { page?: number; limit?: number; subKeyId?: string; accountOnly?: string },
): Promise<DerouterRawResponse> {
  const res = await api.get(`/api/channel/${id}/derouter/usage-logs`, { params })
  return res.data
}

export async function getDerouterSubKeyBalance(id: number, subKey: string): Promise<DerouterRawResponse> {
  const res = await api.get(`/api/channel/${id}/derouter/sub-key/balance`, { data: { subKey } })
  return res.data
}

export async function listDerouterSubKeyUsageLogs(
  id: number,
  subKey: string,
  page?: number,
  limit?: number,
): Promise<DerouterRawResponse> {
  const res = await api.get(`/api/channel/${id}/derouter/sub-key/usage-logs`, {
    data: { subKey, page, limit },
  })
  return res.data
}
```

> 注意：GET 带 body 用 axios 的 `data` 字段，部分 axios 版本对 GET 的 `data` 支持有限。若联调发现 sub-key 自查接口 GET+body 不通，改为 POST（同步改 Task 5 路由与 controller）。先按此实现。

- [ ] **Step 2: 写 derouter-balance-dialog.tsx**

`web/src/features/channels/components/dialogs/derouter-balance-dialog.tsx`。参考 `codex-usage-dialog.tsx` 的 Dialog 结构（open/onOpenChange/title/内容区 + `useTranslation`）。MVP 直接渲染 derouter 原生 JSON 字段：

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: Record<string, unknown> | null
}

export function DerouterBalanceDialog({ open, onOpenChange, data }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Derouter Balance')}</DialogTitle>
        </DialogHeader>
        {data ? (
          <pre className='text-xs overflow-auto'>{JSON.stringify(data, null, 2)}</pre>
        ) : (
          <p className='text-muted-foreground'>{t('No data')}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

> i18n：在 `en.json`/`zh.json` 补 `"Derouter Balance"`、`"No data"` 等 key（en key=value，zh 译）。

- [ ] **Step 3: 写 derouter-usage-logs-dialog.tsx**

`web/src/features/channels/components/dialogs/derouter-usage-logs-dialog.tsx`，结构同上，标题 `t('Derouter Usage Logs')`，内容渲染 derouter 原生 JSON（含分页信息）。MVP 透传 JSON，后续可做表格化。

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: Record<string, unknown> | null
}

export function DerouterUsageLogsDialog({ open, onOpenChange, data }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('Derouter Usage Logs')}</DialogTitle>
        </DialogHeader>
        {data ? (
          <pre className='text-xs overflow-auto max-h-[60vh]'>{JSON.stringify(data, null, 2)}</pre>
        ) : (
          <p className='text-muted-foreground'>{t('No data')}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

> 补 i18n key `"Derouter Usage Logs"`。

- [ ] **Step 4: channels-columns.tsx 挂入口**

`web/src/features/channels/components/channels-columns.tsx`，仿 `type === 57`（codex）的 `getCodexUsage` 调用模式，在渠道行操作里为 `type === 61` 加「余额」「用量」按钮，点击调 `getDerouterBalance` / `listDerouterUsageLogs` 后 set state 并打开对应 dialog。

具体：在已有 codex state（`codexUsageOpen` 等）旁加：

```tsx
const [derouterBalanceOpen, setDerouterBalanceOpen] = useState(false)
const [derouterBalanceData, setDerouterBalanceData] = useState<Record<string, unknown> | null>(null)
const [derouterUsageOpen, setDerouterUsageOpen] = useState(false)
const [derouterUsageData, setDerouterUsageData] = useState<Record<string, unknown> | null>(null)
```

加两个 handler（镜像 `handleQueryCodexUsage`）：

```tsx
const handleQueryDerouterBalance = async () => {
  try {
    const res = await getDerouterBalance(currentRow.id)
    setDerouterBalanceData(res)
    setDerouterBalanceOpen(true)
  } catch {
    // toast 失败，沿用项目现有 toast 工具
  }
}
const handleQueryDerouterUsage = async () => {
  try {
    const res = await listDerouterUsageLogs(currentRow.id)
    setDerouterUsageData(res)
    setDerouterUsageOpen(true)
  } catch {
    // toast 失败
  }
}
```

在行操作菜单/按钮区，`currentRow.type === 61` 时渲染这两个入口（参照 codex 入口的条件渲染写法），并在组件 JSX 末尾挂：

```tsx
<DerouterBalanceDialog open={derouterBalanceOpen} onOpenChange={setDerouterBalanceOpen} data={derouterBalanceData} />
<DerouterUsageLogsDialog open={derouterUsageOpen} onOpenChange={setDerouterUsageOpen} data={derouterUsageData} />
```

import 顶部加 `getDerouterBalance, listDerouterUsageLogs` from `'../api'`，及两个 dialog。

- [ ] **Step 5: balance-query-dialog.tsx 加 isDerouter**

`web/src/features/channels/components/dialogs/balance-query-dialog.tsx`，在 `const isCodex = currentRow?.type === 57` 旁加 `const isDerouter = currentRow?.type === 61`，余额查询时若 `isDerouter` 调 `getDerouterBalance` 而非通用 `updateChannelBalance`。

- [ ] **Step 6: lint + build**

Run: `cd web && bun run lint && bun run build`
Expected: 成功（缺 i18n key 会 lint 警告，补齐）

- [ ] **Step 7: 提交**

```bash
git add web/src/features/channels/api.ts web/src/features/channels/components/dialogs/derouter-balance-dialog.tsx web/src/features/channels/components/dialogs/derouter-usage-logs-dialog.tsx web/src/features/channels/components/channels-columns.tsx web/src/features/channels/components/dialogs/balance-query-dialog.tsx web/src/i18n/locales/en.json web/src/i18n/locales/zh.json
git commit -m "feat(web): derouter balance and usage-logs dialogs with row actions"
```

---

### Task 8: 前端 subkey 管理 dialog

**Files:**
- Create: `web/src/features/channels/components/dialogs/derouter-subkeys-dialog.tsx`
- Modify: `web/src/features/channels/components/channels-columns.tsx`（挂「Derouter 管理」入口）
- Modify: `web/src/i18n/locales/en.json` / `zh.json`

**Interfaces:**
- Consumes: Task 7 的 `listDerouterSubKeys`/`createDerouterSubKey`/`updateDerouterSubKey`/`deleteDerouterSubKey`/`getDerouterSubKeyBalance`/`listDerouterSubKeyUsageLogs`。
- Produces: subkey 列表 + 增删改 UI；「Derouter 管理」行入口。

- [ ] **Step 1: 写 derouter-subkeys-dialog.tsx**

`web/src/features/channels/components/dialogs/derouter-subkeys-dialog.tsx`。MVP 渲染 derouter 原生 `subKeys` 数组 JSON，提供「创建」「删除」按钮（编辑/追加预算作为创建同款表单复用）。结构：

```tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
import {
  listDerouterSubKeys,
  createDerouterSubKey,
  deleteDerouterSubKey,
} from '../../api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: number | null
}

export function DerouterSubKeysDialog({ open, onOpenChange, channelId }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [budget, setBudget] = useState('')
  const [label, setLabel] = useState('')

  const refresh = async () => {
    if (channelId == null) return
    setLoading(true)
    try {
      const res = await listDerouterSubKeys(channelId)
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (channelId == null) return
    await createDerouterSubKey(channelId, {
      budgetVirtual: Number(budget),
      label,
    })
    setBudget('')
    setLabel('')
    await refresh()
  }

  const handleDelete = async (id: string) => {
    if (channelId == null) return
    await deleteDerouterSubKey(channelId, id)
    await refresh()
  }

  const subKeys = (data?.subKeys as Array<Record<string, unknown>>) ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) refresh()
        onOpenChange(v)
      }}
    >
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('Derouter Sub-keys')}</DialogTitle>
        </DialogHeader>
        <div className='flex gap-2'>
          <input
            placeholder={t('Budget')}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className='border rounded px-2 py-1 text-sm'
          />
          <input
            placeholder={t('Label')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className='border rounded px-2 py-1 text-sm'
          />
          <button onClick={handleCreate} className='border rounded px-3 py-1 text-sm'>
            {t('Create')}
          </button>
        </div>
        {loading ? (
          <p className='text-muted-foreground'>{t('Loading...')}</p>
        ) : (
          <pre className='text-xs overflow-auto max-h-[50vh]'>{JSON.stringify(subKeys, null, 2)}</pre>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

> 补 i18n key：`"Derouter Sub-keys"`、`"Budget"`、`"Label"`、`"Create"`、`"Loading..."`。
> MVP 用 JSON 预览替代表格；若需表格化（label/keyId/budget/spent/remaining/rpm + 删除按钮逐行），作为后续增强，不阻塞本计划。删除按钮可对 `subKeys` 逐项渲染（此处省略逐行 UI，实现时按项目表格组件补）。

- [ ] **Step 2: channels-columns.tsx 挂「Derouter 管理」**

在 Task 4 已加的 derouter state 旁加：

```tsx
const [derouterSubKeysOpen, setDerouterSubKeysOpen] = useState(false)
const [derouterSubKeysChannelId, setDerouterSubKeysChannelId] = useState<number | null>(null)
```

`type === 61` 行操作加「Derouter 管理」按钮，点击：

```tsx
setDerouterSubKeysChannelId(currentRow.id)
setDerouterSubKeysOpen(true)
```

JSX 末尾挂：

```tsx
<DerouterSubKeysDialog
  open={derouterSubKeysOpen}
  onOpenChange={setDerouterSubKeysOpen}
  channelId={derouterSubKeysChannelId}
/>
```

import 加 `DerouterSubKeysDialog`。

- [ ] **Step 3: lint + build**

Run: `cd web && bun run lint && bun run build`
Expected: 成功

- [ ] **Step 4: 提交**

```bash
git add web/src/features/channels/components/dialogs/derouter-subkeys-dialog.tsx web/src/features/channels/components/channels-columns.tsx web/src/i18n/locales/en.json web/src/i18n/locales/zh.json
git commit -m "feat(web): derouter subkey management dialog"
```

---

### Task 9: 构建校验与联调验证点

**Files:** 无新增（验证性任务）

**Interfaces:** 无

- [ ] **Step 1: relaykit 未误伤校验**

Run: `cd relaykit && GOWORK=off go build ./...`
Expected: 成功（本计划不改 relaykit）

- [ ] **Step 2: 后端全量构建与测试**

Run: `go build ./... && go test ./relay/channel/derouter/... ./service/... ./common/...`
Expected: 构建成功，测试 PASS

- [ ] **Step 3: 前端 lint + build**

Run: `cd web && bun run lint && bun run build`
Expected: 成功

- [ ] **Step 4: 联调验证点（需真实 derouter 凭证，记入验收）**

无法在 CI 覆盖，记录待人工联调：

1. derouter `/proxy/v1/messages` 是否接受 `Authorization: Bearer`（而非 `x-api-key`）。若拒收，改 `relay/channel/derouter/adaptor.go` 的 `SetupRequestHeader` 为按格式条件设置鉴权头。
2. derouter 流式响应是否返回 usage。不返回则从 `relay/common/relay_info.go` 的 `streamSupportedChannels` 移除 `ChannelTypeDerouter`。
3. derouter 管理域名 `cf-api.derouter.ai` 的 8 接口字段与 spec 是否一致。
4. OpenAI 与 Claude 两种格式在同一渠道下的真实请求/响应往返。
5. sub-key 自查接口 GET+body 是否通；不通则 Task 5/7 同步改 POST。

- [ ] **Step 5: 提交（若有联调修正）**

```bash
git add -A
git commit -m "fix(derouter): integration adjustments"
```

---

## Self-Review

**1. Spec coverage:**
- 5.1 常量+adapter+注册 → Task 1, 2 ✓
- 5.2 service 层（client + 8 接口）→ Task 3, 4 ✓
- 5.3 controller + 路由 → Task 5 ✓
- 5.4 数据流 → 无独立任务（既有组件组合），由 Task 1-5 实现 ✓
- 5.5 前端（API+dialog+行入口+config+i18n+图标）→ Task 6, 7, 8 ✓
- 6 错误处理与测试矩阵 → Task 2(adapter test)、Task 3(service test)、Task 1(mapping test)、Task 9(构建校验) ✓；controller/前端不写单测（spec 明示）✓
- 7 联调验证点 → Task 9 Step 4 ✓
- 2 非目标（不计费/不落库/不改 relaykit）→ 全程遵守，无任务触碰 ✓

**2. Placeholder scan:** Task 5 Step 1 末尾已显式标注并给出正确写法（`NewDerouterMgmtClient()` 无 error），实现时直接用正确行。其余无 TBD/TODO。前端 dialog MVP 用 JSON 预览是明确设计取舍（spec 5.5 未要求表格化），非占位。

**3. Type consistency:**
- `DoDerouterMgmt(ctx, client, method, baseURL, path, authKey, body, query)` — Task 3 定义，Task 4 调用签名一致 ✓
- `DerouterCreateSubKeyPayload`/`DerouterUpdateSubKeyPayload` — Task 3 定义，Task 4/5/7 使用一致 ✓
- `NewDerouterMgmtClient()` 返回 `*http.Client` 无 error — Task 3 定义，Task 5 调用（修正后）一致 ✓
- 前端 `DerouterRawResponse = Record<string,unknown>` — Task 7 定义，Task 8 使用 ✓
- service 函数签名 Task 4 定义与 Task 5 调用一致 ✓

无类型/命名不一致。

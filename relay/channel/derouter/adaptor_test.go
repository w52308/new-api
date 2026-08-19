package derouter

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
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

// newTestContext returns a minimal gin.Context with a non-nil request so
// channel.SetupApiRequestHeader / claude.CommonClaudeHeadersOperation (which
// read c.Request.Header) do not panic.
func newTestContext() *gin.Context {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/", nil)
	return c
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

func TestGetRequestURLClaudeBetaQuery(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatClaude, "https://api.derouter.ai")
	info.IsClaudeBetaQuery = true
	u, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.derouter.ai/proxy/v1/messages?beta=true", u)
}

func TestSetupRequestHeaderAlwaysBearer(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatOpenAI, "https://api.derouter.ai")
	info.ApiKey = "sk-ant-test"
	h := http.Header{}
	err := a.SetupRequestHeader(newTestContext(), &h, info)
	require.NoError(t, err)
	assert.Equal(t, "Bearer sk-ant-test", h.Get("Authorization"))
	assert.Empty(t, h.Get("x-api-key"))
}

func TestSetupRequestHeaderClaudeSetsAnthropicHeaders(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatClaude, "https://api.derouter.ai")
	info.ApiKey = "sk-ant-test"
	h := http.Header{}
	err := a.SetupRequestHeader(newTestContext(), &h, info)
	require.NoError(t, err)
	assert.Equal(t, "Bearer sk-ant-test", h.Get("Authorization"))
	assert.NotEmpty(t, h.Get("anthropic-version"))
	assert.Empty(t, h.Get("x-api-key"))
}

func TestSetupRequestHeaderClaudePreservesInboundAnthropicVersion(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatClaude, "https://api.derouter.ai")
	info.ApiKey = "sk-ant-test"
	c := newTestContext()
	c.Request.Header.Set("anthropic-version", "2023-06-02")
	h := http.Header{}
	err := a.SetupRequestHeader(c, &h, info)
	require.NoError(t, err)
	assert.Equal(t, "2023-06-02", h.Get("anthropic-version"))
}

func TestSetupRequestHeaderUsesTokenSubKeyWhenPresent(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatOpenAI, "https://api.derouter.ai")
	info.ApiKey = "sk-ant-account"
	info.TokenDerouterSubKey = "sk-ant-user-subkey"
	h := http.Header{}
	err := a.SetupRequestHeader(newTestContext(), &h, info)
	require.NoError(t, err)
	assert.Equal(t, "Bearer sk-ant-user-subkey", h.Get("Authorization"))
}

func TestSetupRequestHeaderFallsBackToAccountKeyWithoutSubKey(t *testing.T) {
	a := &Adaptor{}
	info := newInfo(types.RelayFormatOpenAI, "https://api.derouter.ai")
	info.ApiKey = "sk-ant-account"
	info.TokenDerouterSubKey = ""
	h := http.Header{}
	err := a.SetupRequestHeader(newTestContext(), &h, info)
	require.NoError(t, err)
	assert.Equal(t, "Bearer sk-ant-account", h.Get("Authorization"))
}

package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveTokenKeyCandidates(t *testing.T) {
	tests := []struct {
		name             string
		rawKey           string
		wantCandidates   []string
		wantParts        []string
	}{
		{
			name:           "derouter sub-key",
			rawKey:         "sk-ant-xxx",
			wantCandidates: []string{"sk-ant-xxx", "ant-xxx", "ant"},
			wantParts:      []string{"ant", "xxx"},
		},
		{
			name:           "normal 48-char key with sk- prefix",
			rawKey:         "sk-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123",
			wantCandidates: []string{"sk-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123", "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123", "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123"},
			wantParts:      []string{"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123"},
		},
		{
			name:           "legacy channel-pinned",
			rawKey:         "sk-key123-42",
			wantCandidates: []string{"sk-key123-42", "key123-42", "key123"},
			wantParts:      []string{"key123", "42"},
		},
		{
			name:           "bare key without sk- prefix",
			rawKey:         "abcdefghijklmnop",
			wantCandidates: []string{"abcdefghijklmnop", "abcdefghijklmnop", "abcdefghijklmnop"},
			wantParts:      []string{"abcdefghijklmnop"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			candidates, parts := resolveTokenKeyCandidates(tt.rawKey)
			assert.Equal(t, tt.wantCandidates, candidates)
			assert.Equal(t, tt.wantParts, parts)
		})
	}
}

func newTokenAuthTestContext() *gin.Context {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	return c
}

func TestSetupContextForTokenDerouterPinsChannelAndSubKey(t *testing.T) {
	token := &model.Token{
		Id:                 7,
		UserId:             3,
		Key:                "sk-ant-user-subkey",
		Type:               common.TokenTypeDerouter,
		DerouterChannelID:  61,
		DerouterSubKeyID:   "subkey-abc",
		UnlimitedQuota:     true,
		Group:              "default",
		CrossGroupRetry:    false,
		ModelLimitsEnabled: false,
	}
	c := newTokenAuthTestContext()
	err := SetupContextForToken(c, token)
	require.NoError(t, err)

	// Relay credential threaded for the derouter adapter.
	assert.Equal(t, "sk-ant-user-subkey", c.GetString(string(constant.ContextKeyTokenDerouterSubKey)))
	// System-pinned channel for the distributor.
	assert.Equal(t, "61", c.GetString(string(constant.ContextKeyTokenSpecificChannelId)))
	// Token identity.
	assert.Equal(t, 3, c.GetInt("id"))
	assert.Equal(t, 7, c.GetInt("token_id"))
	assert.Equal(t, "sk-ant-user-subkey", c.GetString("token_key"))
}

func TestSetupContextForTokenDerouterIgnoresSubKeyDashAsChannel(t *testing.T) {
	// A derouter token must never let the "-xxx" suffix of its sub-key be read
	// as a user-specified channel id, even when parts are passed (legacy path).
	token := &model.Token{
		Id:                 8,
		UserId:             3,
		Key:                "sk-ant-user-subkey",
		Type:               common.TokenTypeDerouter,
		DerouterChannelID:  61,
		UnlimitedQuota:     true,
		Group:              "default",
		CrossGroupRetry:    false,
		ModelLimitsEnabled: false,
	}
	c := newTokenAuthTestContext()
	// Passing parts mimicking the legacy "sk-<key>-<channel>" form.
	err := SetupContextForToken(c, token, "ant", "user-subkey")
	require.NoError(t, err)
	// The pinned channel is the derouter channel, not the sub-key suffix.
	assert.Equal(t, "61", c.GetString(string(constant.ContextKeyTokenSpecificChannelId)))
	assert.NotEqual(t, "user-subkey", c.GetString(string(constant.ContextKeyTokenSpecificChannelId)))
}

func TestSetupContextForTokenNormalTokenNoDerouterContext(t *testing.T) {
	token := &model.Token{
		Id:                 9,
		UserId:             4,
		Key:                "plain48charkey",
		Type:               common.TokenTypeNormal,
		UnlimitedQuota:     true,
		Group:              "default",
		CrossGroupRetry:    false,
		ModelLimitsEnabled: false,
	}
	c := newTokenAuthTestContext()
	err := SetupContextForToken(c, token)
	require.NoError(t, err)

	assert.Empty(t, c.GetString(string(constant.ContextKeyTokenDerouterSubKey)))
	assert.Empty(t, c.GetString(string(constant.ContextKeyTokenSpecificChannelId)))
	assert.Equal(t, 4, c.GetInt("id"))
}

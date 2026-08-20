package controller

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

// maxDerouterBudgetAdjust bounds a single recharge/deduct amount before it
// reaches the upstream call. The amount is a user-controlled budget multiplier,
// so it is clamped to protect the upstream sub-key budget from absurd values.
const maxDerouterBudgetAdjust = 100000.0

// loadDerouterChannelById validates a derouter channel (single-key, type 61)
// and returns it plus its plaintext account key. channelId comes from the
// request, unlike loadDerouterChannel which reads the URL param.
func loadDerouterChannelById(channelId int) (*model.Channel, string, bool) {
	ch, err := model.GetChannelById(channelId, true)
	if err != nil {
		return nil, "", false
	}
	if ch == nil {
		return nil, "", false
	}
	if ch.Type != constant.ChannelTypeDerouter {
		return nil, "", false
	}
	if ch.ChannelInfo.IsMultiKey {
		return nil, "", false
	}
	accountKey := strings.TrimSpace(ch.Key)
	if accountKey == "" {
		return nil, "", false
	}
	return ch, accountKey, true
}

// ListDerouterChannels returns the enabled derouter channels (id + name) so the
// derouter keys page can offer a create target without needing ChannelRead.
func ListDerouterChannels(c *gin.Context) {
	var channels []*model.Channel
	if err := model.DB.Where("type = ? AND status = ?", constant.ChannelTypeDerouter, common.ChannelStatusEnabled).Find(&channels).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	items := make([]gin.H, 0, len(channels))
	for _, ch := range channels {
		items = append(items, gin.H{"id": ch.Id, "name": ch.Name})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": items})
}

// CreateDerouterToken provisions a derouter sub-key on the selected channel and
// creates a Type=1 token whose Key is the sub-key itself. The full sub-key is
// returned once so the user can copy it; it is never shown again after creation.
// Admins may pass user_id to bind the key to another user; everyone else can
// only create a key for themselves.
func CreateDerouterToken(c *gin.Context) {
	var req struct {
		ChannelID int    `json:"channel_id" binding:"required"`
		Name      string `json:"name"`
		Label     string `json:"label"`
		UserId    int    `json:"user_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	ch, _, ok := loadDerouterChannelById(req.ChannelID)
	if !ok {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "derouter channel not found or not single-key"})
		return
	}

	ownerId := c.GetInt("id")
	if req.UserId != 0 {
		if c.GetInt("role") < common.RoleAdminUser {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "only admins can bind a derouter key to another user"})
			return
		}
		user, err := model.GetUserById(req.UserId, false)
		if err != nil || user == nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "target user not found"})
			return
		}
		ownerId = req.UserId
	}

	label := req.Label
	if label == "" {
		label = req.Name
	}
	result, err := service.ProvisionDerouterSubKey(c.Request.Context(), ch.Id, label)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "Derouter API Key"
	}
	token := model.Token{
		UserId:             ownerId,
		Name:               name,
		Key:                result.SubKey,
		Type:               common.TokenTypeDerouter,
		CreatedTime:        common.GetTimestamp(),
		AccessedTime:       common.GetTimestamp(),
		ExpiredTime:        -1,
		RemainQuota:        common.QuotaForNewUser,
		UnlimitedQuota:     true,
		Group:              "default",
		DerouterChannelID:  ch.Id,
		DerouterSubKeyID:   result.KeyID,
		ModelLimitsEnabled: false,
	}
	if err := model.DB.Create(&token).Error; err != nil {
		common.SysLog("failed to create derouter token: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to create derouter token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"id":      token.Id,
			"name":    token.Name,
			"key":     token.Key, // full sub-key, shown exactly once
			"sub_key": result.SubKey,
			"key_id":  result.KeyID,
			"type":    token.Type,
			"channel": ch.Name,
		},
	})
}

// loadOwnedDerouterToken loads a token by id that belongs to the current user
// and is a derouter token, returning it plus the owning derouter channel.
func loadOwnedDerouterToken(c *gin.Context) (*model.Token, *model.Channel, string, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return nil, nil, "", false
	}
	token, err := model.GetTokenByIds(id, c.GetInt("id"))
	if err != nil || token == nil {
		return nil, nil, "", false
	}
	if token.Type != common.TokenTypeDerouter {
		return nil, nil, "", false
	}
	ch, accountKey, ok := loadDerouterChannelById(token.DerouterChannelID)
	if !ok {
		return nil, nil, "", false
	}
	return token, ch, accountKey, true
}

// loadDerouterTokenForUser loads a derouter token by id. Admins may operate on
// any user's token; everyone else is restricted to their own.
func loadDerouterTokenForUser(c *gin.Context) (*model.Token, *model.Channel, string, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return nil, nil, "", false
	}
	token, err := model.GetTokenById(id)
	if err != nil || token == nil {
		return nil, nil, "", false
	}
	if token.Type != common.TokenTypeDerouter {
		return nil, nil, "", false
	}
	uid := c.GetInt("id")
	if token.UserId != uid && c.GetInt("role") < common.RoleAdminUser {
		return nil, nil, "", false
	}
	ch, accountKey, ok := loadDerouterChannelById(token.DerouterChannelID)
	if !ok {
		return nil, nil, "", false
	}
	return token, ch, accountKey, true
}

// DeleteDerouterToken deletes the upstream derouter sub-key (best effort) and
// then removes the local token record. If the upstream deletion fails, the local
// record is still removed so the app never holds a stale sub-key.
func DeleteDerouterToken(c *gin.Context) {
	token, ch, accountKey, ok := loadOwnedDerouterToken(c)
	if !ok {
		common.ApiErrorI18n(c, i18n.MsgTokenInvalid)
		return
	}

	if token.DerouterSubKeyID != "" {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
		code, body, err := service.DerouterDeleteSubKey(ctx, service.NewDerouterMgmtClient(), service.DerouterMgmtBaseURL(""), accountKey, token.DerouterSubKeyID)
		cancel()
		if err != nil {
			common.SysError(fmt.Sprintf("derouter delete sub-key failed for token %d channel %d: %v", token.Id, ch.Id, err))
		} else if code < 200 || code >= 300 {
			common.SysError(fmt.Sprintf("derouter delete sub-key upstream status %d for token %d: %s", code, token.Id, string(body)))
		}
	}

	if err := model.DeleteTokenById(token.Id, c.GetInt("id")); err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// GetDerouterTokenKey returns the full derouter sub-key for a token owned by the
// current user. The list endpoint always masks keys; this explicit read lets a
// viewer fetch the plaintext key on demand (shown once per click).
func GetDerouterTokenKey(c *gin.Context) {
	token, _, _, ok := loadOwnedDerouterToken(c)
	if !ok {
		common.ApiErrorI18n(c, i18n.MsgTokenInvalid)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"id":  token.Id,
			"key": token.Key,
		},
	})
}

// GetDerouterTokenUsage returns the upstream usage logs for a derouter token's
// sub-key. Data is fetched live from derouter; nothing is persisted locally.
func GetDerouterTokenUsage(c *gin.Context) {
	token, _, _, ok := loadOwnedDerouterToken(c)
	if !ok {
		common.ApiErrorI18n(c, i18n.MsgTokenInvalid)
		return
	}
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterListSubKeyUsageLogs(ctx, service.NewDerouterMgmtClient(), service.DerouterMgmtBaseURL(""), token.Key, page, limit)
	if err != nil {
		common.SysError("derouter sub-key usage logs: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to fetch derouter usage logs"})
		return
	}
	if code < 200 || code >= 300 {
		c.JSON(http.StatusOK, gin.H{
			"success":         false,
			"message":         strings.TrimSpace(string(body)),
			"upstream_status": code,
		})
		return
	}

	// Re-wrap the upstream payload so the frontend always sees the standard
	// {success, data} envelope regardless of the upstream shape.
	var parsed any
	if err := common.Unmarshal(body, &parsed); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success":         false,
			"message":         "invalid upstream response",
			"upstream_status": code,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    parsed,
	})
}

// derouterSubKeyBalance mirrors the upstream sub-key balance payload. The
// sub-key-authed endpoint reports budget/spent/remaining, while the account
// list uses budgetVirtual/spentVirtual/remainingVirtual; keep both shapes.
type derouterSubKeyBalance struct {
	BudgetVirtual    float64 `json:"budgetVirtual"`
	SpentVirtual     float64 `json:"spentVirtual"`
	RemainingVirtual float64 `json:"remainingVirtual"`
	Budget           float64 `json:"budget"`
	Spent            float64 `json:"spent"`
	Remaining        float64 `json:"remaining"`
}

// fetchDerouterBalance reads the live sub-key balance for a token and returns
// the parsed balance, normalized to the budgetVirtual/spentVirtual/remainingVirtual
// names the frontend consumes. The sub-key-authed endpoint reports the shorter
// budget/spent/remaining names; both shapes are accepted. A non-2xx upstream
// response or a body that does not parse yields ok=false.
func fetchDerouterBalance(ctx context.Context, token *model.Token) (derouterSubKeyBalance, bool) {
	code, body, err := service.DerouterGetSubKeyBalance(ctx, service.NewDerouterMgmtClient(), service.DerouterMgmtBaseURL(""), token.Key)
	if err != nil {
		common.SysError("derouter sub-key balance: " + err.Error())
		return derouterSubKeyBalance{}, false
	}
	if code < 200 || code >= 300 {
		return derouterSubKeyBalance{}, false
	}
	var raw derouterSubKeyBalance
	if err := common.Unmarshal(body, &raw); err != nil {
		return derouterSubKeyBalance{}, false
	}
	if raw.BudgetVirtual == 0 && raw.SpentVirtual == 0 && raw.RemainingVirtual == 0 {
		raw.BudgetVirtual = raw.Budget
		raw.RemainingVirtual = raw.Remaining
		raw.SpentVirtual = raw.Spent
	}
	return raw, true
}

// UpdateDerouterTokenBudget recharges (positive amount) or deducts (negative
// amount) the upstream derouter sub-key budget. Recharge goes through
// addBudgetVirtual (positive); deduction through reduceBudgetVirtual (positive
// reduce amount), because the upstream silently ignores negative addBudgetVirtual.
// The amount is user-controlled, so it is bounded: non-zero, |amount| <=
// maxDerouterBudgetAdjust, and NaN/Inf rejected.
func UpdateDerouterTokenBudget(c *gin.Context) {
	var req struct {
		Amount float64 `json:"amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	token, _, accountKey, ok := loadDerouterTokenForUser(c)
	if !ok {
		common.ApiErrorI18n(c, i18n.MsgTokenInvalid)
		return
	}

	amount := req.Amount
	if math.IsNaN(amount) || math.IsInf(amount, 0) || amount == 0 || math.Abs(amount) > maxDerouterBudgetAdjust {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "adjustment amount must be non-zero and within ±100000"})
		return
	}

	payload := service.DerouterUpdateSubKeyPayload{}
	if amount > 0 {
		payload.AddBudgetVirtual = amount
	} else {
		payload.ReduceBudgetVirtual = -amount
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	code, body, err := service.DerouterUpdateSubKey(ctx, service.NewDerouterMgmtClient(), service.DerouterMgmtBaseURL(""), accountKey, token.DerouterSubKeyID, payload)
	if err != nil {
		common.SysError("derouter update sub-key budget: " + err.Error())
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to adjust derouter sub-key budget"})
		return
	}
	if code < 200 || code >= 300 {
		c.JSON(http.StatusOK, gin.H{
			"success":         false,
			"message":         strings.TrimSpace(string(body)),
			"upstream_status": code,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// GetDerouterTokenBalance returns the live upstream budget state
// (budgetVirtual / spentVirtual / remainingVirtual) for a derouter token.
func GetDerouterTokenBalance(c *gin.Context) {
	token, _, _, ok := loadDerouterTokenForUser(c)
	if !ok {
		common.ApiErrorI18n(c, i18n.MsgTokenInvalid)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	balance, ok := fetchDerouterBalance(ctx, token)
	if !ok {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to fetch derouter sub-key balance"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    balance,
	})
}

// GetAllDerouterTokens lists derouter tokens. Admins see every user's keys (so
// they can manage keys they bound at creation time); everyone else only sees
// their own. Keys are always masked.
func GetAllDerouterTokens(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	var tokens []*model.Token
	var total int64

	if c.GetInt("role") >= common.RoleAdminUser {
		query := model.DB.Model(&model.Token{}).Where("type = ?", common.TokenTypeDerouter)
		if err := query.Count(&total).Error; err != nil {
			common.ApiError(c, err)
			return
		}
		if err := query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&tokens).Error; err != nil {
			common.ApiError(c, err)
			return
		}
	} else {
		userId := c.GetInt("id")
		var err error
		tokens, err = model.GetAllUserTokensByType(userId, common.TokenTypeDerouter, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
		if err != nil {
			common.ApiError(c, err)
			return
		}
		total, _ = model.CountUserTokensByType(userId, common.TokenTypeDerouter)
	}

	items := make([]*tokenResponse, 0, len(tokens))
	for _, token := range tokens {
		items = append(items, buildMaskedTokenResponse(token))
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

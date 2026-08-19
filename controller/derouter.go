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
	client := service.NewDerouterMgmtClient()
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
	client := service.NewDerouterMgmtClient()
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

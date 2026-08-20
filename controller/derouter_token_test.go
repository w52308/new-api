package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/service/authz"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupDerouterTokenTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousRedisEnabled := common.RedisEnabled
	previousMainDatabaseType, previousLogDatabaseType := common.MainDatabaseType(), common.LogDatabaseType()
	common.RedisEnabled = false
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	model.DB, model.LOG_DB = db, db
	require.NoError(t, db.AutoMigrate(
		&model.User{}, &model.Channel{}, &model.Token{},
		&model.CasbinRule{}, &model.AuthzRole{},
	))
	require.NoError(t, authz.Init(db))

	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.RedisEnabled = previousRedisEnabled
		common.SetDatabaseTypes(previousMainDatabaseType, previousLogDatabaseType)
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	return db
}

func newDerouterTokenTestContext(method, path, body string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(method, path, strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("id", 101)
	c.Set("role", common.RoleRootUser)
	return c, recorder
}

func TestCreateDerouterTokenProvisionsSubKey(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, "/sub-keys", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"data":{"id":"subkey-created-1","key":"sk-ant-created-subkey","keyId":"sk-ant-...bkey"}}`)
	}))
	defer srv.Close()

	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := model.Channel{
		Type: constant.ChannelTypeDerouter, Key: "sk-ant-account",
		Name: "derouter", Status: 1,
	}
	require.NoError(t, db.Create(&ch).Error)

	body := fmt.Sprintf(`{"channel_id":%d,"name":"My Derouter Key"}`, ch.Id)
	c, recorder := newDerouterTokenTestContext(http.MethodPost, "/api/token/derouter", body)
	CreateDerouterToken(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			Key   string `json:"key"`
			KeyID string `json:"key_id"`
			Type  int    `json:"type"`
			ID    int    `json:"id"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.Equal(t, common.TokenTypeDerouter, resp.Data.Type)
	require.Equal(t, "sk-ant-created-subkey", resp.Data.Key)

	// Persisted token carries the sub-key as Key plus the upstream keyId.
	var tok model.Token
	require.NoError(t, db.Where("id = ?", resp.Data.ID).First(&tok).Error)
	require.Equal(t, "sk-ant-created-subkey", tok.Key)
	require.Equal(t, "subkey-created-1", tok.DerouterSubKeyID)
	require.Equal(t, ch.Id, tok.DerouterChannelID)
}

func TestCreateDerouterTokenRejectsNonDerouterChannel(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := model.Channel{
		Type: constant.ChannelTypeOpenAI, Key: "sk-test",
		Name: "openai", Status: 1,
	}
	require.NoError(t, db.Create(&ch).Error)

	body := fmt.Sprintf(`{"channel_id":%d,"name":"bad"}`, ch.Id)
	c, recorder := newDerouterTokenTestContext(http.MethodPost, "/api/token/derouter", body)
	CreateDerouterToken(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.False(t, resp.Success)
}

func TestDeleteDerouterTokenDeletesUpstreamSubKey(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	var deletedPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deletedPath = r.URL.Path
		require.Equal(t, http.MethodDelete, r.Method)
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer srv.Close()

	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := model.Channel{
		Type: constant.ChannelTypeDerouter, Key: "sk-ant-account",
		Name: "derouter", Status: 1,
	}
	require.NoError(t, db.Create(&ch).Error)
	tok := model.Token{
		UserId: 101, Key: "sk-ant-to-delete", Type: common.TokenTypeDerouter,
		Name: "delete-me", Status: 1, DerouterChannelID: ch.Id, DerouterSubKeyID: "subkey-delete-1",
		CreatedTime: common.GetTimestamp(), AccessedTime: common.GetTimestamp(),
	}
	require.NoError(t, db.Create(&tok).Error)

	c, recorder := newDerouterTokenTestContext(http.MethodDelete, "/api/token/derouter/"+fmt.Sprintf("%d", tok.Id), "")
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tok.Id)}}
	DeleteDerouterToken(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, "/sub-keys/subkey-delete-1", deletedPath)

	var count int64
	require.NoError(t, db.Model(&model.Token{}).Where("id = ?", tok.Id).Count(&count).Error)
	require.Zero(t, count, "local token must be removed")
}

// TestDeleteDerouterTokenAdminCrossUser verifies an admin can delete a derouter
// token that was bound to another user at creation time.
func TestDeleteDerouterTokenAdminCrossUser(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodDelete, r.Method)
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer srv.Close()
	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := seedDerouterChannel(t, db)
	// Token owned by user 202; admin (id 101) deletes it.
	tok := seedDerouterToken(t, db, ch, 202, "bound-to-other", "subkey-cross-user")

	c, recorder := newDerouterTokenTestContextWithRole(http.MethodDelete, "/api/token/derouter/"+strconv.Itoa(tok.Id), "", 101, common.RoleAdminUser)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	DeleteDerouterToken(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var count int64
	require.NoError(t, db.Model(&model.Token{}).Where("id = ?", tok.Id).Count(&count).Error)
	require.Zero(t, count, "admin must be able to delete a token bound to another user")
}

// TestDeleteDerouterTokenNonAdminCrossUserRejected verifies a non-admin cannot
// delete another user's derouter token.
func TestDeleteDerouterTokenNonAdminCrossUserRejected(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 202, "other-delete", "subkey-other-delete")

	c, recorder := newDerouterTokenTestContextWithRole(http.MethodDelete, "/api/token/derouter/"+strconv.Itoa(tok.Id), "", 101, common.RoleCommonUser)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	DeleteDerouterToken(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.False(t, resp.Success)
}

func TestGetAllTokensTypeFilter(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	require.NoError(t, db.Create(&model.Token{
		UserId: 101, Key: "normal-key-1", Type: common.TokenTypeNormal,
		Name: "normal", Status: 1, CreatedTime: common.GetTimestamp(),
	}).Error)
	require.NoError(t, db.Create(&model.Token{
		UserId: 101, Key: "sk-ant-derouter-1", Type: common.TokenTypeDerouter,
		Name: "derouter", Status: 1, CreatedTime: common.GetTimestamp(),
	}).Error)

	c, recorder := newDerouterTokenTestContext(http.MethodGet, "/api/token/?type=1", "")
	c.Request.URL.RawQuery = "type=1"
	GetAllTokens(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Data struct {
			Items []map[string]any `json:"items"`
			Total int              `json:"total"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &resp))
	require.Equal(t, 1, resp.Data.Total)
	require.Len(t, resp.Data.Items, 1)
}

func TestGetDerouterTokenKeyReturnsFullSubKey(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := model.Channel{
		Type: constant.ChannelTypeDerouter, Key: "sk-ant-account",
		Name: "derouter", Status: 1,
	}
	require.NoError(t, db.Create(&ch).Error)
	tok := model.Token{
		UserId: 101, Key: "sk-ant-full-subkey", Type: common.TokenTypeDerouter,
		Name: "view-me", Status: 1, DerouterChannelID: ch.Id, DerouterSubKeyID: "subkey-view-1",
		CreatedTime: common.GetTimestamp(), AccessedTime: common.GetTimestamp(),
	}
	require.NoError(t, db.Create(&tok).Error)

	c, recorder := newDerouterTokenTestContext(http.MethodGet, "/api/token/derouter/"+fmt.Sprintf("%d", tok.Id)+"/key", "")
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tok.Id)}}
	GetDerouterTokenKey(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			Key string `json:"key"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.Equal(t, "sk-ant-full-subkey", resp.Data.Key)
}

func TestGetDerouterTokenKeyRejectsNormalToken(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	tok := model.Token{
		UserId: 101, Key: "normal-key-1", Type: common.TokenTypeNormal,
		Name: "normal", Status: 1, CreatedTime: common.GetTimestamp(),
	}
	require.NoError(t, db.Create(&tok).Error)

	c, recorder := newDerouterTokenTestContext(http.MethodGet, "/api/token/derouter/"+fmt.Sprintf("%d", tok.Id)+"/key", "")
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tok.Id)}}
	GetDerouterTokenKey(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.False(t, resp.Success)
}

func TestGetDerouterTokenUsageWrapsUpstreamPayload(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/sub-key/usage-logs", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"data":[{"model":"gpt-4o","tokens":120,"cost_usdc":0.012,"time":1720000000}],"total":1}`)
	}))
	defer srv.Close()

	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := model.Channel{
		Type: constant.ChannelTypeDerouter, Key: "sk-ant-account",
		Name: "derouter", Status: 1,
	}
	require.NoError(t, db.Create(&ch).Error)
	tok := model.Token{
		UserId: 101, Key: "sk-ant-usage-subkey", Type: common.TokenTypeDerouter,
		Name: "usage", Status: 1, DerouterChannelID: ch.Id, DerouterSubKeyID: "subkey-usage-1",
		CreatedTime: common.GetTimestamp(), AccessedTime: common.GetTimestamp(),
	}
	require.NoError(t, db.Create(&tok).Error)

	c, recorder := newDerouterTokenTestContext(http.MethodGet, "/api/token/derouter/"+fmt.Sprintf("%d", tok.Id)+"/usage?page=1&limit=50", "")
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tok.Id)}}
	c.Request.URL.RawQuery = "page=1&limit=50"
	GetDerouterTokenUsage(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			Total int `json:"total"`
			Data  []struct {
				Model string  `json:"model"`
				Cost  float64 `json:"cost_usdc"`
			} `json:"data"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.Equal(t, 1, resp.Data.Total)
	require.Len(t, resp.Data.Data, 1)
	require.Equal(t, "gpt-4o", resp.Data.Data[0].Model)
	require.InDelta(t, 0.012, resp.Data.Data[0].Cost, 1e-9)
}

// newDerouterTokenTestContextWithRole is newDerouterTokenTestContext with an
// explicit role, so tests can exercise non-admin and admin ownership paths.
func newDerouterTokenTestContextWithRole(method, path, body string, id, role int) (*gin.Context, *httptest.ResponseRecorder) {
	c, recorder := newDerouterTokenTestContext(method, path, body)
	c.Set("id", id)
	c.Set("role", role)
	return c, recorder
}

// seedDerouterChannel creates a single-key derouter channel in the test DB.
func seedDerouterChannel(t *testing.T, db *gorm.DB) *model.Channel {
	t.Helper()
	ch := model.Channel{
		Type: constant.ChannelTypeDerouter, Key: "sk-ant-account",
		Name: "derouter", Status: 1,
	}
	require.NoError(t, db.Create(&ch).Error)
	return &ch
}

// seedDerouterToken creates a derouter token owned by userId backed by channel.
func seedDerouterToken(t *testing.T, db *gorm.DB, ch *model.Channel, userId int, name, subKeyID string) *model.Token {
	t.Helper()
	tok := model.Token{
		UserId: userId, Key: "sk-ant-" + subKeyID, Type: common.TokenTypeDerouter,
		Name: name, Status: 1, DerouterChannelID: ch.Id, DerouterSubKeyID: subKeyID,
		CreatedTime: common.GetTimestamp(), AccessedTime: common.GetTimestamp(),
	}
	require.NoError(t, db.Create(&tok).Error)
	return &tok
}

// TestUpdateDerouterTokenBudgetTopUp verifies a positive amount is forwarded to
// the upstream PUT /sub-keys/:id as addBudgetVirtual.
func TestUpdateDerouterTokenBudgetTopUp(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	var gotAmount float64
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPut, r.Method)
		require.Equal(t, "/sub-keys/subkey-budget-topup", r.URL.Path)
		var payload service.DerouterUpdateSubKeyPayload
		body, _ := io.ReadAll(r.Body)
		require.NoError(t, common.Unmarshal(body, &payload))
		gotAmount = payload.AddBudgetVirtual
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer srv.Close()
	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 101, "topup", "subkey-budget-topup")
	c, recorder := newDerouterTokenTestContext(http.MethodPut, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/budget", `{"amount":5}`)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	UpdateDerouterTokenBudget(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.InDelta(t, 5.0, gotAmount, 1e-9)
}

// TestUpdateDerouterTokenBudgetDeduct verifies a negative amount is forwarded to
// the upstream as reduceBudgetVirtual (the upstream ignores negative
// addBudgetVirtual).
func TestUpdateDerouterTokenBudgetDeduct(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	var gotReduce float64
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPut, r.Method)
		require.Equal(t, "/sub-keys/subkey-budget-deduct", r.URL.Path)
		var payload service.DerouterUpdateSubKeyPayload
		body, _ := io.ReadAll(r.Body)
		require.NoError(t, common.Unmarshal(body, &payload))
		gotReduce = payload.ReduceBudgetVirtual
		require.Zero(t, payload.AddBudgetVirtual, "deduct must not send negative addBudgetVirtual")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"success":true,"recoveredVirtual":3}`)
	}))
	defer srv.Close()
	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 101, "deduct", "subkey-budget-deduct")

	c, recorder := newDerouterTokenTestContext(http.MethodPut, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/budget", `{"amount":-3}`)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	UpdateDerouterTokenBudget(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.InDelta(t, 3.0, gotReduce, 1e-9)
}

// TestUpdateDerouterTokenBudgetZero rejects a zero amount before any upstream call.
func TestUpdateDerouterTokenBudgetZero(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 101, "zero", "subkey-zero")

	c, recorder := newDerouterTokenTestContext(http.MethodPut, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/budget", `{"amount":0}`)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	UpdateDerouterTokenBudget(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.False(t, resp.Success)
}

// TestUpdateDerouterTokenBudgetOversize rejects an amount beyond the bound.
func TestUpdateDerouterTokenBudgetOversize(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 101, "oversize", "subkey-oversize")

	c, recorder := newDerouterTokenTestContext(http.MethodPut, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/budget", `{"amount":100001}`)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	UpdateDerouterTokenBudget(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.False(t, resp.Success)
}

// TestUpdateDerouterTokenBudgetNonAdminOnOtherToken verifies a non-admin cannot
// adjust another user's key.
func TestUpdateDerouterTokenBudgetNonAdminOnOtherToken(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	// token owned by user 202, current user is non-admin 101.
	tok := seedDerouterToken(t, db, ch, 202, "other", "subkey-other")

	c, recorder := newDerouterTokenTestContextWithRole(http.MethodPut, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/budget", `{"amount":1}`, 101, common.RoleCommonUser)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	UpdateDerouterTokenBudget(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.False(t, resp.Success)
}

// TestUpdateDerouterTokenBudgetAdminOnOtherToken verifies an admin can adjust
// any user's key.
func TestUpdateDerouterTokenBudgetAdminOnOtherToken(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPut, r.Method)
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer srv.Close()
	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 202, "other-admin", "subkey-other-admin")

	c, recorder := newDerouterTokenTestContextWithRole(http.MethodPut, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/budget", `{"amount":2}`, 101, common.RoleAdminUser)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	UpdateDerouterTokenBudget(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
}

// TestUpdateDerouterTokenBudgetUpstreamError surfaces the upstream status/message.
func TestUpdateDerouterTokenBudgetUpstreamError(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = io.WriteString(w, `{"error":"insufficient account balance"}`)
	}))
	defer srv.Close()
	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 101, "upstream-error", "subkey-upstream-error")

	c, recorder := newDerouterTokenTestContext(http.MethodPut, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/budget", `{"amount":1}`)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	UpdateDerouterTokenBudget(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success        bool   `json:"success"`
		UpstreamStatus int    `json:"upstream_status"`
		Message        string `json:"message"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.False(t, resp.Success)
	require.Equal(t, http.StatusBadRequest, resp.UpstreamStatus)
	require.Contains(t, resp.Message, "insufficient account balance")
}

// TestCreateDerouterTokenAdminBindsUser verifies an admin can provision a key
// bound to another user.
func TestCreateDerouterTokenAdminBindsUser(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"data":{"id":"subkey-bound-1","key":"sk-ant-bound-subkey","keyId":"sk-ant-...ubkey"}}`)
	}))
	defer srv.Close()
	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := seedDerouterChannel(t, db)
	target := model.User{Username: "target", DisplayName: "Target User", Role: common.RoleCommonUser}
	require.NoError(t, db.Create(&target).Error)

	body := fmt.Sprintf(`{"channel_id":%d,"name":"bound","user_id":%d}`, ch.Id, target.Id)
	c, recorder := newDerouterTokenTestContextWithRole(http.MethodPost, "/api/token/derouter", body, 101, common.RoleAdminUser)
	CreateDerouterToken(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			ID int `json:"id"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.NotZero(t, resp.Data.ID)

	var tok model.Token
	require.NoError(t, db.Where("id = ?", resp.Data.ID).First(&tok).Error)
	require.Equal(t, target.Id, tok.UserId, "admin-created key must be bound to the target user")
}

// TestCreateDerouterTokenNonAdminBindRejected verifies a non-admin cannot bind
// a key to another user.
func TestCreateDerouterTokenNonAdminBindRejected(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	target := model.User{Username: "other", DisplayName: "Other", Role: common.RoleCommonUser}
	require.NoError(t, db.Create(&target).Error)

	body := fmt.Sprintf(`{"channel_id":%d,"name":"bound","user_id":%d}`, ch.Id, target.Id)
	c, recorder := newDerouterTokenTestContextWithRole(http.MethodPost, "/api/token/derouter", body, 101, common.RoleCommonUser)
	CreateDerouterToken(c)

	require.Equal(t, http.StatusForbidden, recorder.Code)
}

// TestGetAllDerouterTokensAdminSeesAll verifies an admin list includes every
// user's derouter tokens.
func TestGetAllDerouterTokensAdminSeesAll(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	seedDerouterToken(t, db, ch, 101, "own", "subkey-admin-own")
	seedDerouterToken(t, db, ch, 202, "other", "subkey-admin-other")

	c, recorder := newDerouterTokenTestContextWithRole(http.MethodGet, "/api/token/derouter/all?p=1&size=20", "", 101, common.RoleAdminUser)
	c.Request.URL.RawQuery = "p=1&size=20"
	GetAllDerouterTokens(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Data struct {
			Total int `json:"total"`
			Items []struct {
				ID     int    `json:"id"`
				UserID int    `json:"user_id"`
				Key    string `json:"key"`
			} `json:"items"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.Equal(t, 2, resp.Data.Total)
	// Keys must be masked in the list.
	for _, item := range resp.Data.Items {
		require.Contains(t, item.Key, "***")
		require.NotContains(t, item.Key, "sk-ant-")
	}
}

// TestGetAllDerouterTokensAdminSearch verifies the admin list supports keyword
// name search, matching the API keys page's Filter-by-name behavior.
func TestGetAllDerouterTokensAdminSearch(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	seedDerouterToken(t, db, ch, 101, "alpha-key", "subkey-alpha")
	seedDerouterToken(t, db, ch, 101, "beta-key", "subkey-beta")
	seedDerouterToken(t, db, ch, 101, "gamma", "subkey-gamma")

	c, recorder := newDerouterTokenTestContextWithRole(http.MethodGet, "/api/token/derouter/all?p=1&size=20", "", 101, common.RoleAdminUser)
	c.Request.URL.RawQuery = "p=1&size=20&keyword=key"
	GetAllDerouterTokens(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Data struct {
			Total int `json:"total"`
			Items []struct {
				Name string `json:"name"`
			} `json:"items"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.Equal(t, 2, resp.Data.Total)
	var names []string
	for _, item := range resp.Data.Items {
		names = append(names, item.Name)
	}
	require.ElementsMatch(t, []string{"alpha-key", "beta-key"}, names)
}

// TestGetAllDerouterTokensNonAdminOwnOnly verifies a non-admin list is scoped
// to the current user.
func TestGetAllDerouterTokensNonAdminOwnOnly(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	seedDerouterToken(t, db, ch, 101, "own", "subkey-nonadmin-own")
	seedDerouterToken(t, db, ch, 202, "other", "subkey-nonadmin-other")

	c, recorder := newDerouterTokenTestContextWithRole(http.MethodGet, "/api/token/derouter/all?p=1&size=20", "", 101, common.RoleCommonUser)
	c.Request.URL.RawQuery = "p=1&size=20"
	GetAllDerouterTokens(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Data struct {
			Total int `json:"total"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.Equal(t, 1, resp.Data.Total)
}

// TestGetDerouterTokenBalanceReturnsUpstreamState verifies the live balance is
// parsed from the upstream sub-key balance endpoint and normalized to the
// budgetVirtual/spentVirtual/remainingVirtual names the frontend consumes.
func TestGetDerouterTokenBalanceReturnsUpstreamState(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/sub-key/balance", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		// The sub-key-authed endpoint reports the shorter field names.
		_, _ = io.WriteString(w, `{"budget":10,"spent":3,"remaining":7}`)
	}))
	defer srv.Close()
	previousBaseURL := service.DefaultDerouterMgmtBaseURL
	service.DefaultDerouterMgmtBaseURL = srv.URL
	t.Cleanup(func() { service.DefaultDerouterMgmtBaseURL = previousBaseURL })

	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 101, "balance", "subkey-balance")

	c, recorder := newDerouterTokenTestContext(http.MethodGet, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/balance", "")
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	GetDerouterTokenBalance(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			BudgetVirtual    float64 `json:"budgetVirtual"`
			SpentVirtual     float64 `json:"spentVirtual"`
			RemainingVirtual float64 `json:"remainingVirtual"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.InDelta(t, 10.0, resp.Data.BudgetVirtual, 1e-9)
	require.InDelta(t, 3.0, resp.Data.SpentVirtual, 1e-9)
	require.InDelta(t, 7.0, resp.Data.RemainingVirtual, 1e-9)
}

// TestGetDerouterTokenBalanceNonAdminOnOtherToken verifies a non-admin cannot
// read another user's balance.
func TestGetDerouterTokenBalanceNonAdminOnOtherToken(t *testing.T) {
	db := setupDerouterTokenTestDB(t)
	ch := seedDerouterChannel(t, db)
	tok := seedDerouterToken(t, db, ch, 202, "other-balance", "subkey-other-balance")

	c, recorder := newDerouterTokenTestContextWithRole(http.MethodGet, "/api/token/derouter/"+strconv.Itoa(tok.Id)+"/balance", "", 101, common.RoleCommonUser)
	c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(tok.Id)}}
	GetDerouterTokenBalance(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp struct {
		Success bool `json:"success"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.False(t, resp.Success)
}

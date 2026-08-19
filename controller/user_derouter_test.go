package controller

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
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

func setupDerouterUserTestDB(t *testing.T) *gorm.DB {
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
		&model.User{}, &model.UserSession{}, &model.Channel{}, &model.Token{},
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

func performCreateUserRequest(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/user/", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("id", 9999)
	c.Set("role", common.RoleRootUser)
	c.Set("username", "root-operator")
	CreateUser(c)
	return recorder
}

// TestCreateUserWithoutDerouter verifies the ordinary create path is unchanged
// when no derouter channel is requested.
func TestCreateUserWithoutDerouter(t *testing.T) {
	db := setupDerouterUserTestDB(t)

	recorder := performCreateUserRequest(t, `{"username":"plain-user","password":"***********","role":1}`)
	require.Equal(t, http.StatusOK, recorder.Code)

	var u model.User
	require.NoError(t, db.Where("username = ?", "plain-user").First(&u).Error)

	// No derouter token should have been created.
	var count int64
	require.NoError(t, db.Model(&model.Token{}).Where("user_id = ?", u.Id).Count(&count).Error)
	require.Zero(t, count)
}

// TestCreateUserDerouterSubKeyFailureRollsBack verifies that a failed subkey
// provisioning rolls the whole user creation back: no user row persists.
// Uses a derouter channel with an empty key so ProvisionDerouterSubKey fails
// hermetically without any network call.
func TestCreateUserDerouterSubKeyFailureRollsBack(t *testing.T) {
	db := setupDerouterUserTestDB(t)

	ch := model.Channel{
		Type: constant.ChannelTypeDerouter, Key: "",
		Name: "derouter-no-key", Status: 1,
	}
	require.NoError(t, db.Create(&ch).Error)

	body := fmt.Sprintf(`{"username":"derouter-user","password":"***********","role":1,"derouter_channel_id":%d}`, ch.Id)
	recorder := performCreateUserRequest(t, body)
	require.Equal(t, http.StatusOK, recorder.Code)

	var count int64
	require.NoError(t, db.Model(&model.User{}).Where("username = ?", "derouter-user").Count(&count).Error)
	require.Zero(t, count, "user must not be created when subkey provisioning fails")

	// Response should indicate failure.
	require.Contains(t, recorder.Body.String(), `"success":false`)
}

// TestCreateUserDerouterCreatesSubKeyToken verifies the happy path: when a
// derouter channel is requested, a token is created whose DerouterSubKey holds
// the provisioned subkey and whose Key is a new-api generated key.
func TestCreateUserDerouterCreatesSubKeyToken(t *testing.T) {
	db := setupDerouterUserTestDB(t)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"data":{"key":"sk-ant-provisioned-subkey","keyId":"subkey-1"}}`)
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

	body := fmt.Sprintf(`{"username":"derouter-user","password":"***********","role":1,"derouter_channel_id":%d}`, ch.Id)
	recorder := performCreateUserRequest(t, body)
	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"success":true`)

	var u model.User
	require.NoError(t, db.Where("username = ?", "derouter-user").First(&u).Error)

	var tok model.Token
	require.NoError(t, db.Where("user_id = ?", u.Id).First(&tok).Error)
	require.Equal(t, "sk-ant-provisioned-subkey", tok.DerouterSubKey)
	require.Equal(t, ch.Id, tok.DerouterChannelID)
	require.NotEmpty(t, tok.Key)
	require.NotEqual(t, "sk-ant-provisioned-subkey", tok.Key, "token.Key must be a new-api generated key, not the subkey")
}

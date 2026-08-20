package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service/authz"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupUserCreateTestDB(t *testing.T) *gorm.DB {
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

// TestCreateUserBasic verifies the ordinary create path works and creates no
// token records (derouter provisioning happens on the dedicated keys page, not
// during user creation).
func TestCreateUserBasic(t *testing.T) {
	db := setupUserCreateTestDB(t)

	recorder := performCreateUserRequest(t, `{"username":"plain-user","password":"***********","role":1}`)
	require.Equal(t, http.StatusOK, recorder.Code)

	var u model.User
	require.NoError(t, db.Where("username = ?", "plain-user").First(&u).Error)

	var count int64
	require.NoError(t, db.Model(&model.Token{}).Where("user_id = ?", u.Id).Count(&count).Error)
	require.Zero(t, count)
}

// TestCreateUserDerouterViewerRole verifies a user can be created with the
// derouter viewer role and that it is persisted.
func TestCreateUserDerouterViewerRole(t *testing.T) {
	db := setupUserCreateTestDB(t)

	recorder := performCreateUserRequest(t, `{"username":"derouter-viewer","password":"***********","role":2}`)
	require.Equal(t, http.StatusOK, recorder.Code)

	var u model.User
	require.NoError(t, db.Where("username = ?", "derouter-viewer").First(&u).Error)
	require.Equal(t, common.RoleDerouterViewer, u.Role)
}

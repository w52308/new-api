package service

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupProvisionTestDB(t *testing.T) *gorm.DB {
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
	require.NoError(t, db.AutoMigrate(&model.Channel{}))

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

// insertDerouterChannel creates a single-key Derouter channel with the given key.
func insertDerouterChannel(t *testing.T, db *gorm.DB, key string) int {
	t.Helper()
	ch := model.Channel{Type: constant.ChannelTypeDerouter, Key: key, Name: "derouter-test", Status: 1}
	require.NoError(t, db.Create(&ch).Error)
	require.Greater(t, ch.Id, 0)
	return ch.Id
}

func TestProvisionDerouterSubKeyCreatesWithFixedBudget(t *testing.T) {
	db := setupProvisionTestDB(t)
	var gotAuth, gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, "/sub-keys", r.URL.Path)
		gotAuth = r.Header.Get("Authorization")
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"data":{"id":"subkey-abc-1234","key":"sk-ant-subkey-full-value","keyId":"sk-ant-...ll-value"}}`)
	}))
	defer srv.Close()

	chID := insertDerouterChannel(t, db, "sk-ant-account")
	result, err := provisionDerouterSubKey(context.Background(), chID, "test-user", srv.URL)
	require.NoError(t, err)
	require.Equal(t, "sk-ant-subkey-full-value", result.SubKey)
	require.Equal(t, "subkey-abc-1234", result.KeyID)
	require.Equal(t, "Bearer sk-ant-account", gotAuth)
	require.Contains(t, gotBody, `"budgetVirtual":1`)
	require.Contains(t, gotBody, `"label":"test-user"`)
}

func TestProvisionDerouterSubKeyRejectsNonDerouterChannel(t *testing.T) {
	db := setupProvisionTestDB(t)
	ch := model.Channel{Type: constant.ChannelTypeOpenAI, Key: "sk-test", Name: "openai-test", Status: 1}
	require.NoError(t, db.Create(&ch).Error)

	_, err := provisionDerouterSubKey(context.Background(), ch.Id, "test-user", "http://unused")
	require.Error(t, err)
	require.Contains(t, err.Error(), "not a Derouter channel")
}

func TestProvisionDerouterSubKeyMissingValue(t *testing.T) {
	db := setupProvisionTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer srv.Close()

	chID := insertDerouterChannel(t, db, "sk-ant-account")
	_, err := provisionDerouterSubKey(context.Background(), chID, "test-user", srv.URL)
	require.Error(t, err)
	require.Contains(t, err.Error(), "missing subkey value")
}

func TestProvisionDerouterSubKeyUpstreamError(t *testing.T) {
	db := setupProvisionTestDB(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = io.WriteString(w, `{"error":"bad budget"}`)
	}))
	defer srv.Close()

	chID := insertDerouterChannel(t, db, "sk-ant-account")
	_, err := provisionDerouterSubKey(context.Background(), chID, "test-user", srv.URL)
	require.Error(t, err)
	require.Contains(t, err.Error(), "failed with status")
}

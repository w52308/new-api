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

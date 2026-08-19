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

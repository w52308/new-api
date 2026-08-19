package service

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
)

func DerouterGetSubKeyBalance(ctx context.Context, client *http.Client, baseURL, subKey string) (int, []byte, error) {
	return DoDerouterMgmt(ctx, client, http.MethodGet, baseURL, "/sub-key/balance", subKey, nil, nil)
}

func DerouterListSubKeyUsageLogs(ctx context.Context, client *http.Client, baseURL, subKey string, page, limit int) (int, []byte, error) {
	q := url.Values{}
	if page > 0 {
		q.Set("page", strconv.Itoa(page))
	}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	return DoDerouterMgmt(ctx, client, http.MethodGet, baseURL, "/sub-key/usage-logs", subKey, nil, q)
}

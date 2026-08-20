package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var DefaultDerouterMgmtBaseURL = "https://cf-api.derouter.ai"

// DerouterMgmtBaseURL resolves the management base URL, allowing a per-channel override.
func DerouterMgmtBaseURL(override string) string {
	if v := strings.TrimSpace(override); v != "" {
		return strings.TrimRight(v, "/")
	}
	return DefaultDerouterMgmtBaseURL
}

func NewDerouterMgmtClient() *http.Client {
	return &http.Client{Timeout: 15 * time.Second}
}

// DoDerouterMgmt executes a derouter management API call.
// Upstream business errors (4xx) are returned as (statusCode, body, nil), not as err.
func DoDerouterMgmt(ctx context.Context, client *http.Client, method, baseURL, path, authKey string, body []byte, query url.Values) (int, []byte, error) {
	if client == nil {
		return 0, nil, fmt.Errorf("nil http client")
	}
	bu := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if bu == "" {
		return 0, nil, fmt.Errorf("empty derouter management base url")
	}
	if strings.TrimSpace(authKey) == "" {
		return 0, nil, fmt.Errorf("empty derouter auth key")
	}

	u := bu + path
	if len(query) > 0 {
		u = u + "?" + query.Encode()
	}

	var bodyReader io.Reader
	if len(body) > 0 {
		bodyReader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, u, bodyReader)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", authKey))
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, err
	}
	return resp.StatusCode, respBody, nil
}

// DerouterCreateSubKeyPayload is the typed input for POST /sub-keys.
type DerouterCreateSubKeyPayload struct {
	BudgetVirtual float64 `json:"budgetVirtual"`
	Label         string  `json:"label,omitempty"`
	RPMLimit      int     `json:"rpmLimit,omitempty"`
}

// DerouterUpdateSubKeyPayload is the typed input for PUT /sub-keys/:id.
// Recharge uses AddBudgetVirtual (positive adds budget); deduction uses
// ReduceBudgetVirtual (positive reduces budget). The upstream ignores negative
// AddBudgetVirtual, so reduction must go through ReduceBudgetVirtual.
type DerouterUpdateSubKeyPayload struct {
	Label               string  `json:"label,omitempty"`
	RPMLimit            int     `json:"rpmLimit,omitempty"`
	AddBudgetVirtual    float64 `json:"addBudgetVirtual,omitempty"`
	ReduceBudgetVirtual float64 `json:"reduceBudgetVirtual,omitempty"`
	DisplayMultiplier   float64 `json:"displayMultiplier,omitempty"`
}

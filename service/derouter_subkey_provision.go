package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
)

// DefaultDerouterSubKeyBudgetVirtual is the fixed virtual budget applied to a
// subkey when it is provisioned automatically during user creation.
const DefaultDerouterSubKeyBudgetVirtual = 1.0

// DerouterSubKeyProvisionResult is the outcome of creating a derouter sub-key.
// SubKey is the full credential value used as the user's Bearer when relaying;
// KeyID is the upstream sub-key id used to delete or query the sub-key later.
// Both are secrets and must be treated as sensitive by callers.
type DerouterSubKeyProvisionResult struct {
	SubKey string
	KeyID  string
}

// ProvisionDerouterSubKey creates a subkey for the given Derouter channel and
// returns the created subkey's full value together with its upstream keyId.
func ProvisionDerouterSubKey(ctx context.Context, channelID int, label string) (DerouterSubKeyProvisionResult, error) {
	return provisionDerouterSubKey(ctx, channelID, label, DerouterMgmtBaseURL(""))
}

// provisionDerouterSubKey is the testable core of ProvisionDerouterSubKey;
// baseURL is injectable for tests.
func provisionDerouterSubKey(ctx context.Context, channelID int, label, baseURL string) (DerouterSubKeyProvisionResult, error) {
	ch, err := model.GetChannelById(channelID, true)
	if err != nil {
		return DerouterSubKeyProvisionResult{}, fmt.Errorf("load derouter channel %d: %w", channelID, err)
	}
	if ch == nil {
		return DerouterSubKeyProvisionResult{}, errors.New("derouter channel not found")
	}
	if ch.Type != constant.ChannelTypeDerouter {
		return DerouterSubKeyProvisionResult{}, fmt.Errorf("channel %d is not a Derouter channel (type %d)", channelID, ch.Type)
	}
	if ch.ChannelInfo.IsMultiKey {
		return DerouterSubKeyProvisionResult{}, fmt.Errorf("derouter channel %d is multi-key, single-key required", channelID)
	}
	accountKey := ch.Key
	if accountKey == "" {
		return DerouterSubKeyProvisionResult{}, fmt.Errorf("derouter channel %d has no account key", channelID)
	}

	client := NewDerouterMgmtClient()
	code, body, err := DerouterCreateSubKey(ctx, client, baseURL, accountKey, DerouterCreateSubKeyPayload{
		BudgetVirtual: DefaultDerouterSubKeyBudgetVirtual,
		Label:         label,
	})
	if err != nil {
		return DerouterSubKeyProvisionResult{}, fmt.Errorf("create derouter subkey: %w", err)
	}
	if code < 200 || code >= 300 {
		return DerouterSubKeyProvisionResult{}, fmt.Errorf("create derouter subkey failed with status %d: %s", code, string(body))
	}

	result, err := parseDerouterSubKeyResponse(body)
	if err != nil {
		return DerouterSubKeyProvisionResult{}, err
	}
	return result, nil
}

// parseDerouterSubKeyResponse extracts the full subkey value and upstream id
// from a POST /sub-keys response. The response may be nested under "data" or at
// the top level. The management id is the upstream "id" (a UUID), NOT "keyId"
// (which is the masked key form); keyId cannot be used to update/delete a sub-key.
func parseDerouterSubKeyResponse(body []byte) (DerouterSubKeyProvisionResult, error) {
	var resp struct {
		Data struct {
			ID     string `json:"id"`
			Key    string `json:"key"`
			SubKey string `json:"subKey"`
			KeyID  string `json:"keyId"`
		} `json:"data"`
		ID     string `json:"id"`
		Key    string `json:"key"`
		SubKey string `json:"subKey"`
		KeyID  string `json:"keyId"`
	}
	if err := common.Unmarshal(body, &resp); err != nil {
		return DerouterSubKeyProvisionResult{}, fmt.Errorf("parse derouter subkey response: %w", err)
	}
	subKey := firstNonEmpty(resp.Data.Key, resp.Data.SubKey, resp.Key, resp.SubKey)
	if subKey == "" {
		return DerouterSubKeyProvisionResult{}, errors.New("derouter subkey response missing subkey value")
	}
	return DerouterSubKeyProvisionResult{
		SubKey: subKey,
		KeyID:  firstNonEmpty(resp.Data.ID, resp.ID),
	}, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

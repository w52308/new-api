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

// ProvisionDerouterSubKey creates a subkey for the given Derouter channel and
// returns the created subkey's keyId (used for later display/management). The
// full subkey value is intentionally not persisted anywhere in new-api.
func ProvisionDerouterSubKey(ctx context.Context, channelID int, label string) (string, error) {
	return provisionDerouterSubKey(ctx, channelID, label, DerouterMgmtBaseURL(""))
}

// provisionDerouterSubKey is the testable core of ProvisionDerouterSubKey;
// baseURL is injectable for tests.
func provisionDerouterSubKey(ctx context.Context, channelID int, label, baseURL string) (string, error) {
	ch, err := model.GetChannelById(channelID, true)
	if err != nil {
		return "", fmt.Errorf("load derouter channel %d: %w", channelID, err)
	}
	if ch == nil {
		return "", errors.New("derouter channel not found")
	}
	if ch.Type != constant.ChannelTypeDerouter {
		return "", fmt.Errorf("channel %d is not a Derouter channel (type %d)", channelID, ch.Type)
	}
	if ch.ChannelInfo.IsMultiKey {
		return "", fmt.Errorf("derouter channel %d is multi-key, single-key required", channelID)
	}
	accountKey := ch.Key
	if accountKey == "" {
		return "", fmt.Errorf("derouter channel %d has no account key", channelID)
	}

	client := NewDerouterMgmtClient()
	code, body, err := DerouterCreateSubKey(ctx, client, baseURL, accountKey, DerouterCreateSubKeyPayload{
		BudgetVirtual: DefaultDerouterSubKeyBudgetVirtual,
		Label:         label,
	})
	if err != nil {
		return "", fmt.Errorf("create derouter subkey: %w", err)
	}
	if code < 200 || code >= 300 {
		return "", fmt.Errorf("create derouter subkey failed with status %d: %s", code, string(body))
	}

	var resp struct {
		Data struct {
			KeyID string `json:"keyId"`
		} `json:"data"`
		KeyID string `json:"keyId"`
	}
	if err := common.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("parse derouter subkey response: %w", err)
	}
	if resp.Data.KeyID != "" {
		return resp.Data.KeyID, nil
	}
	if resp.KeyID != "" {
		return resp.KeyID, nil
	}
	return "", errors.New("derouter subkey response missing keyId")
}

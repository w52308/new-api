package common

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/require"
)

func TestChannelType2APITypeDerouter(t *testing.T) {
	apiType, ok := ChannelType2APIType(constant.ChannelTypeDerouter)
	require.True(t, ok)
	require.Equal(t, constant.APITypeDerouter, apiType)
}

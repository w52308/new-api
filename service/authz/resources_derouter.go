package authz

const (
	ResourceDerouter = "derouter"

	ActionKeyRead         = "key_read"
	ActionKeyWrite        = "key_write"
	ActionUsageRead       = "usage_read"
	ActionMultiplierWrite = "multiplier_write"
)

var (
	DerouterKeyRead          = Permission{Resource: ResourceDerouter, Action: ActionKeyRead}
	DerouterKeyWrite         = Permission{Resource: ResourceDerouter, Action: ActionKeyWrite}
	DerouterUsageRead        = Permission{Resource: ResourceDerouter, Action: ActionUsageRead}
	DerouterMultiplierWrite  = Permission{Resource: ResourceDerouter, Action: ActionMultiplierWrite}
)

func init() {
	RegisterResource(ResourceDefinition{
		Resource: ResourceDerouter,
		LabelKey: "Derouter",
		Actions: []ActionDefinition{
			{
				Action:         ActionKeyRead,
				LabelKey:       "View derouter API keys",
				DescriptionKey: "View the derouter API keys list and their masked values.",
				DefaultRoles:   []string{BuiltInRoleAdmin, BuiltInRoleDerouterViewer},
			},
			{
				Action:         ActionKeyWrite,
				LabelKey:       "Manage derouter API keys",
				DescriptionKey: "Create and delete derouter API keys (provisions/deletes upstream sub-keys).",
				DefaultRoles:   []string{BuiltInRoleAdmin},
			},
			{
				Action:         ActionUsageRead,
				LabelKey:       "View derouter usage statistics",
				DescriptionKey: "View the derouter AI usage statistics for sub-keys.",
				DefaultRoles:   []string{BuiltInRoleAdmin, BuiltInRoleDerouterViewer},
			},
			{
				Action:         ActionMultiplierWrite,
				LabelKey:       "Set derouter key multiplier",
				DescriptionKey: "Set the customer-facing display multiplier of derouter sub-keys. Sensitive: changes what end customers are charged.",
				DefaultRoles:   []string{BuiltInRoleAdmin},
			},
		},
	})
}

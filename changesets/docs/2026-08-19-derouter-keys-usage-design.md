# Derouter API 密钥 + AI 使用量统计子系统设计

日期：2026-08-19

状态：待用户审阅

## 1. 背景与目标

derouter.ai 渠道接入（`2026-08-19-derouter-channel-design.md`）已落地。用户在使用中发现，sub-key 与 new-api 的 API 密钥（token）存在两个 key 并存、语义重叠的问题，需要收口为「一个密钥记录只存一个 key」的干净模型；同时需要一套面向运营/代理的新界面，独立管理 derouter 客户密钥并查看其用量统计。

本设计的目标：

1. **新增一类角色 `DerouterViewer`**（数值 2，介于 CommonUser=1 与 Admin=10 之间），授权其查看「AI API 密钥」与「AI 使用量统计」两个 derouter 新界面，且只允许访问这两块，不授予渠道/用户/计费等其它管理权限。后续可通过现有 authz 权限点动态控制菜单项。
2. **Derouter API 密钥独立页面**：新增侧边栏入口 `/derouter-keys`，独立管理 derouter sub-key（type 区分），每个记录只存**一个** key（sub-key 本身），与现有 API 密钥列表隔离。
3. **AI 使用量统计页面**：新增侧边栏入口，展示 derouter sub-key 维度的用量统计，数据源为 derouter 上游用量接口。

## 2. 非目标

- **不做 derouter 计费结算**。用量统计仅展示上游 `cost_usdc` / token 用量，不据此扣费；计费仍走 new-api 现有 `PreConsume`/`PostConsume`。
- **不做 sub-key 多 Key 轮询**。Derouter 渠道仍为单 Key 渠道，relay 转发用渠道 account key 或 token 携带的 sub-key。
- **不改 relaykit 模块**。
- **不做跨数据库的 Token Type 迁移脚本之外的 Schema 变更**（新增列走 GORM AutoMigrate）。
- **不把 derouter 用量数据落库做聚合报表**。用量统计实时调上游接口展示。

## 3. 关键事实

来自前序实现与源码核对：

- 角色数值常量在 `common/constants.go`：`RoleGuestUser=0, RoleCommonUser=1, RoleAdminUser=10, RoleRootUser=100`。
- 前端角色常量在 `web/src/lib/roles.ts`：`ROLE = { GUEST:0, USER:1, ADMIN:10, SUPER_ADMIN:100 }`；`getRoleLabelKey` 映射 label；创建用户抽屉角色下拉只有 `Common User(1)` / `Admin(10)`。
- 前端 admin 判定 `useIsAdmin() = (user.role ?? 0) >= ROLE.ADMIN`；usage-logs 用 `isAdminView = canManageScope && viewScope==='all'` 决定是否展示全站数据。
- 侧边栏过滤：`use-sidebar-view.ts` 中 `role >= item.requiredRole`（`requiredRole` 可选）；Admin 组整体按 `role >= ROLE.ADMIN` 隐藏。
- authz 体系（`service/authz/`）：casbin 角色/资源/动作权限点；`resolveSubjectRoles`（var 可替换）把 systemRole 数值映射到 authz 角色（root/admin），默认落到 `nil`；`Can(userID, systemRole, permission)`。
- 资源注册范式见 `resources_channel.go`：`RegisterResource(ResourceDefinition{Resource, LabelKey, Actions[]})`，每个 Action 有 `DefaultRoles []string`。
- Token 模型（`model/token.go`）：已有 `DerouterSubKey`、`DerouterChannelID` 字段；`Key` 为 `varchar(128) uniqueIndex`。
- auth 中间件（`middleware/auth.go`）：`TokenAuth` / `TokenAuthReadOnly` 把 Bearer key 去 `sk-` 后按 `-` 截断成第一段再查库；`SetupContextForToken` 设置 `token_key`、`specific_channel_id`（来自 `parts[1]`）。
- `middleware.Distribute()`：优先用 `ContextKeyTokenSpecificChannelId` 强制指定渠道。
- 前端 key 展示统一 `sk-${apiKey.key}`（`api-keys-cells.tsx` / `api-keys-provider.tsx`）。
- derouter 管理接口（`controller/derouter.go`）：`loadDerouterChannel` 校验渠道类型/单 Key；`ListDerouterSubKeys`/`CreateDerouterSubKey`/`DeleteDerouterSubKey`/`ListDerouterUsageLogs` 均透传上游 JSON。
- derouter sub-key 格式 `sk-ant-...`；new-api token key 为 48 位随机键；二者都可能被用户当 Bearer 凭据。

## 4. 架构

```
┌────────────────────────────────────────────────────────────────┐
│                        new-api                                  │
│                                                                  │
│  角色体系                                                        │
│    common.RoleDerouterViewer = 2                                 │
│    authz.BuiltInRoleDerouterViewer (role:derouter_viewer)        │
│    resolveSubjectRoles: role>=2 → derouter_viewer                │
│    ResourceDerouter:                                            │
│      action key_read   (查看 derouter 密钥)                      │
│      action usage_read (查看用量统计)                             │
│                                                                  │
│  Token 模型                                                      │
│    Type: 0=普通, 1=Derouter                                      │
│    Type=1 时 Key = 完整 sk-ant-... (sub-key 本身)                 │
│    DerouterChannelID 保留（路由到对应渠道）                       │
│    DerouterSubKey 字段移除（只存一个 key）                        │
│                                                                  │
│  鉴权链路                                                        │
│    TokenAuth: 整 key 精确匹配 → 失败回退第一段                    │
│    Type=1 token → SetupContextForToken 设置 specific_channel_id  │
│      = DerouterChannelID（系统指定，非用户指定）                  │
│    Distribute → 强制路由到 derouter 渠道                         │
│    derouter adaptor → Bearer <token.Key> (sub-key)               │
│                                                                  │
│  新页面                                                          │
│    /derouter-keys   Derouter API 密钥列表/创建/删除/复制          │
│    /derouter-usage  AI 使用量统计（sub-key 维度，上游接口）        │
│    侧边栏「Derouter」组，requiredRole: DEROUTER_VIEWER            │
└────────────────────────────────────────────────────────────────┘
```

## 5. 数据模型

### 5.1 Token 增加 Type

```go
const (
    TokenTypeNormal   = 0 // 普通 API 密钥
    TokenTypeDerouter = 1 // Derouter API 密钥（Key = sub-key 本身）
)

// Token struct 增加
Type               int    `json:"type" gorm:"type:int;default:0;index"`
// 新增：上游 sub-key 的 keyId（删除上游 sub-key 用）
DerouterSubKeyID   string `json:"-" gorm:"type:varchar(128);column:derouter_sub_key_id"`
// 移除 DerouterSubKey；保留 DerouterChannelID int `json:"-" gorm:"type:int"`
```

- `Type=0`：行为与现状完全一致（48 位随机 key，无 DerouterChannelID）。
- `Type=1`：`Key` = `ProvisionDerouterSubKey` 返回的完整 `sk-ant-...` 值；`DerouterChannelID` = 所选 derouter 渠道 id；`DerouterSubKeyID` = 上游 sub-key 的 keyId（创建时解析，删除时用它调上游）。`UnlimitedQuota` 可按需。

> 注意：`ProvisionDerouterSubKey` 签名需从 `(string, error)` 改为 `(subKey string, keyID string, err error)`，`parseDerouterSubKeyResponse` 需同时返回 key 值与 keyId。

### 5.2 兼容性

- 已有 `derouter_sub_key` 列在 AutoMigrate 后仍存在但不再写入/读取（不删除列避免迁移风险）。新逻辑只读写 `Key`、`DerouterChannelID`、`DerouterSubKeyID`。
- 前端 `sk-${key}` 前缀：`Type=1` 且 `key` 已以 `sk-` 开头时不再重复加前缀。

## 6. 后端设计

### 6.1 角色常量与 authz

`common/constants.go`：
```go
RoleDerouterViewer = 2
```

`service/authz/role.go`：
```go
BuiltInRoleDerouterViewer = "derouter_viewer"
```
加入 `builtInRoles`，`BuiltIn: true, Superuser: false, Sort: 20`。

`service/authz/assignment.go` 的 `resolveSubjectRoles`：
```go
switch {
case systemRole >= common.RoleRootUser:      return []string{BuiltInRoleRoot}
case systemRole >= common.RoleAdminUser:     return []string{BuiltInRoleAdmin}
case systemRole >= common.RoleDerouterViewer:return []string{BuiltInRoleDerouterViewer}
default: return nil
}
```

新增 `service/authz/resources_derouter.go`：
```go
const ResourceDerouter = "derouter"
const (
    ActionKeyRead   = "key_read"
    ActionUsageRead = "usage_read"
)
var (
    DerouterKeyRead   = Permission{Resource: ResourceDerouter, Action: ActionKeyRead}
    DerouterUsageRead = Permission{Resource: ResourceDerouter, Action: ActionUsageRead}
)
func init() {
    RegisterResource(ResourceDefinition{
        Resource: ResourceDerouter,
        LabelKey: "Derouter",
        Actions: []ActionDefinition{
            {Action: ActionKeyRead, LabelKey: "View derouter API keys", DescriptionKey: "...", DefaultRoles: []string{BuiltInRoleDerouterViewer}},
            {Action: ActionUsageRead, LabelKey: "View derouter usage statistics", DescriptionKey: "...", DefaultRoles: []string{BuiltInRoleDerouterViewer}},
        },
    })
}
```

注意：`resolveSubjectRoles` 的映射使 `RoleDerouterViewer` 用户拥有 `ResourceDerouter` 全部默认动作，但不拥有 `channel` 等其它资源 → 天然隔离，看不到渠道/用户/计费管理。

### 6.2 Token CRUD 支持 type 过滤

`controller/token.go`：
- `GetAllTokens` / `SearchTokens`：读 `type` query，传入 model 层过滤（`type = ?`）。默认（无 type 参数）返回所有；`type=0` 只返回普通；`type=1` 只返回 derouter。
- `buildMaskedTokenResponse` 对 `Type=1` 用 `sk-` 前缀对齐展示（后端 `GetMaskedKey` 不变，前端处理）。
- `GetTokenKey`（复制完整 key）：返回 `token.Key` 原值（`Type=1` 即完整 sub-key）。

### 6.3 Derouter 密钥 CRUD 接口

新增路由（挂 `UserAuth` + `RequirePermission(authz.DerouterKeyRead)` 或新控制器）：

```
POST   /api/token/derouter/create   选 derouter 渠道 → provision subkey → 建 Type=1 token
GET    /api/token/?type=1           列出当前用户的 derouter 密钥
DELETE /api/token/:id               删除（含 derouter 密钥）
```

创建逻辑：
```go
// 选渠道（ChannelAuth 校验 derouter 渠道可用）→ ProvisionDerouterSubKey(ctx, channelId, label)
// → 返回 (subKey, keyId) → token := Token{Type: TokenTypeDerouter, Key: subKey,
//     DerouterChannelID: channelId, DerouterSubKeyID: keyId, ...}
// → tx.Create(&token)（失败回滚，不产生孤儿 sub-key）
```

删除逻辑（**同步删除上游 sub-key**）：
```go
// 1. 加载 token（Type=1，属于当前用户）
// 2. ch = GetChannelById(token.DerouterChannelID, true)   ← 用渠道 account key
// 3. DerouterDeleteSubKey(accountKey, token.DerouterSubKeyID)
//    - 上游删除成功 → 继续
//    - 上游删除失败（子密钥不存在 / 网络错误）→ 记录错误日志，仍删除本地 token 记录
//      （本地记录不可再持有已失效/已删的 sub-key 值）
// 4. DeleteTokenById(token.Id, userId) 删除本地记录
```

> 说明：sub-key 创建是**对上游的真实写操作**（调 `/sub-keys`），创建入口权限建议用 `authz.DerouterKeyRead` 之上的写权限点（如新增 `ActionKeyWrite`），避免只读角色也能创建。删除同理需写权限。

### 6.4 用量统计接口

新增控制器：
```
GET /api/token/derouter/usage?tokenId=<id>&page=&limit=
```
- 入参：当前用户的 derouter token id（`Type=1`）或直接 sub-key。
- 逻辑：复用 `service.DerouterListSubKeyUsageLogs`（上游 sub-key 用量接口），用 token 的 `Key`（sub-key）查询。
- 返回：上游用量日志 JSON（透传），前端渲染统计。

### 6.5 auth 中间件适配（关键）

`middleware/auth.go` `TokenAuth` 与 `TokenAuthReadOnly` 的 key 解析改为：

```go
// 当前：去 sk- 后按 - 截断取第一段
key = strings.TrimPrefix(key, "sk-")
parts = strings.Split(key, "-")
key = parts[0]

// 新逻辑：先整 key 精确匹配，失败再回退第一段
rawKey := strings.TrimPrefix(key, "sk-")
segments := strings.Split(rawKey, "-")
// 尝试整 key
token, err := model.GetTokenByKey(rawKey, false)
if err != nil && len(segments) > 1 {
    // 回退：旧格式 sk-<key>-<channelId>，或 48 位 key 场景
    token, err = model.GetTokenByKey(segments[0], false)
}
```

- `Type=1`（`sk-ant-...` 完整 key）：整 key 精确命中 ✓
- 普通 `sk-<48位>`：整 key 不命中（48 位无 `-`，`segments` 长度 1）→ 回退第一段 = 完整 key → 命中 ✓
- 指定渠道 `sk-<key>-<channelId>`：整 key 不命中 → 回退第一段命中 + 保留 `parts[1]` 渠道 ✓
- `SetupContextForToken`：若 token 为 `Type=1`，直接 `c.Set("specific_channel_id", token.DerouterChannelID)`（系统指定，跳过用户指定渠道的 admin 检查分支）。

## 7. 前端设计

### 7.1 角色

`web/src/lib/roles.ts`：
```ts
export const ROLE = {
  GUEST: 0,
  USER: 1,
  DEROUTER_VIEWER: 2,
  ADMIN: 10,
  SUPER_ADMIN: 100,
} as const
```
`ROLE_LABEL_KEYS` 加 `[ROLE.DEROUTER_VIEWER]: 'Derouter Viewer'`。

创建用户抽屉角色下拉加 `{ value: '2', label: t('Derouter Viewer') }`。

### 7.2 侧边栏

`use-sidebar-data.ts` 新增「Derouter」组（或并入 General），条目：
```ts
{
  title: t('Derouter API Keys'),
  url: '/derouter-keys',
  icon: Key,
  requiredRole: ROLE.DEROUTER_VIEWER,
},
{
  title: t('AI Usage Statistics'),
  url: '/derouter-usage',
  icon: BarChart3,
  requiredRole: ROLE.DEROUTER_VIEWER,
},
```

> `role >= ROLE.DEROUTER_VIEWER` 才可见 → Admin/Root 也可见，DerouterViewer 正好达标，普通用户隐藏。

### 7.3 路由

`web/src/routes/_authenticated/derouter-keys/index.tsx`、`.../derouter-usage/index.tsx`：
- `beforeLoad` 校验 `useAuthStore` 的 role >= `ROLE.DEROUTER_VIEWER`，否则 `redirect` 到 `/keys`（或 403）。

### 7.4 Derouter 密钥页面 `/derouter-keys`

- 复用现有 `ApiKeysTable`/`ApiKeysCells` 的骨架，`type=1` 数据源。
- 创建按钮：选择 derouter 渠道（下拉，来自 `/api/channel?type=61`）→ 调创建接口 → provision sub-key → 刷新列表。
- 列表列：名称、masked key（`sk-ant-•••`）、渠道、状态、创建时间、操作（复制完整 key / 删除）。
- 复制：`api-keys-cells` 特判 `key` 已以 `sk-` 开头则不再加前缀。
- 删除：删除对话框提示"将同步删除上游 sub-key"；确认后调删除接口（先删上游 sub-key 再删本地记录）；上游删除失败时仍删本地记录并在后端记错误日志。

### 7.5 AI 使用量统计页面 `/derouter-usage`

- 数据源：`GET /api/token/derouter/usage`（透传上游 sub-key 用量日志）。
- 呈现：按 sub-key 汇总展示 token 用量、`cost_usdc`、请求数，分页列表。
- 组件：复用现有 data-table 骨架；列含时间、模型、tokens、cost、请求 id。

## 8. 错误处理与安全

- **权限**：DerouterViewer 只有 `ResourceDerouter` 权限，其它资源不可达；页面路由 + 后端 `RequirePermission` 双重校验。
- **密钥泄露**：`token.Key` 在列表接口返回 masked 值（`GetMaskedKey`），完整值仅 `GetTokenKey`（复制）返回；与现有 token 行为一致。
- **sub-key 创建失败**：事务内回滚 token 创建，不产生孤儿记录；对上游创建成功但本地落库失败时，上游 sub-key 泄漏（不可回收）——接受现状，后续可用 label 关联清理。
- **sub-key 删除失败**：上游删除失败时仍删除本地 token 记录（避免本地持有已失效 sub-key），并 `logger.LogWarn` 记录错误，运营可通过渠道管理页的 derouter sub-keys 对话框人工清理孤儿 sub-key。
- **auth 回退安全**：整 key 精确匹配失败才回退第一段；普通 48 位 key 无 `-`，不受影响；`sk-ant-` 前缀 key 不会误伤现有 token。
- **billing 安全**：不新增扣费逻辑；`RemainQuota`/`UnlimitedQuota` 沿用现有 token 计费路径。

## 9. 测试策略

- `service/authz`：新增角色 `derouter_viewer` 的 grants 测试；`resolveSubjectRoles` 映射测试。
- `middleware/auth`：`sk-ant-...` 整 key 命中；`sk-<48位>` 回退命中；`sk-<key>-<channel>` 渠道指定保留。
- `controller/token`：`type=1` 过滤；derouter 创建接口（mock `ProvisionDerouterSubKey`）；删除。
- 前端：组件测试（key 前缀特判）；路由守卫测试。
- 构建：后端 `go build ./...` + 相关测试；relaykit `GOWORK=off go build ./...`；前端 `bun run typecheck` + `bun run i18n:sync --check` + `bun run build`。

## 10. 里程碑

1. **M1 后端基础**：角色常量 + authz 角色/资源 + resolveSubjectRoles 映射 + seed。
2. **M2 Token Type + auth 适配**：Token.Type 字段、移除 DerouterSubKey 读写、auth 中间件双路径、specific_channel_id。
3. **M3 接口**：token type 过滤 + derouter 密钥创建/删除 + 用量统计接口。
4. **M4 前端**：角色 + 侧边栏 + 路由守卫 + 两个页面 + key 前缀特判。
5. **M5 验证**：构建 + 测试 + i18n sync。

# New API 平台使用手册

> **版本**：基于 main 分支（2026-08）  
> **适用对象**：平台用户、管理员、开发者

---

## 目录

- [第一章 平台简介](#第一章-平台简介)
- [第二章 快速入门](#第二章-快速入门)
- [第三章 用户端功能](#第三章-用户端功能)
  - [3.1 注册与登录](#31-注册与登录)
  - [3.2 个人资料管理](#32-个人资料管理)
  - [3.3 通知与偏好设置](#33-通知与偏好设置)
  - [3.4 API 密钥（令牌）管理](#34-api-密钥令牌管理)
  - [3.5 钱包与充值](#35-钱包与充值)
  - [3.6 订阅套餐](#36-订阅套餐)
  - [3.7 兑换码使用](#37-兑换码使用)
  - [3.8 使用日志与用量统计](#38-使用日志与用量统计)
  - [3.9 推荐返利](#39-推荐返利)
  - [3.10 每日签到](#310-每日签到)
  - [3.11 安全设置（2FA / Passkey）](#311-安全设置2fa--passkey)
  - [3.12 登录会话管理](#312-登录会话管理)
  - [3.13 语言与界面偏好](#313-语言与界面偏好)
  - [3.14 删除账户](#314-删除账户)
- [第四章 API 接口使用](#第四章-api-接口使用)
  - [4.1 通用说明](#41-通用说明)
  - [4.2 兼容 OpenAI 的 Chat 接口](#42-兼容-openai-的-chat-接口)
  - [4.3 OpenAI Responses 接口](#43-openai-responses-接口)
  - [4.4 Claude Messages 接口](#44-claude-messages-接口)
  - [4.5 Google Gemini 接口](#45-google-gemini-接口)
  - [4.6 图像生成接口](#46-图像生成接口)
  - [4.7 音频接口](#47-音频接口)
  - [4.8 Embedding 接口](#48-embedding-接口)
  - [4.9 Rerank 接口](#49-rerank-接口)
  - [4.10 Realtime 实时对话接口](#410-realtime-实时对话接口)
  - [4.11 视频与异步任务接口](#411-视频与异步任务接口)
  - [4.12 格式转换说明](#412-格式转换说明)
  - [4.13 推理强度控制](#413-推理强度控制)
  - [4.14 Playground 交互式测试](#414-playground-交互式测试)
  - [4.15 外部客户端集成](#415-外部客户端集成)
- [第五章 管理端功能](#第五章-管理端功能)
  - [5.1 用户管理](#51-用户管理)
  - [5.2 渠道管理](#52-渠道管理)
  - [5.3 令牌管理（管理员视角）](#53-令牌管理管理员视角)
  - [5.4 兑换码管理](#54-兑换码管理)
  - [5.5 模型管理](#55-模型管理)
  - [5.6 供应商管理](#56-供应商管理)
  - [5.7 预填分组](#57-预填分组)
  - [5.8 模型部署管理（IO.NET）](#58-模型部署管理ionet)
  - [5.9 日志与统计](#59-日志与统计)
  - [5.10 数据看板](#510-数据看板)
  - [5.11 系统设置 — 站点](#511-系统设置--站点)
  - [5.12 系统设置 — 认证与安全](#512-系统设置--认证与安全)
  - [5.13 系统设置 — 请求限制与安全防护](#513-系统设置--请求限制与安全防护)
  - [5.14 系统设置 — 运营与运维](#514-系统设置--运营与运维)
  - [5.15 系统设置 — 计费与定价](#515-系统设置--计费与定价)
  - [5.16 系统设置 — 模型与路由](#516-系统设置--模型与路由)
  - [5.17 系统设置 — 内容管理](#517-系统设置--内容管理)
  - [5.18 订阅计划管理](#518-订阅计划管理)
  - [5.19 自定义 OAuth 提供商](#519-自定义-oauth-提供商)
  - [5.20 性能监控与运维](#520-性能监控与运维)
  - [5.21 管理员权限体系](#521-管理员权限体系)
- [第六章 定价与计费说明](#第六章-定价与计费说明)
  - [6.1 计费模型概览](#61-计费模型概览)
  - [6.2 额度单位换算](#62-额度单位换算)
  - [6.3 Ratio 模式计费公式](#63-ratio-模式计费公式)
  - [6.4 固定价格模式](#64-固定价格模式)
  - [6.5 阶梯表达式计费](#65-阶梯表达式计费)
  - [6.6 分组与倍率](#66-分组与倍率)
  - [6.7 预扣费与结算流程](#67-预扣费与结算流程)
  - [6.8 特殊计费类型](#68-特殊计费类型)
  - [6.9 工具调用附加费](#69-工具调用附加费)
  - [6.10 速率限制](#610-速率限制)
- [第七章 支持的渠道类型](#第七章-支持的渠道类型)
- [第八章 常见问题 FAQ](#第八章-常见问题-faq)

---

## 第一章 平台简介

### 1.1 项目定位

New API 是一个**下一代 LLM 网关与 AI 资产管理系统**。它聚合了 60+ 上游 AI 提供商，对外暴露统一的 API 接口，同时提供完整的用户管理、计费计量、速率限制、权限控制和可视化管理后台。

### 1.2 核心架构

```
客户端应用
    │
    ▼
┌─────────────┐
│  New API 网关 │  ← 统一 API 入口（兼容 OpenAI / Claude / Gemini 格式）
├─────────────┤
│  认证鉴权     │  ← JWT / Passkey / OAuth
│  速率限制     │  ← 用户级 / 模型级 / 全局限制
│  权限分组     │  ← 用户分组 × 渠道分组
│  智能路由     │  ← 权重均衡 / 故障重试 / 渠道亲和
│  格式转换     │  ← OpenAI ⇄ Claude ⇄ Gemini
│  计费计量     │  ← 预扣费 → 实际结算 → 差额退还
│  日志审计     │  ← 全量请求日志 / 用量统计
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  上游 AI 提供商（60+ 种渠道类型）          │
│  OpenAI │ Claude │ Gemini │ Azure │ AWS  │
│  DeepSeek │ 通义 │ 文心 │ 智谱 │ ……     │
└──────────────────────────────────────────┘
```

### 1.3 核心能力一览

| 能力 | 说明 |
|------|------|
| 统一 API 网关 | 兼容 OpenAI 格式，同时支持 Claude、Gemini 原生格式 |
| 60+ 渠道适配 | OpenAI、Azure、Claude、Gemini、AWS Bedrock、DeepSeek 等 |
| 多渠道负载均衡 | 渠道加权随机、优先级排序、故障自动重试、渠道亲和 |
| 精细化计费 | 比率模式、固定价格模式、阶梯表达式模式、工具调用附加费 |
| 权限与分组 | 用户分组、渠道分组、令牌级别访问控制、管理员权限矩阵 |
| 数据看板 | 可视化控制台、桑基图、模型分析、排行榜 |
| 多数据库 | SQLite、MySQL ≥ 5.7.8、PostgreSQL ≥ 9.6 |
| 多语言 | 简中、繁中、英文、法文、日文、俄文、越南文 |
| 多种登录 | 密码、Passkey、GitHub、Discord、OIDC、Telegram、微信、自定义 OAuth |
| 订阅系统 | 多计划、自动续期、额度重置、分组升级 |
| 异步任务 | Midjourney、Suno、Kling、Sora 等异步生成任务 |

### 1.4 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Go 1.22+、Gin、GORM v2 |
| 前端 | React 19、TypeScript、Rsbuild、Base UI、Tailwind CSS |
| 数据库 | SQLite / MySQL / PostgreSQL |
| 缓存 | Redis（go-redis）+ 内存缓存 |
| 前端包管理 | Bun |

---

## 第二章 快速入门

### 2.1 部署

#### Docker Compose（推荐）

```bash
git clone https://github.com/QuantumNous/new-api.git
cd new-api
# 编辑 docker-compose.yml 配置
nano docker-compose.yml
# 启动服务
docker-compose up -d
```

#### Docker 命令

```bash
# 使用 SQLite（默认）
docker run --name new-api -d --restart always \
  -p 3000:3000 \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  calciumion/new-api:latest

# 使用 MySQL
docker run --name new-api -d --restart always \
  -p 3000:3000 \
  -e SQL_DSN="root:123456@tcp(localhost:3306)/oneapi" \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  calciumion/new-api:latest

# 使用 PostgreSQL
docker run --name new-api -d --restart always \
  -p 3000:3000 \
  -e SQL_DSN="postgres://user:pass@localhost:5432/newapi?sslmode=disable" \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  calciumion/new-api:latest
```

#### 部署要求

| 组件 | 要求 |
|------|------|
| 本地数据库 | SQLite（Docker 必须挂载 `/data` 目录） |
| 远程数据库 | MySQL ≥ 5.7.8 或 PostgreSQL ≥ 9.6 |
| 容器引擎 | Docker / Docker Compose |
| 系统架构 | 64 位（amd64 / arm64），不支持 32 位 |

### 2.2 常用环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SESSION_SECRET` | 认证签名密钥，所有节点必须一致 | — |
| `SQL_DSN` | 数据库连接字符串 | — |
| `REDIS_CONN_STRING` | Redis 连接字符串 | — |
| `STREAMING_TIMEOUT` | 流式超时（秒） | 300 |
| `MAX_REQUEST_BODY_MB` | 最大请求体大小（MB） | 32 |
| `STREAM_SCANNER_MAX_BUFFER_MB` | 流扫描器单行缓冲区上限（MB） | 64 |
| `AZURE_DEFAULT_API_VERSION` | Azure API 版本 | 2025-04-01-preview |
| `ERROR_LOG_ENABLED` | 错误日志开关 | false |

> **完整列表**：参阅 [环境变量文档](https://docs.newapi.pro/en/docs/installation/config-maintenance/environment-variables)

### 2.3 首次初始化

部署完成后访问 `http://localhost:3000`，自动跳转到**初始化设置页面**（`/setup`）：

1. 设置**管理员用户名、邮箱、密码**
2. 配置**系统名称**等基本信息
3. 完成初始化后自动进入管理后台

### 2.4 第一次 API 调用

```bash
curl https://your-domain/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-token-here" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

---

## 第三章 用户端功能

### 3.1 注册与登录

#### 3.1.1 注册

访问 `/sign-up` 页面，填写以下信息：

| 字段 | 说明 |
|------|------|
| 用户名 | 必填，注册后不可修改 |
| 密码 | 8–20 位字符 |
| 确认密码 | 必须与密码一致 |
| 邮箱 | 若启用了邮箱验证则必填 |
| 验证码 | 启用邮箱验证时需要，30 秒倒计时重发 |

页面还会展示：
- **人机验证**（如已配置 Cloudflare Turnstile）
- **用户协议 / 隐私政策**勾选框（如管理员已启用）
- **第三方登录按钮**（如管理员已启用 OAuth 注册）
- 推荐码自动从 URL 参数 `?aff=xxx` 中捕获并持久化

#### 3.1.2 登录

平台支持多种登录方式，管理员可在后台按需启用/禁用：

| 登录方式 | 说明 |
|----------|------|
| 账号密码 | 输入用户名/邮箱 + 密码 |
| Passkey（WebAuthn） | 使用指纹、面部识别或硬件密钥无密码登录 |
| GitHub OAuth | 使用 GitHub 账号授权 |
| Discord OAuth | 使用 Discord 账号授权 |
| OIDC 统一认证 | 支持任意 OIDC 兼容身份提供商 |
| Telegram 登录 | 使用 Telegram 账号授权 |
| 微信登录 | 扫码登录（需配置微信服务器） |
| LinuxDO 登录 | 使用 LinuxDO 账号授权 |
| 自定义 OAuth | 管理员可配置任意 OAuth 2.0 提供商 |

**二步验证（2FA）流程**：

如果账号已启用 2FA，登录后会跳转到验证页面：
- 输入 6 位 TOTP 验证码（来自 Authenticator 应用）
- 或输入备用恢复码（`XXXX-XXXX` 格式，支持自动格式化）
- 可在两种方式之间切换

#### 3.1.3 密码找回

1. 在登录页点击**忘记密码**
2. 输入注册邮箱，完成人机验证
3. 查收重置邮件（30 秒倒计时重发）
4. 点击邮件链接设置新密码

---

### 3.2 个人资料管理

进入**个人资料**（`/profile`）页面，顶部展示：

- 头像（Gravatar）、显示名称、角色徽章、用户 ID
- @用户名、邮箱、所属分组
- 统计卡片：当前余额、总用量、API 请求数

#### 账号绑定

在**账号绑定**标签页管理第三方登录绑定：

| 绑定项 | 操作 |
|--------|------|
| 邮箱 | 绑定 / 更换（需验证码） |
| 微信 | 绑定（扫码） / 解绑 |
| GitHub | 绑定 / 解绑 |
| Discord | 绑定 / 解绑 |
| OIDC | 绑定 / 解绑 |
| Telegram | 绑定 / 解绑 |
| LinuxDO | 绑定 / 解绑 |
| 自定义 OAuth | 绑定 / 解绑（每个提供商独立） |

> 解绑操作需要通过安全验证（TOTP / Passkey）。

---

### 3.3 通知与偏好设置

在**设置与偏好**标签页配置：

#### 通知方式（四选一）

| 方式 | 配置项 |
|------|--------|
| **邮件** | 通知邮箱地址 |
| **Webhook** | Webhook URL、Webhook Secret |
| **Bark** | Bark 推送 URL（支持模板变量 `{{title}}` `{{content}}`） |
| **Gotify** | 服务器 URL、应用令牌、消息优先级（0–10，默认 5） |

#### 通用设置

| 配置项 | 说明 |
|--------|------|
| 额度预警阈值 | 当可用额度低于此值时触发通知（默认 500000 = $1） |
| 接受未定价模型 | 开启后可调用未配置价格的模型 |
| 记录 IP 地址 | 是否在日志中记录客户端 IP |
| 接收上游模型更新通知 | 仅管理员可见 |

---

### 3.4 API 密钥（令牌）管理

进入**令牌管理**（`/keys`）页面管理你的 API 访问令牌。

#### 3.4.1 创建令牌

点击**新建令牌**，展开抽屉表单：

**基础信息**

| 配置项 | 说明 |
|--------|------|
| 名称 | 必填，便于识别的显示名称 |
| 分组 | 决定可使用的渠道范围。选择 `auto` 时启用自动分组 |
| 自动分组顺序 | 仅 `auto` 分组可见：`inherit`（使用全局默认）或 `custom`（自定义有序列表，最多 5 个） |
| 跨分组重试 | 仅 `auto` 分组：失败时自动尝试下一个分组的渠道 |
| 过期时间 | 快捷按钮：永不过期 / 1 个月 / 1 天 / 1 小时，或自定义时间 |
| 数量 | 批量创建数量（每把钥匙添加随机后缀） |

**额度设置**

| 配置项 | 说明 |
|--------|------|
| 额度 | 此令牌可消耗的最大额度（以货币或 token 显示，取决于系统设置） |
| 无限额度 | 开启后不设上限 |

**高级设置**（可折叠）

| 配置项 | 说明 |
|--------|------|
| 模型限制 | 多选可用模型列表（留空表示全部可用） |
| IP 白名单 | 支持 CIDR，每行一个 |

#### 3.4.2 令牌状态

| 状态码 | 含义 | 徽章颜色 |
|--------|------|----------|
| 1 | 启用 | 绿色 |
| 2 | 禁用 | 灰色 |
| 3 | 过期 | 黄色 |
| 4 | 额度耗尽 | 红色 |

#### 3.4.3 令牌操作

表格中每行的操作按钮：

| 操作 | 说明 |
|------|------|
| 启用/禁用 | 图标按钮一键切换 |
| 编辑 | 打开编辑抽屉 |
| 复制密钥 | 复制完整的 `sk-xxxx` 密钥 |
| 复制连接信息 | 复制服务器地址 + 密钥的完整连接信息 |
| CC Switch | 导入到 CC Switch 应用（Claude / Codex / Gemini） |
| Chat | 打开配置的聊天预设链接（自动注入密钥） |
| 删除 | 确认后删除（不可恢复） |

还支持**批量操作**：批量删除、批量导出密钥。

#### 3.4.4 查询令牌用量

无需登录即可查询：

```bash
curl https://your-domain/api/usage/token \
  -H "Authorization: Bearer sk-your-token-here"
```

---

### 3.5 钱包与充值

进入**钱包**（`/wallet`）页面。

#### 3.5.1 统计卡片

- **当前余额** — 剩余额度
- **总用量** — 累计消耗额度
- **API 请求数** — 累计请求次数

#### 3.5.2 充值

**预设金额按钮**：默认为 `[1, 5, 10, 30, 50, 100, 300, 500]`（或管理员自定义的 `amount_options`）。每个按钮显示：充值面额、实付金额、折扣标签、节省金额。

**自定义金额**：数字输入框，最小值为管理员设置的 `min_topup`。输入时实时预览"需支付金额"。

**支付方式**：根据管理员配置动态显示：

| 方式 | 颜色 | 最低充值 |
|------|------|----------|
| 支付宝（alipay） | 蓝色 | 管理员配置 |
| 微信（wxpay） | 绿色 | 管理员配置 |
| Stripe | 紫色 | `stripe_min_topup` |
| Creem | 靛蓝 | 按产品定价 |
| Waffo | 蓝色 | `waffo_min_topup` |
| Waffo Pancake | 橙色 | `waffo_pancake_min_topup` |

**兑换码**：在兑换码输入框输入兑换码，点击兑换按钮。需要管理员已启用兑换码功能。

**支付确认对话框**：显示充值面额、实付金额（原价删除线 + "节省 XX"）、支付方式。

#### 3.5.3 账单历史

点击**订单历史**按钮查看所有充值记录：
- 按订单号搜索
- 分页大小：10 / 20 / 50 / 100
- 每条记录：交易号（可复制）、状态徽章（成功/待处理/过期）、创建时间、支付方式、金额

#### 3.5.4 推荐返利

- 推荐链接（只读输入框 + 复制按钮）
- 统计：待结算 / 累计收入 / 邀请人数
- **转入余额**按钮：将推荐返利转入可用余额

#### 3.5.5 订阅概览

页面底部展示当前订阅信息：
- 我的订阅列表（计划名称、状态徽章、到期时间、下次重置、额度使用进度条）
- **计费偏好**选择：`订阅优先` / `钱包优先` / `仅订阅` / `仅钱包`
- 可购买的套餐卡片

---

### 3.6 订阅套餐

#### 浏览套餐

每个套餐卡片展示：
- 标题、副标题、价格
- 有效期、额度重置周期
- 总额度、购买限制
- 升级分组
- "推荐"徽章（第一个计划）

#### 购买流程

1. 点击**立即订阅**
2. 查看套餐详情：计划名称、有效期、重置周期、额度、升级分组、应付金额
3. 选择支付方式：
   - **余额支付**（需计划允许且余额充足）
   - **Stripe / Creem / Waffo Pancake** 在线支付
   - **EPay**（选择具体支付渠道）
4. 完成支付后自动生效

#### 订阅管理

- 查看订阅状态（活跃 / 过期 / 已取消）
- 查看额度使用情况（已用 / 总额 / 剩余百分比 + 进度条）
- 下次重置时间
- 管理员可手动绑定/重置/失效订阅

---

### 3.7 兑换码使用

在**钱包页面**的兑换码输入框输入兑换码，或在**兑换码**页面操作：

1. 输入兑换码字符串
2. 点击**兑换**
3. 对应额度立即充入账户

> 兑换码为一次性使用，使用后状态变为"已使用"。

---

### 3.8 使用日志与用量统计

进入**使用日志**页面，包含三个标签页：

#### 3.8.1 通用日志

**筛选栏**

| 筛选条件 | 说明 |
|----------|------|
| 日期范围 | 快捷：24 小时 / 7 天 / 14 天 / 30 天，或自定义范围 |
| 模型名称 | 按模型筛选 |
| 分组 | 按分组筛选 |
| 日志类型 | 全部 / 消费 / 错误 / 退款 |
| 令牌名称 | 高级筛选 |
| 用户名 | 高级筛选（仅管理员） |
| 渠道 ID | 高级筛选（仅管理员） |
| 请求 ID | 高级筛选 |
| 上游请求 ID | 高级筛选 |

**统计徽章**：当前筛选范围内的总用量、RPM（每分钟请求数）、TPM（每分钟 token 数）。

**表格列**

| 列 | 说明 |
|----|------|
| 时间 | 请求时间 + 日志类型徽章 |
| 渠道 | 渠道名称（管理员可见，含重试链弹窗） |
| 用户 | 头像 + 用户名（管理员可见） |
| 令牌 | 令牌名称 + 分组 + 倍率 |
| 模型 | 模型名称徽章（显示实际映射后的模型） |
| 流式 | 流式/TPS 指标 |
| Tokens | 输入/输出 + 缓存读/写 |
| 费用 | 本次请求扣费 |
| 耗时 | 总耗时、首个 token 时间（FRT）、TPS |
| 详情 | 点击查看详情对话框 |

**日志详情对话框**包含以下信息（按条件显示）：

- **概览**：请求 ID、上游请求 ID、渠道、重试链、令牌、分组、IP、响应时间
- **请求转换**（管理员）：转换路径、转换链
- **额度饱和**（管理员）：溢出/下溢/NaN 标记
- **拒绝原因**（管理员）
- **违规扣费**：违规代码、标记、扣费金额
- **退款详情**：任务 ID、退款原因
- **充值审计**（管理员）：订单号、回调支付方式、调用者 IP、服务器 IP、节点名称、系统版本
- **操作审计**（管理员）：操作类型、认证方式、变更字段、请求方法+路由、结果
- **登录信息**：登录方式、IP、User-Agent
- **音频 Tokens**：音频输入/输出、文本输入/输出
- **推理强度**、**系统提示词覆盖**、**模型映射**（请求模型 vs 实际模型）
- **Token 明细**：输入/输出/缓存读/缓存写（5 分钟/1 小时）/图片
- **计费详情**：计费模式（按 token/按次/动态）、输入/输出/缓存倍率、分组/专属倍率、音频/图片/网页搜索/文件搜索/图片生成附加费、计费路径、总费用
- **动态定价明细**（阶梯表达式）
- **流状态**：状态、结束原因、软错误、错误列表
- **订阅计费**：计划、实例、预扣、差额、最终消耗、剩余/总额
- **参数覆盖**列表
- **内容**：可复制的请求/响应内容

#### 3.8.2 绘图日志（Midjourney）

展示 Midjourney 任务日志：
- **任务类型**：IMAGINE、UPSCALE、VARIATION、HIGH_VARIATION、LOW_VARIATION、PAN、DESCRIBE、BLEND、SHORTEN、REROLL、INPAINT、SWAP_FACE、ZOOM、CUSTOM_ZOOM、VIDEO、EDITS 等
- **状态**：未开始、已提交、进行中、成功、失败
- 按 mj_id 筛选

#### 3.8.3 任务日志

展示异步任务日志（Suno、Kling、Runway、Luma、Viggle 等）：
- **操作类型**：MUSIC、LYRICS、GENERATE、TEXT_GENERATE 等
- **状态**：未开始、已提交、进行中、成功、失败、队列中
- **平台**：suno、kling、runway、luma、viggle
- 按 task_id 筛选

---

### 3.9 推荐返利

#### 获取推荐链接

进入个人资料页面，查看你的**推荐码**和**推荐链接**：
- 链接格式：`https://your-domain?aff=your-code`
- 分享给他人注册后，推荐人获得返利额度

#### 返利管理

- 返利状态：待结算 / 累计收入 / 邀请人数
- **转入余额**：将返利额度转入可用余额（需管理员确认合规条款）
- 管理员可配置：邀请人奖励额度、被邀请人奖励额度

---

### 3.10 每日签到

如果管理员启用了签到功能：

- 进入个人资料页面查看**签到日历**
- 点击**立即签到**（每日仅一次，签到后按钮禁用）
- 每次签到获得随机额度奖励（范围由管理员配置，如 1000–10000）
- 日历标记已签到日期（悬停显示获得的额度）
- 统计：总签到次数、本月签到次数、累计获得额度
- 启用人机验证时需通过 Turnstile 检查

---

### 3.11 安全设置（2FA / Passkey）

#### 3.11.1 二步验证（2FA）

进入个人资料 → 安全设置 → 二步验证：

**启用 2FA（3 步向导）**：

1. **扫描二维码**：使用 Authenticator 应用（Google Authenticator、Authy 等）扫描，或手动复制密钥
2. **保存备用恢复码**：显示一组恢复码（网格布局 + 全部复制按钮），**务必妥善保管**
3. **验证**：输入 6 位验证码确认

**2FA 状态**：已启用 / 已禁用 / 已锁定 + 剩余备用码数量

**操作**：
- **重新生成备用码**（需验证当前 2FA）
- **禁用 2FA**（需验证）

#### 3.11.2 Passkey（WebAuthn）

支持使用指纹、面部识别或硬件密钥进行无密码登录：

- **状态**：已启用 / 已禁用 + 备份状态（已备份/未备份/无备份）+ 最后使用时间
- **添加 Passkey**：如果已启用 2FA，需先通过 2FA 验证
- **移除 Passkey**：需通过 2FA 或 Passkey 安全验证

#### 3.11.3 安全验证对话框

执行敏感操作（查看渠道密钥、注册/删除 Passkey）时弹出：
- **标签 1**：Authenticator 验证码（6 位 TOTP 或 8 字符备用码）
- **标签 2**：Passkey 设备验证

---

### 3.12 登录会话管理

查看和管理当前账号的所有登录会话：

- **会话列表**：设备信息、IP 地址、最后活跃时间、当前会话标记
- **撤销单个会话**：点击撤销按钮，确认后登出指定设备
- **撤销其他会话**：一键登出除当前设备外的所有设备
- 撤销当前会话会自动登出并跳转到登录页

---

### 3.13 语言与界面偏好

#### 界面语言

支持的语言：
- English（英文）
- 简体中文（fallback）
- 繁體中文
- Français（法文）
- Русский（俄文）
- 日本語（日文）
- Tiếng Việt（越南文）

语言偏好跨设备同步，并影响 API 错误消息的语言。

#### 侧边栏模块

可自定义侧边栏显示的模块：

| 区域 | 可切换模块 |
|------|-----------|
| 聊天区域 | Playground、Chat |
| 控制台区域 | 数据看板、令牌管理、使用日志、绘图日志、任务日志 |
| 个人中心区域 | 钱包管理、个人设置 |

支持**重置为默认**和**保存更改**。

---

### 3.14 删除账户

在个人资料 → 安全设置 → 删除账户：

1. 输入用户名确认（必须完全匹配）
2. 点击**删除账户**（不可恢复）
3. 删除后自动登出并跳转

---

## 第四章 API 接口使用

### 4.1 通用说明

**基础 URL**：`https://your-domain`

**认证头**：
```
Authorization: Bearer sk-your-token-here
Content-Type: application/json
```

**支持的接口格式**：

| 格式 | 前缀 | 说明 |
|------|------|------|
| OpenAI 兼容 | `/v1/` | 最广泛使用的格式 |
| OpenAI Responses | `/v1/responses` | Responses API |
| Claude 原生 | `/v1/messages` | Anthropic Messages API |
| Gemini 原生 | `/v1beta/models/` | Google Gemini API |

### 4.2 兼容 OpenAI 的 Chat 接口

**接口**：`POST /v1/chat/completions`

```bash
curl https://your-domain/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "stream": true,
    "temperature": 0.7,
    "max_tokens": 4096
  }'
```

**流式响应**：添加 `"stream": true`，返回 Server-Sent Events 格式。

### 4.3 OpenAI Responses 接口

**接口**：`POST /v1/responses`

```bash
curl https://your-domain/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "model": "gpt-4o",
    "input": "Hello!"
  }'
```

### 4.4 Claude Messages 接口

**接口**：`POST /v1/messages`

```bash
curl https://your-domain/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### 4.5 Google Gemini 接口

**接口**：`POST /v1beta/models/{model}:generateContent`

```bash
curl https://your-domain/v1beta/models/gemini-2.5-pro:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "Hello!"}]}
    ]
  }'
```

流式使用 `:streamGenerateContent` 端点。

### 4.6 图像生成接口

**接口**：`POST /v1/images/generations`

```bash
curl https://your-domain/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "model": "dall-e-3",
    "prompt": "A cute cat wearing a hat",
    "n": 1,
    "size": "1024x1024"
  }'
```

### 4.7 音频接口

#### 语音转文字（Whisper）

```bash
curl https://your-domain/v1/audio/transcriptions \
  -H "Authorization: Bearer sk-xxxx" \
  -F file="@audio.mp3" \
  -F model="whisper-1"
```

#### 文字转语音（TTS）

```bash
curl https://your-domain/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "model": "tts-1",
    "input": "Hello, welcome to New API!",
    "voice": "alloy"
  }' \
  --output speech.mp3
```

### 4.8 Embedding 接口

**接口**：`POST /v1/embeddings`

```bash
curl https://your-domain/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "The food was delicious and the waiter..."
  }'
```

### 4.9 Rerank 接口

**接口**：`POST /v1/rerank`

```bash
curl https://your-domain/v1/rerank \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "model": "rerank-multilingual-v3.0",
    "query": "What is AI?",
    "documents": ["AI is artificial intelligence", "The weather is nice today"]
  }'
```

### 4.10 Realtime 实时对话接口

```bash
# 获取临时 session
curl https://your-domain/v1/realtime/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "model": "gpt-4o-realtime-preview",
    "voice": "alloy"
  }'
```

### 4.11 视频与异步任务接口

部分视频/音乐生成模型通过任务接口提交：

```bash
# 提交任务
curl https://your-domain/v1/video/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxxx" \
  -d '{
    "model": "kling-v1",
    "prompt": "A cat walking on the beach"
  }'

# 查询任务状态
curl https://your-domain/v1/task/{task_id} \
  -H "Authorization: Bearer sk-xxxx"
```

### 4.12 格式转换说明

New API 支持在不同 API 格式之间自动转换：

| 转换路径 | 状态 |
|----------|------|
| OpenAI 兼容 ⇄ Claude Messages | ✅ 支持 |
| OpenAI 兼容 → Google Gemini | ✅ 支持 |
| Google Gemini → OpenAI 兼容 | ✅ 支持（仅文本，暂不支持 Function Calling） |
| OpenAI 兼容 ⇄ OpenAI Responses | 🚧 开发中 |
| Thinking → Content 转换 | ✅ 支持 |

> 你可以用 OpenAI 格式的请求调用 Claude 模型，平台自动完成双向格式转换。

### 4.13 推理强度控制

通过模型名称后缀控制推理强度：

**OpenAI 系列**：`o3-mini-high` / `o3-mini-medium` / `o3-mini-low`、`gpt-5-high` / `gpt-5-medium` / `gpt-5-low`

**Claude 系列**：`claude-3-7-sonnet-20250219-thinking`（开启思考模式）

**Gemini 系列**：
- `gemini-2.5-flash-thinking` / `gemini-2.5-flash-nothinking`
- `gemini-2.5-pro-thinking` / `gemini-2.5-pro-thinking-128`（128 token 思考预算）
- 任意 Gemini 模型名后追加 `-low` / `-medium` / `-high` 控制推理强度

### 4.14 Playground 交互式测试

进入**Playground**（`/playground`）页面进行在线交互式 API 测试：

#### 输入控件

- **模型/分组选择器**：选择模型和分组
- **发送按钮**（生成中变为停止按钮）
- **附件**：文件/附件操作
- **搜索**：网页搜索功能
- **参数面板**：展开/折叠参数调节

#### 可调参数

| 参数 | 范围 | 默认 | 说明 |
|------|------|------|------|
| Temperature | 0.1–1 | 0.7 | 控制随机性和创造力 |
| Top P | 0.1–1 | 1 | 限制 token 选择的概率质量 |
| Frequency Penalty | -2–2 | 0 | 减少重复用词 |
| Presence Penalty | -2–2 | 0 | 鼓励新话题 |
| Max Tokens | 0–200000 | 4096 | 限制响应长度 |
| Seed | 0–2147483647 | 未设置 | 提高响应一致性 |

> 每个参数都有独立的启用开关，只有启用的参数才会随请求发送。

#### 消息操作

复制、重新生成、显示预览/源码、编辑、删除。

#### 数据持久化

配置、消息历史、参数启用状态均保存在浏览器 localStorage 中。

### 4.15 外部客户端集成

#### Python（OpenAI SDK）

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-your-token-here",
    base_url="https://your-domain/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

#### Node.js（OpenAI 包）

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'sk-your-token-here',
  baseURL: 'https://your-domain/v1',
});
```

#### CC Switch

在令牌管理页面点击**CC Switch**按钮，可将令牌一键导入到 CC Switch 应用（Claude / Codex / Gemini），自动配置服务器地址、API 密钥和端点。

#### 聊天预设

管理员可配置聊天预设链接（支持 Cherry Studio、Aion UI、Deep Chat 等），用户在令牌操作菜单中选择**Chat**即可打开对应客户端并自动注入 API 密钥。支持的链接变量：
- `{key}` → API 密钥
- `{address}` → 服务器地址
- `{cherryConfig}` / `{aionuiConfig}` / `{deepchatConfig}` → Base64 编码的 JSON 配置

---

## 第五章 管理端功能

> 以下功能需要管理员或超级管理员权限。

### 5.1 用户管理

进入**用户管理**页面。

#### 用户列表

- 分页浏览，支持排序：ID / 用户名 / 额度 / 分组 / 注册时间 / 最后登录
- 搜索：关键词、分组、角色、状态
- 筛选：按状态（启用/禁用/已删除）

#### 用户字段

| 字段 | 说明 |
|------|------|
| ID | 系统自增 ID |
| 用户名 | 唯一标识 |
| 显示名称 | 用户可自定义 |
| 角色 | 普通用户(1) / 管理员(10) / 超级管理员(100) |
| 状态 | 启用(1) / 禁用(2) / 已删除(-1) |
| 邮箱 | 绑定邮箱 |
| 分组 | 所属分组（决定可用渠道） |
| 额度 | 当前可用额度 |
| 已用额度 | 累计消耗 |
| 请求数 | 累计 API 请求数 |
| 推荐码 / 推荐统计 | 推荐返利相关 |
| 绑定信息 | GitHub/Discord/OIDC/微信/Telegram/LinuxDO 绑定状态 |
| Derouter 子密钥 ID | 如已创建 |
| 备注 | 管理员备注 |

#### 创建用户

| 字段 | 说明 |
|------|------|
| 用户名 | 必填，创建后不可修改 |
| 显示名称 | 默认为用户名 |
| 密码 | 8–20 位字符 |
| 角色 | 普通用户 或 管理员（超级管理员不可选） |
| Derouter 子密钥 | 可选：为用户创建固定预算的 Derouter 子密钥 |

#### 编辑用户

- 修改分组、备注
- 调整额度（增加 / 扣减 / 覆写三种模式）
- 管理员权限矩阵（仅超级管理员可编辑管理员权限）

#### 批量操作

- 提升/降级角色
- 启用/禁用/删除用户
- 批量调整额度

#### 管理员权限矩阵

超级管理员可为管理员分配精细化权限，权限目录来自 `/api/authz/catalog`，按资源 × 操作维度配置。

---

### 5.2 渠道管理

进入**渠道管理**页面，管理上游 AI 提供商的连接。

#### 5.2.1 支持的渠道类型

平台支持 60+ 种渠道类型（详见[第七章](#第七章-支持的渠道类型)）。

#### 5.2.2 创建渠道

抽屉表单包含以下区域：

**基础信息**

| 配置项 | 说明 |
|--------|------|
| 名称 | 必填，渠道显示名称 |
| 类型 | 下拉选择上游提供商类型 |
| 状态 | 启用 / 禁用 |

**凭据**

| 配置项 | 说明 |
|--------|------|
| 密钥 | 上游 API 密钥。支持多种格式（按类型变化）：OpenAI 使用 `sk-xxx`，百度使用 `APIKey|SecretKey`，AWS 使用 `Ak|Sk|Region` 等 |
| Base URL | 上游 API 地址（部分类型有默认值，如 OpenAI 默认 `https://api.openai.com`） |
| 其他参数 | 部分类型需要额外配置（如 Azure 的 API 版本、Dify 的应用类型等） |
| 多密钥模式 | `single`（单密钥）/ `batch`（批量添加，每行一个）/ `multi_to_single`（多密钥合并为一个渠道） |
| 多密钥类型 | `random`（随机）/ `polling`（轮询） |
| 密钥模式（编辑时） | `append`（追加）/ `replace`（替换） |

**模型与分组**

| 配置项 | 说明 |
|--------|------|
| 模型列表 | 多选此渠道支持的模型 |
| 分组 | 多选渠道所属分组（至少选一个） |
| 模型映射 | JSON 对象，将请求模型名映射到上游实际模型名 |
| 测试模型 | 用于测试连接的模型名 |

**高级设置**（可折叠，展开状态持久化）

| 子区域 | 配置项 |
|--------|--------|
| 路由策略 | 优先级（数字越小越优先）、权重、测试模型、自动禁用 |
| 内部备注 | 标签（tag）、备注（最长 255 字符） |
| 覆盖规则 | 状态码映射、参数覆盖（JSON）、请求头覆盖（JSON） |
| 渠道额外设置 | 强制格式、Thinking 转 Content、透传请求体、禁用任务轮询休眠、代理地址、系统提示词、系统提示词覆盖、HTTP 协议、HTTP/2 连接分片 |
| 字段透传控制 | allow_service_tier、disable_store、allow_speed 等（按类型显示） |
| 上游模型检测 | 启用检测、自动同步、忽略的模型列表 |

**类型特定设置**

| 类型 | 额外配置 |
|------|----------|
| Azure (3) | `azure_responses_version` |
| AWS (33) | `aws_key_type`（ak_sk / api_key） |
| OpenRouter (20) | `is_enterprise_account` |
| Vertex AI (41) | `vertex_key_type`（json / api_key） |
| Advanced Custom (58) | 高级自定义路由配置 |

#### 5.2.3 高级自定义渠道（类型 58）

高级自定义渠道支持完全自定义的路由和格式转换：

**路由配置**：每条路由包含：

| 字段 | 说明 |
|------|------|
| 入站路径 | 客户端请求的路径（如 `/v1/chat/completions`） |
| 上游路径 | 完整 URL 或绝对路径 |
| 转换器 | 格式转换器（8 种可选） |
| 模型规则 | 精确匹配或 `re:` 前缀正则 |
| 认证 | 类型（none/header/query）+ 名称 + 值 |

**支持的转换器**：
1. `none` — 原生透传
2. `anthropic_messages_to_openai_chat_completions`
3. `openai_chat_completions_to_anthropic_messages`
4. `openai_chat_completions_to_openai_responses`
5. `openai_responses_to_openai_chat_completions`
6. `openai_responses_to_gemini_generate_content`
7. `gemini_generate_content_to_openai_chat_completions`
8. `openai_chat_completions_to_gemini_generate_content`

**入站路径选项**（17 种）：OpenAI Chat/Responses/Responses Compact/Embeddings/Images/Audio/Completions/Realtime、Codex Alpha Search、Rerank、Claude Messages、Gemini generateContent/embedContent/batchEmbedContents

**预设模板**：all_protocols、openai_only、claude_only、gemini_only

#### 5.2.4 渠道操作

| 操作 | 说明 |
|------|------|
| 测试连接 | 验证渠道连通性（可指定模型、端点类型、是否流式） |
| 查询余额 | 查询上游账户余额（部分渠道支持） |
| 获取模型列表 | 从上游自动获取可用模型列表 |
| 复制渠道 | 复制当前渠道配置（可选后缀、重置余额） |
| 批量启用/禁用 | 批量管理渠道状态 |
| 批量编辑标签 | 批量修改渠道标签 |
| 删除已禁用渠道 | 一键删除所有已禁用的渠道 |
| 查看密钥 | 超级管理员需通过 2FA 验证才能查看 |

#### 5.2.5 多密钥管理

支持在一个渠道下管理多个密钥：
- 密钥状态：启用 / 手动禁用 / 自动禁用
- 批量操作：启用所有 / 禁用所有 / 删除已禁用 / 删除单个
- 随机模式：每次请求随机选择一个可用密钥
- 轮询模式：按顺序依次使用密钥

#### 5.2.6 渠道标签管理

- 按标签筛选渠道（仅启用 / 仅禁用 / 全部）
- 批量编辑标签
- 查看标签下的模型列表

#### 5.2.7 特殊渠道类型

**Codex（类型 57）**：
- 密钥格式必须为 JSON：`{"access_token": "...", "account_id": "..."}`
- 不支持批量创建
- 支持刷新凭据、查看用量、重置积分

**Derouter（类型 61）**：
- 支持查看余额、管理子密钥（CRUD）、查看用量日志
- 子密钥支持独立余额和用量追踪

**Ollama（类型 4）**：
- 支持查看版本、删除模型、预览模型列表

---

### 5.3 令牌管理（管理员视角）

管理员可查看和管理所有用户的令牌：
- 查看所有令牌列表，支持搜索
- 为用户创建、修改、删除令牌
- 查看令牌的详细使用日志

---

### 5.4 兑换码管理

进入**兑换码管理**页面。

#### 创建兑换码

| 配置项 | 说明 |
|--------|------|
| 名称 | 1–20 字符，留空则根据额度自动生成 |
| 额度 | 兑换码对应的额度值（≥ 0） |
| 过期时间 | 快捷：永不过期 / 1 个月 / 1 周 / 1 天，或自定义 |
| 数量 | 批量生成数量（1–100） |

#### 兑换码状态

| 状态 | 含义 |
|------|------|
| 未使用 | 可兑换 |
| 已禁用 | 管理员禁用 |
| 已使用 | 已被兑换 |
| 已过期 | 超过有效期 |

#### 管理操作

- 搜索兑换码
- 编辑兑换码
- 删除单个兑换码
- **清理无效兑换码**：一键删除所有已使用/已禁用/已过期的兑换码

---

### 5.5 模型管理

进入**模型管理**页面，管理平台支持的模型元数据。

#### 模型列表

- 分页浏览，支持搜索
- 筛选：状态（启用/禁用）、同步状态（官方/非官方）
- 每行显示：模型名称、图标、描述、供应商、标签、匹配规则、已绑定渠道数、状态

#### 创建/编辑模型

**基础信息**

| 配置项 | 说明 |
|--------|------|
| 模型名称 | 必填，唯一标识 |
| 描述 | 模型描述文本 |
| 图标 | @lobehub/icons 图标键名 |
| 供应商 | 关联的供应商 |
| 标签 | 标签输入（用于筛选和分类） |

**匹配规则**

| 规则 | 说明 | 颜色 |
|------|------|------|
| 精确匹配 (0) | 模型名必须完全一致 | 绿色 |
| 前缀匹配 (1) | 以模型名开头的都匹配 | 蓝色 |
| 包含匹配 (2) | 包含模型名的都匹配 | 橙色 |
| 后缀匹配 (3) | 以模型名结尾的都匹配 | 紫色 |

**端点配置**：JSON 编辑器，支持从模板加载：
- `openai` → `/v1/chat/completions`
- `openai-response` → `/v1/responses`
- `anthropic` → `/v1/messages`
- `gemini` → `/v1beta/models/{model}:generateContent`
- `jina-rerank` → `/rerank`
- `image-generation` → `/v1/images/generations`
- `embeddings` → `/v1/embeddings`

**定价配置**（存储在系统选项中，非模型行）

| 模式 | 子模式 | 说明 |
|------|--------|------|
| 按 token | 比率（ratio） | `model_ratio` 乘数、`completion_ratio` 乘数、缓存/图片/音频倍率 |
| 按 token | 价格（price） | 输入价格（$/1M tokens）→ 自动计算 ratio；输出价格 → 自动计算 completion_ratio |
| 按次 | 固定价格 | 每次请求固定费用（USD） |

**状态与同步**

| 配置项 | 说明 |
|--------|------|
| 启用状态 | 开关 |
| 官方同步 | 是否从官方源同步此模型 |

#### 同步上游模型

- **预览**：查看上游渠道中可用但平台尚未注册的模型
- **同步**：选择语言（zh/en/ja）、来源（official/config）、覆盖范围，一键同步
- **查看缺失模型**：查看已启用但没有可用渠道的模型

#### 模型操作

- 编辑、删除、启用/禁用
- 查看已绑定的渠道列表

---

### 5.6 供应商管理

管理上游供应商的元数据信息：

| 字段 | 说明 |
|------|------|
| 名称 | 供应商名称 |
| 描述 | 供应商描述 |
| 图标 | 图标标识 |
| 状态 | 启用/禁用 |

操作：创建、编辑、删除、搜索。

---

### 5.7 预填分组

创建预定义的分组模板，方便快速为新用户分配分组：

| 字段 | 说明 |
|------|------|
| 名称 | 分组模板名称 |
| 类型 | model / tag / endpoint |
| 项目 | 具体的模型、标签或端点列表 |
| 描述 | 备注说明 |

---

### 5.8 模型部署管理（IO.NET）

管理 IO.NET 平台的模型部署。

#### 部署配置

| 配置项 | 说明 |
|--------|------|
| 集群名称 | 必填，需检查可用性 |
| 镜像地址 | 默认 `ollama/ollama:latest` |
| 流量端口 | 默认 11434（1–65535） |
| 硬件类型 | 从可用硬件列表选择（受 max_gpus 限制） |
| 位置 | 多选可用位置 |
| 每容器 GPU 数 | GPU 数量 |
| 副本数 | 实例数量 |
| 时长（小时） | 部署时长 |
| 货币 | USDC / IOCoin |
| 高级选项 | 入口命令、启动参数、环境变量、密钥环境变量、镜像仓库凭据 |

#### 部署操作

- 查看部署详情、日志、容器状态
- 扩展部署、更新名称、删除部署
- 实时价格估算
- 连接测试

---

### 5.9 日志与统计

详见[用户端 3.8 节](#38-使用日志与用量统计)。管理员额外可见：

- 全局日志（所有用户）
- 渠道维度筛选
- 用户维度筛选
- 日志统计（`/api/log/stat`）
- 渠道亲和使用缓存统计

---

### 5.10 数据看板

进入**数据看板**（`/dashboard`）页面。

#### 概览看板

- **初始化引导**：3 步引导（创建 API 密钥 → 充值 → 发送请求），跟踪完成状态
- **快捷操作**：API 密钥、渠道管理（管理员）、使用日志、定价
- **请求预览**：自动生成 curl 命令，支持一键复制
- **面板**：性能健康面板（管理员）、API 信息面板、公告面板、FAQ 面板、Uptime 面板
- **汇总卡片**：总请求、总用量、余额等

#### 图表分析

| 图表 | 说明 |
|------|------|
| 桑基图（Sankey） | 用户 → 分组 → 模型 → 渠道的流量可视化 |
| 消耗分布图 | 柱状图/面积图切换，按模型/用户维度 |
| 模型分析图 | 趋势/占比/Top 排行切换 |
| 用户图表 | Top 用户用量排行 |
| 时间粒度 | 小时/天/周 可选 |
| 时间范围 | 1 天 / 7 天 / 14 天 / 29 天 |

#### 数据导出

管理员可启用数据导出：
- 导出间隔：1–1440 分钟（建议 > 1 分钟以避免 DB 负载）
- 默认时间粒度：小时/天/周

---

### 5.11 系统设置 — 站点

进入**系统设置 → 站点**。

#### 系统信息

| 配置项 | 说明 |
|--------|------|
| 系统名称 | 必填，平台显示名称 |
| 服务器地址 | 用于 OAuth 回调、Webhook 等（尾部斜杠自动去除） |
| Logo | 图片 URL |
| 页脚 | 页脚文本 |
| 关于 | HTML 内容、URL（显示为 iframe）或 Markdown |
| 首页内容 | Markdown 格式 |
| 用户协议 | Markdown/HTML/URL |
| 隐私政策 | Markdown/HTML/URL |

#### 系统公告

公告文本区域，支持 Markdown。

#### 头部导航

配置头部导航栏显示的模块（定价、排行榜等）。

#### 侧边栏模块

管理员配置全局侧边栏模块的默认可见性。

---

### 5.12 系统设置 — 认证与安全

进入**系统设置 → 认证**。

#### 基础认证

| 配置项 | 说明 |
|--------|------|
| 密码登录 | 是否启用密码登录 |
| 注册开关 | 是否允许新用户注册 |
| 密码注册 | 是否允许通过密码注册（可仅允许 OAuth 注册） |
| 邮箱验证 | 注册时是否要求邮箱验证 |
| 邮箱域名限制 | 限制可注册的邮箱域名 |
| 邮箱别名限制 | 禁止同一域名的邮箱别名重复注册 |
| 邮箱域名白名单 | 每行一个域名 |

#### 人机验证

| 配置项 | 说明 |
|--------|------|
| Turnstile 开关 | 是否启用 Cloudflare Turnstile |
| Site Key | Turnstile 站点密钥 |
| Secret Key | Turnstile 服务端密钥 |

#### Passkey 配置

| 配置项 | 说明 |
|--------|------|
| 启用 Passkey | 开关 |
| RP 显示名称 | 依赖方显示名称 |
| RP ID | 依赖方标识（必须匹配/父域名） |
| 用户验证 | required / preferred / discouraged |
| 附件偏好 | none / platform / cross-platform |
| 允许不安全源 | 仅开发环境使用 |
| 允许的源 | 每行一个 Origin |

#### OAuth 集成（6 个标签页）

| 提供商 | 配置项 |
|--------|--------|
| GitHub | 开关、Client ID、Client Secret |
| Discord | 开关、Client ID、Client Secret |
| OIDC | 开关、显示名称、Client ID、Client Secret、Well-Known URL（自动发现端点）、手动配置授权/Token/用户信息端点 |
| Telegram | 开关、Bot Token、Bot Name |
| LinuxDO | 开关、Client ID、Client Secret、最低信任等级 |
| 微信 | 开关、微信服务器地址、服务器 Token、账号二维码图片 URL |

每个标签页都显示设置指南，包含首页 URL 和回调 URL（从服务器地址自动生成），支持一键复制。

#### 自定义 OAuth

管理员可配置任意 OAuth 2.0 兼容的登录提供商：
- 支持 OIDC Discovery 自动获取配置
- 提供商预设选择器
- 访问策略模板
- CRUD 管理

---

### 5.13 系统设置 — 请求限制与安全防护

进入**系统设置 → 安全**。

#### 速率限制

| 配置项 | 说明 |
|--------|------|
| 模型请求限制开关 | 启用模型级请求频率限制 |
| 限制周期（分钟） | 滑动窗口时长 |
| 最大请求数 | 0 = 不限（含失败请求） |
| 最大成功请求数 | 最小值 1 |
| 分组限制 | JSON 对象 `{"groupName": [maxRequests, maxSuccess]}`，支持可视化编辑和 JSON 编辑切换 |

#### 敏感词过滤

| 配置项 | 说明 |
|--------|------|
| 敏感词检查开关 | 启用后阻止包含敏感词的消息 |
| 检查 Prompt | 在发送到上游之前扫描 Prompt |
| 敏感词列表 | 每行一个 |

#### SSRF 防护

| 配置项 | 说明 |
|--------|------|
| SSRF 防护开关 | 启用服务端请求伪造防护 |
| 允许私有 IP | 允许 10/172/192 网段 |
| 域名过滤模式 | 黑名单 / 白名单 |
| 域名列表 | 每行一个 |
| IP 过滤模式 | 黑名单 / 白名单 |
| IP 列表 | IP/CIDR 每行一个 |
| 允许的端口 | 逗号分留，留空表示全部 |
| 域名应用 IP 过滤 | 即使是域名也检查解析后的 IP |

#### 令牌限制

| 配置项 | 说明 |
|--------|------|
| 最大用户令牌数 | 每个用户可创建的最大令牌数（默认 1000，过大影响性能） |

---

### 5.14 系统设置 — 运营与运维

进入**系统设置 → 运营**。

#### 系统行为

| 配置项 | 说明 |
|--------|------|
| 默认折叠侧边栏 | 新用户的侧边栏默认状态 |
| 演示站点模式 | 启用后限制部分管理功能 |
| 自用模式 | 自用场景优化（如未配置价格的模型使用默认比率） |

#### 监控与告警

| 配置项 | 说明 |
|--------|------|
| 额度提醒阈值 | 当可用额度低于此值时发送邮件告警 |
| 性能指标开关 | 启用性能指标采集 |
| 刷新间隔（分钟） | 指标聚合间隔 |
| 桶粒度 | minute / 5min / hour |
| 保留天数 | 0 = 永久保留 |

#### SMTP 邮件

| 配置项 | 说明 |
|--------|------|
| SMTP 服务器 | 服务器地址 |
| SMTP 端口 | 常用：25 / 465 / 587 |
| SMTP 账号 | 登录账号 |
| 发件人地址 | 有效的邮箱地址 |
| SMTP 密码 | 留空则保持不变 |
| 加密方式 | 无 / SSL/TLS / STARTTLS |
| 跳过证书验证 | 自签名证书时启用 |
| 强制认证 | 强制 AUTH LOGIN |

#### Worker 代理

| 配置项 | 说明 |
|--------|------|
| Worker URL | HTTP/HTTPS 地址 |
| Worker 密钥 | 验证密钥 |
| 允许 HTTP 图片请求 | 是否允许 HTTP（非 HTTPS）图片请求 |

#### 日志维护

| 配置项 | 说明 |
|--------|------|
| 消费日志开关 | 是否记录额度消耗日志（增加 DB 写入） |
| 清理历史日志 | 选择时间点（快捷：24 小时前/7 天前/30 天前），启动后台清理任务 |
| 服务端日志管理 | 查看日志文件信息、按数量/天数清理 |

#### 性能设置

| 配置项 | 说明 |
|--------|------|
| 磁盘缓存开关 | 启用磁盘缓存 |
| 缓存阈值（MB） | 触发缓存的大小阈值 |
| 最大缓存大小（MB） | 缓存上限 |
| 缓存路径 | 容器环境中隐藏 |
| 监控开关 | 启用系统资源监控 |
| CPU 阈值（%） | CPU 使用率告警阈值 |
| 内存阈值（%） | 内存使用率告警阈值 |
| 磁盘阈值（%） | 磁盘使用率告警阈值（超过后拒绝新请求） |

**运维操作**：
- 查看运行时统计
- 清理非活跃缓存
- 重置统计
- 强制 GC

#### 系统维护

- 查看当前版本和运行时间
- 检查更新（从 GitHub Releases 获取最新版本）
- 查看更新日志

---

### 5.15 系统设置 — 计费与定价

进入**系统设置 → 计费**。

#### 额度设置

| 配置项 | 说明 |
|--------|------|
| 新用户额度 | 新注册用户获得的初始额度 |
| 预扣额度 | 请求开始时预扣的 token 缓冲量 |
| 邀请人奖励 | 邀请人获得的奖励额度（需确认合规条款） |
| 被邀请人奖励 | 被邀请人获得的奖励额度（需确认合规条款） |
| 免费模型预扣 | 免费模型是否也执行预扣费 |
| 充值链接 | 自定义充值页面链接 |
| 文档链接 | 自定义文档页面链接 |

#### 货币与显示

| 配置项 | 说明 |
|--------|------|
| 额度显示类型 | USD / CNY / CUSTOM / TOKENS |
| 每单位额度 | TOKENS 模式下显示 |
| USD 汇率 | 最小值 0.0001 |
| 自定义货币符号 | 最多 8 字符（CUSTOM 模式必填） |
| 自定义汇率 | 每 USD 兑换的单位数（CUSTOM 模式必填） |
| 货币显示开关 | 是否以货币形式显示额度 |
| Token 统计显示 | 是否显示 token 统计 |

#### 模型定价

四个标签页：模型 / 未定价模型 / 工具价格 / 上游同步

**模型定价编辑**：
- 每个模型可独立配置 `ModelPrice`、`ModelRatio`、`CacheRatio`、`CreateCacheRatio`、`CompletionRatio`、`ImageRatio`、`AudioRatio`、`AudioCompletionRatio`
- 支持从上游同步定价（选择渠道 → 获取 → 应用）
- 是否公开比率（`ExposeRatioEnabled`）

**工具价格**：按工具类型配置（web_search、file_search、google_search、image_generation 等），单位为 $/1K 次调用

**计费模式**：
- `ratio` — 比率模式（默认）
- `tiered_expr` — 阶梯表达式模式

#### 分组定价

| 配置项 | 说明 |
|--------|------|
| 充值分组倍率 | 不同充值档位对应的分组 |
| 分组倍率 | 每个分组的价格倍率（如 vip:0.8 表示 8 折） |
| 用户可用分组 | 用户可使用的分组列表 |
| 分组间倍率 | 用户分组 × 使用分组的特殊倍率矩阵 |
| 自动分组 | 自动分组的候选列表 |
| 最大自动分组数 | 默认 5 |
| 默认使用自动分组 | 是否默认启用 |
| 分组特殊可用分组 | 分组的特殊可用渠道配置 |

#### 支付网关

> **注意**：配置支付网关前，超级管理员必须先确认合规条款（6 条声明，需输入确认文本）。

**通用设置**

| 配置项 | 说明 |
|--------|------|
| 价格 | 本地货币/USD 价格 |
| 最低充值 | 最低充值金额 |
| 支付方式 | JSON 数组，支持可视化编辑器（类型：stripe / waffo_pancake / 其他→Epay） |
| 预设金额 | JSON 数组（如 `[10,20,50,100,200,500]`） |
| 金额折扣 | JSON 对象（金额→折扣率映射） |

**EPay**

| 配置项 | 说明 |
|--------|------|
| 支付地址 | EPay 网关地址 |
| 自定义回调地址 | 仅 Origin 部分 |
| 商户 ID | EpayId |
| 商户密钥 | EpayKey |

**Stripe**

| 配置项 | 说明 |
|--------|------|
| API 密钥 | Stripe Secret Key |
| Webhook 密钥 | Stripe Webhook Secret |
| Price ID | Stripe 产品 Price ID |
| 单价 | 每单位价格 |
| 最低充值 | Stripe 最低充值金额 |
| 优惠码 | 是否启用 Stripe Promotion Codes |

Webhook 地址：`<ServerAddress>/api/stripe/webhook`  
事件：`checkout.session.completed`、`checkout.session.expired`

**Creem**

| 配置项 | 说明 |
|--------|------|
| API 密钥 | Creem API Key |
| Webhook 密钥 | Creem Webhook Secret |
| 测试模式 | 是否使用测试环境 |
| 产品列表 | JSON 数组 |

Webhook 地址：`<ServerAddress>/api/creem/webhook`

**Waffo Pancake**

| 配置项 | 说明 |
|--------|------|
| 商户 ID | Merchant ID |
| 私钥 | Private Key |
| 返回 URL | 支付完成后的跳转地址 |
| 产品绑定 | 店铺/产品绑定配置 |

**Waffo**

| 配置项 | 说明 |
|--------|------|
| 启用开关 | 是否启用 Waffo |
| API 密钥 / 私钥 / 公钥证书 | 生产环境凭据 |
| 沙箱凭据 | 沙箱环境独立配置 |
| 沙箱开关 | 是否使用沙箱 |
| 商户 ID | Merchant ID |
| 货币 | 默认 USD |
| 单价 / 最低充值 | 价格配置 |
| 通知/返回 URL | 回调地址 |
| 支付方式 | 支持的支付方式列表 |

#### 签到奖励

| 配置项 | 说明 |
|--------|------|
| 签到功能开关 | 是否启用每日签到 |
| 最小签到额度 | 每次签到的最低随机额度（默认 1000） |
| 最大签到额度 | 每次签到的最高随机额度（默认 10000） |

---

### 5.16 系统设置 — 模型与路由

进入**系统设置 → 模型**。

#### 全局模型配置

| 配置项 | 说明 |
|--------|------|
| 透传请求 | 启用后请求直接转发，不进行后处理 |
| 思考模型黑名单 | JSON 数组，跳过 -thinking/-nothinking 后缀处理 |
| Chat→Responses 策略 | 实验性预览：自动将 Chat 请求转换为 Responses 格式 |
| 流式 Ping 开关 | 流式响应中发送 keep-alive ping |
| Ping 间隔（秒） | ping 间隔时长 |

#### 路由可靠性

**请求重试**

| 配置项 | 说明 |
|--------|------|
| 重试次数 | 0–10 |
| 自动重试状态码 | 逗号/范围格式（如 `401,403,429,500-599`） |
| 默认重试码 | `100-199,300-399,401-407,409-499,500-503,505-523,525-599` |

**渠道健康检查**

| 配置项 | 说明 |
|--------|------|
| 自动测试开关 | 启用渠道定期健康检查 |
| 测试模式 | `scheduled_all`（定时全量）/ `auto_ban_only`（仅自动禁用时）/ `passive_recovery`（被动恢复） |
| 测试间隔（分钟） | 定时测试间隔 |
| 测试并发数 | 1–32 |
| 自动恢复开关 | 测试成功后自动重新启用渠道 |

**自动禁用规则**

| 配置项 | 说明 |
|--------|------|
| 自动禁用开关 | 启用自动禁用异常渠道 |
| 禁用阈值（秒） | 响应超过此时间则禁用 |
| 自动禁用状态码 | 触发禁用的状态码（默认 401） |
| 自动禁用关键词 | 包含这些错误关键词时禁用（每行一个，不区分大小写） |

#### Gemini 设置

| 配置项 | 说明 |
|--------|------|
| 安全设置 | JSON 按类别配置 |
| 版本设置 | JSON 模型→版本映射 |
| 支持 Imagine 的模型 | JSON 数组 |
| 思考适配器 | 启用 -thinking/-thinking-{budget}/-nothinking 后缀路由 |
| 思考预算百分比 | 0.002–1 |
| Function Call 思考签名 | 是否启用 |
| 移除 Function Response ID | Vertex AI 兼容 |

#### Claude 设置

| 配置项 | 说明 |
|--------|------|
| 模型请求头设置 | JSON 按模型配置请求头覆盖 |
| 默认 Max Tokens | JSON（如 `{"default":8192,"claude-3-haiku-...":4096}`） |
| 思考适配器 | 启用思考模式后缀路由 |
| 思考预算百分比 | 0.1–1 |

#### Grok 设置

| 配置项 | 说明 |
|--------|------|
| 违规扣费开关 | 是否对违规内容扣费 |
| 违规扣费金额 | 基础金额（实际 = 基础 × 分组倍率） |

#### 渠道亲和

| 配置项 | 说明 |
|--------|------|
| 亲和开关 | 启用渠道亲和（粘性路由） |
| 成功时切换 | 请求成功后更新亲和 |
| 禁用时保留 | 渠道禁用时是否保留亲和记录 |
| 最大条目数 | 默认 100000 |
| 默认 TTL（秒） | 默认 3600 |
| 规则 | JSON 数组，按条件匹配设置亲和 |

规则支持：模型正则、路径正则、User-Agent 匹配、密钥来源（context_int/context_string/request_header/gjson）、值正则、TTL、参数覆盖模板。

预置模板：`codexCli`（Codex CLI）、`claudeCli`（Claude CLI）

#### 模型部署

| 配置项 | 说明 |
|--------|------|
| IO.NET 开关 | 启用 IO.NET 部署 |
| API 密钥 | IO.NET API Key（含测试连接按钮） |

---

### 5.17 系统设置 — 内容管理

进入**系统设置 → 内容**。

#### 数据看板

| 配置项 | 说明 |
|--------|------|
| 数据导出开关 | 启用数据导出 |
| 导出间隔（分钟） | 1–1440 |
| 默认时间粒度 | 小时/天/周 |

#### 公告管理

| 配置项 | 说明 |
|--------|------|
| 公告开关 | 启用公告面板 |
| 公告列表 | JSON 数组，每条包含：内容、发布日期、类型（default/ongoing/success/warning/error）、额外信息 |

#### API 信息

| 配置项 | 说明 |
|--------|------|
| API 信息开关 | 启用 API 信息面板 |
| API 信息列表 | JSON 数组，每条包含：URL、路由、描述、颜色 |

#### FAQ

| 配置项 | 说明 |
|--------|------|
| FAQ 开关 | 启用 FAQ 面板 |
| FAQ 列表 | JSON 数组，每条包含：问题、答案 |

#### Uptime Kuma

| 配置项 | 说明 |
|--------|------|
| Uptime 开关 | 启用 Uptime 监控面板 |
| Uptime 分组 | JSON 配置 |

#### 聊天预设

配置聊天预设链接，支持可视化编辑器。每条包含名称和 URL（支持 `{key}`、`{address}` 等模板变量）。

#### 绘图设置

| 配置项 | 说明 |
|--------|------|
| 绘图功能开关 | 启用 Midjourney 等绘图功能 |
| 通知开关 | 允许上游回调（注意：会暴露服务器 IP） |
| 账号筛选 | 按账号筛选任务 |
| 转发 URL | 将回调 URL 重写为本地地址 |
| 清除模式 | 清除 --fast/--relax/--turbo 模式标记 |
| 动作成功检查 | 上采样/变体前要求原图成功 |

---

### 5.18 订阅计划管理

管理员可创建和管理订阅套餐。

#### 创建/编辑计划

| 配置项 | 说明 |
|--------|------|
| 计划标题 | 必填 |
| 计划副标题 | 简短描述 |
| 价格 | 数字，步长 0.01 |
| 额度 | 计划包含的额度（0 = 无限） |
| 升级分组 | 购买后用户升级到的分组 |
| 降级分组 | 订阅到期后用户降级到的分组（含"恢复购买前分组"选项） |
| 购买限制 | 每用户最大购买次数（0 = 不限） |
| 排序 | 显示优先级 |
| 启用状态 | 开关 |
| 允许余额支付 | 是否允许使用钱包余额购买 |
| 额度用完后允许钱包 | 订阅额度耗尽后是否允许使用钱包余额 |

**有效期设置**

| 配置项 | 说明 |
|--------|------|
| 时长单位 | year / month / day / hour / custom（自定义秒数） |
| 时长值 | 对应单位的数量 |
| 自定义秒数 | 仅 custom 单位时启用 |

**额度重置**

| 配置项 | 说明 |
|--------|------|
| 重置周期 | never / daily / weekly / monthly / custom（自定义秒数） |
| 自定义秒数 | 仅 custom 周期时启用 |

**第三方支付配置**

| 配置项 | 说明 |
|--------|------|
| Stripe Price ID | Stripe 产品价格 ID |
| Creem Product ID | Creem 产品 ID |
| Waffo Pancake Product ID | 下拉选择已绑定产品，或点击 "+ 创建" 新建产品 |

#### 计划操作

- 编辑、启用/禁用
- 重置订阅额度（可选提前重置时间）
- 查看用户订阅列表

#### 用户订阅管理（管理员）

- 为用户手动创建订阅
- 查看用户所有订阅
- 按计划重置用户订阅
- 失效/删除用户订阅

---

### 5.19 自定义 OAuth 提供商

超级管理员可配置任意 OAuth 2.0 兼容的登录提供商：

#### 创建提供商

| 配置项 | 说明 |
|--------|------|
| 名称 | 提供商显示名称 |
| Slug | URL 安全标识符 |
| 图标 | 图标标识 |
| Client ID | OAuth 客户端 ID |
| Client Secret | OAuth 客户端密钥 |
| OIDC Discovery URL | 可选，自动发现授权/Token/用户信息端点 |
| 授权端点 | 手动配置（如未使用 Discovery） |
| Token 端点 | 手动配置 |
| 用户信息端点 | 手动配置 |
| 作用域 | 请求的权限范围 |
| 映射字段 | 用户信息字段映射（sub、name、email 等） |

功能：
- 预设选择器（常用提供商快速配置）
- OIDC Discovery 自动获取配置
- 访问策略模板
- 用户可在个人资料中绑定/解绑

---

### 5.20 性能监控与运维

超级管理员可访问**性能监控**页面：

| 功能 | 说明 |
|------|------|
| 运行状态 | 内存、Goroutine、GC 等运行时指标 |
| 磁盘缓存 | 查看和清理磁盘缓存 |
| 强制 GC | 手动触发垃圾回收 |
| 日志文件 | 查看和清理服务端日志文件 |
| 实例管理 | 查看集群中各节点状态、清理过期实例 |
| 系统任务 | 管理日志清理等后台任务（含进度追踪） |

---

### 5.21 管理员权限体系

#### 角色层级

| 角色 | 级别 | 权限范围 |
|------|------|----------|
| 普通用户 | 1 | 创建令牌、调用 API、查看自身日志 |
| 管理员 | 10 | 用户管理、渠道管理、兑换码管理、日志查看 |
| 超级管理员 | 100 | 系统设置、性能管理、OAuth 提供商、合规确认 |

#### 管理员权限矩阵

超级管理员可为管理员分配精细化权限：
- 权限目录来自 `/api/authz/catalog`（资源 × 操作）
- 按资源维度配置：渠道、用户、令牌、兑换码、日志等
- 按操作维度配置：读取、写入、删除、敏感操作等
- 例如：`CHANNEL:SENSITIVE_WRITE` 控制渠道敏感字段的编辑权限

#### 2FA 与敏感操作

以下操作需要通过安全验证（2FA / Passkey）：
- 查看渠道密钥
- 注册/删除 Passkey
- 修改敏感渠道配置

---

## 第六章 定价与计费说明

### 6.1 计费模型概览

平台支持三种计费模式：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| Ratio（比率） | 基于 token 数 × 比率计算 | 大多数文本模型 |
| Price（固定价格） | 每次请求固定费用 | 图片生成、按次计费模型 |
| Tiered Expr（阶梯表达式） | 自定义表达式计算 | 复杂定价需求 |

### 6.2 额度单位换算

| 常量 | 值 | 含义 |
|------|-----|------|
| `QuotaPerUnit` | 500,000 | $1 = 500,000 额度单位 |
| `USD` | 500 | $0.002 = 1 额度单位 |
| `USD2RMB` | 7.3 | 美元兑人民币参考汇率 |
| `RMB` | USD/USD2RMB | 人民币额度换算 |

> 1 个额度单位 ≈ $0.000002（百万分之二美元）

### 6.3 Ratio 模式计费公式

#### 预扣费

```
预扣 token = max(promptTokens, PreConsumedQuota) + maxTokens
比率 = modelRatio × groupRatio
预扣额度 = QuotaFromFloatStrict(预扣 token × 比率)
```

#### 实际结算

```
比率 = modelRatio × groupRatio

基础 token = promptTokens
  - （非 Claude）减去 cacheTokens, cacheCreationTokens, imageTokens, audioTokens

prompt 额度 = 基础 token
            + cacheTokens × cacheRatio
            + imageTokens × imageRatio
            + cacheCreationTokens × cacheCreationRatio（含 5 分钟/1 小时分级）

completion 额度 = completionTokens × completionRatio

总额度 = (prompt 额度 + completion 额度) × 比率
       + audio 额度（音频 token × 音频价格/1M × 分组比率 × QuotaPerUnit）
       × OtherRatios 乘数（视频秒数、分辨率、图片数量等）
       + 工具调用附加费

最终额度 = QuotaFromDecimalChecked(总额度)
```

#### Claude 特殊语义

Claude 的缓存 token 不从基础 token 中扣除，而是通过独立的缓存比率计价。1 小时缓存写入 = 5 分钟比率 × 1.6 倍。

### 6.4 固定价格模式

```
额度 = modelPrice × QuotaPerUnit × groupRatio
```

适用于图片生成、按次计费的模型（如 DALL-E、Suno、Midjourney 等）。

### 6.5 阶梯表达式模式

```
原始成本 = RunExprWithRequest(expr, {P, C, Len}, requestInput)
预扣额度 = QuotaRoundStrict(原始成本 / 1,000,000 × QuotaPerUnit × groupRatio)
```

支持的参数：P（prompt tokens）、C（completion tokens）、Len（总长度）、CR（缓存读）、CC（缓存写 5 分钟）、CC1h（缓存写 1 小时）、Img、ImgO、AI（音频输入）、AO（音频输出）。

详见 `pkg/billingexpr/expr.md`。

### 6.6 分组与倍率

#### 分组倍率解析优先级

1. **自动分组**（`auto_group`）→ 设置 `UsingGroup`
2. **分组间特殊倍率**：`GetGroupGroupRatio(userGroup, usingGroup)` — 用户分组 × 使用分组矩阵
3. **分组常规倍率**：`GetGroupRatio(usingGroup)` — 使用分组的基础倍率

#### 倍率影响

| 倍率 | 影响范围 |
|------|----------|
| `modelRatio` | 模型基础价格 |
| `completionRatio` | 输出 token 相对于输入的价格倍率 |
| `cacheRatio` | 缓存读命中 token 的折扣（如 0.1 = 1 折） |
| `cacheCreationRatio` | 缓存写入 token 的溢价（如 1.25 = 125%） |
| `groupRatio` | 用户分组的价格倍率 |
| `imageRatio` | 图片 token 的价格倍率 |
| `audioRatio` | 音频输入的价格倍率 |
| `audioCompletionRatio` | 音频输出的价格倍率 |

### 6.7 预扣费与结算流程

```
请求开始
    │
    ▼
┌──────────────┐
│  预扣费       │  ← 估算最大消耗，预扣额度
│  (PreConsume) │
├──────────────┤
│  信任用户检查 │  ← 额度 > 5,000,000 的用户跳过预扣
│  资金源检查   │  ← 钱包 → 订阅
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  请求上游     │  ← 实际 API 调用
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  结算         │  ← 实际消耗 vs 预扣
│  (Settle)     │
├──────────────┤
│  delta > 0    │  ← 实际 > 预扣 → 补扣差额
│  delta < 0    │  ← 实际 < 预扣 → 退还差额
│  delta = 0    │  ← 无需调整
└──────────────┘
```

**信任用户**：可用额度 > 5,000,000（约 $10）的用户跳过预扣费，直接调用后结算。

**资金源**：
- `wallet` — 从钱包余额扣费
- `subscription` — 从订阅额度扣费
- 计费偏好决定优先级（`subscription_first` / `wallet_first` / `subscription_only` / `wallet_only`）

### 6.8 特殊计费类型

| 类型 | 计费方式 |
|------|----------|
| 图片生成 | 按张计费（不同模型/分辨率/数量价格不同） |
| 音频转录 | 按音频时长计费 |
| TTS | 按生成音频时长计费 |
| Embedding | 按 token 数计费 |
| Rerank | 按 token 数计费 |
| 视频生成 | 按时长/分辨率计费 |
| 异步任务 | 预估 → 提交时调整 → 完成时最终结算 |

### 6.9 工具调用附加费

| 工具 | 价格（$/1K 次调用） |
|------|---------------------|
| web_search | 10 |
| web_search_preview | 10 |
| file_search | 2.5 |
| google_search | 14 |
| image_generation | 150 |
| web_search_preview (gpt-4o*) | 25 |

计算公式：`价格 × 调用次数 / 1000 × 分组比率 × QuotaPerUnit`

### 6.10 速率限制

| 限制类型 | 配置 | 默认值 |
|----------|------|--------|
| 全局 API 限制 | 环境变量 | — |
| 全局 Web 限制 | 环境变量 | — |
| 关键操作限制 | 内置 | 20 次/20 分钟 |
| 搜索限制 | 内置 | 10 次/60 秒 |
| 上传/下载 | 内置 | 10 次/60 秒 |
| 模型请求限制 | 系统设置 | 按分组配置，周期 1 分钟 |
| 令牌级限制 | 令牌配置 | 用户自定义 |

---

## 第七章 支持的渠道类型

| ID | 类型名称 | 默认 Base URL | 说明 |
|----|----------|---------------|------|
| 1 | OpenAI | api.openai.com | GPT 系列、DALL-E、Whisper、TTS |
| 3 | Azure | — | Azure OpenAI Service |
| 4 | Ollama | localhost:11434 | 本地 Ollama 模型 |
| 8 | Custom | — | 自定义 OpenAI 兼容端点 |
| 14 | Anthropic | api.anthropic.com | Claude 系列 |
| 15 | Baidu | aip.baidubce.com | 文心一言 |
| 16 | Zhipu | open.bigmodel.cn | 智谱 GLM |
| 17 | Ali | dashscope.aliyuncs.com | 通义千问 |
| 18 | Xunfei | — | 讯飞星火 |
| 19 | 360 | api.360.cn | 360 智脑 |
| 20 | OpenRouter | openrouter.ai/api | OpenRouter 聚合 |
| 23 | Tencent | hunyuan.tencentcloudapi.com | 腾讯混元 |
| 24 | Gemini | generativelanguage.googleapis.com | Google Gemini |
| 25 | Moonshot | api.moonshot.cn | 月之暗面 Kimi |
| 27 | Perplexity | api.perplexity.ai | Perplexity |
| 31 | LingYiWanWu | api.lingyiwanwu.com | 零一万物 |
| 33 | AWS | — | AWS Bedrock |
| 34 | Cohere | api.cohere.ai | Cohere Rerank/Chat |
| 35 | MiniMax | api.minimax.chat | MiniMax |
| 36 | SunoAPI | — | Suno 音乐生成 |
| 37 | Dify | api.dify.ai | Dify ChatFlow |
| 38 | Jina | api.jina.ai | Jina Rerank/Embedding |
| 39 | Cloudflare | api.cloudflare.com | Cloudflare Workers AI |
| 40 | SiliconFlow | api.siliconflow.cn | 硅基流动 |
| 41 | Vertex AI | — | Google Vertex AI |
| 42 | Mistral | api.mistral.ai | Mistral AI |
| 43 | DeepSeek | api.deepseek.com | DeepSeek |
| 44 | MokaAI | api.moka.ai | MokaAI |
| 45 | VolcEngine | ark.cn-beijing.volces.com | 火山引擎（豆包） |
| 46 | Baidu V2 | qianfan.baidubce.com | 百度千帆 V2 |
| 47 | Xinference | — | Xinference 本地推理 |
| 48 | xAI | api.x.ai | xAI Grok |
| 49 | Coze | api.coze.cn | Coze Bot |
| 50 | Kling | api.klingai.com | 快影 Kling 视频生成 |
| 51 | Jimeng | visual.volcengineapi.com | 即梦图片生成 |
| 52 | Vidu | api.vidu.cn | Vidu 视频生成 |
| 53 | Submodel | llm.submodel.ai | Submodel |
| 54 | DoubaoVideo | ark.cn-beijing.volces.com | 豆包视频 |
| 55 | Sora | api.openai.com | Sora 视频生成 |
| 56 | Replicate | api.replicate.com | Replicate |
| 57 | Codex | chatgpt.com | ChatGPT Subscription |
| 58 | Advanced Custom | — | 高级自定义路由（详见 5.2.3） |
| 59 | Sub2API | — | Sub2API |
| 60 | New API | — | New API 互通 |
| 61 | Derouter | api.derouter.ai | Derouter 子密钥管理 |

> 还有一些历史兼容类型（如 Midjourney、OhMyGPT 等）仍然支持但不在主要推荐列表中。

---

## 第八章 常见问题 FAQ

### Q: 如何获取 API 密钥？

登录后进入**令牌管理**页面，点击**新建令牌**即可创建。创建后复制密钥（`sk-xxxx` 格式）用于 API 调用。

### Q: 我的额度用完了怎么办？

- 使用兑换码充值
- 通过在线支付充值（如管理员已配置）
- 联系管理员手动充值
- 每日签到获取免费额度
- 通过推荐链接邀请他人注册获取返利

### Q: API 调用返回 401 是什么问题？

令牌密钥无效或已过期。请检查：
1. 密钥是否正确复制（以 `sk-` 开头）
2. 令牌是否已过期
3. 令牌是否被禁用或删除
4. 多节点部署时，`SESSION_SECRET` 是否一致

### Q: API 调用返回 429 是什么问题？

请求频率超出速率限制。请：
1. 降低请求频率
2. 联系管理员调整速率限制配置
3. 等待限制窗口重置后重试

### Q: API 调用返回 403 是什么问题？

没有权限调用该模型。请检查：
1. 令牌是否配置了模型限制
2. 该模型是否在你所属分组的可用范围内
3. 模型是否已被管理员禁用

### Q: API 调用返回 402 是什么问题？

余额不足（预扣费失败）。请充值后重试。

### Q: 如何使用流式响应（SSE）？

在请求中添加 `"stream": true`：

```json
{
  "model": "gpt-4o",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": true
}
```

### Q: 如何查看我的 API 用量？

1. 登录后进入**使用日志**页面查看详细调用记录
2. 使用令牌查询接口获取汇总用量
3. 在**数据看板**查看趋势图表

### Q: 支持哪些编程语言的 SDK？

由于平台兼容 OpenAI API 格式，可使用任何支持 OpenAI 的 SDK：
- **Python**: `openai` 库
- **Node.js**: `openai` 包
- **Go**: `go-openai`
- **Java**: `openai-java`
- 更多语言请参考 OpenAI 官方 SDK 列表

只需将 `base_url` 指向你的 New API 地址即可。

### Q: 如何切换模型格式（OpenAI / Claude / Gemini）？

根据调用的接口路径自动决定格式：
- `/v1/chat/completions` → OpenAI 格式
- `/v1/messages` → Claude 格式
- `/v1beta/models/{model}:generateContent` → Gemini 格式

同一令牌可使用任意格式，平台自动转换。

### Q: 什么是"自动分组"？

自动分组是一种智能路由机制：令牌设置为 `auto` 分组后，平台会按配置的顺序依次尝试多个分组的渠道，直到请求成功。配合"跨分组重试"开关，可在失败时自动切换到下一个分组。

### Q: 什么是"渠道亲和"？

渠道亲和是一种粘性路由机制：当某个用户/密钥的请求在某渠道成功后，后续相同条件的请求会优先路由到同一渠道。这对于需要会话一致性的场景（如 Codex CLI、Claude CLI）非常有用。

### Q: 多节点部署有什么注意事项？

- 所有节点必须使用相同的主数据库和 `SESSION_SECRET`
- 共享 Redis 的节点还必须使用相同的 `CRYPTO_SECRET`
- 共享 Redis 时，Session 撤销立即传播；独立 Redis 时，在 `SYNC_FREQUENCY`（默认 60 秒）内收敛
- 无 Redis 时，每次 Session 验证直接查数据库

### Q: 如何配置 OpenAI Responses API 的自动转换？

在**系统设置 → 模型 → 全局模型配置**中，配置 `Chat→Responses 策略`（实验性）：
- `enabled` — 是否启用
- `all_channels` — 是否对所有渠道生效
- `channel_ids` — 指定渠道 ID 列表
- `model_patterns` — 匹配的模型模式

---

> **更多帮助**：[官方文档](https://docs.newapi.pro) | [Issue 反馈](https://github.com/QuantumNous/new-api/issues) | [最新版本](https://github.com/QuantumNous/new-api/releases)

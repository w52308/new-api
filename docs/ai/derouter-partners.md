# derouter.ai 分销作战手册

> 来源：https://derouter.ai/docs/partners
> 抓取时间：2026-08-17
> 副标题：开一家自己的 AI API 店：你进货、定价、收钱

这是 [分销指南](https://derouter.ai/docs/reseller) 的 **“怎么卖”** 姊妹篇。分销指南讲机制 —— 充值、创建客户密钥、发给客户；这份手册讲怎么把“已经在用 API 的人”变成稳定收益：找谁、怎么定价、怎么成交、怎么开口。

---

## 1 · 你在做什么

你在开一家自己的 AI API 店。你充值 derouter.ai 余额（你的进货成本），用自己定的价格创建 **客户密钥**，发给客户。客户通过 **apikey.cloud** 调 API，全程看不到 derouter.ai。差价归你。

有三点让这是一门真生意，而不只是发个推荐链接：

- **白标。** 客户从头到尾只接触 `apikey.cloud` 和你给的 Key，看不到、也绕不开你的进货渠道。
- **价你说了算。** 你设“成本 → 客户价”，倍率在创建密钥时锁定，续费自动沿用 —— 不会算错，也不会意外改价。
- **线下收款。** 客户怎么付钱给*你*完全由你定（银行转账、支付宝、加密货币、对公开票 —— 任意方式），平台不碰这笔钱。

---

## 2 · 找谁卖

优先找已经有 API 需求的人，别从零教育完全没需求的人。

- **独立 AI 工具开发者** —— 做 bot、插件、自动化脚本，想用满血模型又不想自己搭。去掘金、V2EX、GitHub issue、独立开发者群找。
- **出海 / 创业小团队** —— 需要多人用、看得到用量、按项目设额度上限。去创业群、远程办公群找。
- **内容 / 设计工作室** —— 要 `gpt-image-2` 批量生图，还想查绘图日志。去 AI 绘画群、设计社区找。
- **受限地区用户** —— 要一个稳定可达的入口，不想折腾海外信用卡。去留学生群、远程工作群找。

---

## 3 · 怎么定价

你选的是加价，不是打折。你设你的成本和客户看到的价，利润率 = `(客户价 − 你的成本) / 客户价`。

| 你的成本 | 客户额度 | 倍率 | 利润率 | 定位 |
|---------|---------|------|-------|------|
| $100 → $115 | 1.15x | 13% | 走量薄利 |
| $100 → $130 | 1.30x | 23% | 推荐起步 |
| $100 → $150 | 1.50x | 33% | 含你的接入 + 答疑服务 |

倍率在创建密钥时锁定，续费自动沿用 —— 不用心算，也不会意外改价。

**别只比单价。** 客户真正买的是“开箱即用 + 稳定入口 + 中文答疑”，不是“每 token 最便宜”。这才是你的卖点。

创建密钥的具体界面（成本输入框、客户价输入框、利润率实时预览）在 [分销指南](https://derouter.ai/docs/reseller) 里有逐步演示。

---

## 4 · 标准交付流程

你的活不是“发个 Key”，而是把客户的第一条真实请求跑通。

1. 充值进货（先小额、验证，再放大）。
2. 创建客户密钥 —— 填你的成本 + 客户看到的价。
3. 确认倍率 / 利润率，创建（锁定）。
4. 把 Key + Base URL 发给客户（模板见下）。
5. 让客户先用模型列表请求验通。
6. 再跑一条真实请求 —— chat 或生图。
7. 客户在 apikey.cloud 自查用量；额度快用完 → 你续费。

### 交付模板

> 您好，
> 您的 API Key: sk-ant-1234567890abcdef...
> Base URL(OpenAI SDK): https://api.apikey.cloud/openai/v1
> 生图 / 长任务请用直连端点: https://api-direct.apikey.cloud/openai/v1
> 随时查看用量: https://apikey.cloud（邮箱 OTP 登录，绑定一次即可）

### 给客户哪个 Base URL

| 客户场景 | Base URL | 超时 |
|---------|---------|------|
| 文本 chat (<100s) | `https://api.apikey.cloud/openai/v1` | 100s |
| 生图 / 长输出 | `https://api-direct.apikey.cloud/...` | 600s |
| Anthropic 原生（Claude Messages API） | 把 `/openai/v1` 换成 `/proxy/v1` | — |

两个域名都是完整白标：客户全程看不到 derouter.ai。

### 客户接入示例（OpenAI SDK）

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-ant-...",  # 你给客户的 Key
    base_url="https://api.apikey.cloud/openai/v1",
)

# 1) 先验 Key + 网络
client.models.list()

# 2) 一条真实 chat 请求
r = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user", "content": "hello"}],
)

# 生图 -> 走直连端点(避开 100s 超时)
img_client = OpenAI(
    api_key="sk-ant-...",
    base_url="https://api-direct.apikey.cloud/openai/v1",
)
img = img_client.images.generate(model="gpt-image-2", prompt="a cat")
```

可用模型：Claude Opus 4.8 / Sonnet 4.6 / Haiku 4.5、GPT-5.4 / GPT-5.5，以及 `gpt-image-2`。任何兼容 OpenAI SDK 的项目通常只改 `base_url` + `api_key` 两行。完整参考见 [API 接入指南](https://derouter.ai/docs/api)。

---

## 5 · 可复制话术

### 30 秒介绍

> 我提供满血 Claude / GPT API。你把 Base URL 改成 api.apikey.cloud，填我给你的 Key，就能用一把 Key 调 Claude Opus 4.8、GPT-5.5、gpt-image-2。兼容 OpenAI SDK，通常改两行就能用，用量和日志你自己在后台随时看。

### 价格话术

> 满血 Claude / GPT，一把 Key 全模型。你拿到的是开箱即用 + 稳定入口 + 中文答疑，不是让你自己去折腾搭建和踩坑。别比每 token 单价，算算"做不出来"的代价。

### 技术接入话术

> 项目已经用 OpenAI SDK 的话基本就两行：base_url 改成 https://api.apikey.cloud/openai/v1，api_key 换成我给你的 Key。先跑 models.list() 验通，再发真实请求。生图和长输出走 api-direct.apikey.cloud。

### 排错话术

> 失败先发我：请求时间、模型名、端点、状态码、是否流式。生图或任何长任务先切到 https://api-direct.apikey.cloud/openai/v1（默认域名封顶 100s，长请求会 524）。

---

## 6 · 客户异议应对

### “会不会被你卡额度？”

额度透明 —— 客户随时在 [apikey.cloud](https://apikey.cloud) 看自己的余额、用量和日志，他那侧没有任何隐藏。

### “迁移麻烦吗？”

两行 —— 改 `base_url` 和 `api_key`。模型名照标准填（如 `gpt-5.5`、`claude-sonnet-4-6`）。

### “生图 / 长请求超时？”

这类必须走直连端点 `api-direct.apikey.cloud`（600s）。默认域名封顶 100s，长请求会返回 524。

### “为什么不直接买官方？”

满血无阉割 + 一把 Key 全模型 + 中文答疑。对很多客户来说，这些加上一个稳定可达的入口，就是找你买的全部理由。

---

## 7 · 运营节奏

稳定成交靠的是固定节奏，不是偶尔发一次广告。

- **每天：** 联系 5 个已经在用 API 的人；发 1 条短内容（接入技巧、成本对比、或排错笔记）。
- **每周：** 整理 3 个真实案例（原来怎么用、省了什么、踩了什么坑）；复盘数据 —— 新增密钥、消耗速度、谁该续费了。

### 7 天启动清单

1. 小额充值，先给自己创建一把测试客户密钥。
2. 用交付模板在自己机器上跑通一遍 —— 确认白标 Base URL 能用。
3. 带一个真实客户走完 Key → `models.list()` → 第一条真实请求。
4. 引导客户在 apikey.cloud 设好用量追踪，让他自助。
5. 定好你的起步倍率（1.30x 是稳妥默认），用自己的话写一段 30 秒介绍。
6. 把这段介绍发给 3 个真正在用 API 的人。
7. 记下谁回复了；把问得最多的问题沉淀成一条固定回复。

---

遇到问题？在 [Telegram](https://t.me/derouter_ai) 联系我们，或发邮件给 [support@derouter.ai](mailto:support@derouter.ai)。

# Creem 配置

2026-11-05：原域名、Creem 账户和单次购买产品继续使用；支付流水与额度现由 Cloudflare D1 管理。

## 从现有接入开始

- 先运行 `pnpm check:payments` 做只读配置检查；2026-11-05 本轮复查全部通过。正式产品和回调已存在，不需要重新创建，也不需要为了接入额外安装 Next.js SDK。
- 查看下方沙箱验收记录，再到 [Creem Dashboard](https://creem.io/dashboard) 确认商店审核与收款账户验证状态。产品 active 和配置检查通过不能证明 KYC/KYB、商店审核或正式现金付款验收已经完成；本轮没有查询这些账户状态。
- 官方 [SKILL.md](https://creem.io/SKILL.md) 将生成式 AI 列为需先联系支持确认的类别。[AI Wrapper Compliance](https://docs.creem.io/merchant-of-record/account-reviews/ai-wrapper-compliance) 要求用户输入提示词生图/视频的产品接入 Moderation API，并禁止 face-swap、deepfake、face-manipulation 工具。
- 当前 `cloudflare/generation.ts` 使用服务端固定提示词、用户照片和白名单模板，没有用户自由文本提示词，也没有 Creem Moderation API 调用。固定模板职业头像流程的审核分类、是否需接入该 API，以及照片输入的审核要求，需向 support@creem.io 提供真实流程确认；不能据此直接判定产品获准、豁免或被禁止。
- 若确认需要接入，先在隔离测试环境实现；仅 `allow` 继续生成，`flag`、`deny`、超时及错误阻止生成。将请求延迟、审核费用、失败不消耗用户额度及重试幂等纳入验收。当前尚未实施。官方 [Moderation 文档](https://docs.creem.io/features/moderation) 说明其按文本单位计费，不应把重复审核固定模板视为已解决上传照片的审核。

| 套餐 | 正式产品 ID | 价格 | 额度 |
| --- | --- | --- | --- |
| Professional | prod_3VuEcSLV7nUFQIFYByNkaG | USD 25 | 30 |
| Executive | prod_3goNXcJoP80L3mmWoAdkZs | USD 45 | 60 + 10 |
| Free | 不创建支付 | 0 | 5 |

## 配置

普通变量在 wrangler.toml：APP_URL=https://www.professionalheadshotai.ink、CREEM_TEST_MODE=false，以及两个产品 ID。API key 与 webhook secret 放 Pages secrets。

原回调地址保持 https://www.professionalheadshotai.ink/api/auth/creem/webhook，兼容别名 /api/creem/webhook。不要重复注册回调。需要 checkout.completed 和 refund.created 事件。

当前 D1 迁移位于 database/d1，不依赖 Supabase schema 或 RPC。浏览器以 HttpOnly Cookie 验证会话；服务端保存订单价格/产品/额度快照，再创建 checkout。支付成功回跳不能证明到账，必须由签名回调事务入账，浏览器查询本人订单确认。

D1 唯一索引和触发器将记录事件、发放额度及退款收回额度作为原子操作。迁移的 3 条旧 pending 订单保留原始内容，没有重放旧回调或补发额度；缺少原价格/额度快照的旧订单需人工对账。

0003 迁移修复首次购买与退款权益：首次购买保留页面已经显示的免费额度；退款按订单回收额度，并恢复基础套餐或其他仍有效订单对应的最高套餐。原导入账户的套餐通过 base_plan_type 保留。已有完成支付的旧库不得直接推断基础套餐，必须先对账。

## 验证边界

本地实际 D1 运行时已覆盖重复/并发回调、金额不符、部分/全额退款和超额退款拒绝。正式域名两个回调地址均已验证：有效签名的非财务探测事件返回 received/ignored，错误签名返回 401，没有创建订单或改变余额。

两个套餐已在隔离项目 professional-headshot-ai-qa 完成 Creem Test Mode 真实付款/商户回调/全额退款：Professional 额度 5→35→5；Executive 5→75→5。供应商 transaction 和本地账本均为 refunded，最终恢复 Free/1K/水印；未进行正式现金扣款。详见 [生产验收记录](docs/production-acceptance.md)。

Test Mode 必须使用独立测试 key、产品和签名密钥；不能将正式 key 配到测试 API。测试配置保存在忽略文件 .dev.vars.creem-test；bootstrap-creem-test.ts 配置产品/回调，test-payment-flow.ts 核验订单与退款。已有订单或退款尝试先 inspect，不能重复创建。普通 cf-migration 预览没有付费凭据；独立 QA 项目仅有测试支付 key，独立 D1/R2，没有原客户数据和正式生图 key。

pnpm check:payments 只读检查当前网站 /api/plans、正式产品 active/onetime/prod、价格和币种、回调事件及签名密钥匹配；失败非零退出，不创建交易。它不代替上述实际回调验收。

金额校验已实现商户认可的优惠及零元优惠订单，分别处理含税价/价外税，同时核对原价、优惠、税额、实付、产品及订单归属；零元优惠不记成现金收入。原价沙箱付款/退款已实测；优惠与税额场景仍仅为本地回归，争议/拒付仍需人工处理。

参考：[Creem Webhooks](https://docs.creem.io/code/webhooks)、[Create checkout](https://docs.creem.io/api-reference/endpoint/create-checkout)。

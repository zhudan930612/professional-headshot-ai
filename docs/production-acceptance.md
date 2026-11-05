# 生产验收记录

2026-11-05。目标：完成 Cloudflare 迁移后的真实功能验收和发布收尾，不把模拟测试当作真实业务成功。

## 已验证的真实生图

使用独立验收账号和仓库公开示例图 `public/reference-templates/corporate/corporate_01.jpg`，未使用客户私有照片。1K/2K 权益由测试夹具设置，不能据此声称购买后的权益发放已验证。

| 检查 | 1K | 2K |
| --- | --- | --- |
| 供应商真实任务 | completed | completed |
| 实际输出 | PNG，896 × 1200 | PNG，1792 × 2400 |
| 文件大小 | 1,073,569 字节 | 5,725,791 字节 |
| 实际扣额度 | 1 次测试额度 | 1 次测试额度 |
| 保存、下载、历史读取 | 通过 | 通过 |
| 重复保存 | 返回同一结果，无重复扣额度 | 返回同一结果，无重复扣额度 |
| 匿名访问结果图 | 401 | 401 |
| 供应商返回费用 | USD 0.046 / 3.1 credits | USD 0.096 / 6.4609 credits |

两次供应商报告费用合计 USD 0.142。原客户余额快照对比一致。测试结果已人工查看，图像可正常解码，人物和画面没有明显损坏；这不是对所有照片效果的保证。

证据位于忽略目录 `.migration/acceptance/`：generation-state.json、provider-1K.json、provider-2K.json、result-1K.png、result-2K.png。该目录包含测试会话，不提交。

## 支付及安全收尾

- 正式 Creem 创建 checkout 的实际接口已返回 200：USD 25、30 次额度，订单快照与 Creem checkout ID 一致。该正式订单仍未付款，不计入到账成功；以下沙箱验收未产生正式实付。
- 用户已在本地忽略文件保存 Creem 测试 key。`bootstrap-creem-test.ts` 已创建 Professional、Executive 两个测试产品及 HTTP 投递 webhook，监听 `checkout.completed`、`refund.created`；不得将密钥发到聊天或提交。
- Professional 已完成沙箱闭环：用户手工完成 USD 25 测试付款，Creem 真实商户 `checkout.completed` 回调入账，QA 额度从 5 增至 35；经 Test API 全额退款后，真实 `refund.created` 回调入库，供应商交易和本地订单均为 `refunded`，额度恢复为 5，套餐恢复 Free，水印恢复。该结果验证了测试环境的下单、商户回调、到账及退款，没有把手工构造事件当作供应商投递。
- Executive 也已完成沙箱闭环：用户手工完成 USD 45 测试付款，真实 `checkout.completed` 回调发放 60 次额度和 10 次赠送额度，保留原有 5 次，QA 额度从 5 增至 75；经 Test API 全额退款 4500 美分后，真实 `refund.created` 回调入库，供应商 transaction 和本地账本均为 `refunded`，额度恢复为 5，套餐恢复 Free/1K，水印恢复。两笔付款表单均由用户手动填写，未进行正式现金扣款。
- 旧 Supabase 凭据已退役：旧 service_role 的只读数据请求于 2026-11-05 06:53 UTC 复测返回 401。用户提供的控制台截图确认 ECC (P-256) 为 Current、Previously used keys 为空、旧 HS256 在 Revoked keys。原域名 API 与 Google 登录初始化复查通过。旧凭据仍在公开 Git 历史，但已失效；没有删除源备份或改写历史。
- Git 的 4 个遗留 unmerged 路径已按已测试的文件内容解决，并在修改前备份原 index 到忽略目录。f4549f1（密钥清理）和 642b01b（Cloudflare 迁移）已通过 fast-forward 同步到远端 main；工作区干净。
- Cloudflare Git 自动发布已验证：初次 GitHub push 50f59ae 触发生产部署 3c52c87d-32b4-4464-87a5-e915d91ac604 并成功；支付修复 1884396 对应部署 1d2d7338-1c41-4305-bc5e-bd23ff6b30ca，远端执行 pnpm verify、88 项测试及全部检查通过。原域名及回调验签复查通过。后续工具/文档提交的部署状态以 Cloudflare 对应提交记录为准。
- 隔离支付测试项目 professional-headshot-ai-qa 已部署，使用独立 D1/R2；没有原客户数据，没有正式生图或支付 key，禁止新注册，搜索引擎索引已禁用。测试回调为 https://professional-headshot-ai-qa.pages.dev/api/auth/creem/webhook。

支付脱敏证据位于忽略目录 `.migration/acceptance/`：`creem-test-setup.json`、`payment-test-professional.json`、`payment-test-executive.json`。两份订单记录均为 `mode=test`，Professional 沙箱结算与退款均为 2500 美分，Executive 均为 4500 美分；各包含两个实际回调事件，最终剩余额度均为 5、`plan_type=free`、`quality=1K`、`has_watermark=true`。退款后供应商 checkout 仍为 `completed`、order 仍为 `paid`；退款成功依据是 transaction、退款回调及本地账本的 `refunded` 状态。含会话令牌的 `payment-test-state.json` 不得输出或提交。

测试脚本为 `scripts/cloudflare/bootstrap-creem-test.ts`、`creem-test-api.ts`、`test-payment-flow.ts`，分别负责测试配置、Test API 请求及订单创建/核验/退款。本机 Node 请求 Test API 曾出现 TLS reset，API 封装已改用 `curl.exe` 和本地临时配置传递凭据，不在命令行或日志暴露密钥。已有订单或退款尝试先核验状态，结果不明时不自动重发。

两个套餐的沙箱支付及全额退款均已验收，旧 Supabase 密钥已停用并撤销。正式现金扣款未做；优惠和税额场景仅覆盖本地回归，争议/拒付仍需人工处理。check:payments 现只读核对正式网站套餐与 Creem 正式产品、启用回调、事件和密钥匹配，不依赖旧 Supabase。

源凭据退役证据为 `.migration/acceptance/legacy-key-recheck.json`；检查输出只包含状态和布尔结果，不输出凭据。源码/构建密钥扫描同时覆盖本地正式与测试配置中的敏感值，同名环境变量不会掩盖另一环境的密钥。

2026-11-05 06:56 UTC 已清理生产生图 QA 与隔离支付 QA 的两条验收会话，旧令牌访问各自账户接口均为 401。原客户会话未改动；测试订单、事件、图片、额度记录保留用于对账，未删除数据。证据为 `.migration/acceptance/session-cleanup.json`。原客户余额最终对比仍一致。

构建复核发现 Tailwind 原先扫描全目录，会把忽略的浏览器测试资料和迁移产物中的类名带入本地 CSS。已收窄为实际前端源码目录，避免本地/CI 构建差异和无效扫描。

## 首购和退款权益修复

回归测试实际复现并修复了两处问题：未生成过图片的新用户在首次购买时丢失页面显示的 5 次免费额度；升级订单全额退款后仍保持升级套餐。新增 0003_payment_entitlements.sql，首次购买保留免费额度，全额退款恢复基础套餐或其他有效订单对应套餐。

迁移先在本地与隔离 QA 库通过，再应用生产；生产原 8 条套餐记录（含独立验收账号）的套餐、总额度和已用额度均未改变。原用户基础套餐通过 base_plan_type 保留，不能把旧付费用户误降级。迁移前的 D1 Time Travel 恢复点保存在忽略目录。

该迁移包含门禁：若库内已经有带结算金额的完成/退款订单，则拒绝自动推断基础套餐，需要先对账，不能盲目执行。修复时 83 项测试通过，包含新增的两项反例回归；随后两个套餐的沙箱真实支付和退款已确认购买时保留原有免费额度、退款恢复 Free/1K 及水印，详见上文。

## 优惠与结算金额

只读核对了原 3 条 pending 订单：Creem 侧为 1 条过期、2 条已完成的 100% 优惠订单（实付 0）。没有据此修改旧余额、重放回调或把它们算作现金支付。

这也复现了原校验拒绝有效优惠订单的问题。0004_checkout_amounts.sql 和支付解析增加优惠额、税额、含税模式与实付记录，保留原价快照校验；合法优惠和零元优惠可以按商户签名确认权益，金额不一致或无优惠依据的少付款仍被拒绝。现金退款按实际结算金额计算，不能对 0 元订单虚构退款金额。

同时校验创建 checkout 返回的环境与数量，测试配置不能返回正式付款链接。新增优惠含税、全额优惠、含税价/价外税、金额不一致及环境混用回归；当前 88 项测试和全部本地发布检查通过。两个套餐的原价沙箱支付及全额退款均已有真实回调证据；优惠与含税场景仍仅为本地回归验证，未进行对应供应商真实交易验收。

字段依据：[Creem 官方 SDK OrderEntity](https://github.com/armitage-labs/creem/blob/main/packages/sdk/docs/models/components/orderentity.md)、[ProductEntity 税模式](https://github.com/armitage-labs/creem/blob/main/packages/sdk/docs/models/components/productentity.md)。

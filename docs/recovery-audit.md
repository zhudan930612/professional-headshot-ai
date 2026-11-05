# 网站恢复排查报告

> 2026-11-05 更新：本文保留 11-02 的排查事实。生产已改为 Cloudflare D1/R2/原生会话；当前迁移及验证状态以 [cloudflare-native-migration.md](cloudflare-native-migration.md) 和 HANDOFF.MD 为准，不要继续部署本文的 Supabase 恢复方案。

检查日期：2026-11-02（Asia/Taipei）。目标：继续使用 www.professionalheadshotai.ink、Cloudflare Pages、Supabase、Creem。

## 结论与问题优先级

网站页面仍能访问，但不能据此认定生图和支付正常。已完成本地修复及验证；**本轮未部署生产、未执行生产迁移、未轮换密钥、未产生真实订单或付费生图。当前仍不满足恢复收款运营的条件。**

| 优先级 | 问题与影响 | 当前处理结果 |
| --- | --- | --- |
| P0 | `scripts/fetch-template-urls.ts` 将当前有效的 Supabase service_role 密钥提交进 Git；该密钥拥有数据库管理权限，不能继续信任。 | 工作区硬编码已移除，改为从环境读取。已确认当前 HEAD 包含相同值；旧密钥仍未撤销，Git 历史未改写。必须先轮换并更新受影响服务。未确认仓库是否曾公开，也未证明密钥是否已被他人使用。 |
| P0 | 原生图、保存、代理接口缺少会话和任务归属验证；质量、额度不能由客户端决定，否则可能造成越权、费用损失或免费使用付费能力。 | 本地已加入鉴权、所有者过滤、服务端额度预留、输入限制和幂等流水；需代码与 001 迁移一起发布。 |
| P1 | 前端保存接口发送 taskId，原后端却收 imageUrl/userId，导致出图后无法可靠保存。 | 本地统一为已完成且属于当前用户的任务；重复保存使用固定路径和缓存结果。 |
| P1 | 生产支付状态 API 返回 HTML 200，数据库缺少新支付字段、回调事件表及原子处理函数。 | 本地路由和支付代码已就绪，补齐缺失的 001；001/002 联合迁移已在本地 PostgreSQL 环境演练。生产迁移与 Functions 部署尚未进行。 |
| P1 | Auth 回调中等待 Supabase 查询可能卡住登录；历史迁移失败仍清空本地记录会丢失恢复机会。 | 本地已将异步数据库操作移出 auth 回调；仅清理确认已完整迁移的历史记录。 |
| P1 | 2K 套餐与 Lite 模型当前能力不匹配。 | 1K 默认使用 nano-banana-2-lite，2K 改用 gemini-3.1-flash-image-preview。两者均在当前账户模型目录中，尚未验证实际出图、质量、余额及费用。 |
| P1 | 用户原图及生成图桶为 public，无桶级大小/类型限制；现有隐私及保留承诺需要核对。 | 已识别，未切换生产桶权限。需要签名地址、历史链接、上传 RLS 和清理机制一起迁移，不能直接改 private。 |
| P2 | TypeScript 有 4 个错误；依赖存在已知漏洞；博客加载了全部高亮语言。 | 严格类型检查与构建通过；Vite 及解析器补丁已更新，当前依赖审计 0；博客相关 JS 明显减小。 |

P0 表示恢复运营前必须消除的安全阻断；P1 表示影响核心业务或个人照片保护的问题。上述“已修复”均指当前本地工作区，不能理解为生产已修复。

## 本轮验证结果

| 验证 | 实际结果 | 边界 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile --ignore-scripts` | 通过 | 锁文件与 package.json 一致。 |
| `pnpm test` | 12 个文件、65 个测试通过 | 包括 PostgreSQL 迁移重复执行、额度扣减/失败退回/免费重试、支付回调与退款幂等、接口鉴权与图片保存。使用本地数据库及模拟网络。 |
| `pnpm typecheck` | strict 模式通过 | 不证明外部服务配置正确。 |
| `pnpm build` / `pnpm build:functions` | 均通过 | gray-matter 仍有 eval 构建警告；目前只处理仓库内受信任文章，未开放用户输入解析。 |
| `pnpm audit` | 0 个已知依赖漏洞 | 不能代替应用安全审查。 |
| `pnpm check:secrets` | 当前工作区及 dist 未检出已配置的后端密钥 | **不扫描完整历史，也不证明泄露密钥已失效。** |
| `pnpm check:recovery` | 不通过，按预期非零退出 | 生产缺 generation_tasks、payment_webhook_events、新支付列及 4 个 RPC；不是网络超时或被隐藏的失败。 |
| Auth / Creem / AI 只读检查 | Auth HTTP 200、Google 已开启；正式产品价格、回调事件和本地签名密钥匹配；两个 AI 模型在目录中 | 没有真实登录、收款、退款、生图或 Cloudflare 生产变量验证。 |
| 本地完整运行时 API | 生图、保存、代理、创建订单、订单查询匿名请求均返回 JSON 401；未签名回调返回 401；未知 API 返回 JSON 404 | 未借用生产用户身份，也未改生产订单或额度。 |
| 本地浏览器 | 首页、定价、购买登录弹窗、博客、匿名支付回跳、404、手机定价共 7 项通过；无脚本异常或横向溢出 | 1440 / 390 像素视口；外部统计和 Google 登录脚本在检查中被屏蔽，未覆盖 OAuth 登录成功流程。 |

构建体积：博客相关两块 JS 从约 1,132 KB 降至 189 KB（未压缩，约减少 83%）；目前最大 JS 块约 230 KB。静态页面和资源通过 `_routes.json` 排除在 Functions 调用范围外。生成状态查询每次最多访问一次供应商，近期状态 2 秒内复用；提交请求发生不确定错误时不会自动创建第二个付费任务。没有进行生产压测，不能据此承诺实际延迟、吞吐或费用。

本地浏览器截图及结果位于忽略目录 `.recovery/`。Vitest 已排除该目录，避免误执行浏览器扩展携带的测试。

## 恢复执行顺序

1. **先轮换已提交的 Supabase 管理密钥并撤销旧凭据。** 同步更新受影响的后端环境，确认旧密钥失效；旧 JWT 类型凭据的轮换要评估关联 anon key 和登录会话，不盲目操作。
2. 恢复 Cloudflare 登录并连接 Supabase 管理入口。当前本机 Cloudflare OAuth 已过期；现有 service_role 只支持已开放的服务接口，不能完成所需的管理操作和迁移审查。
3. 备份与生产只读预检：运行 `database/recovery-preflight.sql`，核查 RLS、存储权限、历史 pending 订单、重复有效订阅及 public 旧 RPC 的使用方。
4. 隔离环境先执行 001/002，使用 Creem Test Mode 完成付款、重复回调、取消、退款、额度扣减和真实 1K/2K 出图，记录成本及数据结果。
5. 对账后将数据库迁移、新 API、前端及环境配置一起切换；验证原域名、OAuth 回跳和现有 Creem webhook。发布失败时先暂停入口，不回滚到缺少鉴权的旧 API。

具体环境变量、产品及步骤见 [CREEM_SETUP.md](../CREEM_SETUP.md) 和 [CLOUDFLARE_MIGRATION.md](../CLOUDFLARE_MIGRATION.md)。

此外，客户端水印可被绕过、照片保留期限未自动执行、折扣/零元订单/争议拒付未形成完整业务流程。上线前需使产品承诺和运营流程与实际能力一致。供应商受理结果不明的任务保留为 unknown，由任务记录和供应商账单对账，不自动退额度或重新付费。

## 实测基线

- 首页、定价页 HTTP 200，Supabase Auth 设置接口 HTTP 200；这不等于登录、生图或支付闭环已通过。
- 线上 `/api/creem/payment-status` 返回 HTML，而非支付 JSON。
- 当前工作区原有大量未提交改动，4 个文件处于 Git unmerged 状态，但未发现冲突标记。修复须保留这些改动。
- Vite 构建成功；TypeScript 检查有 4 个错误；现有 41 个测试通过，但未覆盖生图后端。
- 前端保存图片发送 `taskId`，后端仍要求 `imageUrl/userId`；生成与存储接口未校验登录，质量与配额可由请求端绕过。
- 生产库不存在 `generation_tasks`、`payment_webhook_events`；支付表尚无 checkout、产品及额度快照字段。原有 `002_payment_integrity.sql` 引用的 001 迁移缺失。
- 以现有密钥只读核验：Creem Professional 产品价格 USD 25，Executive USD 45，均 active/onetime/prod；与数据库价格一致。数据库额度分别为 30、60+10；Free 为 5。旧 CREEM_SETUP.md 不可信。
- 本地缺少两个 `CREEM_*_PRODUCT_ID` 配置；Cloudflare 本地 OAuth 已过期，API 返回 403。
- 存储桶存在，当前均 public，且无文件大小/类型限制。不可未经迁移直接改 private，否则历史图片和模板会断链。

## 已实现的接口约定

信任边界：浏览器 → 本站 API → Supabase/AI 服务；Creem → 签名回调 → 支付及额度事务。保护资产包括用户照片、付费额度、第三方 API 费用和支付记录。

| 接口 | 约定 |
| --- | --- |
| POST `/api/nanoBanana` submitTask | 验证 Bearer 会话；`requestId` 为用户内幂等键；参考图必须属于登录用户；模板来自项目模板清单；质量与额度由数据库决定。返回本站 `taskId`，不返回供应商敏感数据。 |
| POST `/api/nanoBanana` queryStatus | 仅任务所有者可查；每次请求最多查询供应商一次；完成状态持久化；明确失败只退还一次额度。网络超时不新建付费任务、不误退额度。 |
| POST `/api/save-generated-image` | 只接收已完成且属于当前用户的 `taskId`；源地址从服务端任务读取；确定性存储路径使重复保存安全。兼容现有 `sessionId/index` 请求字段。 |
| GET `/api/proxy-image` | 只允许当前用户任务的结果，禁止任意 URL 代理；图片抓取验证 HTTPS、域名、重定向、类型和大小。 |
| POST `/api/creem/create-payment` | 身份来自会话；价格/额度来自服务端套餐；保存支付快照后再创建 checkout；失败不得宣称支付成功。 |
| POST `/api/auth/creem/webhook` | 保留原地址与 `/api/creem/webhook` 别名；原始请求体 HMAC；checkout.completed 和 refund.created 走原子、幂等数据库函数。 |
| GET `/api/creem/payment-status` | 只查当前用户订单；回跳 URL 不能证明付款成功。 |

免费重试沿用界面现有承诺：每个成功的付费额度任务最多一次免费重做，同用户、同模板，不允许免费任务无限串联。普通供应商失败归还该次实际扣除额度。供应商接受状态不明时保留待核对任务，避免二次收费。

## 上线验证边界

本地构建、测试和只读服务探测不能代替真实登录、测试支付、回调与图片生成验收。生产数据库迁移、部署、真实支付和有费用的 AI 生成分别记录实际执行结果；未执行不得标为通过。先在隔离环境演练迁移，再处理生产旧 pending 订单及存储权限。

参考：[Creem Webhooks](https://docs.creem.io/code/webhooks)、[Create checkout](https://docs.creem.io/api-reference/endpoint/create-checkout)、[Cloudflare Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/)、[EvoLink Lite 模型能力](https://evolink.ai/nano-banana-2-lite)、[EvoLink 2K 模型能力](https://evolink.ai/nano-banana-2)、[Supabase auth 回调锁等待说明](https://supabase.com/kb/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0)。

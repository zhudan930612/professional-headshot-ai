# Cloudflare 全量迁移记录

2026-11-05：用户明确要求业务数据、图片和登录全部迁出 Supabase，保留原用户、订单和余额，并授权创建和部署 Cloudflare 资源。原域名及 Creem 不变。

## 实现契约

- 沿用现有 Pages 项目和域名，以 advanced mode Worker 提供同源 API；静态资源继续走 Pages。D1 存业务/登录数据，私有 R2 存照片；模板公开读取。
- 原 Supabase 用户 UUID、Google provider subject、订单主键、套餐和已用/剩余额度原样导入。登录按经过验证的 Google subject 查找用户，禁止仅凭邮箱合并账户。旧会话不搬运，用户重新登录后关联原账户。
- Google Identity Services 将 ID token 提交同源后端；校验 Google 签名、issuer、audience、expiry、一次性 nonce 与 Origin。会话使用 HttpOnly/Secure/SameSite Cookie，D1 只存 token 哈希，写接口校验 Origin。
- 浏览器不直连数据库；服务端按登录用户过滤所有私有记录。照片请求需要会话；AI 服务访问原图使用短期、限定对象的签名 URL。R2 不开启公共桶。
- D1 不运行 PostgreSQL 函数。扣额度、一次免费重试、失败退回、Creem 入账/退款改写为原子 SQL 及触发器，唯一索引阻止重复发放。保留旧订单的原始字段用于对账，迁移不重新发额度。
- 对源数据分页导出，生成逐表行数/哈希、逐对象 SHA-256 清单；导入后复核用户映射、订单、额度与照片。敏感备份在忽略目录 .migration，不提交。
- 切换时原域名改走新后端，并比对源数据快照；源数据保留。未经对账不删除 Supabase、不撤销全部账户、不重置余额。供应商受理不明的任务不自动重发。

## 验收

真实 D1/R2 本地运行时测试：事务回滚、并发扣额度、重复回调/退款、跨用户隔离、会话与签名过期、历史兼容。源/目标数据校验完成后再切换正式域名。Google 登录和真实支付/出图分别记录是否实测；测试不能替代实际结果。

性能约束：照片不进入 D1；列表分页、有索引；静态资源不进入动态数据库流程；图片流式返回；AI 状态查询不长轮询。迁移对象下载并发有限，失败保留断点，避免反复传输和重复费用。

参考：[D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[R2 Worker API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)、[Google ID token 验证](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)。

## 执行结果

2026-11-05 已切换生产域名 [www.professionalheadshotai.ink](https://www.professionalheadshotai.ink)。迁移切换时部署：638fdf2d-73ba-4225-8d3f-dc1c3ddb8389；当时 Worker 构建 SHA-256：dd06988ef087c60ccb7470139a48ed5fcce5ba7789c6adf344df2bb9a219bad5。后续支付修复和发布结果见 [生产验收记录](production-acceptance.md)。下表为迁移快照，不含后续独立 QA 记录。

| 对象 | 结果 |
| --- | --- |
| Google 用户 | 8 个原账户及 Google subject 原样映射，保留原 UUID |
| 套餐/额度 | 7 条，逐字段一致；全站总额度 210，已用 14，剩余 196 |
| 订单 | 3 条原 pending 订单保留，没有重复入账 |
| 生成历史 | 21 次会话、37 条图片记录原样保留 |
| 真实历史图 | 19 张，所有原图/展示图引用均存在，归属与原会话一致 |
| 旧占位记录 | 18 条 Picsum 随机图链接，保留原始记录，界面标为 Legacy placeholder；没有下载新的随机图片冒充原图 |
| 文件 | 245 个，197,346,397 字节；源/目标 SHA-256 全部匹配 |
| 旧匿名及无账户文件 | 2 个旧匿名 owner（7 次会话）保留；另有 48 个无当前账户映射的旧文件作为私有档案保留，不擅自分配给其他用户 |
| 旧 Supabase | 数据未删除；user-uploads、generated-headshots、template-images 均改 private，匿名探测被拒绝 |

D1：professional-headshot-ai，ID a3c45b09-7544-4a08-8ec8-7d7b998ba8da；R2：professional-headshot-ai。未修改账户中的 goodmorningai 资源。

原快照、切换前快照和切换后快照的全部业务表、用户及对象清单一致。导出使用服务 API，未取得源 PostgreSQL 跨表事务快照或设置源库只读锁；这里的证据是多次快照比对一致，不宣称数据库级冻结。

## 验证与修复

- 81 个测试 / 13 个文件通过，包含 16 个 Cloudflare D1/R2 本地运行时测试；严格 TypeScript、前端/Worker 构建、冻结锁文件安装通过；依赖审计 0，当前源码及构建密钥扫描通过。
- 原域名 API 返回正确 JSON；套餐/公开模板 200；未登录的账户、订单、私有图片请求 401；未知 API 404。构建中 Supabase 运行时引用为 0，生产环境 Supabase 变量为 0。
- 首次上线发现 Wrangler 覆盖了未写入 toml 的普通变量 GOOGLE_CLIENT_ID。用户截图暴露此问题，已在生产/预览 vars 补齐并重新发布；发布检查新增真实登录初始化接口。不能只凭 session 查询 200 判断登录配置正常。
- 用户随后明确确认真实登录成功；生产 D1 已创建 1 个原账户会话，原用户 ID 与额度记录匹配，没有创建替代账户。
- Creem 的正式产品价格与 D1 一致；商户回调仍指向原地址，签名密钥一致。两个线上回调入口均接受有效签名的非财务探测事件并忽略它，拒绝错误签名，没有新订单、扣款或额度变化。
- 图片复制曾有 3 个传输超时，按已验证对象清单续传；最终全部 245 个完成。不是通过跳过失败来完成。
- 前端已移除 Supabase SDK 运行时块（原约 227 KB）；当前 Worker 约 106 KB、最大前端 JS 块约 224 KB。修复了中等屏宽页脚徽标溢出，并更新与实际存储/保留行为不符的旧说明。未做生产压力测试。

## 仍需区分的边界

迁移交付后已实际完成 1K/2K 生成、保存、下载、历史和扣额度；两个套餐均完成 Creem Test Mode 付款、商户完成事件投递及全额退款，未进行正式现金扣款。详见 [生产验收记录](production-acceptance.md)。

旧 Supabase legacy API keys 已停用，旧管理密钥只读请求复测返回 401；用户提供的控制台截图确认新 ECC 密钥为 Current、旧 HS256 为 Revoked。旧值仍在 Git 历史，但已失效。没有删除旧库或改写 Git 历史。

迁移交付时遗留的 4 个 unmerged 路径，已在后续验收中解决并提交推送；Git 自动发布已恢复且实际远端构建通过。Cloudflare Access 预览保护保持原状。后续进展以生产验收记录和 HANDOFF.MD 为准。

敏感备份、逐字段和逐文件证据在忽略目录 .migration；主要文件为 baseline-20261105/final-verification.json、after-cutover-20261105/source-comparison.json、production-verification.json、source-retirement.json 与 build-manifest.json。不要提交这些文件。

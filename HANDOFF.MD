# 项目交接

## 2026-11-05 后续业务验收（进行中）

用户开启持续目标：完成迁移、线上功能、支付及生图验收。已使用独立 QA 账号和公开 corporate_01.jpg 示例，实际跑通 1K（896×1200）与 2K（1792×2400）生成、扣额度、私有 R2 保存、下载、历史读取、重复保存及匿名 401。原客户余额快照未变化。供应商报告费用合计 USD 0.142；详见 docs/production-acceptance.md。

真实创建 Creem Professional checkout 成功：USD 25 / 30 次额度，仍 pending，未扣款。测试密钥文件 .dev.vars.creem-test 已准备且忽略；真实支付完成/回调到账/退款仍待平台测试环境或明确确认的正式交易。

已通过 GitHub API 确认仓库 public，旧 Supabase service_role 仍有效。用户选择先连接 Supabase 管理权限，等待连接；管理页自动打开超时，不能当作密钥撤销成功。官方要求停用 legacy API keys，并撤销对应旧 JWT secret 的信任，仅新增新 key 不够。

原 index 备份在 .migration/pre-acceptance-git-index。4 个遗留 unmerged 路径已解决；f4549f1（密钥清理）和 642b01b（整体迁移）已 fast-forward 合并并推送 main，工作区干净。Cloudflare 自动发布已启用，构建命令 pnpm verify；正在用真实 Git 推送验证远端构建，不能只凭配置已启用写成构建成功。

隔离支付 QA 项目 professional-headshot-ai-qa 已部署，独立 D1 ec703699-4599-4107-bffc-168067ff2753 与同名 R2；无原客户数据、无正式付费 key。测试回调地址 https://professional-headshot-ai-qa.pages.dev/api/auth/creem/webhook。测试文件只需提供 Creem 测试 API key，其余产品/回调可经 API 建立；现有测试 key 仍未提供。

Windows Python 3.14 的 stdin 管道在本机曾错误进入交互模式并循环报错；改为保存 .py 文件再执行。出错进程已终止，不要重试 python - 管道。

## 2026-11-05 Cloudflare 全量迁移（已切换生产）

最终生产部署 638fdf2d-73ba-4225-8d3f-dc1c3ddb8389，原域名 https://www.professionalheadshotai.ink。245 个文件 / 197346397 字节全部哈希一致；业务数据逐字段一致，切换前后源快照一致。用户已确认真实 Google 登录成功，D1 会话关联原账号，额度匹配。全站额度 210 / 已用 14 / 剩余 196。详细收尾见 docs/cloudflare-native-migration.md。

81 个测试通过，strict TypeScript / 构建 / 冻结安装通过，依赖审计 0。生产 Supabase 变量已清除，构建引用为 0。旧三个存储桶已经改 private，源数据留作备份。旧 service_role 密钥尚未轮换；真实付款/退款/生图未执行。旧 Git 自动发布已暂停，待现有合并状态及新代码审阅提交后恢复，不能直接从旧 main 自动覆盖生产。

用户已明确授权数据库、图片、登录全部迁出 Supabase，保留用户/订单/余额；Cloudflare OAuth 已重新授权。当前账户 aa479a48352fb7188db30bf3e50f4ca4，沿用 Pages professional-headshot-ai 与原域名。独立 D1 a3c45b09-7544-4a08-8ec8-7d7b998ba8da、R2 professional-headshot-ai 已创建；未动 goodmorningai。

原始备份位于忽略目录 .migration/baseline-20261105；8 个 Google 用户（必须逐用户 admin GET 才能取 identities，list endpoint 不返回）、7 条套餐（总额度 210、已用 14）、3 条 pending 订单、21 次会话、37 张图片记录、245 个存储文件 / 197346397 字节。7 次旧匿名会话使用 2 个无 Google 身份的旧 ID，作为 archived owner 保留，不可按邮箱猜测归属。

已逐行导入并核验 D1 原数据，图片复制已完成。目标代码 cloudflare/worker.ts 编译为 dist/_worker.js，Pages advanced mode 会忽略旧 functions/；旧 Supabase 实现及 PostgreSQL 测试留作历史，前端运行时已换同源 API。Google GIS + JWT 验签/一次性 nonce，D1 HttpOnly 会话；R2 私有图片按用户鉴权，供应商用 1 小时对象签名链接。

本地新增 cloudflare/integrity.test.ts 的 16 项真实 D1/R2 回归通过，原 65 项仍通过。预览 cf-migration.professional-headshot-ai.pages.dev（deployment 2d9e1c0c）受原 Cloudflare Access 保护；匿名 HTTP 会跳登录页，不能当成 API HTML 错误。preview 没有付费 API key，不允许注册新账户。

操作陷阱：不要输出 d1 export 日志，它会打印可下载整库的临时签名 URL；日志重定向到私有目录。D1 export 会短暂阻塞库，不要与导入/对象清单写入同时运行。不要关闭现有 Access 来做预览；可用本地 Cloudflare 运行时和数据快照验收。

生产首发后用户发现登录报“Sign in is temporarily unavailable”：Wrangler 把配置文件未声明的普通变量 GOOGLE_CLIENT_ID 覆盖掉了，secret_text 变量仍保留。已将公开 Google Client ID 写入 wrangler.toml 的 production/preview vars，并将真实 /api/auth/challenge 初始化加入发布后检查。后续普通变量必须以 wrangler.toml 为准，不能只 PATCH Dashboard；不能仅凭 /api/auth/session 返回 200 就认定登录配置正常。

另外注意：管理员 list users 不含 identities，必须逐用户读取详情；不要按 email 合并。37 条历史图片中有 18 条旧 Picsum 占位链接，不能抓取新随机照片冒充历史；19 张真实图已核验原图/展示图和用户归属。48 个旧存储文件没有当前账户映射，私有保留，不分给其他用户。

长迁移期间 OAuth access token 可能过期：scripts/cloudflare/api.ts 在 401 时调用现有 Wrangler whoami 刷新一次，不重复要求用户登录。不要同时执行多次 refresh 或打印令牌。

## 2026-11-02 网站恢复排查

用户确认继续使用 www.professionalheadshotai.ink 和 Creem。详细事实、修复契约及上线步骤见 docs/recovery-audit.md、CREEM_SETUP.md、CLOUDFLARE_MIGRATION.md。

### 先处理的阻断

- scripts/fetch-template-urls.ts 曾将有效 Supabase service_role 密钥写入 Git，当前 HEAD 也含有该值。本轮已移除工作区硬编码，尚未轮换/撤销旧密钥，也未改写 Git 历史。不可将本地无硬编码解释为泄露已解决；恢复运营前先完成轮换及所有后端环境更新。
- 当前 Cloudflare 登录过期，无法自动刷新；生产尚未部署本轮修复。
- 生产库缺少 generation_tasks、payment_webhook_events 和新支付字段/RPC。001/002 只在本地 PGlite 演练，未在生产执行。先备份和运行只读 recovery-preflight.sql，核查现有 RLS、约束及 public 旧函数是否仅属于本应用。
- 真实 OAuth 登录、Creem Test Mode 端到端付款/退款、1K/2K 真实出图、余额/费用与生产照片权限未完成验收。

### 已完成的本地修复

- 生图/保存/代理接口验证登录和任务归属，服务端决定质量与额度。任务 UUID 兼作幂等键；已知失败只退还一次，响应不明不自动重新付费。原前端发 taskId、后端收 imageUrl/userId 的契约冲突已修复。
- 补齐 001 生图流水及权限迁移；保留已有 002 支付幂等事务，增加两者联合 PostgreSQL 回归测试。没有改动生产余额或客户订单。
- OAuth 回调仅同步设置状态，数据库操作放到回调外，避免 Supabase auth 锁等待；迁移历史记录失败时保留本地数据。
- 配置检查真正加载 .env.local，失败非零退出；不打印密钥、不匿名上传文件。Creem 产品、价格、回调和签名密钥已只读核验，正式产品 ID 已补入本地忽略文件。
- 严格 TypeScript 检查、测试命令、Cloudflare Functions 编译和完整本地运行命令已补齐。Vite 更新至 6.4.5，postcss-selector-parser 6.1.4 覆盖为 6.1.5；依赖审计为 0。
- 博客只加载需要的代码高亮语言；静态路由不进入 Functions；未知 API 返回 JSON 404。

### 不要再踩的坑

- pnpm dev / preview 只有静态前端，不能验证支付和生图；用 pnpm dev:full。不要只发布 dist 而漏 functions。
- 当前产品为一次性额度：Professional $25/30，Executive $45/60+10，Free 5。旧 CLAUDE.md、SQL 修复片段和历史文档中价格、免费次数、schema、支付事件可能过时。
- Creem 用 checkout.completed、refund.created 和原始请求体 HMAC；支付回跳成功不是入账成功。未应用 002 不能启用新支付代码；旧 pending 订单须对账，不能盲目补发。
- EvoLink Lite 当前只支持 1K；2K 默认使用 gemini-3.1-flash-image-preview，二者均已在可用模型目录查到，尚未付费实测。不能把目录可访问写成生图成功。
- 生产 user-uploads/generated-headshots 当前 public，无大小/类型限制。直接改 private 会断开现有链接；需要完整签名地址迁移。此问题未在本轮生产修复。
- 免费重试一次由服务端限制，不能信任浏览器 isRetry 或 retryCount。
- 不在 onAuthStateChange 中 await Supabase API。历史迁移要同时补会话及图片，不能仅凭会话存在就清空本地备份。
- Vitest 不会自动遵守 .gitignore；临时浏览器 profile 可能包含扩展自带的测试。vitest.config.ts 明确排除 .recovery 和 .wrangler，避免误运行第三方测试。
- 现有灰色区域：客户端水印可被绕过；照片保留期限未自动执行；折扣/0 元支付/拒付需另行完成业务流程。不要宣称已支持。

### 工作区状态

本轮开始前已有大量修改和 4 个 Git unmerged 路径：api/auth/creem/webhook.ts、api/creem/create-payment.ts、api/creem/webhook.ts、lib/supabase.ts。文件内容无冲突标记，本轮未覆盖/撤销原改动、未修改暂存区、未提交或推送。发布前审查并确认这些合并结果；不要 reset、stash 或清掉未跟踪文件。

浏览器检查覆盖首页、定价、匿名购买登录弹窗、博客、匿名支付回跳、404 和手机定价页。没有脚本异常或横向溢出。截图及临时运行文件位于忽略目录 .recovery/，不提交。

最终本地验证：冻结锁文件安装通过；12 个测试文件 / 65 个测试通过；strict TypeScript、Vite 构建、Cloudflare Functions 编译通过；pnpm audit 为 0；当前工作区及构建密钥扫描通过（不覆盖历史）。check:recovery 因生产缺表/列/RPC 明确失败，这是待执行迁移的真实阻断。博客相关 JS 从约 1,132 KB 降至 189 KB，最大 JS 块约 230 KB；没有做生产压测。

本轮临时 Wrangler 本地服务及独立 Chrome profile 进程已停止，3000 / 9334 不再监听。Git 暂存区原有 docs/cleanup-public-schema.md、scripts/verify-schema-migration.ts 的空白警告未通过改写暂存区处理；不得把这次本地验证当作已完成合并、提交或生产发布。

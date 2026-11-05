# Cloudflare 部署与回滚

2026-11-05 已将生产运行端迁到 Cloudflare。原域名为 https://www.professionalheadshotai.ink，Pages 项目 professional-headshot-ai。

## 资源

| 资源 | 当前配置 |
| --- | --- |
| Runtime | cloudflare/worker.ts → dist/_worker.js，Pages advanced mode |
| D1 | professional-headshot-ai，binding DB，ID a3c45b09-7544-4a08-8ec8-7d7b998ba8da |
| R2 | professional-headshot-ai，binding PHOTOS，私有桶 |
| 登录 | Google Identity Services + Google JWT 验签；D1 存会话哈希 |
| 支付 | Creem，原 webhook 地址不变 |

迁移明细、校验与边界见 docs/cloudflare-native-migration.md。Supabase 不再参与当前网站请求。PostgreSQL 的 001/002 是旧恢复方案，不要再向生产 Supabase 应用它们来部署当前版本。

## 配置与发布

公开变量以 wrangler.toml 为准，尤其是 GOOGLE_CLIENT_ID、APP_URL 和 Creem 产品 ID。production 与 preview 的 vars 不继承，需要分别声明。密钥放 Pages secrets：MEDIA_SIGNING_SECRET、CREEM_API_KEY、CREEM_WEBHOOK_SECRET、NANO_BANANA_API_KEY。不要把密钥改成 VITE_ 变量。

按 README 进行类型、测试、构建、依赖和密钥检查，再从项目根目录部署 dist；必须包含 _worker.js。当前脚本检查构建中没有 Supabase 运行时引用。

预览分支 cf-migration 受原有 Cloudflare Access 保护，不能把 Access 登录 HTML 当作 API 返回值，也不要关闭保护来跑测试。预览不配置付费 API key，禁止创建新账号。

4 个遗留 unmerged 路径已解决，代码已通过检查并同步到 main。Git 自动发布已重新启用，构建命令为 pnpm verify；Node 22 和 pnpm 10.26.1 固定在版本配置中。推送后仍需核对远端构建和原域名检查结果，不能只凭 push 成功宣布发布通过。

## 性能与恢复

静态资源不进入 Worker；历史列表分 50 条读取并使用用户/日期索引；状态查询原子占用 2 秒查询间隔，避免并发轮询放大供应商请求。图片存 R2，授权后流式返回；上传限 10 MB、生成结果限 20 MB。

故障时回退到迁移后经过验证的 Worker 版本，或使用 MAINTENANCE_MODE 暂停入口。不要直接回滚到依赖 Supabase、无完整鉴权的旧代码；当前 Supabase 备份桶已私有化。

D1 导出会短暂阻塞库，且 CLI 日志包含可下载整库的临时签名链接：在维护窗口导出并把日志重定向到 .migration。优先先保留 D1/R2 当前状态，再分析数据恢复，不能重置用户余额。

备份及校验清单位于忽略目录 .migration，不提交。原 Supabase 数据未删除；旧 legacy API keys 已停用，旧管理密钥请求复测返回 401，旧 HS256 签名密钥已撤销。不要用已退役凭据恢复旧运行时。

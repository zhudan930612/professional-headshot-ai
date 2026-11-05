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

- 正式 Creem 创建 checkout 的实际接口已返回 200：USD 25、30 次额度，订单快照与 Creem checkout ID 一致。验收账号有 1 条新增 pending 测试订单，未付款；不能把它当作到账成功。
- 支付完成、商户回调投递、到账与退款仍需 Creem Test Mode 凭据或经确认的正式测试交易。已准备忽略文件 `.dev.vars.creem-test`，禁止将密钥发到聊天或提交。
- 已确认 GitHub 仓库为 public，旧 Supabase service_role 仍被源服务接受。用户选择连接源平台管理权限，等待连接完成以撤销旧凭据；只新增新 key 不会撤销旧 key。
- Git 的 4 个遗留 unmerged 路径已按已测试的文件内容解决，并在修改前备份原 index 到忽略目录。f4549f1（密钥清理）和 642b01b（Cloudflare 迁移）已通过 fast-forward 同步到远端 main；工作区干净。
- Cloudflare Git 自动发布已启用，构建命令 pnpm verify；本次文档推送用于触发并验证实际自动构建。只有远端构建和原域名检查通过后才记为流水线验收成功。
- 隔离支付测试项目 professional-headshot-ai-qa 已部署，使用独立 D1/R2；没有原客户数据，没有正式生图或支付 key，禁止新注册，搜索引擎索引已禁用。测试回调为 https://professional-headshot-ai-qa.pages.dev/api/auth/creem/webhook。

普通浏览器签入、交易和密钥撤销需要各自的实际证据。当前目标保持进行中。

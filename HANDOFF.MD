# 项目交接

## 2026-11-06 链接分享预览（分支本地验证完成）

- 提交检查修复换行兼容：生成器与构建端都将脚本 CRLF 归一为 LF 后计算哈希，避免 Windows 重新检出触发错误的“分享图过期”；字体、原图和PNG仍按原始二进制哈希。

- 用户随后授权本轮分享预览改动在当前分支本地提交；提交后讨论下一项，仍不推送或发布。
- 用户同意补齐分享预览；当前 `codex/seo-improvements` 新增首页、LinkedIn、8 篇博客和默认品牌图共11张1200×630 PNG，覆盖15个公开页面。本轮未提交、推送、发布，也未调用外部平台调试器或发送分享消息。
- `lib/socialPreview.ts` 集中定义素材和 Open Graph/Twitter 标签，SEOHead 和预渲染共用；补齐绝对 HTTPS 图片地址、格式、尺寸、alt、site_name。已知博客文章为 article，博客列表和其他公开页为 website；私有页/404 不输出图片，切换时移除旧标签。AuthCallback 增加 noindex SEO 清理。
- 分享图是现有人像与短标题的本地排版导出，照片原文件不改，无新的人像生成。`pnpm generate:social` 用仅开发依赖 resvg 和本地 Inter 字体生成 PNG；字体来自 Google Fonts 的 Inter 分发，OFL许可证和来源在 scripts/assets，字体不会部署。11张图片约338–615KB，总计约5.35MB，日常页面不会因 meta 标签自动加载它们；Worker 哈希未变，无请求时图片渲染。
- 生成器记录脚本、字体、原图、标题及产物哈希到 scripts/assets/social-manifest.json；构建校验过期、缺失、PNG签名、尺寸和1MB大小上限。标题/原图/排版修改后必须重新运行生成命令，不能让卡片内容与页面脱节。
- `pnpm verify` 通过：104 项回归、38 项交互、15页静态检查、产物/密钥扫描与依赖审计（0已知漏洞）；另完成隔离Pages HTTP检查，确认分享图匿名200及PNG类型/尺寸、私有路由和404。11张PNG均已目视检查，锁文件冻结安装通过。测试覆盖首屏标签与接管后相同、文章间切换、文章到价格/账号页的标签清理。
- 正式域名尚无这些分支新增图片，不能声称真实社交平台已验证。平台缓存与实际卡片展示应待全部修改统一验收并正式发布后再检查。

## 2026-11-06 博客改动提交范围

- 用户已授权将博客阅读布局、真实人像封面、相关文章、预览过渡、统一页脚和 Read guide 锚点修复提交到当前本地分支。下方“未提交”为各阶段历史状态；不推送、合并或发布，支付文档的原有修改继续留在工作区。

## 2026-11-06 Read guide 锚点对齐

- Read guide 改为直接引用 Contents 首个章节的锚点，不再跳到正文容器；沿用章节的 scroll-margin-top，避免被顶部导航遮挡。仅无章节时回退 article-body。
- 构建和15页检查通过，8篇文章产物的两个入口均为同一锚点。IAB 对比穿搭页：两种点击的 scrollY 均658、章节顶部均96px。修改仍仅在当前分支，未提交或发布。

## 2026-11-06 预览过渡与页脚修正

- 按用户截图反馈，列表预览改为分层 opacity 过渡（380ms）；鼠标停留140ms才请求切换，键盘焦点无停留延迟。新图 load/decode 后才显示，取消已离开项的异步结果，避免扫过列表时跳变、空白或旧请求覆盖。图片按需加载并复用已访问图层，减少动态效果时禁用过渡。
- 用户追加要求底部与首页统一，已让博客列表和全部详情恢复同一个 Footer。用户此要求优先于上一轮技能的精简页脚建议；静态检查逐页比较 footer 与首页 HTML，不能再以设计理由分离页脚。
- 完整检查通过98项回归，补充后共37项页面交互测试；新增扫过取消、延迟加载/过期结果和页脚一致性覆盖。IAB 验证预览图已加载后以0.38s过渡、页脚恢复产品/资源/法律/徽标区域。本地预览已刷新，未提交、推送或发布。上一轮0 FAIL视觉报告是精简页脚时的记录，不代表本轮恢复首页页脚后的完整风格指标。

## 2026-11-06 博客视觉修订（按 design-taste-frontend）

- 用户认为 SVG 拼贴、图标与正文布局像批量生成，明确要求用 design-taste-frontend 重做。仍在 `codex/seo-improvements`，未提交/推送/发布。采用 editorial-report / The printed annual，seed 1950723833，保留蓝白配色与 Inter；将不适合图片文章的固定滚动卡片改为图片索引，避免复杂滚动场景影响阅读。
- 撤下 8 张 SVG 和生成脚本，原版保存在忽略目录 `.recovery/blog-svg-v1`。改用 best_01/03/04/08/12/17 原有 AI 人像 JPEG，不新增虚构摄影作品或客户案例。列表为摄影拼幅＋可聚焦切换预览的文章索引；详情为短阅读标题、主图、目录与正文。桌面分栏，平板/手机单栏；博客专用页脚与导航断点不改其他业务页。
- 去掉博客日历/时钟/返回箭头图标，解析层清理 emoji、装饰 hr、重复 Why this matters 标签和冗长小标题；保留标签下的正文，原始 Markdown 和 SEO 标题/URL/日期不改。营销/事实核验仍待后续，不把排版清理当成内容准确性验收。
- `pnpm verify` 通过：98 项回归、35 项页面/交互测试、15 页静态与本地 HTTP 检查、密钥/产物检查和依赖审计。新增目录唯一锚点、正文保留、去装饰与焦点预览测试。IAB 实测目录跳转（目标在导航下方约96px）、文章往返、canonical，未见 hydration 错误。
- 技能 lint 为 0 FAIL/0 WARN；最终 inspect：列表在1440/768/390为0 FAIL/2 WARN，穿搭详情三宽为0 FAIL/4 WARN，上传长文390为0 FAIL/1 WARN。提示为无真实视频、动效较克制、字号层级较多及桌面正文内缩；按阅读用途保留并在 `.taste-skill/decisions.md` 解释。全部最终输出截图已查看，主观视觉评分与剩余内容问题见该记录。
- 坑：清除独立标签的正则只能匹配行内空白，不能用跨行的 `\s*` 吞掉段落分隔，否则可能将解释段落并入上一列表。手机正文不继承桌面阅读色块的横向内边距，以免内容测量出现左右边缘不一致；平板正文改为单栏避免窄列。
- 仍保留隔离本地预览 `http://127.0.0.1:4173/blog`，已刷新用户打开的页面；无正式配置/账号/付款操作。原有支付文档修改保留。

## 2026-11-06 SEO 任务 4：博客封面与相关文章（分支本地验证完成）

- 用户确认按“现有人像＋主题示意、每篇两条人工推荐”完成 8 篇博客；当前仍为 `codex/seo-improvements`，本轮未提交、推送、发布。LinkedIn 页已在上一轮提交为 `f87552c`。正文营销表述留待用户另开会话，本轮未修改 Markdown 正文、文章 URL 或发布日期。
- `public/blog-covers/` 新增 8 张 1200×675 SVG，以现有 best_01/best_12/best_03 JPEG 原样嵌入、矢量排版组合，未生成新的人像或伪造前后对比。封面用于穿搭、裁切错误、光线、有效头像、AI/摄影棚概念对比、上传、行业及不同平台裁切；上传封面重复同一人物示意，不暗示上传多人照片。
- `lib/blogPresentation.ts` 集中管理封面、准确 alt、每篇两条关联文章和一个相关工具入口；列表、详情、推荐区复用 BlogCover。替换 Picsum，详情标题置于封面上方，文末推荐桌面两列/手机单列；平台/简历文章进入 LinkedIn 页，比较文章进入定价，其余进入生成工具。封面已标注 AI 示例示意。
- 构建检查覆盖关系配置、无重复/自身推荐、有效文章/工具目标、封面存在和尺寸；静态检查验证封面与两条链接，8 项新增导航测试验证跳转后封面和 canonical 同步。`pnpm verify` 通过：96 项回归、34 项 hydration/交互测试、15 页静态检查及产物/密钥/依赖审计；隔离 Pages HTTP 检查覆盖 15 页、6 个私有路径、5 类 404 与 API。
- IAB 查看全部 8 张封面、详情、推荐导航与 390px/320px 布局，无横向溢出或 hydration 错误。SVG 裁切须在 use 外层 g 上应用全局 clipPath；直接在 symbol 实例上裁切曾导致人物缺失，已修正并逐图目视复核。图片 complete 不能替代图像内容检查。
- 素材 gzip 约 63–247 KB/张，照片保持原压缩；同一 SVG 的重复裁切复用符号，首屏外懒加载，封面与推荐配置共享 JS gzip 约 1.15 KB。Worker 哈希未变。重建命令 `pnpm exec tsx scripts/create-blog-covers.ts`；SVG 源码和生成器均应保留。
- 本地预览继续使用仓库外隔离 Pages 环境 `http://127.0.0.1:4173/blog`，已恢复浏览器默认视口。原有支付文档未提交修改保留。

## 2026-11-06 SEO 任务 3：LinkedIn 用途页（分支本地验证完成）

- 用户随后授权本轮改动在当前分支本地提交；提交后沟通博客封面与相关文章导航方案，仍不推送或发布。
- 用户跳过宣传文案与权益一致性，计划另开会话处理；本轮按授权实现 `/linkedin-headshots`，仍在 `codex/seo-improvements`，未发布、推送或提交本轮改动。上一轮 SEO 基础已提交为 `3264fad`；原有支付文档改动保持原样。
- 新页包含可切换的三种 AI 示例、圆形裁切示意、照片准备说明、常见问题和同页 HeroTool。示例复用已经查看过的 best_01/best_12/best_03 图片，明确标注 AI 生成和结果可能不同，不作为真实客户案例或前后对比。圆形仅为示意，不增加裁切导出功能。
- 匿名主按钮打开原登录弹窗并保留 `/linkedin-headshots#linkedin-generator` 返回路径；页面加载后定位生成区，已登录用户复用原上传/选模板/生成/保存流程。新增独立 SEO 信息、sitemap、首页 LinkedIn 卡片/页脚/相关指南 CTA；公开页从 14 个增至 15 个，静态内链均可从首页最多两次点击到达。
- 修复复用组件的窄屏问题：上传说明允许换行，示例图用自适应网格，工具步骤头允许换行；320px 导航缩小品牌字号并保持菜单按钮可见，补充按钮可访问名称和展开状态。
- `pnpm verify` 通过：96 项回归、26 项 hydration/交互测试、15 页静态检查、产物/密钥检查及依赖审计（0 已知漏洞）。隔离 Pages HTTP 验收覆盖 15 页、6 个账户路径、5 类 GET/HEAD 404 与 API。IAB 实测桌面、390px/320px、示例切换、登录入口、刷新定位与手机菜单；无横向溢出或 hydration 错误。上传至生成结果/保存为模拟接口回归，未重做真实登录、付费生成或支付。
- 新页面 HTML gzip 约 6.8 KB，页面 JS gzip 约 3 KB；HeroTool 拆为共享块，Worker 仍约 105 KB、哈希未变，无请求时页面渲染开销。
- 验收坑：生成流程测试应在 `#upload-tool` 或 `#linkedin-generator` 内定位模板图片，不能用全页第一个 AI 示例图作为模板选择器。
- 本地预览保留在 `http://127.0.0.1:4173/linkedin-headshots`，使用仓库外隔离目录 `F:/codex_temp/2026-11-06/headshot-seo-validation-01a1ae6f` 的本地 D1/R2、空付费凭据和测试 Google Client ID；仅供页面预览，不是正式服务。浏览器视口已恢复默认。

## 2026-11-06 用户确认的 SEO 工作范围

- 用户已授权将本轮 SEO 修复提交到本地分支；下方各阶段“未提交”是当时的状态记录。提交不代表验收全部完成或授权推送、合并及发布。
- 全部 SEO 修改仅在 `codex/seo-improvements` 分支修改和本地验证；待全部修改任务完成并经用户统一验收后，再确认正式发布。此约束覆盖下方早先“先发布再复查”的建议，不提前合并/推送触发自动发布，也不发布到生产、提交 sitemap 或请求索引。
- 当前优先处理未编入索引的技术问题。分支可验收正文、canonical、robots、HTTP 状态和静态内链可发现性；Google 实际收录恢复只能在最终发布后复查，不能把本地验证通过写成已恢复收录。

## 2026-11-06 优先处理未编入索引（发布前准备）

- 用户要求优先处理另一会话 01a1ae81-5991-7c21-a42c-28e52870976f 的索引问题；已实际 read_thread 并读取 GSC Wizard 保存的 11-06 检查记录。14 页中 5 页已收录、FAQ+7 篇文章为 Crawled - currently not indexed、pricing 为 URL is unknown to Google。8 页均允许抓取/索引，Google canonical 为自身，不能据此断言内容差或被判成首页重复。基线在忽略目录 `.recovery/indexing-20261106/baseline.json`。
- 本轮线上 GET pricing/faq/top-5-mistakes-in-resume-photos 仍为空 root、首页 canonical，证明分支预渲染还未生效。下一步应先发布已验证的预渲染、canonical、404，再核对线上内容；索引恢复需 Google 重新抓取和选择，不能当场承诺。
- sitemap 接口返回 0 错误/警告，最后提交/下载记录为 2026-01-14；tracker 未配置。移除 public/sitemap.xml 中无法逐页核验的统一旧 lastmod，保留全部 14 个规范 URL；不把当天构建日期冒充文章更新时间。本轮重新 build 和 14 页静态检查通过，未重复消耗 URL Inspection 配额。
- 拟发布范围仅为当前已验证 SEO 改动；发布后检查 14 页、账户/回调、真实 404、登录初始化，再重新提交 `https://www.professionalheadshotai.ink/sitemap.xml`。优先复查 pricing、top-5-mistakes-in-resume-photos、faq；当前未发布、未提交 sitemap、未创建索引追踪或定时任务，等待正式发布范围确认。

## 2026-11-06 SEO 任务 2：真实 404（分支本地验证完成）

- 在 `codex/seo-improvements` 上为构建新增根目录 `404.html`，复用 NotFound 页面，带 noindex、独立标题、首页/博客恢复入口，不输出 canonical。不存在的普通路径和文章由 Pages 直接返回 HTTP 404，无新增 Worker 请求时渲染、D1 查询或路由绑定变更。未知文章客户端也立即显示相同错误页；SPA 内部跳转不产生文档 HTTP 响应，直接访问/刷新才返回 HTTP 404。
- 404 静态数据标记允许在任意未知路径 hydration；错误页返回正常页面后移除 noindex 并恢复正常 canonical。Layout 必须保留页面显式 noIndex，不能被默认 false 覆盖。根 404 文件不加入 sitemap，6 个账户/回调路径继续显式重写到 `/app-shell`。
- `pnpm verify` 全部通过：96 项回归、23 项 hydration/交互测试、14 页静态检查、类型/构建/密钥/产物检查与依赖审计（0 已知漏洞）。隔离本地 Pages 实测 5 类未知路径 GET/HEAD 为 404、无重定向；14 个有效页面、6 个账户路径及 health/plans/account/未知 API 的 JSON 状态通过。IAB 实测未知文章错误页与返回博客，标签恢复正确，无 hydration 错误。
- 测试坑：首次 lazy 页面尚未完成 hydration 时，点击静态链接可能触发原生导航；DOM 验收需等待组件 effect 可观察信号，并在轮询之间退出 act 以让 React 提交，不能把整个等待包在 act 中阻塞其提交。
- 本轮未提交、推送或部署，未执行真实登录、付款或付费生图；临时本地 Pages 服务已停止。README 和检查脚本已同步，下一项待沟通的是宣传文案与实际套餐权益的一致性。

## 2026-11-06 SEO 任务 1：14 页预渲染（分支本地验证完成）

- 当前工作分支 `codex/seo-improvements`。复用 React 页面，在构建时为 sitemap 中全部 14 个公开 URL 输出完整 HTML、独立 title/description/canonical、既有 OG/Twitter 标签。文章直接读取 public/content/blog 的 Markdown，正文标题只保留一处；构建期与客户端复用相同初始数据。SEOHead 由 Layout 单一管理，避免文章标题被第二个实例覆盖。
- 价格快照只读调用正式 `/api/plans`，校验并仅保留公开字段；失败中止构建。`PRERENDER_PLANS_URL` 可指定本地/测试公开接口，不能带凭据或查询参数。D1 套餐变更必须重新构建发布，浏览器价格页仍实时刷新；价格 SEO 描述移除了与额度套餐矛盾的 unlimited。其他营销文案、内容扩充、sitemap 日期和真实 404 留待后续任务。
- 公开页面采用 `pricing.html`、`blog/<slug>.html` 等文件，由 Pages 直接匹配无扩展名 URL；移除覆盖所有资产的 `/* /index.html 200`。history/subscription/auth callback 显式使用带 noindex 的 app-shell，API 仍由原 `_routes.json` 和 Worker 处理。hydrateRoot 只接管 URL 与静态数据匹配的页面，未知 URL 回退不错误接管首页。
- Pages 200 重写的目标须用无扩展名 `/app-shell`；写 `/app-shell.html` 会触发自动 clean-URL 308 并改变浏览器地址，破坏账户/回调路由。已修复；HTTP 验收用 `redirect: manual`，核验 6 个私有路径（含尾斜线和查询参数）均原地址 200、无 Location、noindex。PowerShell 自动跟随重定向的最终 200 不能当作这项验证通过。
- `pnpm verify` 全部通过：strict TypeScript、96 项原有/新增回归、14 页禁用脚本产物检查、19 项 hydration/交互测试、产物/密钥检查、依赖审计（0 已知漏洞）。另用隔离的本地 Pages 实测 14/14 HTTP 200、正文/标签、3 个私有路由 noindex 与公开 API；IAB 已实际核验定价页购买入口打开登录框、博客 SPA 跳转和直接刷新，无 React hydration 错误。生图结果界面与登录后状态为模拟接口回归，本轮未执行真实 Google 登录、付费出图或支付。
- 性能：生成 HTML gzip 约 4.5–11.7 KB/页；客户端入口约 224 KB（gzip 70.8 KB），保留页面懒加载；Worker 约 105 KB，源码未改，无请求时页面渲染和额外 D1 查询。构建报告为忽略目录 `dist-ssr/prerender-report.json`，不部署 dist-ssr。真实访客 Core Web Vitals 未测量。
- 验证坑：SSR 与浏览器渲染若在同一测试进程共用 React Router context，首次 lazy/stream 渲染可能产生伪“嵌套 Router”错误；hydration 测试直接读取先前构建的 HTML，在独立浏览器 DOM 环境验收，`pnpm check:hydration` 必须在 build 之后运行。不要从 index.tsx 同步导入包含全部文章的 SEO 模块，否则会将文章常量提前打入入口包。
- 隔离验收坑：本版 Wrangler Pages dev 在仓库子目录启动时可能再次解析祖先配置，并忽略传给 Pages 的 env-file；发现日志加载了父目录 .dev.vars 后已立即停服，未发业务请求。最终使用仓库外独立 package.json/config/空 .dev.vars，日志确认绑定仅为 local 的 headshot-seo-local、无付费 key。验收目录 `F:/codex_temp/2026-11-06/headshot-seo-validation-01a1ae6f`；子目录试验在忽略的 `.recovery/seo-prerender`。
- 未提交、推送或部署；保留原有 CREEM_SETUP.md 和 HANDOFF.MD 改动，包括另一会话新增的 Search Console 核验记录。

## 2026-11-06 Search Console 数据核验

- 通过 GSC Wizard 的 Google API 读取域名属性，Web 搜索完整数据截至 2026-11-03（America/Los_Angeles）。10-07～11-03：29 展示、0 点击；09-09～10-06：74 展示、0 点击。平均排名 7.88→65.86，但公开查询词两期无重叠，不能说同一批关键词跌了 58 位。
- 展示减少集中于 `/blog/top-5-mistakes-in-resume-photos`（68→1）；首页反而 4→26。11-06 URL Inspection：首页 Submitted and indexed；该文章 Crawled - currently not indexed，允许抓取/索引、fetch 成功，Google 与用户 canonical 在检查记录中均为文章自身。检查结果不提供退出索引日期，不能断言与某次发布存在因果关系。
- 同日线上原始 GET 首页和上述文章均为空 root、首页 title/canonical；客户端会改写 canonical。应区分当前初始 HTML、JS 渲染结果与 Google 历史检查记录，不能将非 JS 抓取器的“8 words / missing H1”当作真实文章全文缺失，也不能断言 Google 完全无法渲染。
- 查询明细只覆盖 24/29 展示；其余查询未披露。CrUX 未配置，不能评价真实访客性能；GSC 无法给出付费转化结论。工作区已有预渲染等未提交改动，本轮未修改业务代码或部署，线上检查不代表这些本地改动已经生效。

## 2026-11-06 SEO 只读审查

- 线上 GET 首页、`/pricing`、`/blog/what-to-wear-for-a-professional-headshot` 均返回相同的 3939 字节 HTML：空 `#root`、首页 title/canonical、无正文。代码由 `SEOHead` 在客户端改写，不能把它表述为 Google 完全无法收录；应优先让公开内容页初始 HTML 含正文和各自唯一、前后一致的 canonical。当前构建没有预渲染。
- 随机不存在路径 `/seo-audit-missing-page-20261106` 返回 200；需服务端真实 404。裸域到 www 的 301 正常。sitemap 含 14 个 URL（8 篇文章），lastmod 全为 2026-01-14，与已经更新的隐私页等不一致；不要每天统一刷新日期冒充内容更新。
- 价格 SEO 描述仍写 unlimited，但线上 `/api/plans` 为 Free 5、Professional USD25/30、Executive USD45/60+10。首页有“3x More Interview Invitations”，本轮未找到该倍数依据；博客封面仍用 Picsum 占位图。修正文案须依据真实产品能力和可核验案例。
- 首页 20 张独立图库文件共 1,679,579 字节，循环渲染 40 个 img，均未设懒加载；不能把重复 img 数算作重复传输量。仅完成源码和 HTTP 检查，未取得 Search Console、真实访客 Core Web Vitals 或关键词搜索量，不据此断言零收录/流量损失/性能不合格。
- 浏览器工具仅提供 IAB，无 Chrome；本次 IAB 打开文章超时，未完成渲染 DOM 验证，不反复重试或冒充完成。Google 官方更新记录已确认 FAQ 富结果自 2026-05-07 停用，不能把增加 FAQ schema 当作当前富结果收益承诺。
- 本轮未修改业务代码、发布、付费查询或创建订单；保留原有 CREEM_SETUP.md、HANDOFF.MD 未提交改动。

## 2026-11-05 后续业务验收（业务闭环已通过）

用户开启持续目标：完成迁移、线上功能、支付及生图验收。已使用独立 QA 账号和公开 corporate_01.jpg 示例，实际跑通 1K（896×1200）与 2K（1792×2400）生成、扣额度、私有 R2 保存、下载、历史读取、重复保存及匿名 401。原客户余额快照未变化。供应商报告费用合计 USD 0.142；详见 docs/production-acceptance.md。

Professional 和 Executive 均已完成 Creem 沙箱支付和退款闭环，两笔付款表单均由用户手动填写。Professional 为 USD 25 / 30 次额度，真实商户 checkout.completed 回调使 QA 额度 5→35；Executive 为 USD 45 / 60+10 次额度，回调使额度 5→75。分别经 Test API 全额退款 2500 / 4500 美分后，refund.created 回调入库，供应商交易及本地订单均为 refunded，两次额度均恢复为 5、套餐恢复 Free/1K、水印恢复。这是 Test Mode 的真实回调验收，未进行正式现金扣款。此前创建的正式 Professional checkout 未付款，不计入成功交易。

旧 Supabase 凭据已退役：用户已停用 legacy API keys，旧 service_role 只读请求在 2026-11-05 06:53 UTC 复测返回 401。用户提供的控制台截图显示 ECC (P-256) 为 Current、Previously used keys 为空、旧 HS256 为 Revoked。原域名 API 和 Google 登录初始化复查正常。仓库 public，旧值仍在 Git 历史中，但已失效；没有删除源数据或改写 Git 历史。脱敏证据在 .migration/acceptance/legacy-key-recheck.json。仅新增新 key 或 Migrate JWT secret 不等于撤销：必须继续 Rotate，再 Revoke 旧 HS256。

原 index 备份在 .migration/pre-acceptance-git-index。4 个遗留 unmerged 路径已解决；f4549f1（密钥清理）和 642b01b（整体迁移）已 fast-forward 合并并推送 main。Cloudflare 自动发布已通过真实 Git 推送验证：50f59ae → 3c52c87d-32b4-4464-87a5-e915d91ac604，远端执行 pnpm verify，81 项测试及全部检查通过；原域名复查通过。后续当前提交以 Git/Cloudflare 实时状态为准。

隔离支付 QA 项目 professional-headshot-ai-qa 已部署，独立 D1 ec703699-4599-4107-bffc-168067ff2753 与同名 R2；无原客户数据、无正式付费 key。测试回调地址 https://professional-headshot-ai-qa.pages.dev/api/auth/creem/webhook。用户已在本地忽略文件保存测试 key，bootstrap 已创建两个套餐的测试产品及 HTTP 投递 webhook。脱敏证据位于 .migration/acceptance/：creem-test-setup.json、payment-test-professional.json、payment-test-executive.json；不要读取或输出含会话令牌的 payment-test-state.json，不提交验收目录。

支付测试脚本位于 scripts/cloudflare/：bootstrap-creem-test.ts 配置测试产品和回调，creem-test-api.ts 封装 Test API，test-payment-flow.ts 创建订单、核验账本和执行测试退款。本机 Node 连接 Test API 曾出现 TLS reset，已改用 curl.exe，通过本地临时配置传递凭据，不把密钥放到命令行或日志。出现结果不明时先核验现有订单/退款，不盲目重试。退款后供应商 checkout 仍可为 completed、order 仍可为 paid；应以 transaction、退款回调及本地账本的 refunded 状态判断退款结果。

Windows Python 3.14 的 stdin 管道在本机曾错误进入交互模式并循环报错；改为保存 .py 文件再执行。出错进程已终止，不要重试 python - 管道。

Tailwind 不能扫描全仓库的 **/*：会扫入忽略的 .recovery 浏览器 profile 与 .migration 构建产物，导致本地/CI CSS 不一致。内容扫描已限定实际前端目录。

后续支付回归复现两处 bug：首次购买丢失虚拟的 5 次免费额度、退款后升级档位未恢复。0003_payment_entitlements.sql 已在 QA/生产应用，新增 base_plan_type 保留原套餐；生产前后 8 条套餐余额和档位均一致。迁移前 Time Travel 恢复点及核验结果在 .migration/acceptance/。如果已有带结算金额的完成订单，迁移门禁会拒绝自动回填，必须先对账。当前 83 个测试通过。

旧 3 条订单已只读核对：1 条过期，2 条 100% 优惠完成、实付 0；旧状态/额度未自动改写。原代码会拒绝优惠付款，0004 已在 QA/生产应用，新支付代码核对原价/优惠/税/实付并记录含税模式，兼容原价旧 Worker 的过渡；测试配置拒绝正式 checkout URL。当前 88 项回归通过，两个套餐的沙箱支付/退款均已有真实回调证据，正式现金扣款未做。1884396 对应生产部署 1d2d7338-1c41-4305-bc5e-bd23ff6b30ca 已成功，后续工具与文档收尾发布以 Git/Cloudflare 最新记录为准。

check:payments 已改为当前网站 /api/plans 与正式 Creem 产品/回调的只读检查，不再依赖旧 Supabase；失败非零退出。check:secrets 收集 .env.local、.dev.vars、.dev.vars.creem-test 和进程环境中的所有敏感值，同名变量不能覆盖漏检。忽略目录和历史 Git 不属于当前源码扫描覆盖范围。

2026-11-05 06:56 UTC 已撤销生产生图 QA 与隔离支付 QA 的两条验收会话，旧令牌访问各自 /api/account 均返回 401；没有动原客户会话、额度、订单或测试业务记录。证据在 .migration/acceptance/session-cleanup.json。付款 inspect 需要有效 QA 会话；验收结束后不要为了重跑报告重新执行 init 或重发付费任务，既有脱敏报告及账本可只读核对。

测试配置复用也必须检查产品 active、webhook enabled/http 及必要事件，不能仅凭资源 ID 报成功。原价完整沙箱流程已有实际回调；优惠/税和并发幂等场景是本地回归覆盖，争议/拒付仍需人工处理。

## 2026-11-05 Cloudflare 全量迁移（已切换生产）

以下为迁移切换当时的记录，付款、生图、密钥撤销及自动发布的后续结果以上方业务验收为准。

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

以下为迁移前历史状态，不代表当前生产阻断。当前生产入口与验收结果见本文顶部及 docs/production-acceptance.md。

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

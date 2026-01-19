# 性能优化 - 快速安装指南

## ⚠️ 重要提醒

所有优化配置文件已经创建完成，但需要安装依赖才能生效。

## 📦 安装步骤

### 1. 安装 Tailwind CSS 依赖

```bash
npm install
```

**如果遇到错误**，尝试清理缓存：
```bash
npm cache clean --force
npm install
```

### 2. 验证配置

检查以下文件是否存在：
- ✅ `tailwind.config.js` - Tailwind 配置
- ✅ `postcss.config.js` - PostCSS 配置
- ✅ `index.css` - Tailwind 样式入口
- ✅ `vite.config.ts` - 已添加代码分割配置
- ✅ `App.tsx` - 已添加路由懒加载

### 3. 测试开发环境

```bash
npm run dev
```

打开 http://localhost:3000 查看应用是否正常运行。

### 4. 构建生产版本

```bash
npm run build
```

**预期输出**：
```
vite v6.2.0 building for production...
✓ 构建完成，输出在 dist/ 目录
dist/index.html                   x.xx KiB
dist/assets/react-vendor.xxx.js   xxx.xx KiB / gzip: xx.xx KiB
dist/assets/supabase.xxx.js       xxx.xx KiB / gzip: xx.xx KiB
dist/assets/index.xxx.js          xxx.xx KiB / gzip: xx.xx KiB
dist/assets/index.xxx.css         x.xx KiB / gzip: x.xx KiB
```

### 5. 预览生产构建

```bash
npm run preview
```

打开 http://localhost:4173 预览优化后的应用。

## 📊 验证优化效果

### 在浏览器开发者工具中：

1. **Network 标签**
   - 刷新页面
   - 查看加载的 JavaScript 文件
   - 应该看到多个较小的 chunk 文件

2. **Coverage 标签** (Chrome)
   - Ctrl+Shift+P → "Show Coverage"
   - 刷新页面并记录
   - 未使用的 JavaScript 应该显著减少

3. **Lighthouse**
   - Ctrl+Shift+P → "Generate report"
   - 关注性能评分和建议

## 🎯 预期优化效果

### 优化前 (CDN Tailwind)
- 主包大小: ~523.8 KiB
- 未使用的 JS: ~293 KiB (56%)
- Tailwind CDN: 123.3 KiB

### 优化后 (本地 Tailwind + 代码分割)
- 主包大小: ~250 KiB (减少 50%)
- 未使用的 JS: ~50 KiB (20%)
- Tailwind 样式: ~15 KiB (减少 88%)

### 额外改进
- ✅ Vendor 代码缓存更好 (React, Supabase 分离)
- ✅ 首屏加载更快 (路由懒加载)
- ✅ 更小的初始包体积
- ✅ 更好的长期缓存策略

## 🔧 故障排查

### 样式丢失
如果构建后没有样式：
1. 检查 `npm install` 是否成功
2. 检查 `index.css` 是否正确导入到 `index.tsx`
3. 运行 `npm run build` 查看是否有错误

### 路由无法加载
如果页面空白：
1. 检查浏览器控制台错误
2. 确认 `React.lazy()` 导入路径正确
3. 确认所有页面组件都是命名导出

### npm 安装失败
```bash
# 尝试以下命令
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📚 详细文档

查看 `docs/PERFORMANCE_OPTIMIZATION.md` 了解：
- 完整的优化策略说明
- 进一步优化建议
- 性能监控方法
- 更多故障排查技巧

## ✅ 完成后

验证优化成功后，可以：
1. 提交代码到 Git
2. 部署到 Vercel
3. 使用 PageSpeed Insights 验证线上性能

---

**需要帮助？** 查看 `docs/PERFORMANCE_OPTIMIZATION.md` 或提交 Issue。

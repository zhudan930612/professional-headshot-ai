# 性能优化指南

## 问题分析

原始应用存在以下性能问题：
- ❌ Tailwind CSS 通过 CDN 加载 (123.3 KiB，37.1 KiB 未使用)
- ❌ 主应用包过大 (523.8 KiB，135.4 KiB 未使用)
- ❌ 未配置代码分割
- ❌ 所有路由组件在初始加载时全部打包

## 已实施的优化

### 1. 迁移 Tailwind CSS 到本地构建 ✅

**效果**：减少 ~100+ KiB 的初始 JavaScript

**改动**：
- 创建 `tailwind.config.js` - 配置主题和内容路径
- 创建 `postcss.config.js` - PostCSS 配置
- 创建 `index.css` - Tailwind 指令和自定义样式
- 更新 `index.html` - 移除 CDN 脚本
- 更新 `index.tsx` - 导入 CSS 文件

### 2. 配置代码分割 ✅

**效果**：将 vendor 代码分离，优化缓存

**改动**（`vite.config.ts`）：
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'supabase': ['@supabase/supabase-js'],
        'markdown': ['react-markdown', 'marked', 'gray-matter', 'highlight.js'],
      }
    }
  },
  chunkSizeWarningLimit: 1000,
}
```

### 3. 路由懒加载 ✅

**效果**：减少初始包大小，按需加载页面

**改动**（`App.tsx`）：
- 使用 `React.lazy()` 懒加载所有页面组件
- 使用 `<Suspense>` 包裹路由
- 添加 `PageLoader` 加载指示器

## 安装步骤

### 1. 安装依赖

```bash
npm install -D tailwindcss postcss autoprefixer
```

如果遇到 npm 错误，尝试：
```bash
# 清理 npm 缓存
npm cache clean --force

# 重新安装
npm install -D tailwindcss postcss autoprefixer
```

### 2. 构建测试

```bash
# 清理旧构建
rm -rf dist

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

### 3. 验证优化效果

在浏览器中访问 `http://localhost:4173`（预览服务器），打开开发者工具：

1. **Network 标签**：
   - 查看初始加载的 JavaScript 大小
   - 应该看到多个小的 chunk 文件而不是一个大文件

2. **Coverage 标签**（Chrome）：
   - 刷新页面并记录覆盖率
   - 未使用的 JavaScript 应该显著减少

3. **Lighthouse**：
   - 运行性能审计
   - 关注 "First Contentful Paint" 和 "Time to Interactive"

## 预期效果

优化后应该看到：
- ✅ **初始 JavaScript 减少 40-50%**
- ✅ **Tailwind CSS 只包含使用的样式** (~10-20 KiB)
- ✅ **React/Router/Supabase 分离到独立 chunk**
- ✅ **页面按需加载，减少首屏时间**
- ✅ **更好的缓存策略** (vendor chunk 变化频率低)

## 进一步优化建议

### 1. 图片优化
- 使用 WebP 格式
- 实施图片懒加载
- 使用 `srcset` 响应式图片

### 2. Google Tag Manager 优化
```html
<!-- 延迟加载 GTM -->
<script>
  window.addEventListener('load', function() {
    setTimeout(function() {
      // 加载 GTM 脚本
    }, 3000);
  });
</script>
```

### 3. 字体优化
```html
<!-- 预加载关键字体 -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>

<!-- 使用 font-display: swap -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### 4. 启用 Gzip/Brotli 压缩
在 Vercel 部署时自动启用，本地测试可以使用：
```bash
npm install -D vite-plugin-compression
```

### 5. 预连接优化
```html
<!-- 预连接到第三方域名 -->
<link rel="preconnect" href="https://accounts.google.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
```

## 监控和持续优化

### 开发时
```bash
# 分析打包大小
npm run build -- --mode analyze

# 如果安装了 rollup-plugin-visualizer
npm install -D rollup-plugin-visualizer
```

### 生产环境
- 使用 Google PageSpeed Insights
- 使用 WebPageTest.org
- 监控 Core Web Vitals (LCP, FID, CLS)

## 故障排查

### 样式丢失
如果构建后样式丢失，检查：
1. `tailwind.config.js` 中的 `content` 路径是否正确
2. `index.css` 是否正确导入
3. PostCSS 是否正确配置

### 构建错误
```bash
# 清理并重新构建
rm -rf dist node_modules/.vite
npm run build
```

### 路由懒加载问题
如果页面无法加载，检查：
1. `React.lazy()` 的导入路径是否正确
2. `Suspense` 是否正确包裹 `Routes`
3. 浏览器控制台是否有错误

## 参考资源

- [Vite 性能优化](https://vitejs.dev/guide/build.html#chunking-strategy)
- [Tailwind CSS 生产优化](https://tailwindcss.com/docs/optimizing-for-production)
- [React 代码分割](https://react.dev/reference/react/lazy)
- [Web.dev 性能指南](https://web.dev/performance/)

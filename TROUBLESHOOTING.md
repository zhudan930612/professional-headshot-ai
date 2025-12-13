# 故障排除指南

## 403 Forbidden 错误

如果遇到 `403 Forbidden` 错误，说明 API Key 已配置但被 API 服务器拒绝。请按以下步骤排查：

### 1. 检查 API Key 有效性

在浏览器控制台运行以下代码来验证 API Key：

```javascript
// 在浏览器控制台运行
const apiKey = '你的_API_Key';
fetch('https://api.evolink.ai/v1/tasks', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
})
.then(r => console.log('状态:', r.status, r.status === 200 ? '✅ 有效' : '❌ 无效'))
.catch(e => console.error('错误:', e));
```

### 2. 常见原因和解决方案

#### 原因 1: API Key 无效或已过期
**症状：** 403 错误，响应体可能包含 "invalid api key" 或类似信息

**解决方案：**
- 登录 [Nano Banana Dashboard](https://evolink.ai) 检查 API Key 状态
- 生成新的 API Key 并更新 Vercel 环境变量
- 确认 API Key 没有多余的空格或换行符

#### 原因 2: 账户余额不足
**症状：** 403 错误，可能是账户配额已用完

**解决方案：**
- 检查 Nano Banana 账户余额
- 确认账户是否有足够的积分/配额
- 如有需要，充值账户

#### 原因 3: API Key 权限不足
**症状：** 403 错误，API Key 存在但无法调用生成接口

**解决方案：**
- 确认 API Key 有 `images/generations` 接口的访问权限
- 检查 API Key 的权限范围设置
- 联系 API 提供商确认权限配置

#### 原因 4: 账户被限制或暂停
**症状：** 403 错误，所有请求都被拒绝

**解决方案：**
- 登录账户检查是否有违规记录
- 联系 API 提供商客服确认账户状态
- 检查邮箱是否有账户相关的通知

#### 原因 5: 环境变量配置问题
**症状：** 403 错误，但本地开发环境正常

**解决方案：**
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入项目 → Settings → Environment Variables
3. 确认 `NANO_BANANA_API_KEY` 已正确配置
4. 确认环境变量应用到正确的环境（Production/Preview/Development）
5. 重新部署项目（Redeploy）

### 3. 验证环境变量配置

在 Vercel 中检查环境变量：

1. 进入项目设置
2. 查看 Environment Variables 列表
3. 确认以下变量存在：
   - `NANO_BANANA_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (可选)

### 4. 测试 API Key

使用 curl 命令测试 API Key：

```bash
curl -X GET "https://api.evolink.ai/v1/tasks" \
  -H "Authorization: Bearer 你的_API_Key"
```

如果返回 200，说明 API Key 有效；如果返回 403，说明 API Key 有问题。

### 5. 联系支持

如果以上步骤都无法解决问题：

1. 检查 [Nano Banana API 文档](https://api.evolink.ai/v1) 是否有更新
2. 查看 API 状态页面（如果有）
3. 联系 Nano Banana 技术支持
4. 提供以下信息：
   - API Key 前缀（前 10 个字符，用于识别）
   - 错误时间
   - 完整的错误响应
   - 请求的 URL 和参数

### 6. 临时解决方案

如果急需使用，可以：

1. 检查是否有备用 API Key
2. 使用测试环境的 API Key（如果有）
3. 联系 API 提供商获取临时访问权限

## 其他常见错误

### 网络错误
- 检查网络连接
- 确认 API 服务是否正常运行
- 检查防火墙或代理设置

### 超时错误
- 增加请求超时时间
- 检查网络延迟
- 确认 API 服务响应速度

### 500 服务器错误
- 等待一段时间后重试
- 检查 API 服务状态
- 联系 API 提供商

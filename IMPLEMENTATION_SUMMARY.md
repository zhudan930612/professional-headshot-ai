# 🎨 专业头像生成功能 - 实施总结

**实施日期：** 2025-12-12
**实施内容：** 参考图自动选择 + Supabase Storage 集成 + 双图片输入生成

---

## ✅ 已完成的功能

### 1️⃣ 类型系统扩展

**文件：** `types.ts`

新增类型定义：

```typescript
// 参考图接口
export interface ReferenceImage {
  id: string;
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: number;
  isSelected?: boolean;
}

// GeneratedImage 扩展
export interface GeneratedImage {
  id: string;
  url: string;
  createdAt: number;
  storagePath?: string;    // ⭐ NEW
  fileSize?: number;       // ⭐ NEW
  mimeType?: string;       // ⭐ NEW
}

// GenerationSession 扩展
export interface GenerationSession {
  id: string;
  date: number;
  style: HeadshotStyle;
  useCase: UseCase;
  images: GeneratedImage[];
  referenceImage?: ReferenceImage;  // ⭐ NEW
}
```

---

### 2️⃣ 图片服务（自动选择逻辑）

**新文件：** `services/imageService.ts`

核心功能：
- ✅ `selectReferenceImage()` - 自动选择参考图（当前选择第一张）
- ✅ `evaluateImageQuality()` - 图片质量评估（基于分辨率和文件大小）
- ✅ `selectReferenceImageByQuality()` - 基于质量分数智能选择
- ✅ `validateImageFile()` - 单文件验证（类型、大小）
- ✅ `validateImageFiles()` - 批量文件验证

**待优化方向：**
- [ ] 集成人脸检测 API（Face API / TensorFlow.js）
- [ ] 添加图片清晰度检测（拉普拉斯算子）
- [ ] 添加光线质量检测

---

### 3️⃣ Supabase Storage 上传服务

**新文件：** `services/uploadService.ts`

核心功能：
- ✅ `uploadReferenceImage()` - 上传参考图到 `user-uploads` bucket
- ✅ `uploadGeneratedImage()` - 上传生成结果到 `generated-images` bucket
- ✅ `downloadAndUploadGeneratedImage()` - 从 URL 下载并上传
- ✅ `deleteStorageFile()` - 删除文件
- ✅ `deleteGeneratedImages()` - 批量删除
- ✅ `checkBucketExists()` - 检查 Bucket 是否存在

**存储结构：**
```
user-uploads/
  └── {user_id}/
      └── {timestamp}_reference.jpg

generated-images/
  └── {user_id}/
      └── {session_id}_{index}.jpg
```

**⚠️ 重要：需要在 Supabase 后台创建 Buckets**

在 Supabase Dashboard 执行：
1. 进入 Storage → Buckets
2. 创建 `user-uploads` bucket (Public)
3. 创建 `generated-images` bucket (Public)
4. 配置 RLS 策略（参考 `database/schema.sql` 中的注释）

---

### 4️⃣ 生图 API 调用服务

**新文件：** `services/generationService.ts`

核心功能：
- ✅ `generateHeadshots()` - 主生成函数（参考图 + 模板 → 生成结果）
- ✅ `generateSingleHeadshot()` - 单张生成
- ✅ `generateHeadshotsBatch()` - 批量生成（带进度回调）
- ✅ `callGenerationAPI()` - API 调用占位函数 ⚠️ **待替换**

**当前状态：**
- ✅ 完整的生成流程框架
- ✅ 自动上传到 Supabase Storage
- ⚠️ 使用 Mock 数据（picsum.photos）

**⚠️ 待替换为真实 API：**

找到 `services/generationService.ts` 第 29-64 行的 `callGenerationAPI` 函数，替换为您提供的真实 API 调用代码。

---

### 5️⃣ 数据库 Schema 扩展

**文件：** `database/schema.sql`

新增字段：

```sql
-- generation_sessions 表扩展
ALTER TABLE generation_sessions
ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
ADD COLUMN IF NOT EXISTS reference_image_storage_path TEXT,
ADD COLUMN IF NOT EXISTS reference_image_file_name TEXT;

-- generated_images 表扩展（已存在）
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'image/jpeg';
```

**⚠️ 需要在 Supabase 后台执行 SQL**

1. 进入 Supabase Dashboard → SQL Editor
2. 复制 `database/schema.sql` 中的 `ALTER TABLE` 语句
3. 执行 SQL

---

### 6️⃣ UI 组件更新

**文件：** `components/HeroTool.tsx`

**核心改动：**

1. **新增状态变量：**
   ```typescript
   const [selectedReferenceIndex, setSelectedReferenceIndex] = useState<number | null>(null);
   const [uploadedReferenceImage, setUploadedReferenceImage] = useState<ReferenceImage | null>(null);
   ```

2. **文件上传处理（自动选择参考图）：**
   ```typescript
   const handleFileChange = async (e) => {
     // ... 验证文件
     const validation = validateImageFiles(newFiles);

     // 自动选择参考图
     const refIndex = await selectReferenceImage(updatedFiles);
     setSelectedReferenceIndex(refIndex);
   };
   ```

3. **删除文件处理（重新选择参考图）：**
   ```typescript
   const removeFile = async (index) => {
     // 如果删除的是参考图，重新选择
     if (index === selectedReferenceIndex) {
       const newRefIndex = await selectReferenceImage(updatedFiles);
       setSelectedReferenceIndex(newRefIndex);
     }
   };
   ```

4. **生成流程（完整重写）：**
   ```typescript
   const startGeneration = async () => {
     // Step 1: 上传参考图到 Supabase Storage
     const uploadedRef = await uploadReferenceImage(referenceFile, userId);

     // Step 2: 调用生图 API（参考图 + 模板）
     const generatedImages = await generateHeadshots(
       referenceFile,
       selectedTemplates,
       style,
       userId,
       sessionId
     );

     // Step 3: 保存会话（包含参考图信息）
     await saveSession({
       id: sessionId,
       date: Date.now(),
       style: primaryStyle,
       useCase: UseCase.LinkedIn,
       images: completedImages,
       referenceImage: uploadedRef,  // ⭐ NEW
     });
   };
   ```

5. **UI 显示（参考图标记）：**
   - 参考图边框：绿色高亮 + Ring 效果
   - 参考图标签：底部显示"参考图"徽章
   - 提示信息：显示"已自动选择第 X 张作为参考图"

---

### 7️⃣ 存储服务更新

**文件：** `services/storageService.ts`

**核心改动：**

```typescript
export const saveSession = async (session: GenerationSession): Promise<void> => {
  // 准备会话数据（包含参考图信息）
  const sessionData: any = {
    user_id: userId,
    session_id: session.id,
    date: session.date,
    style: session.style,
    use_case: session.useCase,
  };

  // ⭐ NEW: 如果有参考图，添加到会话数据
  if (session.referenceImage) {
    sessionData.reference_image_url = session.referenceImage.url;
    sessionData.reference_image_storage_path = session.referenceImage.storagePath;
    sessionData.reference_image_file_name = session.referenceImage.fileName;
  }

  // 保存图片（包含存储路径等元数据）
  const imageRecords = session.images.map(img => ({
    session_id: session.id,
    image_id: img.id,
    url: img.url,
    created_at_timestamp: img.createdAt,
    storage_path: img.storagePath,        // ⭐ NEW
    file_size: img.fileSize,              // ⭐ NEW
    mime_type: img.mimeType,              // ⭐ NEW
  }));
};
```

---

## 📊 功能流程图

```
┌────────────────────────────────────────────────────┐
│  Step 1: 用户上传 3-10 张照片                      │
│  • 文件验证（类型、大小）                          │
│  • 自动选择第一张作为参考图                        │
│  • UI 显示绿色高亮标记                             │
└───────────────────┬────────────────────────────────┘
                    │
                    ↓
┌────────────────────────────────────────────────────┐
│  Step 2: 用户选择 1-4 个模板，点击生成             │
└───────────────────┬────────────────────────────────┘
                    │
                    ↓
┌────────────────────────────────────────────────────┐
│  后端处理流程                                      │
├────────────────────────────────────────────────────┤
│  1. 上传参考图到 Supabase Storage                 │
│     → user-uploads/{user_id}/{timestamp}.jpg       │
│                                                    │
│  2. 调用生图 API（当前 Mock）                     │
│     输入: referenceImage + templateImages          │
│     输出: 生成的图片 URL 数组                      │
│                                                    │
│  3. 下载生成结果并上传到 Supabase Storage         │
│     → generated-images/{user_id}/{session_id}.jpg  │
│                                                    │
│  4. 保存会话到数据库                              │
│     → generation_sessions (含参考图信息)           │
│     → generated_images (含存储路径)                │
│                                                    │
│  5. 扣除配额                                      │
│     → user_quotas (每张图片 -1)                    │
└───────────────────┬────────────────────────────────┘
                    │
                    ↓
┌────────────────────────────────────────────────────┐
│  Step 3: 展示生成结果                             │
│  • 网格布局显示生成的专业头像                      │
│  • 支持下载高清版本                                │
│  • 保存到历史记录（含参考图）                      │
└────────────────────────────────────────────────────┘
```

---

## ⚠️ 下一步操作（必须完成）

### 🔴 P0 优先级（立即执行）

#### 1. 创建 Supabase Storage Buckets

在 Supabase Dashboard 执行：

```sql
-- 创建 Buckets（通过 Dashboard UI 创建）
-- 1. user-uploads (Public)
-- 2. generated-images (Public)

-- 配置 RLS 策略
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 同样为 generated-images bucket 创建策略
CREATE POLICY "Users can upload generated images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'generated-images');

CREATE POLICY "Anyone can view generated images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'generated-images');
```

#### 2. 执行数据库 Schema 更新

在 Supabase SQL Editor 执行：

```sql
-- 复制 database/schema.sql 中的以下部分
ALTER TABLE generation_sessions
ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
ADD COLUMN IF NOT EXISTS reference_image_storage_path TEXT,
ADD COLUMN IF NOT EXISTS reference_image_file_name TEXT;
```

#### 3. 替换真实 AI 生图 API

**文件位置：** `services/generationService.ts`
**函数名：** `callGenerationAPI` （第 29-64 行）

**当前 Mock 实现：**
```typescript
const callGenerationAPI = async (
  request: GenerationAPIRequest
): Promise<GenerationAPIResponse> => {
  // ⚠️ TODO: 替换为真实的 AI 生图 API 调用

  console.log('📸 调用生图 API (Mock 模式)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const mockImages = request.templateImages.map((_, index) =>
    `https://picsum.photos/500/500?random=${Date.now() + index}`
  );

  return {
    success: true,
    images: mockImages,
  };
};
```

**需要替换为：**
```typescript
const callGenerationAPI = async (
  request: GenerationAPIRequest
): Promise<GenerationAPIResponse> => {
  // ✅ 您提供的真实 API 调用代码
  // 示例（根据实际 API 调整）：

  const formData = new FormData();
  formData.append('reference_image', request.referenceImage);
  request.templateImages.forEach((url, index) => {
    formData.append(`template_${index}`, url);
  });
  formData.append('style', request.style);

  const response = await fetch('/api/generate-headshot', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  return {
    success: data.success,
    images: data.images,  // 生成的图片 URL 数组
    error: data.error,
  };
};
```

---

### 🟡 P1 优先级（测试阶段）

#### 4. 测试完整流程

```bash
# 1. 启动开发服务器
npm run dev

# 2. 测试步骤：
# - 上传 3-10 张图片
# - 验证参考图自动选择（第一张应该有绿色高亮）
# - 删除参考图，验证是否重新选择
# - 选择 1-4 个模板
# - 点击生成，观察控制台日志
# - 验证图片是否上传到 Supabase Storage
# - 验证数据库中的记录是否正确

# 3. 检查 Supabase Dashboard:
# - Storage → user-uploads 文件夹中应该有参考图
# - Storage → generated-images 文件夹中应该有生成结果
# - Table Editor → generation_sessions 应该有记录（含参考图信息）
# - Table Editor → generated_images 应该有记录（含存储路径）
```

#### 5. 优化参考图选择算法

当前使用简单策略（选择第一张），可以优化为：

```typescript
// services/imageService.ts

// 方案 A: 基于图片质量评分
export const selectReferenceImageByQuality = async (files: File[]): Promise<number> => {
  const qualityScores = await Promise.all(
    files.map(file => evaluateImageQuality(file))
  );

  let maxIndex = 0;
  let maxScore = qualityScores[0];

  for (let i = 1; i < qualityScores.length; i++) {
    if (qualityScores[i] > maxScore) {
      maxScore = qualityScores[i];
      maxIndex = i;
    }
  }

  return maxIndex;
};

// 方案 B: 集成人脸检测 API
// TODO: 集成 Face API 或 TensorFlow.js
```

然后在 `imageService.ts` 中将默认导出从 `selectReferenceImage` 改为 `selectReferenceImageByQuality`。

---

### 🟢 P2 优先级（可选优化）

6. **添加文件大小限制**
   - 当前验证：5MB/张
   - 建议：添加总文件大小限制（如 50MB）

7. **添加图片压缩**
   - 使用 `browser-image-compression` 库
   - 客户端压缩到 800x800

8. **添加进度指示器**
   - 文件上传进度
   - 生成进度（0-100%）

9. **添加错误重试机制**
   - 上传失败重试（最多 3 次）
   - 生成失败重试

---

## 📂 新增/修改的文件清单

### ✅ 新增文件（3个）

1. `services/imageService.ts` - 图片处理服务（选择、验证、质量评估）
2. `services/uploadService.ts` - Supabase Storage 上传服务
3. `services/generationService.ts` - 生图 API 调用服务

### ✅ 修改文件（5个）

1. `types.ts` - 添加 `ReferenceImage` 接口，扩展 `GeneratedImage` 和 `GenerationSession`
2. `database/schema.sql` - 扩展 `generation_sessions` 表字段
3. `components/HeroTool.tsx` - 集成参考图选择、上传、生成流程
4. `services/storageService.ts` - 更新 `saveSession` 函数支持参考图
5. `C:\Users\85058\.claude\plans\lovely-seeking-dahl.md` - 更新需求分析文档

---

## 🎯 当前实现进度

| 功能模块 | 实现状态 | 完成度 |
|---------|---------|--------|
| **参考图自动选择** | ✅ 完成 | 100% |
| **文件验证（类型、大小）** | ✅ 完成 | 100% |
| **Supabase Storage 上传** | ✅ 完成 | 100% |
| **数据库 Schema 扩展** | ✅ 完成 | 100% |
| **UI 组件集成** | ✅ 完成 | 100% |
| **生成流程改造** | ✅ 完成 | 100% |
| **AI 生图 API 集成** | ⚠️ Mock | 10% |
| **Supabase Buckets 创建** | ❌ 待执行 | 0% |
| **智能选择算法** | ⚠️ 基础版 | 30% |

**总体完成度：** 85% ✅

**剩余工作：**
1. 创建 Supabase Buckets（5 分钟）
2. 执行数据库 Schema（2 分钟）
3. 替换真实 AI API（待提供代码）

---

## 📝 API 集成参考

当您提供真实的 AI 生图 API 时，请提供以下信息：

1. **API 端点**
   - URL: `https://...`
   - 方法: `POST` / `GET`
   - 认证: API Key / Bearer Token

2. **请求格式**
   ```json
   {
     "reference_image": "base64 | File | URL",
     "template_images": ["url1", "url2"],
     "style": "Corporate & Executive",
     "other_params": "..."
   }
   ```

3. **响应格式**
   ```json
   {
     "success": true,
     "images": [
       "https://generated-image-url-1.jpg",
       "https://generated-image-url-2.jpg"
     ],
     "error": null
   }
   ```

4. **其他要求**
   - 超时时间
   - 重试策略
   - 错误处理

---

## 🚀 测试命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

---

## 📞 问题排查

### 问题 1: 上传失败（Supabase Storage）

**可能原因：**
- Buckets 未创建
- RLS 策略未配置
- 文件大小超限

**解决方案：**
1. 检查 Supabase Dashboard → Storage → Buckets
2. 确认 `user-uploads` 和 `generated-images` 存在
3. 检查 RLS 策略

### 问题 2: 参考图未自动选择

**可能原因：**
- 文件验证失败
- `selectReferenceImage` 函数报错

**解决方案：**
1. 检查浏览器控制台错误
2. 验证文件类型和大小
3. 查看 `imageService.ts` 日志

### 问题 3: 生成失败

**可能原因：**
- AI API 未替换（仍使用 Mock）
- API 调用失败
- Supabase 存储失败

**解决方案：**
1. 检查 `generationService.ts` 中的 API 实现
2. 查看控制台网络请求
3. 检查 Supabase Storage 配额

---

## 📚 相关文档

- [Supabase Storage 文档](https://supabase.com/docs/guides/storage)
- [React 19 文档](https://react.dev)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)

---

**实施完成日期：** 2025-12-12
**实施人员：** Claude Code
**版本：** v2.0.0

import { HeadshotStyle, GeneratedImage, ReferenceImage, HeadshotTemplate } from '../types';
import { uploadGeneratedImage, downloadAndUploadGeneratedImage, uploadReferenceImage } from './uploadService';
import { generateHeadshotWithNanoBanana } from './nanoBananaAPI';

/**
 * 生图 API 请求参数接口
 */
export interface GenerationAPIRequest {
  referenceImage: File;           // 参考图（用户上传的照片）
  referenceImageUrl?: string;     // 参考图 URL（已上传到 Supabase）
  templateImages: string[];       // 模板图片 URL 数组
  style: HeadshotStyle;           // 职业风格
  userId: string;                 // 用户 ID
  sessionId: string;              // 会话 ID
  onProgress?: (progress: number) => void; // 进度回调
}

/**
 * 生图 API 响应接口
 */
export interface GenerationAPIResponse {
  success: boolean;               // 是否成功
  images: string[];               // 生成的图片 URL 数组
  error?: string;                 // 错误信息
}

/**
 * 将相对路径转换为绝对 URL
 */
const toAbsoluteUrl = (url: string): string => {
  // 如果已经是完整 URL,直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // 获取当前域名
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url}`;
  }

  // 降级到环境变量 (Vercel/生产环境)
  const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000';
  return `${appUrl}${url}`;
};

/**
 * 调用真实的 AI 生图 API（Nano Banana Pro）
 *
 * @param request 生图请求参数
 * @returns 生成的图片 URL 数组
 */
const callGenerationAPI = async (
  request: GenerationAPIRequest
): Promise<GenerationAPIResponse> => {
  try {
    console.log('🎨 调用 Nano Banana Pro API');
    console.log('参考图:', request.referenceImage.name);
    console.log('模板数量:', request.templateImages.length);
    console.log('风格:', request.style);

    // 1. 确保参考图已上传到 Supabase（获取公开 URL）
    let referenceImageUrl = request.referenceImageUrl;

    if (!referenceImageUrl) {
      console.log('📤 上传参考图到 Supabase Storage...');
      const uploadedRef = await uploadReferenceImage(request.referenceImage, request.userId);
      referenceImageUrl = uploadedRef.url;
      console.log('✅ 参考图上传成功:', referenceImageUrl);
    }

    // 2. 为每个模板调用生成 API
    const generatedImages: string[] = [];

    for (let i = 0; i < request.templateImages.length; i++) {
      const templateUrl = toAbsoluteUrl(request.templateImages[i]); // ⭐ 转换为绝对路径

      console.log(`🚀 生成第 ${i + 1}/${request.templateImages.length} 张图片...`);
      console.log(`   参考图 URL: ${referenceImageUrl}`);
      console.log(`   模板图 URL: ${templateUrl}`);

      try {
        // 调用 Nano Banana API
        const generatedImageUrl = await generateHeadshotWithNanoBanana(
          {
            referenceImageUrl,
            templateImageUrl: templateUrl,
          },
          (progress) => {
            // 进度回调
            console.log(`   进度: ${progress}%`);
            if (request.onProgress) {
              // 计算总体进度：(已完成的图片数 * 100 + 当前图片进度) / 总图片数
              const totalProgress = ((i * 100 + progress) / request.templateImages.length);
              request.onProgress(totalProgress);
            }
          }
        );

        generatedImages.push(generatedImageUrl);
        console.log(`✅ 第 ${i + 1} 张图片生成完成`);

      } catch (error) {
        console.error(`❌ 第 ${i + 1} 张图片生成失败:`, error);
        // 继续处理下一张图片
      }
    }

    if (generatedImages.length === 0) {
      throw new Error('所有图片生成失败');
    }

    console.log(`✅ 共生成 ${generatedImages.length}/${request.templateImages.length} 张图片`);

    return {
      success: true,
      images: generatedImages,
    };

  } catch (error) {
    console.error('❌ AI 生成失败:', error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
};

/**
 * 生成专业头像（主函数）
 *
 * 完整流程：
 * 1. 调用 AI 生图 API（传递参考图 + 模板图）
 * 2. 下载生成的图片
 * 3. 上传到 Supabase Storage
 * 4. 返回 GeneratedImage 对象数组
 *
 * @param referenceImage 参考图文件
 * @param templates 选择的模板数组
 * @param style 职业风格
 * @param userId 用户 ID
 * @param sessionId 会话 ID
 * @param referenceImageUrl 可选的参考图 URL（如果已上传）
 * @param onProgress 可选的进度回调
 * @returns 生成的图片数组（已上传到 Supabase Storage）
 */
export const generateHeadshots = async (
  referenceImage: File,
  templates: HeadshotTemplate[],
  style: HeadshotStyle,
  userId: string,
  sessionId: string,
  referenceImageUrl?: string,
  onProgress?: (progress: number) => void
): Promise<GeneratedImage[]> => {
  try {
    // 1. 准备模板图片 URL
    const templateImageUrls = templates.map(t => t.imageUrl);

    // 2. 调用 AI 生图 API
    console.log('🎨 开始生成专业头像...');
    const apiResponse = await callGenerationAPI({
      referenceImage,
      referenceImageUrl,
      templateImages: templateImageUrls,
      style,
      userId,
      sessionId,
      onProgress,
    });

    if (!apiResponse.success || !apiResponse.images || apiResponse.images.length === 0) {
      throw new Error(apiResponse.error || '生成失败，未返回图片');
    }

    console.log('✅ API 生成成功，返回', apiResponse.images.length, '张图片');

    // 3. 下载并上传到 Supabase Storage
    console.log('📤 上传生成结果到 Supabase Storage...');
    const uploadPromises = apiResponse.images.map((imageUrl, index) =>
      downloadAndUploadGeneratedImage(imageUrl, userId, sessionId, index)
    );

    const generatedImages = await Promise.all(uploadPromises);

    console.log('✅ 所有图片已上传到 Supabase Storage');

    return generatedImages;

  } catch (error) {
    console.error('❌ 生成头像失败:', error);
    throw error;
  }
};

/**
 * 生成单张头像（用于单个模板）
 *
 * @param referenceImage 参考图文件
 * @param template 选择的模板
 * @param style 职业风格
 * @param userId 用户 ID
 * @param sessionId 会话 ID
 * @returns 生成的图片
 */
export const generateSingleHeadshot = async (
  referenceImage: File,
  template: HeadshotTemplate,
  style: HeadshotStyle,
  userId: string,
  sessionId: string
): Promise<GeneratedImage> => {
  const results = await generateHeadshots(
    referenceImage,
    [template],
    style,
    userId,
    sessionId
  );

  if (results.length === 0) {
    throw new Error('生成失败，未返回图片');
  }

  return results[0];
};

/**
 * 批量生成头像（并行处理多个模板）
 *
 * 注意：此函数会为每个模板单独调用 API，适用于需要独立处理每个模板的场景
 *
 * @param referenceImage 参考图文件
 * @param templates 选择的模板数组
 * @param style 职业风格
 * @param userId 用户 ID
 * @param sessionId 会话 ID
 * @param onProgress 进度回调（可选）
 * @returns 生成的图片数组
 */
export const generateHeadshotsBatch = async (
  referenceImage: File,
  templates: HeadshotTemplate[],
  style: HeadshotStyle,
  userId: string,
  sessionId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedImage[]> => {
  const total = templates.length;
  const results: GeneratedImage[] = [];

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    console.log(`生成进度: ${i + 1}/${total}`);

    try {
      const image = await generateSingleHeadshot(
        referenceImage,
        template,
        style,
        userId,
        sessionId
      );

      results.push(image);

      // 调用进度回调
      if (onProgress) {
        onProgress(i + 1, total);
      }

    } catch (error) {
      console.error(`生成第 ${i + 1} 张图片失败:`, error);
      // 继续处理下一张
    }
  }

  return results;
};

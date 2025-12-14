import { HeadshotStyle, GeneratedImage, ReferenceImage, HeadshotTemplate, ImageQuality } from '../types';
import { uploadGeneratedImage, downloadAndUploadGeneratedImage, uploadReferenceImage } from './uploadService';
import { generateHeadshotWithNanoBanana } from './nanoBananaAPI.secure';
import { getUserQuotaInfo } from './storageService';
import { supabase } from '../lib/supabase';

// 检查用户是否已登录
const isUserLoggedIn = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.user?.id;
  } catch {
    return false;
  }
};

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
  quality?: ImageQuality;         // 图片质量（可选）
  isRetry?: boolean;              // 是否为重新生成（可选）
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

  // 获取基础 URL
  let baseUrl: string;

  // 优先使用环境变量（生产环境）
  if (import.meta.env.VITE_APP_URL) {
    const envUrl = import.meta.env.VITE_APP_URL;
    // 确保环境变量 URL 格式正确
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
      baseUrl = envUrl;
    } else {
      baseUrl = 'http://localhost:3000';
    }
  } else if (typeof window !== 'undefined') {
    // 浏览器环境：验证 window.location.origin
    const origin = window.location.origin;
    // 验证 origin 是否有效（包含协议和主机名）
    if (origin && origin !== 'null' && origin.includes('://')) {
      baseUrl = origin;
    } else {
      // 如果 origin 无效，从 window.location.href 解析
      try {
        const parsedUrl = new URL(window.location.href);
        baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      } catch (e) {
        console.warn('Failed to parse window.location.href:', e);
        baseUrl = 'http://localhost:3000';
      }
    }
  } else {
    // 最终回退
    baseUrl = 'http://localhost:3000';
  }

  return `${baseUrl}${url}`;
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

    // 1. 上传参考图到 Supabase Storage（无论是否登录，都需要上传以获取 HTTP URL）
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
        // 调用 Nano Banana API（传递质量参数）
        const generatedImageUrl = await generateHeadshotWithNanoBanana(
          {
            referenceImageUrl,
            templateImageUrl: templateUrl,
            quality: request.quality || '2K',  // 使用传递来的质量参数
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
      throw new Error('Our AI blinked for a second 😅 Let\'s try again.');
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
 * 1. 获取用户配额信息和图片质量
 * 2. 调用 AI 生图 API（传递参考图 + 模板图 + 质量参数）
 * 3. 根据登录状态处理生成结果：
 *    - 未登录：直接使用 API 返回的 URL，不保存到数据库
 *    - 已登录：下载并上传到 Supabase Storage，保存到数据库
 * 4. 返回 GeneratedImage 对象数组
 *
 * @param referenceImage 参考图文件
 * @param templates 选择的模板数组
 * @param style 职业风格
 * @param userId 用户 ID
 * @param sessionId 会话 ID
 * @param referenceImageUrl 可选的参考图 URL（如果已上传）
 * @param onProgress 可选的进度回调
 * @param isRetry 是否为重新生成（不消耗配额）
 * @returns 生成的图片数组
 */
export const generateHeadshots = async (
  referenceImage: File,
  templates: HeadshotTemplate[],
  style: HeadshotStyle,
  userId: string,
  sessionId: string,
  referenceImageUrl?: string,
  onProgress?: (progress: number) => void,
  isRetry: boolean = false
): Promise<GeneratedImage[]> => {
  try {
    // 1. 检查用户登录状态和获取配额信息
    const isLoggedIn = await isUserLoggedIn();
    console.log('用户登录状态:', isLoggedIn ? '已登录' : '未登录');

    let quality: ImageQuality = '2K';  // 默认最高质量

    if (isLoggedIn) {
      try {
        const quotaInfo = await getUserQuotaInfo();
        quality = quotaInfo.quality;
        console.log('用户套餐配置:', {
          plan: quotaInfo.plan_type,
          quality: quotaInfo.quality,
          remaining: quotaInfo.remaining_quota
        });
      } catch (error) {
        console.warn('获取配额信息失败，使用默认 2K 质量:', error);
      }
    }

    // 2. 准备模板图片 URL
    const templateImageUrls = templates.map(t => t.imageUrl);

    // 3. 调用 AI 生图 API（传递质量参数）
    console.log('🎨 开始生成专业头像...');
    const apiResponse = await callGenerationAPI({
      referenceImage,
      referenceImageUrl,
      templateImages: templateImageUrls,
      style,
      userId,
      sessionId,
      onProgress,
      quality,  // 传递质量参数
      isRetry   // 传递重试标志
    });

    if (!apiResponse.success || !apiResponse.images || apiResponse.images.length === 0) {
      throw new Error(apiResponse.error || '生成失败，未返回图片');
    }

    console.log('✅ API 生成成功，返回', apiResponse.images.length, '张图片');

    // 4. 根据登录状态处理生成结果
    let generatedImages: GeneratedImage[];

    if (isLoggedIn) {
      // 已登录：上传到 Supabase Storage
      console.log('📤 上传生成结果到 Supabase Storage...');
      const uploadPromises = apiResponse.images.map((imageUrl, index) =>
        downloadAndUploadGeneratedImage(imageUrl, userId, sessionId, index)
      );

      generatedImages = await Promise.all(uploadPromises);
      console.log('✅ 所有图片已上传到 Supabase Storage');
    } else {
      // 未登录：直接使用 API 返回的 URL，不保存到数据库
      console.log('📦 未登录用户，使用 API 返回的临时 URL');
      const timestamp = Date.now();
      generatedImages = apiResponse.images.map((imageUrl, index) => ({
        id: `gen_${timestamp}_${index}`,
        url: imageUrl,
        createdAt: timestamp,
        // 未登录用户不保存 storagePath、fileSize、mimeType
      }));
      console.log('✅ 生成结果已准备（未保存到数据库）');
    }

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

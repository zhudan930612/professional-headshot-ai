import { supabase } from '../lib/supabase';
import { ReferenceImage, GeneratedImage } from '../types';

// Supabase Storage Bucket 名称
const USER_UPLOADS_BUCKET = 'user-uploads';
const GENERATED_IMAGES_BUCKET = 'generated-headshots';

// 将图片 Blob 转换为指定格式（基于浏览器 Canvas，失败时回退原始 Blob）
const convertBlobToFormat = async (
  blob: Blob,
  mimeType: 'image/png' | 'image/webp' | 'image/jpeg',
  quality: number = 0.92
): Promise<Blob> => {
  // 仅在浏览器环境转换；SSR/函数环境直接返回原始 Blob
  if (typeof document === 'undefined' || typeof FileReader === 'undefined' || typeof Image === 'undefined') return blob;

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 1;
            canvas.height = img.height || 1;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('无法获取 Canvas 上下文');

            ctx.drawImage(img, 0, 0);

            canvas.toBlob((converted) => {
              if (converted) {
                resolve(converted);
              } else {
                resolve(blob);
              }
            }, mimeType, quality);
          } catch (err) {
            console.warn('转换图片失败，回退原始 Blob:', err);
            resolve(blob);
          }
        };

        img.onerror = () => {
          console.warn('图片加载失败，回退原始 Blob');
          resolve(blob);
        };

        img.src = reader.result as string;
      };

      reader.onerror = () => {
        console.warn('读取图片失败，回退原始 Blob');
        resolve(blob);
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn('转换过程异常，回退原始 Blob:', err);
      resolve(blob);
    }
  });
};

/**
 * 上传参考图到 Supabase Storage
 *
 * @param file 用户上传的图片文件
 * @param userId 用户 ID
 * @returns ReferenceImage 对象
 */
export const uploadReferenceImage = async (
  file: File,
  userId: string
): Promise<ReferenceImage> => {
  try {
    // 生成唯一文件名
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}_reference.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(USER_UPLOADS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('上传参考图失败:', error);
      throw new Error(`上传失败: ${error.message}`);
    }

    // 获取公开访问 URL
    const { data: { publicUrl } } = supabase.storage
      .from(USER_UPLOADS_BUCKET)
      .getPublicUrl(filePath);

    // 构建 ReferenceImage 对象
    const referenceImage: ReferenceImage = {
      id: `ref_${timestamp}`,
      url: publicUrl,
      storagePath: filePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      createdAt: timestamp,
      isSelected: true,
    };

    return referenceImage;
  } catch (error) {
    console.error('上传参考图出错:', error);
    throw error;
  }
};

/**
 * 上传生成的图片到 Supabase Storage
 *
 * @param imageBlob 图片 Blob 数据
 * @param userId 用户 ID
 * @param sessionId 会话 ID
 * @param index 图片索引（用于生成唯一文件名）
 * @returns GeneratedImage 对象
 */
export const uploadGeneratedImage = async (
  imageBlob: Blob,
  userId: string,
  sessionId: string,
  index: number
): Promise<GeneratedImage> => {
  try {
    // 统一转成 PNG 作为主存
    const pngBlob = await convertBlobToFormat(imageBlob, 'image/png');
    const timestamp = Date.now();
    const baseName = `${sessionId}_${index}`;
    const pngPath = `${userId}/${baseName}.png`;

    const { error: pngErr } = await supabase.storage
      .from(GENERATED_IMAGES_BUCKET)
      .upload(pngPath, pngBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/png',
      });

    if (pngErr) {
      console.error('上传 PNG 失败:', pngErr);
      throw new Error(`上传失败: ${pngErr.message}`);
    }

    const { data: { publicUrl: pngUrl } } = supabase.storage
      .from(GENERATED_IMAGES_BUCKET)
      .getPublicUrl(pngPath);

    // 从 PNG 派生 JPG 展示（替代 WebP，更好的兼容性）
    let jpgUrl: string | undefined;
    try {
      const jpgBlob = await convertBlobToFormat(pngBlob, 'image/jpeg', 0.85);
      const jpgPath = `${userId}/${baseName}.jpg`;

      const { error: jpgErr } = await supabase.storage
        .from(GENERATED_IMAGES_BUCKET)
        .upload(jpgPath, jpgBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (!jpgErr) {
        const { data: { publicUrl } } = supabase.storage
          .from(GENERATED_IMAGES_BUCKET)
          .getPublicUrl(jpgPath);
        jpgUrl = publicUrl;
      } else {
        console.warn('上传 JPG 失败，前端将回退 PNG:', jpgErr);
      }
    } catch (err) {
      console.warn('生成 JPG 失败，前端将回退 PNG:', err);
    }

    // 构建 GeneratedImage 对象
    const generatedImage: GeneratedImage = {
      id: `gen_${timestamp}_${index}`,
      url: pngUrl,
      storagePath: pngPath,
      fileSize: pngBlob.size,
      mimeType: 'image/png',
      createdAt: timestamp,
      jpgUrl,
    };

    return generatedImage;
  } catch (error) {
    console.error('上传生成图片出错:', error);
    throw error;
  }
};

/**
 * 从 URL 下载图片并上传到 Supabase Storage
 * （用于将 AI 生成的图片 URL 转换为 Supabase Storage）
 *
 * @param imageUrl 图片 URL
 * @param userId 用户 ID
 * @param sessionId 会话 ID
 * @param index 图片索引
 * @returns GeneratedImage 对象
 */
export const downloadAndUploadGeneratedImage = async (
  imageUrl: string,
  userId: string,
  sessionId: string,
  index: number
): Promise<GeneratedImage> => {
  try {
    // 使用代理下载图片以避免 CORS 问题
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const proxyUrl = `${appUrl}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    
    console.log('通过代理下载图片:', proxyUrl);
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      cache: 'no-cache',
    });
    
    if (!response.ok) {
      // 如果代理失败，尝试直接下载（回退方案）
      console.warn('代理下载失败，尝试直接下载...');
      const directResponse = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache',
      });
      
      if (!directResponse.ok) {
        throw new Error(`下载图片失败: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      const imageBlob = await directResponse.blob();
      return await uploadGeneratedImage(imageBlob, userId, sessionId, index);
    }

    const imageBlob = await response.blob();

    // 上传到 Supabase Storage
    return await uploadGeneratedImage(imageBlob, userId, sessionId, index);
  } catch (error) {
    console.error('下载并上传图片出错:', error);
    throw error;
  }
};

/**
 * 删除 Supabase Storage 中的文件
 *
 * @param storagePath 文件路径
 * @param bucket Bucket 名称
 * @returns 是否成功
 */
export const deleteStorageFile = async (
  storagePath: string,
  bucket: 'user-uploads' | 'generated-headshots'
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (error) {
      console.error('删除文件失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('删除文件出错:', error);
    return false;
  }
};

/**
 * 批量删除生成的图片
 *
 * @param storagePaths 文件路径数组
 * @returns 是否成功
 */
export const deleteGeneratedImages = async (
  storagePaths: string[]
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(GENERATED_IMAGES_BUCKET)
      .remove(storagePaths);

    if (error) {
      console.error('批量删除文件失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('批量删除文件出错:', error);
    return false;
  }
};

/**
 * 检查 Bucket 是否存在（用于初始化）
 *
 * @param bucketName Bucket 名称
 * @returns 是否存在
 */
export const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('获取 Bucket 列表失败:', error);
      return false;
    }

    return data?.some(bucket => bucket.name === bucketName) || false;
  } catch (error) {
    console.error('检查 Bucket 出错:', error);
    return false;
  }
};

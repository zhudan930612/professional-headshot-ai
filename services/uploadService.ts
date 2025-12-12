import { supabase } from '../lib/supabase';
import { ReferenceImage, GeneratedImage } from '../types';

// Supabase Storage Bucket 名称
const USER_UPLOADS_BUCKET = 'user-uploads';
const GENERATED_IMAGES_BUCKET = 'generated-images';

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
    // 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `${sessionId}_${index}.jpg`;
    const filePath = `${userId}/${fileName}`;

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(GENERATED_IMAGES_BUCKET)
      .upload(filePath, imageBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) {
      console.error('上传生成图片失败:', error);
      throw new Error(`上传失败: ${error.message}`);
    }

    // 获取公开访问 URL
    const { data: { publicUrl } } = supabase.storage
      .from(GENERATED_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    // 构建 GeneratedImage 对象
    const generatedImage: GeneratedImage = {
      id: `gen_${timestamp}_${index}`,
      url: publicUrl,
      storagePath: filePath,
      fileSize: imageBlob.size,
      mimeType: 'image/jpeg',
      createdAt: timestamp,
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
    // 下载图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.statusText}`);
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
  bucket: 'user-uploads' | 'generated-images'
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

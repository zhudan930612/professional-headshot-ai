import { ReferenceImage } from '../types';

/**
 * 自动选择参考图片
 * 当前实现：选择第一张图片作为参考图
 * 未来优化方向：
 * - 图片质量评估（清晰度、光线）
 * - 人脸检测（使用 Face API 或 TensorFlow.js）
 * - 图片分辨率检查
 * - 综合评分系统
 *
 * @param files 用户上传的文件数组
 * @returns 选中的参考图索引
 */
export const selectReferenceImage = async (files: File[]): Promise<number> => {
  if (files.length === 0) {
    throw new Error('没有可选择的图片');
  }

  // 当前简单实现：选择第一张图片
  // TODO: 实现智能选择算法
  return 0;
};

/**
 * 评估图片质量（未来实现）
 * 可以使用以下指标：
 * - 分辨率（宽度 × 高度）
 * - 文件大小（不应过小）
 * - 图片清晰度（可以使用拉普拉斯算子）
 * - 人脸检测（面部清晰度、角度）
 *
 * @param file 图片文件
 * @returns 质量分数（0-100）
 */
export const evaluateImageQuality = async (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 基础评分：基于分辨率和文件大小
        const resolution = img.width * img.height;
        const sizeScore = Math.min(file.size / (1024 * 1024), 1) * 30; // 最大 30 分
        const resolutionScore = Math.min(resolution / (1920 * 1080), 1) * 50; // 最大 50 分
        const basicScore = sizeScore + resolutionScore + 20; // 基础 20 分

        // TODO: 添加更高级的图片质量检测
        // - 清晰度检测
        // - 光线检测
        // - 人脸检测

        resolve(Math.min(Math.round(basicScore), 100));
      };

      img.onerror = () => {
        resolve(0);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(0);
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 智能选择参考图（基于质量评分）
 * 未来可以替代 selectReferenceImage 函数
 *
 * @param files 用户上传的文件数组
 * @returns 选中的参考图索引
 */
export const selectReferenceImageByQuality = async (files: File[]): Promise<number> => {
  if (files.length === 0) {
    throw new Error('没有可选择的图片');
  }

  // 并行评估所有图片的质量
  const qualityScores = await Promise.all(
    files.map(file => evaluateImageQuality(file))
  );

  // 找到质量最高的图片索引
  let maxScore = qualityScores[0];
  let maxIndex = 0;

  for (let i = 1; i < qualityScores.length; i++) {
    if (qualityScores[i] > maxScore) {
      maxScore = qualityScores[i];
      maxIndex = i;
    }
  }

  console.log('图片质量评分:', qualityScores);
  console.log('选择第', maxIndex + 1, '张图片，质量分数:', maxScore);

  return maxIndex;
};

/**
 * 验证图片文件
 * 检查文件类型、大小等
 *
 * @param file 图片文件
 * @param maxSizeMB 最大文件大小（MB）
 * @returns 验证结果
 */
export const validateImageFile = (
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } => {
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `不支持的文件类型：${file.type}。请上传 JPG、PNG 或 HEIC 格式的图片。`
    };
  }

  // 检查文件大小
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `文件过大：${(file.size / 1024 / 1024).toFixed(2)}MB。最大允许 ${maxSizeMB}MB。`
    };
  }

  return { valid: true };
};

/**
 * 批量验证图片文件
 *
 * @param files 图片文件数组
 * @param maxSizeMB 最大文件大小（MB）
 * @returns 验证结果
 */
export const validateImageFiles = (
  files: File[],
  maxSizeMB: number = 5
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  files.forEach((file, index) => {
    const result = validateImageFile(file, maxSizeMB);
    if (!result.valid) {
      errors.push(`图片 ${index + 1}: ${result.error}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

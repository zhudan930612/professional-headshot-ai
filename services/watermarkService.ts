/**
 * 水印服务 - 为 Free 用户生成的图片添加水印
 * 仅在前端使用 Canvas 添加，不需要后端处理
 */

// 水印配置
const WATERMARK_CONFIG = {
  text: 'AI Headshot - Free Version',
  font: '24px Inter, sans-serif',
  textColor: 'rgba(255, 255, 255, 0.7)',
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  padding: 20,
  borderRadius: 8,
  position: 'bottom-right' as const
};

/**
 * 使用 Canvas 添加水印到图片
 * @param imageUrl 原始图片 URL
 * @param watermarkText 水印文字（可选，默认为 'AI Headshot - Free Version'）
 * @returns 返回带水印图片的 Blob URL
 */
export async function addWatermark(
  imageUrl: string,
  watermarkText: string = WATERMARK_CONFIG.text
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法获取 Canvas 上下文'));
          return;
        }

        // 设置 Canvas 尺寸与原图相同
        canvas.width = img.width;
        canvas.height = img.height;

        // 绘制原图
        ctx.drawImage(img, 0, 0);

        // 计算文字尺寸
        ctx.font = WATERMARK_CONFIG.font;
        const textMetrics = ctx.measureText(watermarkText);
        const textWidth = textMetrics.width;
        const textHeight = 30;

        // 背景框的位置和尺寸
        const bgPadding = WATERMARK_CONFIG.padding;
        const bgX = canvas.width - textWidth - bgPadding * 2.5;
        const bgY = canvas.height - textHeight - bgPadding * 2;
        const bgWidth = textWidth + bgPadding * 2;
        const bgHeight = textHeight + bgPadding * 1.5;

        // 绘制水印背景框（圆角矩形）
        ctx.fillStyle = WATERMARK_CONFIG.backgroundColor;
        drawRoundedRect(ctx, bgX, bgY, bgWidth, bgHeight, WATERMARK_CONFIG.borderRadius);
        ctx.fill();

        // 绘制水印文字
        ctx.fillStyle = WATERMARK_CONFIG.textColor;
        ctx.font = WATERMARK_CONFIG.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          watermarkText,
          bgX + bgWidth / 2,
          bgY + bgHeight / 2
        );

        // 转换为 Blob URL
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error('无法创建带水印的图片'));
            }
          },
          'image/png',
          0.95  // 图片质量
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error(`无法加载图片: ${imageUrl}`));
    };

    img.src = imageUrl;
  });
}

/**
 * 下载带水印的图片
 * @param imageUrl 原始图片 URL
 * @param filename 下载文件名
 */
export async function downloadImageWithWatermark(
  imageUrl: string,
  filename: string
): Promise<void> {
  try {
    const watermarkedUrl = await addWatermark(imageUrl);

    const link = document.createElement('a');
    link.href = watermarkedUrl;
    link.download = filename;

    // 添加到 DOM 并触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理内存（延迟清理避免下载中断）
    setTimeout(() => URL.revokeObjectURL(watermarkedUrl), 1000);
  } catch (error) {
    console.error('下载带水印图片失败:', error);
    throw error;
  }
}

/**
 * 批量为多张图片添加水印
 * @param imageUrls 图片 URL 数组
 * @returns 返回带水印的 Blob URL 数组
 */
export async function addWatermarkBatch(
  imageUrls: string[]
): Promise<string[]> {
  try {
    const watermarkedUrls = await Promise.all(
      imageUrls.map(url => addWatermark(url))
    );
    return watermarkedUrls;
  } catch (error) {
    console.error('批量添加水印失败:', error);
    throw error;
  }
}

/**
 * 绘制圆角矩形的辅助函数
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

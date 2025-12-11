import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleAPIError, Errors } from '../lib/errorHandler';

/**
 * Reference Templates API
 * 获取案例参考图片库
 *
 * GET /api/reference-templates?category={category}&active={boolean}
 *
 * Query参数:
 * - category: 可选，过滤分类（Corporate, Creative, General, Medical, RealEstate, SolidColor）
 *             如果为 "all" 或不提供，返回所有分类
 * - active: 可选，只返回激活的模板（默认: true）
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET requests are allowed'
      }
    });
  }

  try {
    // 获取查询参数
    const { category, active } = req.query;
    const categoryParam = typeof category === 'string' ? category : undefined;
    const activeParam = active === 'false' ? false : true; // 默认只返回激活的

    console.log(`[API] Fetching reference templates - category: ${categoryParam || 'all'}, active: ${activeParam}`);

    // 创建Supabase客户端
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // 构建查询
    let query = supabase
      .from('reference_templates')
      .select('*')
      .order('category')
      .order('sort_order');

    // 应用分类过滤（如果不是'all'且提供了category）
    if (categoryParam && categoryParam !== 'all') {
      query = query.eq('category', categoryParam);
    }

    // 应用激活状态过滤
    query = query.eq('is_active', activeParam);

    // 执行查询
    const { data, error } = await query;

    if (error) {
      console.error('[API] Supabase query error:', error);
      throw error;
    }

    // 转换数据格式为前端需要的格式
    const templates = data.map(record => ({
      templateId: record.template_id,
      id: record.template_id, // 兼容前端可能使用的id字段
      name: record.name,
      label: record.name, // 兼容前端可能使用的label字段
      category: record.category,
      thumbnailUrl: record.thumbnail_url || record.full_url,
      imageUrl: record.full_url, // 兼容前端可能使用的imageUrl字段
      fullUrl: record.full_url,
      description: record.description,
      sortOrder: record.sort_order,
      isActive: record.is_active,
      storagePath: record.storage_path,
      createdAt: record.created_at
    }));

    console.log(`[API] Successfully fetched ${templates.length} templates`);

    // 返回成功响应
    return res.status(200).json({
      success: true,
      count: templates.length,
      templates
    });

  } catch (error) {
    console.error('[API] Error in reference-templates:', error);
    handleAPIError(error, res);
  }
}

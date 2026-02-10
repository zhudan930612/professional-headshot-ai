-- ========================================
-- 更新 Professional 套餐的图片质量
-- 将 Professional 从 2K 改为 1K
-- 只有 Executive 套餐使用 2K 质量
-- ========================================

-- 更新 subscription_plans 表中的 Professional 套餐
UPDATE subscription_plans
SET 
  quality = '1K',
  updated_at = NOW()
WHERE id = 'professional';

-- 验证更新结果
SELECT 
  id,
  name,
  quality,
  '✅ 质量已更新' as status
FROM subscription_plans
WHERE id IN ('free', 'professional', 'executive')
ORDER BY 
  CASE id
    WHEN 'free' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'executive' THEN 3
  END;

-- 预期结果：
-- free: 1K
-- professional: 1K (已修正)
-- executive: 2K

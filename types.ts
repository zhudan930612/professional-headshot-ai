export interface AccountUser {
  id: string;
  email: string | null;
  user_metadata: { name?: string; avatar_url?: string };
}

export enum HeadshotStyle {
  General = 'General Professional',
  Medical = 'Medical & Healthcare',
  RealEstate = 'Real Estate Agent',
  Corporate = 'Corporate & Executive',
  Creative = 'Actor & Creative',
  SolidColor = 'Solid Color Background',
}

export enum UseCase {
  LinkedIn = 'LinkedIn',
  Resume = 'Resume',
  Portfolio = 'Portfolio',
  SocialMedia = 'Social Media',
}

export interface HeadshotTemplate {
  id: string;
  templateId: string;
  label: string;
  name: string;
  category: HeadshotStyle;
  imageUrl: string;
  thumbnailUrl?: string;
  fullUrl?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  storagePath?: string;
  createdAt?: string;
}

export interface GeneratedImage {
  isPlaceholder?: boolean;
  taskId?: string;
  id: string;
  url: string;             // PNG 主资源 URL（用于下载）
  createdAt: number;
  storagePath?: string;    // Supabase Storage 路径（PNG）
  fileSize?: number;       // 文件大小（字节，PNG）
  mimeType?: string;       // MIME 类型，默认 image/png
  jpgUrl?: string;         // JPG 展示 URL（替代 WebP，更好的兼容性）
}

// 参考图（用户上传的照片）
export interface ReferenceImage {
  id: string;              // 唯一标识
  url: string;             // 公开访问 URL
  storagePath: string;     // Supabase Storage 路径
  fileName: string;        // 原始文件名
  fileSize: number;        // 文件大小（字节）
  mimeType: string;        // MIME 类型
  createdAt: number;       // 创建时间戳
  isSelected?: boolean;    // 是否被选为参考图
}

export interface GenerationSession {
  id: string;
  date: number;
  style: HeadshotStyle;
  useCase: UseCase;
  images: GeneratedImage[];
  referenceImage?: ReferenceImage;  // 生成时使用的参考图 ⭐ NEW
}

export interface UserQuota {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface BlogPost {
  id: string;
  slug: string;  // SEO-friendly URL slug
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  content: string;  // HTML content
}

// ========================================
// 订阅系统类型定义
// ========================================

// 订阅套餐类型
export type SubscriptionPlan = 'free' | 'professional' | 'executive';

// 订阅状态
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

// 图片质量
export type ImageQuality = '1K' | '2K' | '4K';

// 用户订阅信息
export interface UserSubscription {
  id: string;
  user_id: string;
  plan_type: SubscriptionPlan;
  status: SubscriptionStatus;
  purchased_quota: number;
  bonus_quota: number;
  used_quota: number;
  subscribed_at: string;
  expires_at: string | null;
  payment_id: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

// 配额信息（统一接口）
export interface QuotaInfo {
  plan_type: SubscriptionPlan;
  total_quota: number;
  used_quota: number;
  remaining_quota: number;
  is_paid: boolean;
  quality: ImageQuality;
  has_watermark: boolean;
  resets_at?: string;  // 仅 Free 用户有
}

// 套餐配置
export interface SubscriptionPlanConfig {
  id: SubscriptionPlan;
  name: string;
  display_name: string;
  price: number;
  quota: number;
  bonus_quota: number;
  quality: ImageQuality;
  has_watermark: boolean;
  features: string[];
  is_active: boolean;
  is_popular?: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// 支付交易记录
export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id: string | null;
  creem_order_id: string;
  creem_transaction_id: string | null;
  plan_type: SubscriptionPlan;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata: any;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

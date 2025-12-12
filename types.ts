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
  id: string;
  url: string;
  createdAt: number;
  storagePath?: string;    // Supabase Storage 路径
  fileSize?: number;       // 文件大小（字节）
  mimeType?: string;       // MIME 类型（如 image/jpeg）
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
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
}
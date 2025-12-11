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
}

export interface GenerationSession {
  id: string;
  date: number;
  style: HeadshotStyle;
  useCase: UseCase;
  images: GeneratedImage[];
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
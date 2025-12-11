export enum HeadshotStyle {
  General = 'General Professional',
  Medical = 'Medical & Healthcare',
  RealEstate = 'Real Estate Agent',
  Corporate = 'Corporate & Executive',
  Creative = 'Actor & Creative',
}

export enum UseCase {
  LinkedIn = 'LinkedIn',
  Resume = 'Resume',
  Portfolio = 'Portfolio',
  SocialMedia = 'Social Media',
}

export interface HeadshotTemplate {
  id: string;
  label: string;
  category: HeadshotStyle;
  imageUrl: string;
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
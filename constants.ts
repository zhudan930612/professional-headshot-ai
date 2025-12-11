import { HeadshotStyle, UseCase, HeadshotTemplate } from './types';

export const DAILY_LIMIT = 100;

// Base templates to be duplicated
const BASE_TEMPLATES: Omit<HeadshotTemplate, 'id'>[] = [
  // General
  { 
    label: 'Modern Office', 
    category: HeadshotStyle.General, 
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Warm Studio', 
    category: HeadshotStyle.General, 
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Bright Loft', 
    category: HeadshotStyle.General, 
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Neutral Gray', 
    category: HeadshotStyle.General, 
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  
  // Medical
  { 
    label: 'White Coat Studio', 
    category: HeadshotStyle.Medical, 
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Hospital Context', 
    category: HeadshotStyle.Medical, 
    imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Clinic Bright', 
    category: HeadshotStyle.Medical, 
    imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=400' 
  },

  // Real Estate
  { 
    label: 'Luxury Property', 
    category: HeadshotStyle.RealEstate, 
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Urban Realtor', 
    category: HeadshotStyle.RealEstate, 
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Garden Backdrop', 
    category: HeadshotStyle.RealEstate, 
    imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=300&h=400' 
  },

  // Corporate
  { 
    label: 'Boardroom', 
    category: HeadshotStyle.Corporate, 
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Executive Dark', 
    category: HeadshotStyle.Corporate, 
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Skyscraper View', 
    category: HeadshotStyle.Corporate, 
    imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=300&h=400' 
  },

  // Creative
  { 
    label: 'Artistic Light', 
    category: HeadshotStyle.Creative, 
    imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Outdoor Natural', 
    category: HeadshotStyle.Creative, 
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=300&h=400' 
  },
  { 
    label: 'Studio Color', 
    category: HeadshotStyle.Creative, 
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=400' 
  },
];

// Generate 40+ templates by repeating the base ones with slight variations in ID
export const HEADSHOT_TEMPLATES: HeadshotTemplate[] = [];

// Create 3 copies of each to ensure scrolling
for (let i = 0; i < 3; i++) {
  BASE_TEMPLATES.forEach((template, index) => {
    HEADSHOT_TEMPLATES.push({
      ...template,
      id: `${template.category.substring(0,2).toLowerCase()}_${i}_${index}`,
      label: `${template.label} ${i > 0 ? i + 1 : ''}`.trim()
    });
  });
}


export const STYLE_OPTIONS = [
  { value: HeadshotStyle.Corporate, label: 'Corporate', desc: 'Suit and tie, studio background' },
  { value: HeadshotStyle.General, label: 'General', desc: 'Blazer, open collar, office blur' },
  { value: HeadshotStyle.Creative, label: 'Creative', desc: 'Artistic lighting, modern background' },
  { value: HeadshotStyle.Medical, label: 'Medical', desc: 'White coat, clinical setting' },
];

export const USE_CASE_OPTIONS = [
  { value: UseCase.LinkedIn, label: 'LinkedIn', icon: 'briefcase' },
  { value: UseCase.Resume, label: 'Resume / CV', icon: 'file-text' },
  { value: UseCase.Portfolio, label: 'Personal Website', icon: 'globe' },
  { value: UseCase.SocialMedia, label: 'Social Media', icon: 'user' },
];

export const FAQ_ITEMS = [
  {
    question: "What is a professional headshot?",
    answer: "A professional headshot is a high-quality photo focused on your face, typically used for business profiles like LinkedIn, resumes, and company websites to convey professionalism and approachability."
  },
  {
    question: "Do I really just need selfies to start?",
    answer: "Yes! Our AI analyzes your facial features from 3-10 varied selfies to construct a photorealistic professional image. No studio required."
  },
  {
    question: "How many headshots can I generate per day?",
    answer: `Currently, our free plan allows you to generate up to ${DAILY_LIMIT} headshots every 24 hours. The quota resets at midnight UTC.`
  },
  {
    question: "Will the headshots still look like me?",
    answer: "We strive for high fidelity. The more angles and lighting conditions you provide in your input selfies, the more accurate the result will be."
  },
  {
    question: "Is my data private?",
    answer: "Absolutely. Your uploaded photos are processed solely for the purpose of generating your headshots and are deleted from our processing servers shortly after generation."
  }
];

export const BLOG_POSTS = [
  {
    id: '1',
    title: 'What to Wear for a Professional Headshot',
    excerpt: 'Discover the best color palettes and clothing styles to make your LinkedIn profile stand out.',
    date: 'Oct 12, 2023',
    readTime: '5 min read'
  },
  {
    id: '2',
    title: 'Top 5 Mistakes in Resume Photos',
    excerpt: 'Are you making these common errors? Learn how to fix your CV image instantly.',
    date: 'Nov 04, 2023',
    readTime: '4 min read'
  },
  {
    id: '3',
    title: 'Lighting 101: Studio vs. Natural',
    excerpt: 'Understanding how lighting affects the mood and professionalism of your portrait.',
    date: 'Dec 01, 2023',
    readTime: '6 min read'
  }
];
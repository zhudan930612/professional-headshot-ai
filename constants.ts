import { HeadshotStyle, HeadshotTemplate, UseCase } from './types';

export const DAILY_LIMIT = 100;

// 案例模板（静态资源）- 96张图片
// 图片位置: public/reference-templates/
const BASE_TEMPLATES: Omit<HeadshotTemplate, 'id'>[] = [
  {
    templateId: 'corporate_01',
    label: 'Corporate Professional 01',
    name: 'Corporate Professional 01',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_01.jpg'
  },
  {
    templateId: 'corporate_02',
    label: 'Corporate Professional 02',
    name: 'Corporate Professional 02',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_02.jpg'
  },
  {
    templateId: 'corporate_03',
    label: 'Corporate Professional 03',
    name: 'Corporate Professional 03',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_03.jpg'
  },
  {
    templateId: 'corporate_04',
    label: 'Corporate Professional 04',
    name: 'Corporate Professional 04',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_04.jpg'
  },
  {
    templateId: 'corporate_05',
    label: 'Corporate Professional 05',
    name: 'Corporate Professional 05',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_05.jpg'
  },
  {
    templateId: 'corporate_06',
    label: 'Corporate Professional 06',
    name: 'Corporate Professional 06',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_06.jpg'
  },
  {
    templateId: 'corporate_07',
    label: 'Corporate Professional 07',
    name: 'Corporate Professional 07',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_07.jpg'
  },
  {
    templateId: 'corporate_08',
    label: 'Corporate Professional 08',
    name: 'Corporate Professional 08',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_08.jpg'
  },
  {
    templateId: 'corporate_09',
    label: 'Corporate Professional 09',
    name: 'Corporate Professional 09',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_09.jpg'
  },
  {
    templateId: 'corporate_10',
    label: 'Corporate Professional 10',
    name: 'Corporate Professional 10',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_10.jpg'
  },
  {
    templateId: 'corporate_11',
    label: 'Corporate Professional 11',
    name: 'Corporate Professional 11',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_11.jpg'
  },
  {
    templateId: 'corporate_12',
    label: 'Corporate Professional 12',
    name: 'Corporate Professional 12',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_12.jpg'
  },
  {
    templateId: 'corporate_13',
    label: 'Corporate Professional 13',
    name: 'Corporate Professional 13',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_13.jpg'
  },
  {
    templateId: 'corporate_14',
    label: 'Corporate Professional 14',
    name: 'Corporate Professional 14',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_14.jpg'
  },
  {
    templateId: 'corporate_15',
    label: 'Corporate Professional 15',
    name: 'Corporate Professional 15',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_15.jpg'
  },
  {
    templateId: 'corporate_16',
    label: 'Corporate Professional 16',
    name: 'Corporate Professional 16',
    category: HeadshotStyle.Corporate,
    imageUrl: '/reference-templates/corporate/corporate_16.jpg'
  },
  {
    templateId: 'creative_01',
    label: 'Creative Professional 01',
    name: 'Creative Professional 01',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_01.jpg'
  },
  {
    templateId: 'creative_02',
    label: 'Creative Professional 02',
    name: 'Creative Professional 02',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_02.jpg'
  },
  {
    templateId: 'creative_03',
    label: 'Creative Professional 03',
    name: 'Creative Professional 03',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_03.jpg'
  },
  {
    templateId: 'creative_04',
    label: 'Creative Professional 04',
    name: 'Creative Professional 04',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_04.jpg'
  },
  {
    templateId: 'creative_05',
    label: 'Creative Professional 05',
    name: 'Creative Professional 05',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_05.jpg'
  },
  {
    templateId: 'creative_06',
    label: 'Creative Professional 06',
    name: 'Creative Professional 06',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_06.jpg'
  },
  {
    templateId: 'creative_07',
    label: 'Creative Professional 07',
    name: 'Creative Professional 07',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_07.jpg'
  },
  {
    templateId: 'creative_08',
    label: 'Creative Professional 08',
    name: 'Creative Professional 08',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_08.jpg'
  },
  {
    templateId: 'creative_09',
    label: 'Creative Professional 09',
    name: 'Creative Professional 09',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_09.jpg'
  },
  {
    templateId: 'creative_10',
    label: 'Creative Professional 10',
    name: 'Creative Professional 10',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_10.jpg'
  },
  {
    templateId: 'creative_11',
    label: 'Creative Professional 11',
    name: 'Creative Professional 11',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_11.jpg'
  },
  {
    templateId: 'creative_12',
    label: 'Creative Professional 12',
    name: 'Creative Professional 12',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_12.jpg'
  },
  {
    templateId: 'creative_13',
    label: 'Creative Professional 13',
    name: 'Creative Professional 13',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_13.jpg'
  },
  {
    templateId: 'creative_14',
    label: 'Creative Professional 14',
    name: 'Creative Professional 14',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_14.jpg'
  },
  {
    templateId: 'creative_15',
    label: 'Creative Professional 15',
    name: 'Creative Professional 15',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_15.jpg'
  },
  {
    templateId: 'creative_16',
    label: 'Creative Professional 16',
    name: 'Creative Professional 16',
    category: HeadshotStyle.Creative,
    imageUrl: '/reference-templates/creative/creative_16.jpg'
  },
  {
    templateId: 'general_01',
    label: 'General Professional 01',
    name: 'General Professional 01',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_01.jpg'
  },
  {
    templateId: 'general_02',
    label: 'General Professional 02',
    name: 'General Professional 02',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_02.jpg'
  },
  {
    templateId: 'general_03',
    label: 'General Professional 03',
    name: 'General Professional 03',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_03.jpg'
  },
  {
    templateId: 'general_04',
    label: 'General Professional 04',
    name: 'General Professional 04',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_04.jpg'
  },
  {
    templateId: 'general_05',
    label: 'General Professional 05',
    name: 'General Professional 05',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_05.jpg'
  },
  {
    templateId: 'general_06',
    label: 'General Professional 06',
    name: 'General Professional 06',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_06.jpg'
  },
  {
    templateId: 'general_07',
    label: 'General Professional 07',
    name: 'General Professional 07',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_07.jpg'
  },
  {
    templateId: 'general_08',
    label: 'General Professional 08',
    name: 'General Professional 08',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_08.jpg'
  },
  {
    templateId: 'general_09',
    label: 'General Professional 09',
    name: 'General Professional 09',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_09.jpg'
  },
  {
    templateId: 'general_10',
    label: 'General Professional 10',
    name: 'General Professional 10',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_10.jpg'
  },
  {
    templateId: 'general_11',
    label: 'General Professional 11',
    name: 'General Professional 11',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_11.jpg'
  },
  {
    templateId: 'general_12',
    label: 'General Professional 12',
    name: 'General Professional 12',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_12.jpg'
  },
  {
    templateId: 'general_13',
    label: 'General Professional 13',
    name: 'General Professional 13',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_13.jpg'
  },
  {
    templateId: 'general_14',
    label: 'General Professional 14',
    name: 'General Professional 14',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_14.jpg'
  },
  {
    templateId: 'general_15',
    label: 'General Professional 15',
    name: 'General Professional 15',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_15.jpg'
  },
  {
    templateId: 'general_16',
    label: 'General Professional 16',
    name: 'General Professional 16',
    category: HeadshotStyle.General,
    imageUrl: '/reference-templates/general/general_16.jpg'
  },
  {
    templateId: 'medical_01',
    label: 'Medical Professional 01',
    name: 'Medical Professional 01',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_01.jpg'
  },
  {
    templateId: 'medical_02',
    label: 'Medical Professional 02',
    name: 'Medical Professional 02',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_02.jpg'
  },
  {
    templateId: 'medical_03',
    label: 'Medical Professional 03',
    name: 'Medical Professional 03',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_03.jpg'
  },
  {
    templateId: 'medical_04',
    label: 'Medical Professional 04',
    name: 'Medical Professional 04',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_04.jpg'
  },
  {
    templateId: 'medical_05',
    label: 'Medical Professional 05',
    name: 'Medical Professional 05',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_05.jpg'
  },
  {
    templateId: 'medical_06',
    label: 'Medical Professional 06',
    name: 'Medical Professional 06',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_06.jpg'
  },
  {
    templateId: 'medical_07',
    label: 'Medical Professional 07',
    name: 'Medical Professional 07',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_07.jpg'
  },
  {
    templateId: 'medical_08',
    label: 'Medical Professional 08',
    name: 'Medical Professional 08',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_08.jpg'
  },
  {
    templateId: 'medical_09',
    label: 'Medical Professional 09',
    name: 'Medical Professional 09',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_09.jpg'
  },
  {
    templateId: 'medical_10',
    label: 'Medical Professional 10',
    name: 'Medical Professional 10',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_10.jpg'
  },
  {
    templateId: 'medical_11',
    label: 'Medical Professional 11',
    name: 'Medical Professional 11',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_11.jpg'
  },
  {
    templateId: 'medical_12',
    label: 'Medical Professional 12',
    name: 'Medical Professional 12',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_12.jpg'
  },
  {
    templateId: 'medical_13',
    label: 'Medical Professional 13',
    name: 'Medical Professional 13',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_13.jpg'
  },
  {
    templateId: 'medical_14',
    label: 'Medical Professional 14',
    name: 'Medical Professional 14',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_14.jpg'
  },
  {
    templateId: 'medical_15',
    label: 'Medical Professional 15',
    name: 'Medical Professional 15',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_15.jpg'
  },
  {
    templateId: 'medical_16',
    label: 'Medical Professional 16',
    name: 'Medical Professional 16',
    category: HeadshotStyle.Medical,
    imageUrl: '/reference-templates/medical/medical_16.jpg'
  },
  {
    templateId: 'realestate_01',
    label: 'RealEstate Professional 01',
    name: 'RealEstate Professional 01',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_01.jpg'
  },
  {
    templateId: 'realestate_02',
    label: 'RealEstate Professional 02',
    name: 'RealEstate Professional 02',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_02.jpg'
  },
  {
    templateId: 'realestate_03',
    label: 'RealEstate Professional 03',
    name: 'RealEstate Professional 03',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_03.jpg'
  },
  {
    templateId: 'realestate_04',
    label: 'RealEstate Professional 04',
    name: 'RealEstate Professional 04',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_04.jpg'
  },
  {
    templateId: 'realestate_05',
    label: 'RealEstate Professional 05',
    name: 'RealEstate Professional 05',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_05.jpg'
  },
  {
    templateId: 'realestate_06',
    label: 'RealEstate Professional 06',
    name: 'RealEstate Professional 06',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_06.jpg'
  },
  {
    templateId: 'realestate_07',
    label: 'RealEstate Professional 07',
    name: 'RealEstate Professional 07',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_07.jpg'
  },
  {
    templateId: 'realestate_08',
    label: 'RealEstate Professional 08',
    name: 'RealEstate Professional 08',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_08.jpg'
  },
  {
    templateId: 'realestate_09',
    label: 'RealEstate Professional 09',
    name: 'RealEstate Professional 09',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_09.jpg'
  },
  {
    templateId: 'realestate_10',
    label: 'RealEstate Professional 10',
    name: 'RealEstate Professional 10',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_10.jpg'
  },
  {
    templateId: 'realestate_11',
    label: 'RealEstate Professional 11',
    name: 'RealEstate Professional 11',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_11.jpg'
  },
  {
    templateId: 'realestate_12',
    label: 'RealEstate Professional 12',
    name: 'RealEstate Professional 12',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_12.jpg'
  },
  {
    templateId: 'realestate_13',
    label: 'RealEstate Professional 13',
    name: 'RealEstate Professional 13',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_13.jpg'
  },
  {
    templateId: 'realestate_14',
    label: 'RealEstate Professional 14',
    name: 'RealEstate Professional 14',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_14.jpg'
  },
  {
    templateId: 'realestate_15',
    label: 'RealEstate Professional 15',
    name: 'RealEstate Professional 15',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_15.jpg'
  },
  {
    templateId: 'realestate_16',
    label: 'RealEstate Professional 16',
    name: 'RealEstate Professional 16',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/reference-templates/realestate/realestate_16.jpg'
  },
  {
    templateId: 'solidcolor_01',
    label: 'SolidColor Professional 01',
    name: 'SolidColor Professional 01',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_01.jpg'
  },
  {
    templateId: 'solidcolor_02',
    label: 'SolidColor Professional 02',
    name: 'SolidColor Professional 02',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_02.jpg'
  },
  {
    templateId: 'solidcolor_03',
    label: 'SolidColor Professional 03',
    name: 'SolidColor Professional 03',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_03.jpg'
  },
  {
    templateId: 'solidcolor_04',
    label: 'SolidColor Professional 04',
    name: 'SolidColor Professional 04',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_04.jpg'
  },
  {
    templateId: 'solidcolor_05',
    label: 'SolidColor Professional 05',
    name: 'SolidColor Professional 05',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_05.jpg'
  },
  {
    templateId: 'solidcolor_06',
    label: 'SolidColor Professional 06',
    name: 'SolidColor Professional 06',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_06.jpg'
  },
  {
    templateId: 'solidcolor_07',
    label: 'SolidColor Professional 07',
    name: 'SolidColor Professional 07',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_07.jpg'
  },
  {
    templateId: 'solidcolor_08',
    label: 'SolidColor Professional 08',
    name: 'SolidColor Professional 08',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_08.jpg'
  },
  {
    templateId: 'solidcolor_09',
    label: 'SolidColor Professional 09',
    name: 'SolidColor Professional 09',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_09.jpg'
  },
  {
    templateId: 'solidcolor_10',
    label: 'SolidColor Professional 10',
    name: 'SolidColor Professional 10',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_10.jpg'
  },
  {
    templateId: 'solidcolor_11',
    label: 'SolidColor Professional 11',
    name: 'SolidColor Professional 11',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_11.jpg'
  },
  {
    templateId: 'solidcolor_12',
    label: 'SolidColor Professional 12',
    name: 'SolidColor Professional 12',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_12.jpg'
  },
  {
    templateId: 'solidcolor_13',
    label: 'SolidColor Professional 13',
    name: 'SolidColor Professional 13',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_13.jpg'
  },
  {
    templateId: 'solidcolor_14',
    label: 'SolidColor Professional 14',
    name: 'SolidColor Professional 14',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_14.jpg'
  },
  {
    templateId: 'solidcolor_15',
    label: 'SolidColor Professional 15',
    name: 'SolidColor Professional 15',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_15.jpg'
  },
  {
    templateId: 'solidcolor_16',
    label: 'SolidColor Professional 16',
    name: 'SolidColor Professional 16',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/reference-templates/solidcolor/solidcolor_16.jpg'
  }
];

// 生成完整的模板列表（兼容现有代码）
export const HEADSHOT_TEMPLATES: HeadshotTemplate[] = BASE_TEMPLATES.map((template) => ({
  ...template,
  id: template.templateId,
}));

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

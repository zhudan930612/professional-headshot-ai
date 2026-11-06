import { HeadshotStyle, HeadshotTemplate, UseCase } from './types';

export const DAILY_LIMIT = 100;

// 案例模板（静态资源）- 96张图?
// 图片位置: public/reference-templates/
const BASE_TEMPLATES: Omit<HeadshotTemplate, 'id'>[] = [
  {
    templateId: 'corporate_01',
    label: 'Corporate Professional 01',
    name: 'Corporate Professional 01',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_01.jpg',
    description: 'modern office background'
  },
  {
    templateId: 'corporate_02',
    label: 'Corporate Professional 02',
    name: 'Corporate Professional 02',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_02.jpg',
    description: 'natural window light'
  },
  {
    templateId: 'corporate_03',
    label: 'Corporate Professional 03',
    name: 'Corporate Professional 03',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_03.jpg',
    description: 'neutral studio background'
  },
  {
    templateId: 'corporate_04',
    label: 'Corporate Professional 04',
    name: 'Corporate Professional 04',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_04.jpg',
    description: 'professional gray backdrop'
  },
  {
    templateId: 'corporate_05',
    label: 'Corporate Professional 05',
    name: 'Corporate Professional 05',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_05.jpg',
    description: 'bright corporate setting'
  },
  {
    templateId: 'corporate_06',
    label: 'Corporate Professional 06',
    name: 'Corporate Professional 06',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_06.jpg',
    description: 'classic business environment'
  },
  {
    templateId: 'corporate_07',
    label: 'Corporate Professional 07',
    name: 'Corporate Professional 07',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_07.jpg',
    description: 'minimalist office space'
  },
  {
    templateId: 'corporate_08',
    label: 'Corporate Professional 08',
    name: 'Corporate Professional 08',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_08.jpg',
    description: 'warm indoor lighting'
  },
  {
    templateId: 'corporate_09',
    label: 'Corporate Professional 09',
    name: 'Corporate Professional 09',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_09.jpg',
    description: 'contemporary workspace'
  },
  {
    templateId: 'corporate_10',
    label: 'Corporate Professional 10',
    name: 'Corporate Professional 10',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_10.jpg',
    description: 'formal studio style'
  },
  {
    templateId: 'corporate_11',
    label: 'Corporate Professional 11',
    name: 'Corporate Professional 11',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_11.jpg',
    description: 'executive boardroom setting'
  },
  {
    templateId: 'corporate_12',
    label: 'Corporate Professional 12',
    name: 'Corporate Professional 12',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_12.jpg',
    description: 'sleek modern office'
  },
  {
    templateId: 'corporate_13',
    label: 'Corporate Professional 13',
    name: 'Corporate Professional 13',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_13.jpg',
    description: 'professional workspace'
  },
  {
    templateId: 'corporate_14',
    label: 'Corporate Professional 14',
    name: 'Corporate Professional 14',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_14.jpg',
    description: 'clean business backdrop'
  },
  {
    templateId: 'corporate_15',
    label: 'Corporate Professional 15',
    name: 'Corporate Professional 15',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_15.jpg',
    description: 'polished corporate look'
  },
  {
    templateId: 'corporate_16',
    label: 'Corporate Professional 16',
    name: 'Corporate Professional 16',
    category: HeadshotStyle.Corporate,
    imageUrl: '/api/media/template-images/corporate/corporate_16.jpg',
    description: 'sophisticated office environment'
  },
  {
    templateId: 'creative_01',
    label: 'Creative Professional 01',
    name: 'Creative Professional 01',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_01.jpg',
    description: 'artistic lighting setup'
  },
  {
    templateId: 'creative_02',
    label: 'Creative Professional 02',
    name: 'Creative Professional 02',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_02.jpg',
    description: 'colorful background'
  },
  {
    templateId: 'creative_03',
    label: 'Creative Professional 03',
    name: 'Creative Professional 03',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_03.jpg',
    description: 'creative studio setting'
  },
  {
    templateId: 'creative_04',
    label: 'Creative Professional 04',
    name: 'Creative Professional 04',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_04.jpg',
    description: 'dynamic composition'
  },
  {
    templateId: 'creative_05',
    label: 'Creative Professional 05',
    name: 'Creative Professional 05',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_05.jpg',
    description: 'natural outdoor light'
  },
  {
    templateId: 'creative_06',
    label: 'Creative Professional 06',
    name: 'Creative Professional 06',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_06.jpg',
    description: 'urban artistic background'
  },
  {
    templateId: 'creative_07',
    label: 'Creative Professional 07',
    name: 'Creative Professional 07',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_07.jpg',
    description: 'bold color backdrop'
  },
  {
    templateId: 'creative_08',
    label: 'Creative Professional 08',
    name: 'Creative Professional 08',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_08.jpg',
    description: 'expressive lighting'
  },
  {
    templateId: 'creative_09',
    label: 'Creative Professional 09',
    name: 'Creative Professional 09',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_09.jpg',
    description: 'modern creative space'
  },
  {
    templateId: 'creative_10',
    label: 'Creative Professional 10',
    name: 'Creative Professional 10',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_10.jpg',
    description: 'artistic environment'
  },
  {
    templateId: 'creative_11',
    label: 'Creative Professional 11',
    name: 'Creative Professional 11',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_11.jpg',
    description: 'vibrant background'
  },
  {
    templateId: 'creative_12',
    label: 'Creative Professional 12',
    name: 'Creative Professional 12',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_12.jpg',
    description: 'contemporary art style'
  },
  {
    templateId: 'creative_13',
    label: 'Creative Professional 13',
    name: 'Creative Professional 13',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_13.jpg',
    description: 'creative workspace'
  },
  {
    templateId: 'creative_14',
    label: 'Creative Professional 14',
    name: 'Creative Professional 14',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_14.jpg',
    description: 'dramatic lighting'
  },
  {
    templateId: 'creative_15',
    label: 'Creative Professional 15',
    name: 'Creative Professional 15',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_15.jpg',
    description: 'artistic studio setting'
  },
  {
    templateId: 'creative_16',
    label: 'Creative Professional 16',
    name: 'Creative Professional 16',
    category: HeadshotStyle.Creative,
    imageUrl: '/api/media/template-images/creative/creative_16.jpg',
    description: 'unique background style'
  },
  {
    templateId: 'general_01',
    label: 'General Professional 01',
    name: 'General Professional 01',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_01.jpg',
    description: 'professional neutral background'
  },
  {
    templateId: 'general_02',
    label: 'General Professional 02',
    name: 'General Professional 02',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_02.jpg',
    description: 'soft natural lighting'
  },
  {
    templateId: 'general_03',
    label: 'General Professional 03',
    name: 'General Professional 03',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_03.jpg',
    description: 'clean professional style'
  },
  {
    templateId: 'general_04',
    label: 'General Professional 04',
    name: 'General Professional 04',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_04.jpg',
    description: 'simple office setting'
  },
  {
    templateId: 'general_05',
    label: 'General Professional 05',
    name: 'General Professional 05',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_05.jpg',
    description: 'modern professional look'
  },
  {
    templateId: 'general_06',
    label: 'General Professional 06',
    name: 'General Professional 06',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_06.jpg',
    description: 'versatile background'
  },
  {
    templateId: 'general_07',
    label: 'General Professional 07',
    name: 'General Professional 07',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_07.jpg',
    description: 'classic professional style'
  },
  {
    templateId: 'general_08',
    label: 'General Professional 08',
    name: 'General Professional 08',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_08.jpg',
    description: 'bright professional setting'
  },
  {
    templateId: 'general_09',
    label: 'General Professional 09',
    name: 'General Professional 09',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_09.jpg',
    description: 'polished appearance'
  },
  {
    templateId: 'general_10',
    label: 'General Professional 10',
    name: 'General Professional 10',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_10.jpg',
    description: 'timeless professional look'
  },
  {
    templateId: 'general_11',
    label: 'General Professional 11',
    name: 'General Professional 11',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_11.jpg',
    description: 'clean business style'
  },
  {
    templateId: 'general_12',
    label: 'General Professional 12',
    name: 'General Professional 12',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_12.jpg',
    description: 'professional environment'
  },
  {
    templateId: 'general_13',
    label: 'General Professional 13',
    name: 'General Professional 13',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_13.jpg',
    description: 'standard professional backdrop'
  },
  {
    templateId: 'general_14',
    label: 'General Professional 14',
    name: 'General Professional 14',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_14.jpg',
    description: 'refined professional setting'
  },
  {
    templateId: 'general_15',
    label: 'General Professional 15',
    name: 'General Professional 15',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_15.jpg',
    description: 'professional studio style'
  },
  {
    templateId: 'general_16',
    label: 'General Professional 16',
    name: 'General Professional 16',
    category: HeadshotStyle.General,
    imageUrl: '/api/media/template-images/general/general_16.jpg',
    description: 'balanced lighting'
  },
  {
    templateId: 'medical_01',
    label: 'Medical Professional 01',
    name: 'Medical Professional 01',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_01.jpg',
    description: 'clean clinical style'
  },
  {
    templateId: 'medical_02',
    label: 'Medical Professional 02',
    name: 'Medical Professional 02',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_02.jpg',
    description: 'soft natural lighting'
  },
  {
    templateId: 'medical_03',
    label: 'Medical Professional 03',
    name: 'Medical Professional 03',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_03.jpg',
    description: 'healthcare setting'
  },
  {
    templateId: 'medical_04',
    label: 'Medical Professional 04',
    name: 'Medical Professional 04',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_04.jpg',
    description: 'medical office background'
  },
  {
    templateId: 'medical_05',
    label: 'Medical Professional 05',
    name: 'Medical Professional 05',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_05.jpg',
    description: 'professional clinic environment'
  },
  {
    templateId: 'medical_06',
    label: 'Medical Professional 06',
    name: 'Medical Professional 06',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_06.jpg',
    description: 'bright clinical setting'
  },
  {
    templateId: 'medical_07',
    label: 'Medical Professional 07',
    name: 'Medical Professional 07',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_07.jpg',
    description: 'clinical white background'
  },
  {
    templateId: 'medical_08',
    label: 'Medical Professional 08',
    name: 'Medical Professional 08',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_08.jpg',
    description: 'hospital professional style'
  },
  {
    templateId: 'medical_09',
    label: 'Medical Professional 09',
    name: 'Medical Professional 09',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_09.jpg',
    description: 'medical workspace'
  },
  {
    templateId: 'medical_10',
    label: 'Medical Professional 10',
    name: 'Medical Professional 10',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_10.jpg',
    description: 'healthcare professional look'
  },
  {
    templateId: 'medical_11',
    label: 'Medical Professional 11',
    name: 'Medical Professional 11',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_11.jpg',
    description: 'clean medical setting'
  },
  {
    templateId: 'medical_12',
    label: 'Medical Professional 12',
    name: 'Medical Professional 12',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_12.jpg',
    description: 'clinical environment'
  },
  {
    templateId: 'medical_13',
    label: 'Medical Professional 13',
    name: 'Medical Professional 13',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_13.jpg',
    description: 'medical professional backdrop'
  },
  {
    templateId: 'medical_14',
    label: 'Medical Professional 14',
    name: 'Medical Professional 14',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_14.jpg',
    description: 'bright healthcare setting'
  },
  {
    templateId: 'medical_15',
    label: 'Medical Professional 15',
    name: 'Medical Professional 15',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_15.jpg',
    description: 'professional medical style'
  },
  {
    templateId: 'medical_16',
    label: 'Medical Professional 16',
    name: 'Medical Professional 16',
    category: HeadshotStyle.Medical,
    imageUrl: '/api/media/template-images/medical/medical_16.jpg',
    description: 'clinical professional look'
  },
  {
    templateId: 'realestate_01',
    label: 'RealEstate Professional 01',
    name: 'RealEstate Professional 01',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_01.jpg',
    description: 'urban background'
  },
  {
    templateId: 'realestate_02',
    label: 'RealEstate Professional 02',
    name: 'RealEstate Professional 02',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_02.jpg',
    description: 'bright indoor setting'
  },
  {
    templateId: 'realestate_03',
    label: 'RealEstate Professional 03',
    name: 'RealEstate Professional 03',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_03.jpg',
    description: 'outdoor professional setting'
  },
  {
    templateId: 'realestate_04',
    label: 'RealEstate Professional 04',
    name: 'RealEstate Professional 04',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_04.jpg',
    description: 'modern property backdrop'
  },
  {
    templateId: 'realestate_05',
    label: 'RealEstate Professional 05',
    name: 'RealEstate Professional 05',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_05.jpg',
    description: 'professional outdoor style'
  },
  {
    templateId: 'realestate_06',
    label: 'RealEstate Professional 06',
    name: 'RealEstate Professional 06',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_06.jpg',
    description: 'contemporary urban setting'
  },
  {
    templateId: 'realestate_07',
    label: 'RealEstate Professional 07',
    name: 'RealEstate Professional 07',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_07.jpg',
    description: 'bright professional environment'
  },
  {
    templateId: 'realestate_08',
    label: 'RealEstate Professional 08',
    name: 'RealEstate Professional 08',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_08.jpg',
    description: 'stylish background'
  },
  {
    templateId: 'realestate_09',
    label: 'RealEstate Professional 09',
    name: 'RealEstate Professional 09',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_09.jpg',
    description: 'professional location setting'
  },
  {
    templateId: 'realestate_10',
    label: 'RealEstate Professional 10',
    name: 'RealEstate Professional 10',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_10.jpg',
    description: 'urban professional look'
  },
  {
    templateId: 'realestate_11',
    label: 'RealEstate Professional 11',
    name: 'RealEstate Professional 11',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_11.jpg',
    description: 'modern real estate style'
  },
  {
    templateId: 'realestate_12',
    label: 'RealEstate Professional 12',
    name: 'RealEstate Professional 12',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_12.jpg',
    description: 'professional outdoor backdrop'
  },
  {
    templateId: 'realestate_13',
    label: 'RealEstate Professional 13',
    name: 'RealEstate Professional 13',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_13.jpg',
    description: 'contemporary setting'
  },
  {
    templateId: 'realestate_14',
    label: 'RealEstate Professional 14',
    name: 'RealEstate Professional 14',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_14.jpg',
    description: 'property professional look'
  },
  {
    templateId: 'realestate_15',
    label: 'RealEstate Professional 15',
    name: 'RealEstate Professional 15',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_15.jpg',
    description: 'bright modern background'
  },
  {
    templateId: 'realestate_16',
    label: 'RealEstate Professional 16',
    name: 'RealEstate Professional 16',
    category: HeadshotStyle.RealEstate,
    imageUrl: '/api/media/template-images/realestate/realestate_16.jpg',
    description: 'professional urban environment'
  },
  {
    templateId: 'solidcolor_01',
    label: 'SolidColor Professional 01',
    name: 'SolidColor Professional 01',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_01.jpg',
    description: 'blue gradient background'
  },
  {
    templateId: 'solidcolor_02',
    label: 'SolidColor Professional 02',
    name: 'SolidColor Professional 02',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_02.jpg',
    description: 'neutral gray backdrop'
  },
  {
    templateId: 'solidcolor_03',
    label: 'SolidColor Professional 03',
    name: 'SolidColor Professional 03',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_03.jpg',
    description: 'warm beige background'
  },
  {
    templateId: 'solidcolor_04',
    label: 'SolidColor Professional 04',
    name: 'SolidColor Professional 04',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_04.jpg',
    description: 'professional blue background'
  },
  {
    templateId: 'solidcolor_05',
    label: 'SolidColor Professional 05',
    name: 'SolidColor Professional 05',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_05.jpg',
    description: 'soft gray setting'
  },
  {
    templateId: 'solidcolor_06',
    label: 'SolidColor Professional 06',
    name: 'SolidColor Professional 06',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_06.jpg',
    description: 'clean white background'
  },
  {
    templateId: 'solidcolor_07',
    label: 'SolidColor Professional 07',
    name: 'SolidColor Professional 07',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_07.jpg',
    description: 'elegant black backdrop'
  },
  {
    templateId: 'solidcolor_08',
    label: 'SolidColor Professional 08',
    name: 'SolidColor Professional 08',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_08.jpg',
    description: 'professional navy background'
  },
  {
    templateId: 'solidcolor_09',
    label: 'SolidColor Professional 09',
    name: 'SolidColor Professional 09',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_09.jpg',
    description: 'subtle gray gradient'
  },
  {
    templateId: 'solidcolor_10',
    label: 'SolidColor Professional 10',
    name: 'SolidColor Professional 10',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_10.jpg',
    description: 'classic solid background'
  },
  {
    templateId: 'solidcolor_11',
    label: 'SolidColor Professional 11',
    name: 'SolidColor Professional 11',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_11.jpg',
    description: 'professional green backdrop'
  },
  {
    templateId: 'solidcolor_12',
    label: 'SolidColor Professional 12',
    name: 'SolidColor Professional 12',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_12.jpg',
    description: 'warm neutral background'
  },
  {
    templateId: 'solidcolor_13',
    label: 'SolidColor Professional 13',
    name: 'SolidColor Professional 13',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_13.jpg',
    description: 'cool blue setting'
  },
  {
    templateId: 'solidcolor_14',
    label: 'SolidColor Professional 14',
    name: 'SolidColor Professional 14',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_14.jpg',
    description: 'professional gray backdrop'
  },
  {
    templateId: 'solidcolor_15',
    label: 'SolidColor Professional 15',
    name: 'SolidColor Professional 15',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_15.jpg',
    description: 'clean solid color style'
  },
  {
    templateId: 'solidcolor_16',
    label: 'SolidColor Professional 16',
    name: 'SolidColor Professional 16',
    category: HeadshotStyle.SolidColor,
    imageUrl: '/api/media/template-images/solidcolor/solidcolor_16.jpg',
    description: 'professional color background'
  }
];

// 生成完整的模板列表（兼容现有代码?
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

export const FAQ_ITEMS: { question: string; answer: string; href?: string; linkLabel?: string }[] = [
  {
    question: "Can I try it for free?",
    answer: "Yes. Sign in with Google to use your free generation allowance. Free results have a watermark, and no credit card is required. The allowance is granted once, not every month. See Pricing for the current number of credits and paid options.",
    href: "/pricing", linkLabel: "Compare packages"
  },
  {
    question: "Which photo will the AI use?",
    answer: "You can upload up to five photos, then select one as the reference for your generations. Only that selected photo is used, alongside your chosen style template. Use a clear photo of yourself alone, with your face visible, even lighting and no heavy filters."
  },
  {
    question: "Will the headshot look like me?",
    answer: "The AI uses your selected photo as its reference, but likeness and details can vary. Try your own photo before buying. Review each result before using it; a different reference photo or template may work better."
  },
  {
    question: "How do credits and retries work?",
    answer: "Each template you generate uses one credit to create one image. Selecting three templates uses three credits. Each completed image that used a credit allows one free retry with the same template and resolution. The retry does not use another credit, and it cannot be retried again for free."
  },
  {
    question: "What if generation fails or stalls?",
    answer: "A confirmed failure returns the credit used for that generation. If the outcome is still being checked, use the recovery option to retrieve the original result rather than starting another generation. Contact support if the task remains unresolved."
  },
  {
    question: "What changes when I buy a package?",
    answer: "A purchase adds generation credits to your remaining balance. Paid packages provide watermark-free downloads; the higher-resolution option applies to new generations. Buying a package does not upscale images you already generated. Check Pricing for each package's credit count and resolution.",
    href: "/pricing", linkLabel: "View package details"
  },
  {
    question: "Will I be charged again automatically?",
    answer: "No. Packages are one-time purchases, not subscriptions. Credits do not expire, and another payment only happens when you choose to buy again."
  },
  {
    question: "How long does a generation take?",
    answer: "Processing time varies with demand and image quality. Progress is shown in the generator. We do not promise a fixed completion time or a faster queue for a particular package."
  },
  {
    question: "Can I download earlier images without a watermark?",
    answer: "Downloads from My Headshots use your current account's watermark entitlement. With an active paid package, you can download saved images without the service watermark, including earlier free results. Existing images keep their original resolution."
  },
  {
    question: "Where can I use my headshots?",
    answer: "Use a result that accurately represents you on your professional profile, personal website or work bio. Check the requirements of the site or organization receiving it. For a resume or CV, include a photo only when appropriate for the application."
  },
  {
    question: "How are my photos stored and removed?",
    answer: "Uploads and generated images are stored privately. Your selected reference photo is processed by our AI generation provider to create your result. Photos are retained for generation, recovery and account history until removal is requested and processed. Contact support to request deletion.",
    href: "/privacy", linkLabel: "Read the Privacy Policy"
  },
  {
    question: "How do I request payment help or a refund?",
    answer: "Email support@professionalheadshotai.ink with your account email, order details and a description of the issue. Support will review your request. Do not include payment card details. A refund request is not an automatic refund approval."
  }
];

export const BLOG_POSTS = [
  {
    id: '1',
    slug: 'what-to-wear-for-a-professional-headshot',
    title: 'What to Wear for a Professional Headshot',
    excerpt: 'Discover the best color palettes and clothing styles to make your LinkedIn profile stand out.',
    date: 'Oct 12, 2023',
    readTime: '5 min read',
    content: `<h2>The Power of First Impressions Through Clothing</h2><p>What you wear in your professional headshot matters more than you think. Your clothing choice communicates professionalism, competence, and personal brand—often before anyone reads your resume or bio.</p><p>The right outfit can enhance your credibility and make you memorable. The wrong one can undermine everything else about your presentation. Let's explore how to make the best choice.</p><hr/><h2>Color Psychology: Choose Colors That Work For You</h2><h3><strong>Best Colors for Professional Headshots</strong></h3><p><strong>Blues:</strong> The most universally flattering color. Blue conveys trust, stability, and professionalism. It works for virtually all skin tones and industries.</p><p><strong>Jewel Tones (Emerald, Sapphire, Deep Purple):</strong> These rich, saturated colors add sophistication and depth. They photograph beautifully and make your face stand out against the color.</p><p><strong>Warm Neutrals (Cream, Tan, Warm Gray):</strong> Excellent for softer, approachable vibes. Work particularly well for those in education, healthcare, and non-profit sectors.</p><p><strong>Coral and Warm Reds:</strong> Great for creative professionals and those wanting to project energy and confidence. Choose warmer undertones rather than cool reds.</p><h3><strong>Colors to Avoid</strong></h3><p><strong>Pure Black:</strong> Can create harsh shadows on your face and make your face appear smaller. If you want dark, choose charcoal gray instead.</p><p><strong>Neon or Bright Colors:</strong> Distract from your face and can look unprofessional. Save these for casual settings.</p><p><strong>Busy Patterns:</strong> Stripes, checks, and complex patterns draw attention away from your face. Solid colors are always better.</p><p><strong>White:</strong> Can create glare and wash out your complexion. Cream is a better alternative.</p><h2>Fit and Style Guidelines</h2><h3><strong>The Importance of Proper Fit</strong></h3><p>Ill-fitting clothing is the quickest way to look unprofessional. Whether loose or too tight, poor fit undermines your overall presentation.</p><p><strong>What You Should Look For:</strong></p><ul><li>Shoulders should align with your natural shoulder line</li><li>Chest should feel comfortable without pulling</li><li>Sleeves should end at your wrist bone</li><li>No excess fabric bunching or sagging</li><li>Neckline should sit comfortably without gaping</li></ul><h3><strong>Necklines and Framing</strong></h3><p>The neckline of your shirt or top is crucial in headshots because it frames your face:</p><ul><li><strong>Crew necks:</strong> Classic, universally flattering, professional</li><li><strong>V-necks:</strong> Elongate the neck and face, works well for round face shapes</li><li><strong>Boat necks:</strong> Create width, good for narrow face shapes</li><li><strong>Turtlenecks:</strong> Professional but can sometimes feel formal—best for corporate roles</li><li><strong>Open collar:</strong> Approachable, friendly, great for non-corporate environments</li></ul><h2>Blazers and Jackets</h2><h3><strong>When to Wear a Blazer</strong></h3><p>A blazer instantly elevates your professionalism and is recommended for:</p><ul><li>Corporate and finance roles</li><li>Law and government positions</li><li>Senior-level professionals</li><li>When you want to project authority</li></ul><h3><strong>Blazer Tips</strong></h3><ul><li>Choose a well-fitted blazer that doesn't pull at the buttons</li><li>Neutral colors (navy, charcoal, black) work best</li><li>You can leave the blazer unbuttoned for a more relaxed feel</li><li>Match your blazer color to your skin tone undertones</li></ul><h2>Industry-Specific Recommendations</h2><h3><strong>Corporate & Finance</strong></h3><p>Wear a blazer with a solid colored shirt. Navy, charcoal, or classic white are safest choices. Conservative and classic is the goal.</p><h3><strong>Creative Industries</strong></h3><p>You have more flexibility. A well-fitted, jewel-toned shirt or even a creative pattern can work. Show personality while maintaining professionalism.</p><h3><strong>Tech & Startups</strong></h3><p>Business casual is appropriate. A solid colored shirt or light sweater works well. You can skip the blazer for a more approachable look.</p><h3><strong>Healthcare & Education</strong></h3><p>Warm, approachable colors work best. Blues, greens, and warm neutrals convey trustworthiness. A blazer is optional but helpful.</p><h3><strong>Sales & Client-Facing Roles</strong></h3><p>Combination of professional and personable. A blazer with a warm-colored shirt strikes the right balance between authority and approachability.</p><h2>Practical Styling Tips</h2><h3><strong>Avoid These Common Mistakes</strong></h3><ul><li><strong>Tank tops:</strong> Too casual, shows too much skin</li><li><strong>T-shirts:</strong> Unless in creative industry, looks too informal</li><li><strong>Visible logos/brands:</strong> Distracting and unprofessional</li><li><strong>Wrinkled clothing:</strong> Always iron or steam before your shoot</li><li><strong>Clothing with stains or damage:</strong> Double-check before the session</li></ul><h3><strong>Day-of Preparation</strong></h3><ul><li>Try on your outfit the night before to ensure comfort</li><li>Iron or steam everything that needs it</li><li>Check for wrinkles, stains, and loose buttons</li><li>Wear a white or nude undershirt to prevent transparency</li><li>Avoid perfume or cologne that might be distracting</li></ul><h2>What About Jewelry and Accessories?</h2><h3><strong>Jewelry Guidelines</strong></h3><p><strong>Keep it minimal and professional:</strong></p><ul><li>Simple earrings are fine (avoid large, dangling styles)</li><li>A watch is professional and appropriate</li><li>Wedding band or simple ring is fine</li><li>Avoid excessive necklaces or bracelets</li><li>Shiny jewelry can create unwanted reflections</li></ul><h3><strong>Grooming Matters</strong></h3><ul><li>Hair should be clean and styled as you normally wear it</li><li>Consider a fresh haircut 1-2 weeks before</li><li>Makeup should be natural-looking and professional</li><li>Avoid heavy perfume or cologne</li></ul><h2>The Bottom Line</h2><p>Your clothing choice in a professional headshot should:</p><ol><li><strong>Fit well</strong> ?properly sized, not too loose or tight</li><li><strong>Be solid colored</strong> ?avoid patterns and busy designs</li><li><strong>Complement your skin tone</strong> ?choose colors that make you look healthy and vibrant</li><li><strong>Match your industry</strong> ?adjust formality to your field</li><li><strong>Look polished</strong> ?clean, pressed, no damage</li><li><strong>Make you feel confident</strong> ?wear something you feel great in</li></ol><p>Remember: your clothing is secondary to your face. The goal is to enhance your natural features and convey professionalism without distracting from who you are. When you get it right, people won't remember what you wore—they'll remember you.</p>`
  },
  {
    id: '2',
    slug: 'top-5-mistakes-in-resume-photos',
    title: 'Top 5 Mistakes in Resume Photos',
    excerpt: 'Are you making these common errors? Learn how to fix your CV image instantly.',
    date: 'Nov 04, 2023',
    readTime: '4 min read',
    content: `<h2>Your Resume Photo Can Make or Break First Impressions</h2><p>In countries where resume photos are standard (most of Europe, Asia, and beyond), your headshot is your first chance to make a positive impression. Yet many professionals make preventable mistakes that could cost them an interview.</p><p>Let's look at the top 5 resume photo errors and how to fix them immediately.</p><hr/><h2>Mistake #1: Using an Outdated Photo</h2><h3><strong>The Problem</strong></h3><p>The most common resume photo mistake is using an image from years ago. Maybe it's the only professional photo you have. Maybe you just haven't updated it since you got a new job. But here's the issue: <strong>recruiters expect your photo to match your appearance now.</strong></p><p>When you walk into an interview looking significantly different from your photo, it raises red flags. Recruiters wonder: Did you lie? Are you hiding something? It creates an awkward first moment that could undermine your entire interview.</p><h3><strong>The Fix</strong></h3><ul><li>Update your resume photo every 2-3 years</li><li>If your appearance has changed significantly (new hairstyle, weight change, etc.), update sooner</li><li>Ensure your photo matches how you'll look during the interview</li><li>Consider AI-generated headshots for quick, affordable updates</li></ul><h2>Mistake #2: Poor Lighting and Shadow</h2><h3><strong>The Problem</strong></h3><p>A photo taken in poor lighting with harsh shadows makes you look tired, older, or untrustworthy. Shadows under your eyes, unflattering side lighting, or backlighting can completely ruin an otherwise good photo.</p><p>Resume photos are typically small (1x1 inch or smaller), so any shadows or lighting issues become more pronounced.</p><h3><strong>The Fix</strong></h3><ul><li>Use natural, soft window light when possible</li><li>Avoid harsh overhead lighting or direct sunlight</li><li>Position yourself so light comes from the side at a 45-degree angle</li><li>Take the photo outdoors on an overcast day for even, flattering light</li><li>Never use a photo taken with backlighting</li><li>If editing, brighten the face slightly to reduce shadows</li></ul><h2>Mistake #3: Wrong Background or Framing</h2><h3><strong>The Problem</strong></h3><p>A busy, distracting background makes you look unprofessional and pulls attention away from your face. Cropping that includes shoulders awkwardly or shows messy furniture behind you sends the wrong message.</p><h3><strong>The Fix</strong></h3><ul><li>Use a neutral, plain background (white, light gray, or blurred)</li><li>Avoid office backgrounds with visible desks, clutter, or branding</li><li>Frame your photo to show head and shoulders clearly</li><li>The background should be unobtrusive and professional</li><li>If DIY, shoot against a blank wall or use a neutral curtain</li></ul><h2>Mistake #4: Inappropriate Expression or Clothing</h2><h3><strong>The Problem</strong></h3><p>A big, toothy smile might seem friendly, but in a formal resume photo it can look unprofessional. On the flip side, a stern expression or frown looks unapproachable. Similarly, casual clothing, visible logos, or overly trendy outfits don't belong on a resume.</p><h3><strong>The Fix</strong></h3><ul><li>Use a subtle, genuine smile or neutral professional expression</li><li>Wear solid-colored, professional clothing (blazer or dress shirt recommended)</li><li>Avoid casual t-shirts, tank tops, or visible logos</li><li>Keep jewelry minimal and professional-looking</li><li>Choose colors that complement your skin tone</li></ul><h2>Mistake #5: Overly Edited or Heavily Filtered Photos</h2><h3><strong>The Problem</strong></h3><p>Heavy Photoshop, face-smoothing apps, or Instagram filters might make you look younger or "better," but they make you look fake. Recruiters can spot an over-edited photo instantly, and it actually <em>hurts</em> your credibility.</p><p>There's a reason: if your resume photo doesn't match your real appearance, recruiters question your honesty. It's a small red flag that often eliminates you from consideration.</p><h3><strong>The Fix</strong></h3><ul><li>Light retouching is fine (removing blemishes, brightening slightly)</li><li>Avoid smooth-skinning apps that blur your skin artificially</li><li>Don't change your face shape, age, or ethnic appearance</li><li>Avoid all filters and beauty apps</li><li>Aim for a photo that looks like you on your best day—not an unrealistic version</li></ul><h2>Quick Resume Photo Checklist</h2><ul><li>[ ] Photo is recent (within last 2-3 years)</li><li>[ ] Lighting is flattering and even (no harsh shadows)</li><li>[ ] Background is neutral and professional</li><li>[ ] Expression is subtle, professional, and genuine</li><li>[ ] Clothing is professional and solid-colored</li><li>[ ] Minimal editing (only light retouching)</li><li>[ ] Photo looks like you now (not 5 years ago)</li><li>[ ] Image is high-resolution and clear</li><li>[ ] Photo matches your actual appearance</li></ul><h2>The Bottom Line</h2><p>Your resume photo should be:</p><ol><li>Recent and representative of how you look now</li><li>Well-lit with professional, flattering lighting</li><li>Cropped and framed appropriately</li><li>Professional in expression and clothing</li><li>Natural and unedited (except for minor retouching)</li></ol><p>A good resume photo takes just a few minutes to fix, and it can significantly impact your interview chances. Don't let a bad photo eliminate you from consideration before anyone even reads your qualifications.</p>`
  },
  {
    id: '3',
    slug: 'lighting-101-studio-vs-natural',
    title: 'Lighting 101: Studio vs. Natural',
    excerpt: 'Understanding how lighting affects the mood and professionalism of your portrait.',
    date: 'Dec 01, 2023',
    readTime: '6 min read',
    content: `<h2>Lighting Is Everything in Professional Headshots</h2><p>The difference between a mediocre headshot and a stunning one often comes down to one thing: lighting. Good lighting can enhance your best features, smooth your skin, and make you look confident and approachable. Poor lighting can age you, create unflattering shadows, and undermine your entire presentation.</p><p>Whether you're using studio lighting or natural light, understanding the fundamentals will help you get better results every time.</p><hr/><h2>The Fundamentals: Light Quality and Direction</h2><h3><strong>Soft Light vs. Hard Light</strong></h3><p><strong>Soft Light:</strong> This is diffused, even light with gentle shadows. It flatters most people and is universally preferred for headshots.</p><p><strong>Hard Light:</strong> Direct, intense light that creates harsh shadows. It's dramatic but generally unflattering for professional headshots.</p><h3><strong>Light Direction Matters</strong></h3><p>The angle at which light hits your face dramatically changes how you look:</p><ul><li><strong>Front Lighting:</strong> Flattering and professional, reduces wrinkles, soft and approachable</li><li><strong>Side Lighting (45-degree angle):</strong> The "golden angle" for headshots—reveals facial structure while remaining flattering</li><li><strong>Overhead Lighting:</strong> Creates shadows under eyes and makes you look tired (avoid!)</li><li><strong>Backlighting:</strong> Creates a halo effect but obscures your face (not suitable for headshots)</li></ul><h2>Natural Light: The Free Option</h2><h3><strong>Advantages of Natural Light</strong></h3><ul><li>Free—no equipment needed</li><li>Soft, flattering light when done right</li><li>Warm undertones that photograph beautifully</li><li>What you see is what you get (no need to adjust white balance tricks)</li><li>Familiar and comfortable for many people</li></ul><h3><strong>The Best Times for Natural Light</strong></h3><p><strong>Golden Hour (Sunrise/Sunset):</strong> The best time for natural light photography. The sun is low on the horizon, light is warm, soft, and incredibly flattering. Most professional photographers recommend this.</p><p><strong>Overcast Days:</strong> The clouds act as a giant diffuser, creating soft, even light. Perfect for headshots. There's no direct sun to create harsh shadows.</p><p><strong>Open Shade:</strong> Position yourself in shadow with the main light source (open sky) in front of you. Creates soft, even light without harsh shadows.</p><h3><strong>What to Avoid with Natural Light</strong></h3><ul><li><strong>Direct midday sun:</strong> Creates harsh shadows and makes you squint</li><li><strong>Side shadows:</strong> Can create unflattering contrast on your face</li><li><strong>Backlighting without fill light:</strong> You'll appear as a silhouette</li></ul><h3><strong>Natural Light DIY Tips</strong></h3><ul><li>Position yourself at a 45-degree angle to the light source</li><li>Use a white or silver reflector to bounce light back onto your face and fill shadows</li><li>Test multiple angles and times of day</li><li>Take test shots and review them on your camera/phone</li><li>Best times: early morning or late afternoon</li></ul><h2>Studio Lighting: The Professional Choice</h2><h3><strong>Advantages of Studio Lighting</strong></h3><ul><li>Complete control over lighting angle, intensity, and color</li><li>Consistent results regardless of weather or time of day</li><li>Professional-looking results with proper technique</li><li>Multiple light sources can be positioned for flattering effect</li><li>Controlled environment eliminates distractions</li></ul><h3><strong>Common Studio Lighting Setups</strong></h3><p><strong>Single Key Light (45-degree angle):</strong> Most basic but effective setup. One light positioned to the side at a 45-degree angle creates dimension and flatters most faces.</p><p><strong>Key Light + Fill Light:</strong> Key light creates shadows, fill light (lower intensity) reduces harsh shadows for a more balanced, flattering look.</p><p><strong>Three-Point Lighting (Key + Fill + Background):</strong> Professional setup with main light, fill light to soften shadows, and a back light to separate you from the background.</p><h3><strong>Common Studio Lighting Mistakes</strong></h3><ul><li><strong>Too harsh:</strong> Single hard light creates unflattering shadows</li><li><strong>Too flat:</strong> Two equal lights eliminate all dimension</li><li><strong>Too bright:</strong> Causes you to squint and look uncomfortable</li><li><strong>Wrong color temperature:</strong> Too warm or too cool can affect skin tone</li></ul><h2>Natural vs. Studio: Which Should You Choose?</h2><h3><strong>Choose Natural Light If:</strong></h3><ul><li>You have access to good natural light (golden hour, overcast day)</li><li>You want warm, flattering tones</li><li>You're on a budget</li><li>You feel more comfortable outdoors</li><li>You have time to wait for optimal conditions</li></ul><h3><strong>Choose Studio Lighting If:</strong></h3><ul><li>You need professional, consistent results</li><li>You can't rely on weather conditions</li><li>You need specific looks or multiple variations</li><li>You want to look your absolute best</li><li>You need to match specific brand colors or aesthetics</li></ul><h2>Color Temperature Matters</h2><h3><strong>What Is Color Temperature?</strong></h3><p>Light has different "colors"—warm (orangish) or cool (bluish). Professional headshots should have natural, pleasing skin tones.</p><ul><li><strong>Warm light (Golden hour, tungsten):</strong> Flatters skin tone, creates welcoming feeling</li><li><strong>Cool light (Shade, fluorescent):</strong> Can look unflattering, can make skin look blue or sallow</li><li><strong>Neutral light (Overcast, professional daylight):</strong> Most flattering for accurate skin tones</li></ul><h2>Practical Tips for Any Lighting Situation</h2><h3><strong>Regardless of whether you choose natural or studio light, follow these principles:</strong></h3><ul><li><strong>Avoid shadows under eyes</strong> ?light should come from slightly above or level</li><li><strong>Avoid harsh shadows on face</strong> ?use fill light or reflectors to soften</li><li><strong>Watch the background lighting</strong> ?should be slightly darker than face to create separation</li><li><strong>Test before the actual shoot</strong> ?take test photos and review them</li><li><strong>Consider skin tone</strong> ?warm light is generally more flattering for most skin tones</li><li><strong>Watch eye light</strong> ?eyes should have a bright sparkle (catchlight) from the light source</li></ul><h2>The Bottom Line</h2><p>The best lighting is <strong>whichever lighting makes you look and feel your best.</strong></p><p>For most professional headshots:</p><ol><li><strong>Natural light</strong> works beautifully if you have access to golden hour or overcast conditions</li><li><strong>Studio lighting</strong> gives consistent, professional results in any weather</li><li><strong>The most important factor</strong> is soft, flattering light that doesn't create harsh shadows</li><li><strong>Test and review</strong> before committing to any setup</li></ol><p>Whether you go natural or studio, remember: good lighting should enhance your features, not dominate them. The focus should always be on you—your expression, your confidence, and your professionalism.</p>`
  },
  {
    id: '4',
    slug: 'what-makes-professional-headshot-effective-2025',
    title: 'What Makes a Professional Headshot Truly Effective in 2025?',
    excerpt: 'Learn what recruiters and clients look for in a professional headshot—authenticity beats perfection in the modern workplace.',
    date: 'Dec 13, 2024',
    readTime: '8 min read',
    content: `<h2>The First Impression That Matters</h2><p>In 2025, your professional headshot is often the first—and sometimes only—impression you make on recruiters, clients, and potential collaborators. Yet many professionals still underestimate its power.</p><p>The reality? <strong>A recruiter spends less than 6 seconds evaluating your LinkedIn photo.</strong> In that brief window, they decide whether you're worth learning more about. Your headshot isn't just a nice-to-have; it's a critical career asset.</p><hr/><h2>What Recruiters Actually Look For</h2><h3>1. <strong>Professionalism That Feels Approachable</strong></h3><p>The best headshots strike a balance. You should look competent and trustworthy—but not intimidating or overly formal. Studies show that a slight smile (genuine, not forced) and relaxed shoulders signal both professionalism and approachability.</p><p><strong>What works:</strong> A natural expression with engaged eyes. The camera captures emotion; make sure yours conveys confidence without arrogance.</p><h3>2. <strong>Authenticity Over Perfection</strong></h3><p>Here's the uncomfortable truth: <strong>People can tell when you've been heavily edited.</strong> Extreme smoothing, obvious skin retouching, or heavy filters actually <em>reduce</em> trust. Modern recruiters expect a headshot to look like you on your best day—not like a Hollywood celebrity.</p><p><strong>What works:</strong> Light retouching (reducing blemishes, improving lighting balance) is fine. Changing your face shape, age, or ethnic appearance is counterproductive. You want the interviewer to recognize you when you walk in.</p><h3>3. <strong>Consistent With Your Role</strong></h3><p>A creative designer's headshot can be more artistic. A corporate lawyer's needs to be more traditional. The style should align with your industry's expectations.</p><p><strong>Banking & Finance:</strong> Conservative clothing, neutral background, classic style<br/><strong>Tech & Startups:</strong> Can be slightly more casual, authentic backgrounds acceptable<br/><strong>Creative Industries:</strong> More room for personality and artistic lighting<br/><strong>Healthcare:</strong> Professional, trustworthy, approachable energy</p><h2>The LinkedIn Paradox: More Visibility Doesn't Always Help</h2><p>LinkedIn shows your photo to thousands of people searching for professionals in your field. Yet many profiles use:</p><ul><li>Blurry vacation photos</li><li>Group photos (cropped poorly)</li><li>Photos from 5+ years ago</li><li>Selfies with bathroom mirrors or poor lighting</li></ul><p><strong>Why this matters:</strong> A weak headshot doesn't just fail to help—it actively works against you. Recruiters who can't see your face clearly often skip your profile entirely.</p><h2>The Hidden Requirements of Headshots on Different Platforms</h2><h3><strong>LinkedIn Headshots</strong></h3><ul><li><strong>Dimensions:</strong> Head-and-shoulders framing</li><li><strong>Tone:</strong> Professional, warm, approachable</li><li><strong>Dress:</strong> Industry-appropriate business attire</li><li><strong>Expression:</strong> Genuine smile or confident neutral</li><li><strong>Background:</strong> Plain or subtle (not distracting)</li></ul><h3><strong>Resume/CV Photos</strong></h3><ul><li><strong>Tone:</strong> More formal and serious than LinkedIn</li><li><strong>Size:</strong> Usually passport-style (small, 1x1 inch)</li><li><strong>Dress:</strong> Classic professional wear (suit recommended)</li><li><strong>Expression:</strong> Confidence and competence</li><li><strong>Background:</strong> Plain white or light gray</li></ul><h3><strong>Personal Website/Portfolio</strong></h3><ul><li><strong>Tone:</strong> Can show personality while remaining professional</li><li><strong>Dimensions:</strong> Varies, but often used large</li><li><strong>Dress:</strong> Can be slightly less formal if industry-appropriate</li><li><strong>Expression:</strong> Friendly, approachable, open</li><li><strong>Background:</strong> Can be more dynamic or branded</li></ul><h3><strong>Social Media (Twitter, Instagram Bios)</strong></h3><ul><li><strong>Tone:</strong> Professional but with personality</li><li><strong>Dimensions:</strong> Square format works best</li><li><strong>Dress:</strong> Role-dependent; more room for casualness</li><li><strong>Expression:</strong> Authentic and friendly</li><li><strong>Background:</strong> Can include elements of your personal brand</li></ul><h2>The Authenticity Test: Does It Still Look Like You?</h2><p>Here's a simple test: <strong>If someone met you in person after seeing your headshot, would they recognize you immediately?</strong></p><p>If the answer is no, your headshot isn't working—regardless of how beautiful it looks.</p><p>The most common issues:</p><ol><li><strong>Over-brightening:</strong> Makes you look washed out or unrealistic</li><li><strong>Heavy filters:</strong> Creates a barrier between your real self and the digital version</li><li><strong>Extreme angle:</strong> Selfie angles can distort your face in ways that feel wrong in person</li><li><strong>Different hair/styling:</strong> Hair color, length, or style changes should match your current appearance</li><li><strong>Dramatically different weight:</strong> Significant weight loss/gain between photo and in-person meeting creates awkward moments</li></ol><h2>Why "Looking Like You" Beats "Looking Good"</h2><p>A 2023 study by CareerBuilder found that <strong>73% of recruiters said they'd be more likely to interview a candidate with an authentic, slightly less perfect headshot than a heavily edited one.</strong></p><p>Why? Because:</p><ol><li><strong>Trust is built on authenticity.</strong> Overly edited photos feel deceptive.</li><li><strong>Video calls reveal the truth anyway.</strong> If your headshot doesn't match your video interview appearance, it raises red flags.</li><li><strong>Confidence is attractive.</strong> Someone who's comfortable in their own skin projects more confidence than someone hiding behind filters.</li><li><strong>Consistency matters.</strong> When your headshot matches reality, the transition to in-person meeting is smooth.</li></ol><h2>The Technical Elements That Actually Impact Perception</h2><h3><strong>Lighting (40% of the equation)</strong></h3><ul><li>Side-lighting flatters most face shapes</li><li>Avoid harsh overhead lights (create shadows under eyes)</li><li>Avoid backlighting (you'll appear as a silhouette)</li><li>Natural window light beats artificial studio lights (when done right)</li></ul><h3><strong>Background (20% of the equation)</strong></h3><ul><li>Neutral backgrounds are safest (plain white, soft gray, light blur)</li><li>Non-distracting is essential (nothing too busy or colorful)</li><li>Professional setting (office, studio) or natural background (park) > unprofessional (bathroom, bedroom)</li></ul><h3><strong>Clothing (25% of the equation)</strong></h3><ul><li>Solid colors photograph better than patterns</li><li>Colors that complement your skin tone build confidence</li><li>Neckline should be appropriate to the shoulder (avoid extreme close-ups or too-wide framing)</li><li>Jacket/blazer adds formality; open-collar adds approachability</li></ul><h3><strong>Expression (15% of the equation)</strong></h3><ul><li>Eyes are 80% of the expression</li><li>Slight smile is more approachable than dead serious</li><li>Relaxed shoulders project confidence</li><li>Real emotion beats forced smiles</li></ul><h2>The AI Advantage in 2025</h2><p>One emerging trend: <strong>AI-generated professional headshots.</strong> They're becoming increasingly popular because they solve key problems:</p><p>?<strong>Authenticity without over-editing:</strong> AI learns from your actual features<br/>?<strong>Multiple variations:</strong> You can try different styles without retaking photos<br/>?<strong>Accessibility:</strong> No expensive studio shoot required<br/>?<strong>Speed:</strong> Results in minutes, not weeks<br/>?<strong>Consistency:</strong> You can generate versions for different platforms</p><p>However, they're only as good as the input photos. The more natural, varied angles and lighting you provide, the better your AI headshot will be.</p><h2>Your 2025 Professional Headshot Checklist</h2><ul><li>[ ] <strong>Recognition test:</strong> Would someone meet you in person and recognize you immediately?</li><li>[ ] <strong>Lighting:</strong> Is the lighting flattering and even? No harsh shadows?</li><li>[ ] <strong>Expression:</strong> Does your expression match your profession and personality?</li><li>[ ] <strong>Current:</strong> Is the hair, style, and appearance consistent with how you look now?</li><li>[ ] <strong>Platform-appropriate:</strong> Does it match the tone expected in your industry?</li><li>[ ] <strong>Background:</strong> Is the background professional and non-distracting?</li><li>[ ] <strong>Professional help:</strong> Have you had it taken by a professional or AI tool designed for this purpose?</li><li>[ ] <strong>Consistency:</strong> Are you using the same headshot across all platforms for brand recognition?</li></ul><h2>The Bottom Line</h2><p>Your professional headshot in 2025 should be:</p><ol><li><strong>Authentic</strong> ?recognizably you</li><li><strong>Professional</strong> ?matching your industry standards</li><li><strong>Approachable</strong> ?inviting people to connect</li><li><strong>Well-lit</strong> ?flattering without being deceptive</li><li><strong>Up-to-date</strong> ?reflecting your current appearance</li></ol><p>It's not about being the most beautiful photo ever taken. It's about being a true representation of you at your professional best. That balance—authenticity combined with intentional presentation—is what makes a professional headshot truly effective in 2025.</p>`
  },
  {
    id: '5',
    slug: 'ai-professional-headshots-vs-studio-photography',
    title: 'AI Professional Headshots vs Studio Photography: Which Is Right for You?',
    excerpt: 'Compare costs, time, and flexibility. Discover why AI headshots are the perfect solution for most professionals.',
    date: 'Dec 13, 2024',
    readTime: '7 min read',
    content: `<h2>The New Era of Professional Portraits</h2><p>For decades, getting a professional headshot meant one thing: booking a session with a photographer in a studio. But in 2024-2025, a significant shift is happening. <strong>AI-generated professional headshots are challenging the traditional model—and winning for many professionals.</strong></p><p>This doesn't mean traditional studio photography is dead. But for most people, the decision today isn't "should I get a professional headshot?" It's "should I go to a studio or use AI?"</p><p>Let's break down both approaches honestly.</p><hr/><h2>The Cost Comparison</h2><h3><strong>Traditional Studio Photography</strong></h3><ul><li><strong>Basic session fee:</strong> $200-$500</li><li><strong>Location shots:</strong> $500-$1,200</li><li><strong>Premium retouching:</strong> $100-$300</li><li><strong>Multiple looks/outfits:</strong> Often requires new shoots ($200-$500 each)</li><li><strong>Rush delivery:</strong> Additional $50-$150</li><li><strong>Total for typical professional:</strong> $400-$1,000+</li></ul><h3><strong>AI Professional Headshots</strong></h3><ul><li><strong>Basic generation:</strong> $0-$50</li><li><strong>Premium generations (multiple styles):</strong> $30-$100</li><li><strong>Unlimited variations:</strong> Included</li><li><strong>Multiple looks/outfits:</strong> Generate unlimited versions instantly</li><li><strong>Delivery:</strong> Immediate (within minutes)</li><li><strong>Total for typical professional:</strong> $30-$100</li></ul><p><strong>Verdict:</strong> AI is 5-10x cheaper.</p><h2>The Time Investment</h2><h3><strong>Traditional Studio Photography</strong></h3><ol><li><strong>Research and booking:</strong> 1-2 weeks (finding the right photographer)</li><li><strong>Pre-shoot consultation:</strong> 30 minutes to 1 hour</li><li><strong>The shoot itself:</strong> 1-2 hours</li><li><strong>Retouching process:</strong> 1-2 weeks</li><li><strong>Final delivery:</strong> Variable (1-4 weeks)</li><li><strong>Total:</strong> 3-6 weeks minimum</li></ol><p>If you need adjustments or want different looks? Add another 1-2 weeks.</p><h3><strong>AI Professional Headshots</strong></h3><ol><li><strong>Upload photos:</strong> 5 minutes</li><li><strong>Select style/options:</strong> 2-3 minutes</li><li><strong>Generation:</strong> 30 seconds to 2 minutes</li><li><strong>Download results:</strong> 1 minute</li><li><strong>Total:</strong> 10-15 minutes</li></ol><p>Need different versions? Generate them instantly.</p><p><strong>Verdict:</strong> AI is 100-200x faster.</p><h2>The Quality Question</h2><h3><strong>When Studio Photography Wins</strong></h3><p>?<strong>If you need portfolio-level work:</strong> Professional photographers create images that work for full-body portraits, headshots, and complex compositions.</p><p>?<strong>If you want maximum control:</strong> You can direct lighting, angles, and composition in real-time.</p><p>?<strong>If you need full wardrobe variety:</strong> Easy to change outfits between shots without regenerating.</p><p>?<strong>If you want video/motion content:</strong> Photographers capture video, GIFs, and dynamic content. AI doesn't (yet).</p><p>?<strong>If you need headshots in 5 years:</strong> A studio shoot creates lasting documentation. AI is time-bound.</p><h3><strong>When AI Headshots Win</strong></h3><p>?<strong>If you need fast turnaround:</strong> AI delivers in minutes.</p><p>?<strong>If you want multiple styles instantly:</strong> Change backgrounds, lighting, clothing—instantly regenerate.</p><p>?<strong>If you want budget-friendly options:</strong> Stunning headshots at 1/10th the cost.</p><p>?<strong>If you want consistency across platforms:</strong> Generate multiple versions optimized for LinkedIn, resume, website.</p><p>?<strong>If you're risk-averse about studio anxiety:</strong> No pressure, no awkward moments with photographers.</p><p>?<strong>If you want to experiment:</strong> Try 10 different looks without reshooting.</p><h2>The Authenticity Factor</h2><p>Here's where things get interesting.</p><p><strong>Studio Photography Advantage:</strong></p><ul><li>Your real face, real expression, real moment captured</li><li>Natural skin texture and lighting</li><li>Authentic human connection visible in the image</li><li>No uncanny valley feelings</li></ul><p><strong>AI Headshot Advantage:</strong></p><ul><li>You at your absolute best</li><li>Perfect lighting on every shot</li><li>Consistent, polished presentation</li><li>Removes "bad hair day" variables</li><li>Can smooth skin and perfect minor imperfections perfectly</li></ul><p><strong>The Trade-off:</strong> Studio photos feel authentic; AI photos feel aspirational. Which matters depends on your industry.</p><ul><li><strong>Tech, finance, startups:</strong> Authenticity increasingly valued over perfection</li><li><strong>Creative industries:</strong> Aspirational polish is expected</li><li><strong>Healthcare, law, government:</strong> Authenticity is critical</li><li><strong>LinkedIn:</strong> Increasingly accepting both</li></ul><h2>What Can Each Actually Deliver?</h2><h3><strong>Studio Photography Can Deliver:</strong></h3><ul><li>High-resolution prints (8x10, 11x14, etc.)</li><li>Multiple outfit changes (you bring wardrobe)</li><li>Various backgrounds (studio has multiple setups)</li><li>Retouching (though quality varies by photographer)</li><li>Video/motion content</li><li>Full-body shots</li><li>Group photos</li><li>Headshots in any style (professional, casual, artistic)</li></ul><h3><strong>AI Headshots Can Deliver:</strong></h3><ul><li>Instant variations in unlimited styles</li><li>Perfect technical quality (lighting, color)</li><li>Multiple backgrounds without reshooting</li><li>Different outfits/clothing styles instantly</li><li>High-resolution digital files</li><li>Mobile-optimized versions</li><li>Website-ready formats</li><li>Print-quality files (2400+ dpi)</li><li>Consistency across 5+ different looks</li></ul><p><strong>What AI Can't Deliver:</strong></p><ul><li>Full-body shots (only head-and-shoulders)</li><li>Truly custom poses (limited by training data)</li><li>Video or motion content</li><li>Your literal, unaltered facial appearance (uses enhancement)</li><li>Historical documentation (time-specific)</li></ul><h2>The Real-World Usage Analysis</h2><h3><strong>Scenario 1: Job Searching</strong></h3><p><strong>Studio:</strong> $400-800 investment; 1 great headshot updated yearly</p><p><strong>AI:</strong> $30-50 investment; 20+ variations to test, optimize per platform</p><p><strong>Winner:</strong> AI (faster, cheaper, more flexibility for testing)</p><h3><strong>Scenario 2: LinkedIn Profile Optimization</strong></h3><p><strong>Studio:</strong> Need multiple shoots for different looks/styles</p><p><strong>AI:</strong> Generate unlimited looks in one session</p><p><strong>Winner:</strong> AI (obvious)</p><h3><strong>Scenario 3: Professional Branding</strong></h3><p><strong>Studio:</strong> One consistent photo across platforms (all branded with same headshot)</p><p><strong>AI:</strong> Multiple brand-consistent variations for A/B testing</p><p><strong>Winner:</strong> AI (more options for brand testing)</p><h3><strong>Scenario 4: Corporate Headshot Directory</strong></h3><p><strong>Studio:</strong> $300-500 per employee × 100 employees = $30-50K total</p><p><strong>AI:</strong> $50 × 100 employees = $5K total (plus faster turnaround)</p><p><strong>Winner:</strong> AI (massive cost savings)</p><h3><strong>Scenario 5: Actor/Creative Portfolio</strong></h3><p><strong>Studio:</strong> Multiple shoots showing range ($2,000-5,000 total)</p><p><strong>AI:</strong> Generate multiple looks instantly (cheaper alternative for testing)</p><p><strong>Winner:</strong> Studio (still needed for high-end portfolio work)</p><h2>The Client Trust Factor</h2><p>Does a client/recruiter care if your headshot was AI-generated vs professionally photographed?</p><p><strong>Honest answer:</strong> Not if it looks great and looks like you.</p><p><strong>When they might care:</strong></p><ul><li>If it's obvious the AI made mistakes (weird hair, strange artifacts)</li><li>If the photo doesn't match your actual appearance</li><li>If your industry has specific authenticity expectations</li><li>If the AI made you look fundamentally different</li></ul><p><strong>When they won't care:</strong></p><ul><li>If the result is professional and polished</li><li>If you look recognizably like yourself</li><li>If it matches your video call appearance</li><li>If you're in tech, creative, or startup industries</li></ul><h2>The Hybrid Approach (2025 Trend)</h2><p>Many professionals are now using both:</p><ol><li><strong>Get a professional studio shoot</strong> (once per 2-3 years) for a few killer hero shots</li><li><strong>Use AI tools</strong> (as needed) for platform-specific variations, quick updates, and A/B testing</li></ol><p>This approach gives you:</p><ul><li>The authenticity of a studio shoot</li><li>The flexibility and cost-efficiency of AI</li><li>Multiple variations without repeated studio sessions</li><li>Current vs. aspirational options</li></ul><h2>Choosing Based on Your Situation</h2><h3><strong>Use Studio Photography If:</strong></h3><ul><li>[ ] You're an actor or in a creative field needing portfolio range</li><li>[ ] You need full-body shots or group photos</li><li>[ ] You're a high-level executive building a serious personal brand</li><li>[ ] You want something that lasts 5+ years without updating</li><li>[ ] You need video content alongside still photos</li><li>[ ] Your industry values authenticity above all</li><li>[ ] You have the budget and time to invest</li></ul><h3><strong>Use AI Headshots If:</strong></h3><ul><li>[ ] You need results in days, not weeks</li><li>[ ] You want to try multiple styles/looks</li><li>[ ] You're on a tight budget ($200 or less)</li><li>[ ] You need platform-specific variations (LinkedIn, resume, website)</li><li>[ ] You want quick refreshes when your look changes</li><li>[ ] You want to generate multiple options for A/B testing</li><li>[ ] You're in tech, startup, or modern business environments</li><li>[ ] You want perfect technical quality (lighting, color)</li></ul><h2>The Verdict for Most Professionals in 2025</h2><p><strong>For 90% of professionals:</strong> AI professional headshots are the better choice today.</p><p><strong>Why?</strong></p><ul><li>Cost: 1/10th the price</li><li>Speed: Same day vs 3-6 weeks</li><li>Flexibility: Generate unlimited variations</li><li>Quality: Surprisingly excellent if done right</li><li>Practicality: You can update easily as your look evolves</li></ul><p><strong>However:</strong> If you're in law, healthcare, politics, or high-level corporate roles, a professional studio photographer might still be the safer choice for the perceived authenticity and prestige it conveys.</p><p>The gap is closing fast. In 2-3 years, AI-generated headshots will likely be the dominant choice across all industries—unless you specifically want the narrative of "I had this professionally shot by a famous photographer," which is more about personal preference than practical results.</p><p><strong>Bottom line:</strong> Don't let perfect be the enemy of good. A great AI headshot now beats waiting weeks for a studio shoot. You can always upgrade to studio photography later if needed.</p>`
  },
  {
    id: '6',
    slug: 'how-to-upload-photos-best-ai-headshot-results',
    title: 'How to Upload Photos for the Best AI Headshot Results',
    excerpt: 'Master the art of uploading selfies. Learn lighting, angles, and expressions that produce stunning AI-generated headshots.',
    date: 'Dec 13, 2024',
    readTime: '6 min read',
    content: `<h2>The Most Common AI Headshot Mistake</h2><p>You upload 10 selfies with different angles and wait excitedly for your AI-generated headshots.</p><p>Then they arrive... and you barely recognize yourself. Or worse, you look completely different—different gender presentation, different age, different ethnicity.</p><p><strong>The problem?</strong> 90% of people who get disappointing AI headshots made mistakes during upload.</p><p>The good news? This is completely preventable. Your upload strategy directly determines your output quality.</p><hr/><h2>Why 3-5 Photos Is the Sweet Spot</h2><h3><strong>Why Not Just One Photo?</strong></h3><p>AI learns from variation. One photo tells the AI:</p><ul><li>Your face from one angle only</li><li>One lighting condition</li><li>One expression</li><li>One setting</li></ul><p>Result: The AI might overfit to that single perspective, creating something that looks slightly off because it lacks multiple reference points.</p><h3><strong>Why Not 10+ Photos?</strong></h3><p>AI models trained on multiple photos need variety, but too many similar photos causes:</p><ul><li><strong>Inconsistency:</strong> If photos are all slightly different, AI gets confused about which features are consistent</li><li><strong>Averaging down:</strong> AI might blend all your photos into a "average" version rather than focusing on your best features</li><li><strong>Processing inefficiency:</strong> More data doesn't always mean better results; it means more variables to process</li></ul><h3><strong>Why 3-5 Is Optimal</strong></h3><p>This range gives the AI:</p><ul><li>Enough variation to understand your face from multiple angles ?/li><li>Enough consistency to identify your core features ?/li><li>Enough data to be confident without being confused ?/li><li>Optimal processing without redundancy ?/li></ul><h2>The Scientific Formula: Getting Maximum Variation</h2><p>The AI algorithm learns best when your photos vary across:</p><h3><strong>1. Angle (Most Important - 40% of quality)</strong></h3><p><strong>What you need:</strong></p><ul><li><strong>One straight-on face:</strong> Eyes looking directly at camera</li><li><strong>One 3/4 angle:</strong> Face turned ~30 degrees to one side</li><li><strong>One profile or near-profile:</strong> Shows your side profile</li></ul><p><strong>Why it matters:</strong> Different angles reveal different face proportions. Your cheekbones look different from profile than straight-on. Jaw structure changes with angle. AI needs multiple angles to create a 3D understanding of your face.</p><p><strong>Common mistake:</strong> All 5 photos at the same angle = AI can't generalize beyond that angle</p><h3><strong>2. Lighting (Second Most Important - 35% of quality)</strong></h3><p><strong>What you need:</strong></p><ul><li><strong>Natural window light:</strong> Soft, directional (not harsh)</li><li><strong>Different time of day:</strong> Morning light is different from afternoon light</li><li><strong>Varied intensity:</strong> One brightly lit, one softer lit</li></ul><p><strong>Why it matters:</strong> Lighting dramatically affects how your face is perceived. Professional lighting flatters certain features. Poor lighting can make you look tired, pale, or asymmetrical. AI learns from lighting variation to understand your face structure vs. lighting artifacts.</p><p><strong>Professional note:</strong> Avoid:</p><ul><li>?Direct sunlight (creates harsh shadows and squinting)</li><li>?Overhead-only lighting (unflattering, creates shadows under eyes)</li><li>?Backlighting (you become a silhouette)</li><li>?Window light at 45-degree angle (goldilocks of headshot lighting)</li><li>?Overcast day outdoor light (soft, even, flattering)</li></ul><h3><strong>3. Expression (Important - 15% of quality)</strong></h3><p><strong>What you need:</strong></p><ul><li><strong>Genuine smile:</strong> Real smile (not forced; crinkles at eyes)</li><li><strong>Neutral expression:</strong> Relaxed, confident, but not smiling</li><li><strong>Subtle expression variation:</strong> Different eye engagement levels</li></ul><p><strong>Why it matters:</strong> Expressions change the entire feel of a headshot. AI learns which expressions look natural on you vs. forced. A forced smile in all 5 photos means your AI headshots will all look slightly forced.</p><p><strong>Professional note:</strong></p><ul><li>Think of something that makes you genuinely happy (avoid thinking "smile for camera")</li><li>Relax your shoulders (tension shows)</li><li>Engage your eyes (90% of expression happens in the eyes)</li></ul><h3><strong>4. Framing/Background (Less Critical - 10% of quality)</strong></h3><p><strong>What you need:</strong></p><ul><li><strong>Varied backgrounds:</strong> Different rooms, locations, outdoor settings</li><li><strong>Different framing:</strong> Slightly different head position in frame</li></ul><p><strong>Why it matters:</strong> Too consistent backgrounds might cause AI to associate your face with a specific background. Variation teaches AI to focus on your face, not environmental context.</p><p><strong>What works best:</strong></p><ul><li>Neutral walls (white, light gray, beige)</li><li>Natural outdoor backgrounds</li><li>Blurred/out-of-focus backgrounds</li><li>Avoid: Extremely busy backgrounds, logos, text</li></ul><h2>The Ideal Upload Checklist</h2><p>Create 3-5 photos with these characteristics:</p><h3><strong>Photo 1: Straight-On, Natural Light</strong></h3><ul><li>[ ] Face directly facing camera (eyes on lens)</li><li>[ ] Window light coming from 45-degree angle</li><li>[ ] Genuine smile (think happy thought)</li><li>[ ] Neutral background</li><li>[ ] Shoulders relaxed</li><li>[ ] Head position natural (not tilted back or down)</li></ul><h3><strong>Photo 2: 3/4 Angle, Different Lighting</strong></h3><ul><li>[ ] Face turned ~30 degrees to one side</li><li>[ ] Different light source (overcast, different time of day, different room)</li><li>[ ] Neutral or slight smile</li><li>[ ] Different background if possible</li><li>[ ] Shoulders relaxed</li></ul><h3><strong>Photo 3: Profile or More Turned, Different Expression</strong></h3><ul><li>[ ] Face turned more (toward profile)</li><li>[ ] Softer/dimmer lighting</li><li>[ ] Neutral expression (not smiling)</li><li>[ ] Different background</li><li>[ ] Shows your jawline clearly</li></ul><h3><strong>Photo 4: (Optional but recommended) Variation</strong></h3><ul><li>[ ] Whatever angle/lighting combo you haven't captured</li><li>[ ] If possible, outdoor natural light</li><li>[ ] Different expression than your main smile</li><li>[ ] Shows another side of your face personality</li></ul><h3><strong>Photo 5: (Optional but recommended) Backup</strong></h3><ul><li>[ ] Your favorite natural-looking selfie</li><li>[ ] Whatever feels most like "you"</li><li>[ ] Good lighting and clear face visibility</li><li>[ ] Genuine expression</li></ul><h2>Common Failure Cases and How to Avoid Them</h2><h3><strong>Failure Case 1: "I Don't Look Like Me"</strong></h3><p><strong>Cause:</strong> AI was trained on heavily filtered or extreme angle selfies</p><p><strong>Solution:</strong></p><ul><li>Use minimal or no filters</li><li>Avoid extreme selfie angles (camera shouldn't be above or below at extreme angles)</li><li>Include neutral, straight-on photos</li><li>Use natural lighting, not heavy makeup</li></ul><p><strong>Red flag signs you're doing this wrong:</strong></p><ul><li>You look 10+ years younger in photos</li><li>Your face shape seems different</li><li>You have heavy makeup/contouring</li><li>Photos are all from extreme angles/filtered</li></ul><h3><strong>Failure Case 2: "The AI Changed My Gender Expression"</strong></h3><p><strong>Cause:</strong> Upload photos have conflicting signals about gender presentation (or AI overcompensated)</p><p><strong>Solution:</strong></p><ul><li>Be consistent in gender expression across photos</li><li>Use similar styling, hair, clothing tone</li><li>If you want androgynous results, be explicitly androgynous across all photos</li><li>Avoid extreme makeup/no-makeup swings between photos</li><li>Include photos showing your natural gender expression clearly</li></ul><p><strong>Example of confusing AI:</strong></p><ul><li>Photo 1: Heavy makeup, very feminine presentation</li><li>Photo 2: No makeup, more androgynous clothing</li><li>Photo 3: Very masculine styling</li><li>Result: AI gets confused and might overcompensate</li></ul><h3><strong>Failure Case 3: "I Look Like a Different Ethnicity"</strong></h3><p><strong>Cause:</strong> Inconsistent lighting or angle interpretation by AI, or training data bias</p><p><strong>Solution:</strong></p><ul><li>Use consistent, flattering lighting across all photos</li><li>Include true skin tone representation (avoid extreme over/underexposure)</li><li>Vary angles naturally (avoid extreme angles that distort facial structure)</li><li>Use higher quality phone cameras (better color accuracy)</li><li>Include photos showing your natural skin tone clearly</li></ul><p><strong>Example of confusing AI:</strong></p><ul><li>Photo 1: Overexposed (very bright) ?looks lighter</li><li>Photo 2: Underexposed (very dark) ?looks darker/different</li><li>Photo 3: Extreme side angle ?face proportions distorted</li><li>Result: AI struggles to identify consistent features</li></ul><h3><strong>Failure Case 4: "I Look Too Old/Too Young"</strong></h3><p><strong>Cause:</strong> Wide age-appearance variation across photos, or poor lighting making you look older/younger</p><p><strong>Solution:</strong></p><ul><li>Take all photos in similar lighting conditions</li><li>Avoid harsh lighting (makes you look older) and overly soft lighting (can make you look younger)</li><li>Use consistent makeup/styling approach</li><li>Avoid very different hairstyles between photos</li><li>Include at least one photo in natural daylight (most accurate age representation)</li></ul><h2>Technical Photo Requirements</h2><h3><strong>Phone Camera Settings</strong></h3><ul><li><strong>Resolution:</strong> 1080p+ (most modern phones do this automatically)</li><li><strong>Lighting:</strong> Natural light > artificial light (better color accuracy)</li><li><strong>Focus:</strong> Face clearly in focus (use portrait mode if available)</li><li><strong>Stability:</strong> Hold phone steady or use tripod (avoid blurriness)</li><li><strong>Clean lens:</strong> Wipe phone camera lens before shooting</li></ul><h3><strong>File Format</strong></h3><ul><li>JPG, PNG, or HEIC (supported by most tools)</li><li>File size doesn't matter much (AI tools compress automatically)</li></ul><h3><strong>Editing Your Photos</strong></h3><ul><li><strong>Do:</strong> Crop to show head-and-shoulders</li><li><strong>Do:</strong> Adjust brightness/contrast if very dark (but stay natural)</li><li><strong>Don't:</strong> Use heavy filters</li><li><strong>Don't:</strong> Smooth or blur your skin</li><li><strong>Don't:</strong> Change your hair color (unless you want AI to assume that's your natural hair)</li></ul><h2>Pro Tips for Better AI Headshots</h2><h3><strong>Tip 1: The "Golden Hour" Strategy</strong></h3><p>If possible, take one or more photos during golden hour (sunrise/sunset). The light is naturally flattering, warm, and professional-looking. This single photo can dramatically improve your overall results.</p><h3><strong>Tip 2: The "Multiple Takes" Rule</strong></h3><p>Take 15-20 photos in each setup, then choose the best 3-5. You'll be surprised how much facial expression varies between shots. Pick the ones where you look most confident and genuine.</p><h3><strong>Tip 3: The "No Makeup vs. Makeup" Balance</strong></h3><p>If you normally wear makeup:</p><ul><li>Include at least one photo with your normal makeup</li><li>Include one lighter makeup or no-makeup photo</li><li>This helps AI understand your face baseline vs. makeup effects</li></ul><p>If you don't wear makeup:</p><ul><li>Keep it that way across all photos (consistency)</li><li>Don't suddenly add heavy makeup in one photo</li></ul><h3><strong>Tip 4: The "Wardrobe Consistency" Rule</strong></h3><p>Wear similar colors/styles across photos. If your upload includes:</p><ul><li>Bright neon t-shirt</li><li>Formal suit</li><li>Beach casual tank top</li></ul><p>...AI might focus on clothing patterns rather than your face. Stick to neutral, professional colors.</p><h3><strong>Tip 5: The "Background Contrast" Strategy</strong></h3><p>Lighter skin tones + lighter backgrounds = harder for AI to see details (low contrast)<br/>Darker skin tones + darker backgrounds = same problem</p><p><strong>Solution:</strong> Make sure there's visible contrast between your face and background. This is why neutral backgrounds (white, gray) or natural outdoor backgrounds work well.</p><h2>The Pre-Upload Checklist</h2><p>Before uploading to an AI headshot generator:</p><ul><li>[ ] 3-5 photos selected (not 10+, not 1)</li><li>[ ] Faces at different angles (straight-on, 3/4, profile)</li><li>[ ] Different lighting conditions</li><li>[ ] Varied expressions (smiling vs. neutral)</li><li>[ ] Different backgrounds</li><li>[ ] Minimal or no filters</li><li>[ ] Clear face visibility (no sunglasses, no excessive hair in face)</li><li>[ ] Genuine expressions (no forced smiles)</li><li>[ ] Consistent gender presentation</li><li>[ ] Good contrast between face and background</li><li>[ ] High resolution (1080p+)</li><li>[ ] Relaxed, confident posture (shoulders back, neck natural)</li></ul><h2>What to Expect After Upload</h2><p><strong>Good signs:</strong></p><ul><li>Generated headshots look like you</li><li>You recognize yourself immediately</li><li>Face seems naturally enhanced (better lighting, perfect complexion)</li><li>Multiple variations show consistent facial structure</li><li>Hair, eye color, skin tone match your actual appearance</li></ul><p><strong>Red flag signs:</strong></p><ul><li>You don't recognize yourself</li><li>Face shape seems dramatically different</li><li>Ethnic appearance seems changed</li><li>Hair color/style is significantly different</li><li>Expressions seem unnatural or forced</li><li>Age representation is significantly off</li></ul><p>If you see red flags: <strong>Try again with different upload photos.</strong> The problem is usually the input photos, not the AI tool.</p><h2>Final Thought</h2><p>The quality of your AI headshot is 80% determined by your upload photos and 20% determined by the AI tool.</p><p>Spend 20 minutes thoughtfully selecting 3-5 good photos with varied angles, lighting, and expressions. That 20-minute investment will pay dividends in better results.</p><p>Your AI headshot can be absolutely stunning—but only if you give it the right source material to work with.</p>`
  },
  {
    id: '7',
    slug: 'professional-headshots-by-industry-tech-finance-creative',
    title: 'Professional Headshots by Industry: What Works in Tech, Finance, Creative, and More',
    excerpt: 'Different industries have different expectations. Discover the unwritten rules for headshots in tech, finance, creative fields, healthcare, and beyond.',
    date: 'Dec 18, 2024',
    readTime: '8 min read',
    content: `<h2>Why Industry Matters in Professional Photography</h2><p>Your professional headshot isn't just about looking good—it's about looking right for your field. A headshot that works perfectly for a software engineer might look completely out of place for a corporate lawyer. Understanding these industry-specific expectations can be the difference between standing out positively and inadvertently sending the wrong message.</p><p>The truth is, every industry has its own visual language. Some value creativity and personality, while others prize tradition and formality. Getting this balance right isn't about conforming—it's about strategic communication.</p><hr/><h2>Tech & Startups: Innovation Meets Approachability</h2><h3><strong>The Visual Language</strong></h3><p>Tech professionals need to project innovation, forward-thinking, and approachability. Your headshot should say "I'm competent and cutting-edge, but also easy to work with."</p><h3><strong>Clothing Recommendations</strong></h3><ul><li><strong>Business casual is king:</strong> Button-down shirts (untucked is fine), polo shirts, or clean t-shirts work well</li><li><strong>Blazers are optional:</strong> You can wear one, but it's not required—many tech professionals skip it</li><li><strong>Colors:</strong> Blues, grays, blacks work great. You can also experiment with tech-friendly colors like orange or green</li><li><strong>Avoid:</strong> Suits and ties (too formal), graphic tees with slogans (too casual)</li></ul><h3><strong>Background & Setting</strong></h3><ul><li>Modern, clean backgrounds work best</li><li>Natural outdoor settings are increasingly popular</li><li>Office environments with tech equipment (monitors, whiteboards) can work</li><li>Avoid overly formal studio backgrounds</li></ul><h3><strong>Expression & Tone</strong></h3><ul><li>Friendly, genuine smile is ideal</li><li>Relaxed but confident posture</li><li>Eye contact should feel direct but warm</li><li>Project: "I'm smart, capable, and collaborative"</li></ul><h3><strong>Pro Tip for Tech</strong></h3><p>Authenticity matters more in tech than polish. A slightly casual, genuine headshot often performs better than an overly formal one. Many successful tech leaders use headshots that feel more like "smart casual Friday" than "board meeting."</p><h2>Finance, Banking & Legal: Trust Through Tradition</h2><h3><strong>The Visual Language</strong></h3><p>Financial and legal professionals need to project authority, trustworthiness, and competence. Your headshot should communicate stability, professionalism, and attention to detail.</p><h3><strong>Clothing Recommendations</strong></h3><ul><li><strong>Formal business attire is expected:</strong> Suit and tie for men, blazer and professional top for women</li><li><strong>Colors:</strong> Navy, charcoal gray, black are safest. White or light blue shirts underneath</li><li><strong>Quality matters:</strong> Well-fitted, high-quality fabrics communicate success</li><li><strong>Conservative is better:</strong> No bold patterns, bright colors, or trendy styles</li></ul><h3><strong>Background & Setting</strong></h3><ul><li>Classic, professional backgrounds (neutral gray, soft white)</li><li>Traditional office settings work well</li><li>Avoid casual or creative backgrounds</li><li>Clean, uncluttered, timeless</li></ul><h3><strong>Expression & Tone</strong></h3><ul><li>Confident but not arrogant</li><li>Slight smile or serious, competent expression both work</li><li>Direct eye contact conveys trustworthiness</li><li>Project: "I'm experienced, reliable, and in control"</li></ul><h3><strong>Pro Tip for Finance/Legal</strong></h3><p>In these industries, traditional is trusted. Don't try to stand out with creative angles or unusual styling—stand out with exceptional quality and polish. Invest in professional photography and err on the side of formal.</p><h2>Creative, Marketing & Media: Personality With Professionalism</h2><h3><strong>The Visual Language</strong></h3><p>Creative professionals need headshots that show personality while maintaining professionalism. Your image should say "I'm creative, but I understand business needs."</p><h3><strong>Clothing Recommendations</strong></h3><ul><li><strong>Business casual with flair:</strong> You have room to show personality</li><li><strong>Colors:</strong> You can experiment—jewel tones, warm colors, even subtle patterns can work</li><li><strong>Style matters:</strong> Show your aesthetic sensibility through clothing choices</li><li><strong>Accessories:</strong> Interesting glasses, scarves, or jewelry can add character</li><li><strong>Avoid:</strong> Looking too corporate (kills creativity) or too casual (undermines professionalism)</li></ul><h3><strong>Background & Setting</strong></h3><ul><li>Can be more dynamic—urban settings, creative spaces, textured walls</li><li>Color is okay—doesn't have to be neutral</li><li>Environmental portraits work well (in your studio, at your workspace)</li><li>Can show context that tells your story</li></ul><h3><strong>Expression & Tone</strong></h3><ul><li>Energetic, engaged, alive</li><li>Genuine smile showing personality</li><li>Can experiment with angles and framing</li><li>Project: "I'm creative, innovative, and a pleasure to work with"</li></ul><h3><strong>Pro Tip for Creative Industries</strong></h3><p>This is one industry where you can (and should) show more personality. But there's a line—don't cross into "unprofessional" territory. Think "creatively professional" not "professionally creative."</p><h2>Healthcare & Medical: Compassion Meets Competence</h2><h3><strong>The Visual Language</strong></h3><p>Healthcare professionals need to project both expertise and empathy. Your headshot should say "I'm highly qualified, and I genuinely care about helping you."</p><h3><strong>Clothing Recommendations</strong></h3><ul><li><strong>White coat or professional attire:</strong> Both work depending on your role</li><li><strong>Colors:</strong> Blues (trust), whites (cleanliness), warm neutrals (approachability)</li><li><strong>Clean, professional appearance:</strong> Well-groomed, polished</li><li><strong>Avoid:</strong> Anything too casual or too fashion-forward</li></ul><h3><strong>Background & Setting</strong></h3><ul><li>Clean, professional medical office settings</li><li>Neutral backgrounds work well</li><li>Clinical but not cold—should feel welcoming</li><li>Avoid overly sterile or institutional looks</li></ul><h3><strong>Expression & Tone</strong></h3><ul><li>Warm, genuine smile is crucial</li><li>Open, approachable posture</li><li>Eye contact that conveys caring and competence</li><li>Project: "I'm an expert, and I'm here to help you"</li></ul><h3><strong>Pro Tip for Healthcare</strong></h3><p>The balance between competence and compassion is critical. Too serious and you seem cold; too casual and you seem less qualified. Aim for "warm professional"—someone patients can trust with their health.</p><h2>Real Estate & Sales: Success Meets Approachability</h2><h3><strong>The Visual Language</strong></h3><p>Sales professionals need headshots that project success while remaining approachable. You want clients to think "this person is successful enough to deliver results, but personable enough to work with."</p><h3><strong>Clothing Recommendations</strong></h3><ul><li><strong>Polished business or business casual:</strong> Depends on your market</li><li><strong>Colors:</strong> Confident colors—navy, burgundy, emerald green</li><li><strong>Quality signals success:</strong> Well-fitted, quality fabrics</li><li><strong>Slightly upscale:</strong> Look successful but not ostentatious</li></ul><h3><strong>Background & Setting</strong></h3><ul><li>Can show your market—luxury settings for high-end, neighborhood settings for local</li><li>Outdoor settings work well for real estate</li><li>Clean, aspirational but not intimidating</li></ul><h3><strong>Expression & Tone</strong></h3><ul><li>Warm, enthusiastic smile</li><li>Confident but not aggressive</li><li>Approachable and trustworthy</li><li>Project: "I'll work hard for you and deliver results"</li></ul><h3><strong>Pro Tip for Sales/Real Estate</strong></h3><p>Your headshot is your first sales pitch. It should make people want to work with you. Test your headshot by showing it to potential clients—does it make them feel like calling you?</p><h2>Academic & Education: Knowledge With Warmth</h2><h3><strong>The Visual Language</strong></h3><p>Academics and educators need to project intellectual credibility while remaining approachable. Your headshot should say "I'm knowledgeable and passionate about teaching."</p><h3><strong>Clothing Recommendations</strong></h3><ul><li><strong>Academic casual:</strong> Blazer with open collar, cardigan, professional but not corporate</li><li><strong>Colors:</strong> Earth tones, blues, warm colors work well</li><li><strong>Slightly bookish is okay:</strong> Interesting glasses, scarves can add character</li><li><strong>Avoid:</strong> Too corporate (not relatable) or too casual (lacks authority)</li></ul><h3><strong>Background & Setting</strong></h3><ul><li>Library, office with bookshelves, campus settings work beautifully</li><li>Can show your environment (lab, classroom)</li><li>Intellectual but warm setting</li></ul><h3><strong>Expression & Tone</strong></h3><ul><li>Intelligent, thoughtful, engaged</li><li>Gentle, genuine smile</li><li>Approachable for students but authoritative</li><li>Project: "I'm knowledgeable, passionate, and here to help you learn"</li></ul><h3><strong>Pro Tip for Academia</strong></h3><p>Don't underestimate the power of showing your environment. A headshot with bookshelves or lab equipment in the background immediately communicates your field and passion.</p><h2>Universal Principles Across All Industries</h2><p>Regardless of your industry, these principles always apply:</p><h3><strong>1. Quality Over Trends</strong></h3><p>A high-quality, traditional headshot beats a trendy, poorly executed one every time. Invest in good photography or a quality AI tool.</p><h3><strong>2. Authenticity Within Boundaries</strong></h3><p>Be yourself, but be the professional version of yourself. Your headshot should feel like you on your best day at work.</p><h3><strong>3. Context Is King</strong></h3><p>Consider where your headshot will be used. LinkedIn? Website? Conference materials? Match the formality to the context.</p><h3><strong>4. Update Regularly</strong></h3><p>Your headshot should match your current appearance. Update every 2-3 years or whenever your look significantly changes.</p><h3><strong>5. Test With Your Audience</strong></h3><p>Show your headshot to colleagues or mentors in your industry. Do they think it's appropriate? Does it communicate the right message?</p><h2>When to Break the Rules</h2><p>Industry conventions are guidelines, not laws. You can break them strategically:</p><ul><li><strong>If your company culture is different:</strong> A startup law firm might be more casual than traditional firms</li><li><strong>If you're building a personal brand:</strong> Thought leaders often use more distinctive headshots</li><li><strong>If your role is unique:</strong> A tech-focused investment banker might blend tech casual with finance professionalism</li><li><strong>If you're changing industries:</strong> Your headshot can signal your transition</li></ul><p>The key is to break rules intentionally, not accidentally.</p><h2>Your Industry-Specific Checklist</h2><ol><li><strong>Research your industry standards:</strong> Look at successful people in your field—what do their headshots have in common?</li><li><strong>Consider your specific role:</strong> Junior vs. senior, client-facing vs. internal—these affect expectations</li><li><strong>Think about your company culture:</strong> Align with your organization's values and style</li><li><strong>Know your audience:</strong> Who will see this headshot? What do they expect?</li><li><strong>Balance personality with professionalism:</strong> Find the sweet spot for your industry</li><li><strong>Quality matters everywhere:</strong> Good lighting, clean background, professional appearance</li><li><strong>Update as your career evolves:</strong> Your headshot should grow with you</li><li><strong>Get feedback:</strong> Ask trusted colleagues if your headshot works for your industry</li></ol><h2>The Bottom Line</h2><p>Your professional headshot should open doors, not close them. Understanding your industry's visual language ensures you're sending the right message before you even meet someone.</p><p>Remember: the goal isn't to look like everyone else in your industry—it's to look like a successful, professional version of yourself within your industry's context. That balance is what makes a truly effective professional headshot.</p>`
  },
  {
    id: '8',
    slug: 'linkedin-resume-website-headshot-optimization-guide',
    title: 'LinkedIn vs. Resume vs. Website: Optimizing Your Headshot for Different Platforms',
    excerpt: 'One headshot doesn\'t fit all platforms. Learn the specific technical requirements, cropping strategies, and stylistic differences for LinkedIn, resumes, and websites.',
    date: 'Dec 18, 2024',
    readTime: '7 min read',
    content: `<h2>Why Platform Matters</h2><p>You've invested in a great professional headshot. Now you upload it everywhere—LinkedIn, resume, personal website, social media—using the same exact image.</p><p>Big mistake.</p><p>Each platform has different technical requirements, aspect ratios, and audience expectations. What works beautifully on LinkedIn might look awkward on your resume. What's perfect for your website might be completely wrong for Twitter.</p><p>Understanding these platform-specific requirements isn't optional—it's essential for maximizing your professional presence.</p><hr/><h2>LinkedIn Headshots: The Complete Guide</h2><h3><strong>Technical Requirements</strong></h3><ul><li><strong>Minimum size:</strong> 400 × 400 pixels</li><li><strong>Recommended size:</strong> 7680 × 4320 pixels (maximum)</li><li><strong>File format:</strong> JPG, PNG, or GIF</li><li><strong>File size limit:</strong> 8MB maximum</li><li><strong>Aspect ratio:</strong> 1:1 (square)</li><li><strong>Display size:</strong> Appears as 400 × 400 on desktop, smaller on mobile</li></ul><h3><strong>Cropping & Framing Strategy</strong></h3><p>LinkedIn displays your photo as a circle, so plan accordingly:</p><ul><li><strong>Head and shoulders:</strong> Your face should occupy 60-70% of the frame</li><li><strong>Center your face:</strong> Avoid off-center compositions—they get cut off in the circular crop</li><li><strong>Leave headroom:</strong> Don't crop too tightly at the top of your head</li><li><strong>Consider the circle:</strong> The corners will be cropped, so keep important elements centered</li></ul><h3><strong>Background Recommendations</strong></h3><ul><li>Clean, professional, non-distracting</li><li>Solid colors or subtle gradients work best</li><li>Avoid busy patterns (they become chaotic in the circular crop)</li><li>Light backgrounds often perform better (pop more in feeds)</li></ul><h3><strong>Clothing & Style</strong></h3><ul><li>Business or business casual</li><li>Solid colors photograph better than patterns</li><li>Colors that contrast with your background</li><li>Match your industry standards</li></ul><h3><strong>Expression & Pose</strong></h3><ul><li>Genuine, friendly smile is ideal</li><li>Direct eye contact with the camera</li><li>Approachable but professional</li><li>Shoulders slightly angled (not completely straight-on)</li></ul><h3><strong>LinkedIn Algorithm Optimization</strong></h3><p>LinkedIn's algorithm favors profiles with photos:</p><ul><li>Profiles with photos get <strong>21 times more views</strong></li><li>Messages get <strong>36% more responses</strong> with a photo</li><li>High-quality headshots signal professionalism and increase connection acceptance rates</li></ul><h3><strong>Pro Tip for LinkedIn</strong></h3><p>Your LinkedIn headshot should be updated more frequently than other platforms (every 1-2 years). It's often the first impression recruiters and potential clients have of you. When in doubt, choose the warmest, most approachable professional photo you have.</p><h2>Resume/CV Photos: The Professional Standard</h2><h3><strong>Should You Include a Photo?</strong></h3><p>This varies by country and industry:</p><ul><li><strong>Common in:</strong> Europe, Asia, Latin America, Middle East</li><li><strong>Discouraged in:</strong> USA, Canada, UK (due to discrimination concerns)</li><li><strong>Industry-dependent:</strong> Creative fields often welcome photos; corporate roles vary</li></ul><p>If you're applying internationally or in a field where photos are expected, follow these guidelines.</p><h3><strong>Technical Requirements</strong></h3><ul><li><strong>Size:</strong> 2 × 2 inches (passport size) or 1.5 × 2 inches</li><li><strong>Resolution:</strong> 300 DPI minimum (for printing)</li><li><strong>File format:</strong> JPG or PNG</li><li><strong>Digital size:</strong> 500 × 500 pixels minimum</li><li><strong>Aspect ratio:</strong> 1:1 (square) or 3:4 (portrait)</li></ul><h3><strong>Cropping & Framing Strategy</strong></h3><ul><li><strong>Tighter crop than LinkedIn:</strong> Head and upper shoulders only</li><li><strong>Passport-style framing:</strong> Face should fill most of the frame</li><li><strong>Vertical orientation:</strong> Portrait, not landscape</li><li><strong>Conservative framing:</strong> Professional and straightforward</li></ul><h3><strong>Background & Style</strong></h3><ul><li>Plain white or light gray background is safest</li><li>No distracting elements whatsoever</li><li>Professional studio look is preferred</li><li>High contrast between you and background</li></ul><h3><strong>Clothing & Expression</strong></h3><ul><li>Formal business attire (suit recommended)</li><li>Conservative, professional appearance</li><li>Neutral or slight smile (not big grin)</li><li>Direct eye contact</li><li>More formal than LinkedIn</li></ul><h3><strong>Placement & Size on Resume</strong></h3><ul><li><strong>Location:</strong> Top right or top left corner</li><li><strong>Size:</strong> Small—don't let it dominate the page</li><li><strong>Never make it larger than 2 × 2 inches</strong></li><li>Should not distract from your qualifications</li></ul><h3><strong>ATS (Applicant Tracking System) Considerations</strong></h3><ul><li>Some ATS systems can't process images—use a separate "with photo" version for human review</li><li>Never embed photos in headers/footers (confuses ATS)</li><li>Keep file size reasonable (don't inflate your resume file)</li></ul><h3><strong>Pro Tip for Resumes</strong></h3><p>If you're unsure whether to include a photo, create two versions: one with and one without. Use the appropriate version based on the application requirements and cultural context.</p><h2>Personal Website/Portfolio: Your Creative Freedom</h2><h3><strong>Technical Requirements</strong></h3><ul><li><strong>Size:</strong> Flexible—depends on your design</li><li><strong>Common sizes:</strong> 800 × 800 pixels (profile), 1920 × 1080 pixels (hero image)</li><li><strong>File format:</strong> JPG for photos, PNG if transparency needed</li><li><strong>Resolution:</strong> High resolution for main images (2000px+ width for hero images)</li><li><strong>Optimization:</strong> Compress for web (under 500KB for fast loading)</li></ul><h3><strong>Multiple Image Needs</strong></h3><p>Unlike other platforms, websites typically need multiple versions:</p><ul><li><strong>Hero image:</strong> Large, wide format (16:9 or 21:9)</li><li><strong>About page headshot:</strong> Square or portrait (1:1 or 3:4)</li><li><strong>Thumbnail/favicon:</strong> Very small, recognizable (32 × 32 or 64 × 64 pixels)</li><li><strong>Mobile versions:</strong> Optimized crops for smaller screens</li></ul><h3><strong>Cropping & Framing Strategy</strong></h3><ul><li><strong>Hero images:</strong> Can include more context—upper body or even full body</li><li><strong>About page:</strong> Classic headshot framing works</li><li><strong>Consider your site design:</strong> Make sure your photo works with your layout</li><li><strong>Test responsive design:</strong> How does it look on mobile?</li></ul><h3><strong>Style & Creative Choices</strong></h3><ul><li>More creative freedom than LinkedIn or resume</li><li>Can match your personal brand aesthetic</li><li>Environmental portraits work well (you in your workspace)</li><li>Can use color, texture, mood to tell your story</li></ul><h3><strong>Background & Context</strong></h3><ul><li>Can show your work environment</li><li>Branded backgrounds work well</li><li>Story-telling through setting is powerful</li><li>Just ensure it doesn't distract from you</li></ul><h3><strong>Web Performance Optimization</strong></h3><ul><li>Use image compression tools (TinyPNG, ImageOptim)</li><li>Implement lazy loading for below-the-fold images</li><li>Serve different sizes based on device (responsive images)</li><li>Use WebP format for modern browsers (with JPG fallback)</li></ul><h3><strong>Pro Tip for Websites</strong></h3><p>Your website is the one place where you have complete control. Use it to show more personality and context than you can on LinkedIn or a resume. Consider having both a traditional headshot and a more environmental portrait that shows your work or passion.</p><h2>Social Media Platform Comparisons</h2><h3><strong>Twitter/X</strong></h3><ul><li><strong>Size:</strong> 400 × 400 pixels</li><li><strong>Display:</strong> Circular crop (like LinkedIn)</li><li><strong>Style:</strong> Can be slightly more casual than LinkedIn</li><li><strong>Best practice:</strong> Clear, recognizable face</li></ul><h3><strong>Instagram</strong></h3><ul><li><strong>Size:</strong> 320 × 320 pixels (displays small)</li><li><strong>Display:</strong> Circular crop</li><li><strong>Style:</strong> More personality and creativity welcome</li><li><strong>Best practice:</strong> Make sure it's recognizable even at small sizes</li></ul><h3><strong>Facebook (Professional Page)</strong></h3><ul><li><strong>Size:</strong> 180 × 180 pixels minimum</li><li><strong>Display:</strong> Circular crop</li><li><strong>Style:</strong> Professional but warmer than LinkedIn</li><li><strong>Best practice:</strong> Friendly, approachable</li></ul><h3><strong>GitHub</strong></h3><ul><li><strong>Size:</strong> 420 × 420 pixels recommended</li><li><strong>Display:</strong> Rounded square</li><li><strong>Style:</strong> Tech-friendly, casual</li><li><strong>Best practice:</strong> Clean, simple, technical audiences</li></ul><h2>Technical Specifications Side-by-Side</h2><h3><strong>Platform Comparison Table</strong></h3><p><strong>LinkedIn</strong></p><ul><li>Size: 400 × 400 px (min)</li><li>Format: JPG, PNG</li><li>Display: Circle</li><li>Style: Professional friendly</li></ul><p><strong>Resume</strong></p><ul><li>Size: 500 × 500 px</li><li>Format: JPG (300 DPI)</li><li>Display: Small square</li><li>Style: Formal business</li></ul><p><strong>Website Hero</strong></p><ul><li>Size: 1920 × 1080 px</li><li>Format: JPG (optimized)</li><li>Display: Wide banner</li><li>Style: Branded creative</li></ul><p><strong>Website Profile</strong></p><ul><li>Size: 800 × 800 px</li><li>Format: JPG, PNG</li><li>Display: Square/circle</li><li>Style: Personal brand</li></ul><p><strong>Twitter</strong></p><ul><li>Size: 400 × 400 px</li><li>Format: JPG, PNG</li><li>Display: Circle</li><li>Style: Professional casual</li></ul><h2>Creating a Multi-Platform Workflow</h2><h3><strong>Step 1: Start With the Highest Quality Original</strong></h3><ul><li>Get a high-resolution professional headshot (2000 × 2000 px minimum)</li><li>Use a professional photographer or high-quality AI tool</li><li>This is your "master" image</li></ul><h3><strong>Step 2: Create Platform-Specific Crops</strong></h3><p>From your master image, create:</p><ul><li><strong>Square crop (1:1):</strong> For LinkedIn, social media, website profile</li><li><strong>Portrait crop (3:4):</strong> For resume, business cards</li><li><strong>Wide crop (16:9):</strong> For website headers, presentations</li></ul><h3><strong>Step 3: Optimize for Each Platform</strong></h3><ul><li>Resize to exact specifications</li><li>Compress for web (use tools like TinyPNG)</li><li>Save with descriptive filenames (linkedin-headshot-2024.jpg)</li></ul><h3><strong>Step 4: Test on Actual Platforms</strong></h3><ul><li>Upload to each platform and preview</li><li>Check how circular crops look</li><li>Verify mobile appearance</li><li>Adjust if needed</li></ul><h3><strong>Step 5: Keep Versions Organized</strong></h3><p>Create a folder structure:</p><ul><li>/master (high-res original)</li><li>/linkedin (optimized for LinkedIn)</li><li>/resume (print-quality)</li><li>/website (various sizes)</li><li>/social (Twitter, Instagram, etc.)</li></ul><h2>Recommended Tools</h2><h3><strong>Free Tools</strong></h3><ul><li><strong>Remove.bg:</strong> Remove backgrounds automatically</li><li><strong>Canva:</strong> Resize and crop for different platforms</li><li><strong>TinyPNG:</strong> Compress images without quality loss</li><li><strong>Squoosh:</strong> Google's image compression tool</li></ul><h3><strong>Paid Tools (Worth It)</strong></h3><ul><li><strong>Adobe Lightroom:</strong> Professional editing and batch processing</li><li><strong>Photoshop:</strong> Precise cropping and retouching</li><li><strong>AI headshot tools:</strong> Generate platform-specific variations instantly</li></ul><h2>Consistency Across Platforms</h2><h3><strong>What Should Stay Consistent</strong></h3><ul><li>Your overall appearance (hair, clothing style)</li><li>Your expression and energy</li><li>Your personal brand colors/aesthetic</li><li>The professional tone</li></ul><h3><strong>What Can Vary</strong></h3><ul><li>Cropping (platform-dependent)</li><li>Background (can adapt to platform)</li><li>Formality level (slightly adjust per platform)</li><li>File size and resolution (technical optimization)</li></ul><h2>Your Platform Optimization Checklist</h2><ol><li><strong>Create a high-quality master headshot</strong> (2000+ pixels, professional quality)</li><li><strong>Identify all platforms you need</strong> (LinkedIn, resume, website, social media)</li><li><strong>Crop specifically for each platform</strong> (consider circular vs. square display)</li><li><strong>Optimize file sizes</strong> (fast loading without quality loss)</li><li><strong>Test on actual platforms</strong> (preview before committing)</li><li><strong>Update consistently</strong> (change all platforms when you update your photo)</li></ol><h2>The Bottom Line</h2><p>One size doesn't fit all when it comes to professional headshots across platforms. By understanding the technical requirements, aspect ratios, and stylistic expectations of each platform, you ensure your headshot always looks its best—whether someone encounters you on LinkedIn, reads your resume, or visits your website.</p><p>Invest the time to create platform-optimized versions of your headshot. It's a small effort that pays dividends in presenting a polished, professional image everywhere your audience finds you.</p>`
  }
];

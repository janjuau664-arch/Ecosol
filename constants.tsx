
import { Category, SectionType, Language } from './types';

export const SECTIONS: { id: SectionType; label: string; icon: string; color: string }[] = [
  { 
    id: 'Climate', 
    label: 'Climate Change',
    icon: '🌏', 
    color: 'emerald'
  },
  { 
    id: 'Water', 
    label: 'Water',
    icon: '🌊', 
    color: 'blue'
  },
  { 
    id: 'Air', 
    label: 'Air',
    icon: '🪁', 
    color: 'indigo'
  },
  { 
    id: 'Noise', 
    label: 'Noise & Global Change',
    icon: '📢', 
    color: 'red'
  },
];

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

export const CATEGORIES_BY_SECTION: Record<SectionType, Category> = {
  Climate: Category.CLIMATE_CHANGE,
  Water: Category.WATER,
  Air: Category.AIR,
  Noise: Category.NOISE_GLOBAL,
  // Fix: Added missing property 'Vision' to satisfy Record<SectionType, Category>
  Vision: Category.VISION,
};
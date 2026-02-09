
export enum Category {
  CLIMATE_CHANGE = 'Climate Change',
  WATER = 'Water',
  AIR = 'Air',
  NOISE_GLOBAL = 'Noise & Global Change',
  VISION = 'Eco Vision'
}

export type SectionType = 'Climate' | 'Water' | 'Air' | 'Noise' | 'Vision';

export type ImageSize = '1K' | '2K' | '4K';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface EnvironmentalSolution {
  topic: string;
  summary: string;
  introduction: string;
  explanation: string;
  background: string;
  causes: string[];
  impacts: string[];
  solutions: string[];
  examples: string[];
  preventionTips: string[];
  conclusion: string;
  visualPrompt: string;
  category: Category;
  section: SectionType;
}

export interface ImageGenerationResult {
  url: string;
  prompt: string;
  size: ImageSize;
}

export interface EcoHabit {
  id: string;
  name: string;
  completed: boolean;
  streak: number;
}

export interface EcoStatus {
  localTemp: string;
  localCondition: string;
  globalAvgTemp: string;
  news: {
    title: string;
    description: string;
    url: string;
  }[];
}

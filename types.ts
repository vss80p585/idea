
export enum BrainstormMode {
  FREE = 'FREE',
  SCAMPER = 'SCAMPER',
  SIX_HATS = 'SIX_HATS',
  RANDOM = 'RANDOM',
  SCENARIO = 'SCENARIO'
}

export interface UserNote {
  id: string;
  content: string;
  createdAt: number;
}

export interface DeepAnalysis {
  executionSteps: string[];
  variants: { title: string; description: string }[];
  createdAt: number;
}

export interface PRD {
  id: string;
  ideaId: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface WebPRD {
  id: string;
  prdId: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface RawRequirement {
  id: string;
  content: string;
  type: 'AI_BOOST' | 'PRD_GEN';
  createdAt: number;
}

export interface Idea {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  tags: string[];
  isFavorite: boolean;
  priority: 'Low' | 'Medium' | 'High';
  createdAt: number;
  mode?: BrainstormMode;
  category?: string;
  userNotes?: UserNote[];
  deepAnalysis?: DeepAnalysis;
}

export interface Session {
  id: string;
  title: string;
  goal: string;
  currentMode: BrainstormMode;
  ideas: Idea[];
  prds: PRD[];
  webPrds: WebPRD[];
  rawRequirements: RawRequirement[];
  createdAt: number;
  isArchived?: boolean;
}

export type ViewType = 'session' | 'history' | 'favorites' | 'mindmap' | 'wordcloud' | 'prds' | 'web_prds' | 'raw_requirements';

export const MODES_CONFIG = {
  [BrainstormMode.FREE]: {
    name: '自由脑暴',
    description: '无限制捕捉灵感',
    icon: '💡'
  },
  [BrainstormMode.SCAMPER]: {
    name: 'SCAMPER 法',
    description: '通过替代、合并、改进激发创意',
    icon: '🔄'
  },
  [BrainstormMode.SIX_HATS]: {
    name: '六顶思考帽',
    description: '多维度的平行思考模式',
    icon: '🎩'
  },
  [BrainstormMode.RANDOM]: {
    name: '随机刺激',
    description: '利用随机关键词打破思维僵局',
    icon: '🎲'
  },
  [BrainstormMode.SCENARIO]: {
    name: '场景模拟',
    description: '基于用户画像的针对性方案',
    icon: '🌍'
  }
};

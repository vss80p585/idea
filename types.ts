
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
    name: '自由',
    description: '无拘无束',
    icon: '💡'
  },
  [BrainstormMode.SCAMPER]: {
    name: '重构',
    description: '替代/合并',
    icon: '🔄'
  },
  [BrainstormMode.SIX_HATS]: {
    name: '视角',
    description: '六顶帽',
    icon: '🎩'
  },
  [BrainstormMode.RANDOM]: {
    name: '碰撞',
    description: '随机触发',
    icon: '🎲'
  },
  [BrainstormMode.SCENARIO]: {
    name: '场景',
    description: '用户模拟',
    icon: '🌍'
  }
};

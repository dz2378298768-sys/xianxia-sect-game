import type { ArtifactType } from '@/types/artifact';
import type { BeastType } from '@/types/beast';
import type { PillType } from '@/types/pill';
import type { TalismanType } from '@/types/talisman';

export type TaskType = 'main' | 'side' | 'monthly' | 'achievement';

export const TaskTypeNames: Record<TaskType, string> = {
  main: '主线',
  side: '支线',
  monthly: '月度',
  achievement: '成就',
};

export type TaskMetric =
  // 派生类
  | 'sectLevel' | 'reputation' | 'discipleCount' | 'elderCount' | 'spiritStones'
  | 'buildingLevel' | 'buildingCount' | 'discipleRealmCount'
  | 'allyCount' | 'vassalCount' | 'beastKinds' | 'booksLearned' | 'gameWon'
  // 计数类
  | 'breakthroughCount' | 'trialCompleteCount' | 'tournamentTop3' | 'tournamentChampion'
  | 'pillCraftCount' | 'artifactCraftCount' | 'talismanCraftCount'
  | 'eventResolveCount' | 'buildingUpgradeCount'
  // 月度计数
  | 'monthlyAdvance' | 'monthlyTrial' | 'monthlyRecruit'
  | 'monthlyCraft' | 'monthlyEvent' | 'monthlyUpgrade';

export interface TaskReward {
  spiritStones?: number;
  reputation?: number;
  contribution?: number;
  pills?: { type: PillType; qty: number }[];
  artifacts?: { type: ArtifactType; qty: number }[];
  talismans?: { type: TalismanType; qty: number }[];
  beasts?: { type: BeastType; qty: number }[];
  specialMaterials?: { name: string; amount: number }[];
  unlockPillRecipes?: PillType[];
  unlockArtifactRecipes?: ArtifactType[];
  unlockTalismanRecipes?: TalismanType[];
}

export interface TaskConfig {
  id: string;
  type: TaskType;
  chapter?: number;
  title: string;
  description: string;
  metric: TaskMetric;
  target: number;
  params?: Record<string, string | number>;
  prerequisite?: string[];
  rewards: TaskReward;
  hidden?: boolean;
}

export interface TaskProgress {
  current: number;
  target: number;
  completed: boolean;
  claimed: boolean;
}

export interface TaskStateView {
  sectLevel: import('@/types/game').SectLevel;
  reputation: number;
  spiritStones: number;
  disciples: import('@/types/disciple').Disciple[];
  buildings: import('@/types/building').Building[];
  otherSects: import('@/types/game').OtherSect[];
  beastInventory: import('@/types/beast').BeastInventory[];
  gameWon: boolean;
  taskCounters: Record<string, number>;
  monthlyTaskCounters: Record<string, number>;
  claimedTasks: Record<string, { year: number; month: number }>;
  monthlyTaskIds: string[];
}

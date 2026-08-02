import type { Realm, DiscipleStatus } from '@/types/disciple';
import type { PillType } from '@/types/pill';

// 大比范围
export type TournamentScope = 'sect' | 'inter-sect';

// 大比频率
export type TournamentFrequency = 'yearly' | 'every5years' | 'every10years';

export const TournamentFrequencyNames: Record<TournamentFrequency, string> = {
  yearly: '每年一比',
  every5years: '每五年一比',
  every10years: '每十年一比',
};

export const TournamentFrequencyIntervals: Record<TournamentFrequency, number> = {
  yearly: 1,
  every5years: 5,
  every10years: 10,
};

// 大比分组维度：按境界 / 按身份 / 全员
export type TournamentDivisionKind = 'realm' | 'status' | 'all';

// 分组标识：境界值 / 身份值 / 'all'
export type TournamentDivision =
  | { kind: 'realm'; value: Realm }
  | { kind: 'status'; value: DiscipleStatus }
  | { kind: 'all'; value: 'all' };

// 奖励类型
export type TournamentRewardType = 'pill' | 'contribution' | 'spiritStones' | 'reputation';

export const TournamentRewardTypeNames: Record<TournamentRewardType, string> = {
  pill: '丹药',
  contribution: '贡献点',
  spiritStones: '灵石',
  reputation: '声望',
};

export interface TournamentReward {
  type: TournamentRewardType;
  amount: number;
  pillType?: PillType; // 仅当 type === 'pill' 时有效
  // 名次：1=冠军，2=亚军，3=季军
  rank: 1 | 2 | 3;
}

// 单个频率配置：可独立开关，有独立的分组与奖励
export interface FrequencyTournamentConfig {
  enabled: boolean;
  division: TournamentDivision;
  rewards: TournamentReward[];
}

// 大比总配置：三种频率可同时开启，各自独立配置
export interface TournamentConfig {
  yearly: FrequencyTournamentConfig;
  every5years: FrequencyTournamentConfig;
  every10years: FrequencyTournamentConfig;
}

// 对手（其他宗门弟子）的简化表示
export interface TournamentOpponent {
  name: string;
  sectName: string;
  realm: Realm;
  combatPower: number;
}

// 单场对战结果
export interface TournamentMatch {
  ourName: string;
  opponentName: string;
  opponentSectName: string;
  ourPower: number;
  opponentPower: number;
  ourWin: boolean;
  round: number; // 第几轮
}

// 大比总结果：新增 frequency 字段区分是哪一种频率的结果
export interface TournamentResult {
  scope: TournamentScope;
  frequency: TournamentFrequency;
  division: TournamentDivision;
  date: { year: number; month: number };
  // 我方参赛弟子数
  ourParticipantCount: number;
  // 我方冠军名（若夺冠）
  ourChampionName: string | null;
  // 我方最终名次（1-based，0 表示未入榜）
  ourRank: number;
  // 冠军、亚军、季军名称
  topThree: { name: string; sectName: string; isOurs: boolean }[];
  // 关键对战记录（我方弟子的对战）
  matches: TournamentMatch[];
  // 我方获得的总奖励文本
  rewardSummary: string[];
}

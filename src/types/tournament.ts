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

/** 自动举办月份：三种频率错开，避免同月连办数场 */
export const TournamentFrequencyMonths: Record<TournamentFrequency, number> = {
  yearly: 1,
  every5years: 7,
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
export type TournamentRewardType = 'pill' | 'talisman' | 'artifact' | 'contribution' | 'spiritStones' | 'reputation';

export const TournamentRewardTypeNames: Record<TournamentRewardType, string> = {
  pill: '丹药',
  talisman: '符箓',
  artifact: '法器',
  contribution: '贡献点',
  spiritStones: '灵石',
  reputation: '声望',
};

export interface TournamentReward {
  type: TournamentRewardType;
  amount: number;
  pillType?: PillType; // 仅当 type === 'pill' 时有效
  talismanType?: string; // 仅当 type === 'talisman' 时有效
  artifactType?: string; // 仅当 type === 'artifact' 时有效
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
  // 我方参赛弟子 id（用于赛后修为/满意度结算）
  ourParticipantIds: string[];
  // 我方冠军 id / 名字（若夺冠）；id 用来避免重名发错奖励
  ourChampionId: string | null;
  ourChampionName: string | null;
  // 我方名次最高者（1~3 名），奖励发给他；未进三甲时为空
  ourPodiumId: string | null;
  ourPodiumName: string | null;
  // 我方最终名次（1-based，0 表示未入榜）
  ourRank: number;
  // 冠军、亚军、季军；参赛人数不足 3 时可能少于三项
  topThree: { name: string; sectName: string; isOurs: boolean; id?: string }[];
  // 关键对战记录（我方弟子的对战）
  matches: TournamentMatch[];
  // 我方获得的总奖励文本
  rewardSummary: string[];
  // 本届实际发放的奖赏（山门大比会从库存扣除；库存不足时小于配置值）
  payout?: { spiritStones: number; pills: number; talismans: number; artifacts: number };
}

/** 历届大比记录（宗门级，用于榜单与回顾） */
export interface TournamentHistoryEntry {
  id: string;
  date: { year: number; month: number };
  scope: TournamentScope;
  frequency: TournamentFrequency;
  divisionName: string;
  ourRank: number;
  champion: string;
  championSect: string;
  ourChampionName: string | null;
  rewardSummary: string[];
}

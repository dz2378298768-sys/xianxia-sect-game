import type { Disciple } from '@/types/disciple';
import type { Realm, DiscipleStatus } from '@/types/disciple';
import { RealmOrder, RealmNames, DiscipleStatusNames } from '@/types/disciple';
import type { OtherSect, SectLevel } from '@/types/game';
import type {
  FrequencyTournamentConfig, TournamentConfig, TournamentDivision, TournamentOpponent,
  TournamentMatch, TournamentResult, TournamentReward, TournamentFrequency,
} from '@/types/tournament';
import { TournamentRewardTypeNames, TournamentFrequencyIntervals, TournamentFrequencyMonths } from '@/types/tournament';
import type { PillType } from '@/types/pill';
import { PillTypeNames } from '@/types/pill';
import type { TalismanType } from '@/types/talisman';
import { TalismanTypeNames } from '@/types/talisman';
import type { ArtifactType } from '@/types/artifact';
import { ArtifactTypeNames } from '@/types/artifact';
import { randomInt, pickRandom, weightedRandom } from './random';
import { calculateDiscipleCombatPower, ADULT_AGE } from './gameLogic';

// 弟子名字片段
const NAME_SURNAMES = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧'];
const NAME_GIVENS = ['逍遥', '无极', '清风', '明月', '玄', '道', '尘', '虚', '灵', '云', '霜', '雪', '锋', '渊', '辰', '昊', '煜', '瑾', '瑜', '璃', '芷', '若', '瑶', '嫣', '墨', '砚', '青', '白', '紫', '丹'];

function generateOpponentName(): string {
  return pickRandom(NAME_SURNAMES) + pickRandom(NAME_GIVENS);
}

// 判断弟子是否符合分组
export function discipleMatchesDivision(disciple: Disciple, division: TournamentDivision): boolean {
  switch (division.kind) {
    case 'all': return true;
    case 'realm': return disciple.realm === division.value;
    case 'status': return disciple.status === division.value;
  }
}

// 分组显示名
export function getDivisionName(division: TournamentDivision): string {
  switch (division.kind) {
    case 'all': return '全员大比';
    case 'realm': return `${RealmNames[division.value]}大比`;
    case 'status': return `${DiscipleStatusNames[division.value]}大比`;
  }
}

// 根据境界生成对手的战力（与本宗弟子同境界战力相当）
function realmCombatRange(realm: Realm): [number, number] {
  const idx = RealmOrder.indexOf(realm);
  const ranges: [number, number][] = [
    [30, 120],     // mortal
    [80, 350],     // qi
    [300, 1200],   // foundation
    [1000, 4500],  // golden
    [4000, 18000], // nascent
    [15000, 70000], // spirit
  ];
  return ranges[idx] ?? [50, 200];
}

// 对手宗门的实力系数：宗门越强，派出的弟子越强
const SECT_LEVEL_POWER_MUL: Record<SectLevel, number> = {
  founding: 0.7,
  known: 0.9,
  famous: 1.05,
  dominant: 1.2,
  eternal: 1.35,
};

export function sectPowerMultiplier(sect: OtherSect): number {
  const base = SECT_LEVEL_POWER_MUL[sect.level] ?? 1;
  // 敌对宗门下手更重，盟友留手；让外交关系在赛场上也有意义
  const relationMul = sect.relation === 'hostile' ? 1.1 : sect.relation === 'ally' ? 0.92 : 1;
  return base * relationMul;
}

/** 供 UI 预告：该分组下对手的战力区间（按在场宗门的最弱/最强实力估算） */
export function estimateOpponentRange(realm: Realm, sects: OtherSect[]): [number, number] {
  const [min, max] = realmCombatRange(realm);
  if (sects.length === 0) return [min, max];
  const muls = sects.map(sectPowerMultiplier);
  return [Math.round(min * Math.min(...muls)), Math.round(max * Math.max(...muls))];
}

// 生成其他宗门的对手弟子
function generateOpponents(
  sects: OtherSect[],
  division: TournamentDivision,
  count: number,
  ourRealms: Realm[],
): TournamentOpponent[] {
  if (sects.length === 0) return [];
  const opponents: TournamentOpponent[] = [];
  const statusRealmMap: Record<DiscipleStatus, Realm> = {
    mortal: 'mortal',
    servant: 'mortal',
    outer: 'qi',
    inner: 'foundation',
    core: 'golden',
    elder: 'nascent',
  };

  for (let i = 0; i < count; i++) {
    const sect = pickRandom(sects);
    // 确定对手境界：按分组；「全员」按我方参赛者的境界分布随机，避免全场固定筑基期
    let realm: Realm;
    if (division.kind === 'realm') realm = division.value;
    else if (division.kind === 'status') realm = statusRealmMap[division.value];
    else realm = ourRealms.length > 0 ? pickRandom(ourRealms) : 'foundation';

    const [min, max] = realmCombatRange(realm);
    opponents.push({
      name: generateOpponentName(),
      sectName: sect.name,
      realm,
      combatPower: Math.round(randomInt(min, max) * sectPowerMultiplier(sect)),
    });
  }
  return opponents;
}

// 抽签：随机洗牌，避免"最强对第二强"提前上演决赛
function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 单场对战：战力为主，含随机波动
function runMatch(ourPower: number, opponentPower: number): boolean {
  const ourRoll = ourPower * (0.7 + Math.random() * 0.6);
  const opponentRoll = opponentPower * (0.7 + Math.random() * 0.6);
  return ourRoll >= opponentRoll;
}

// 奖励文本
export function rewardToText(reward: TournamentReward): string {
  switch (reward.type) {
    case 'pill':
      return `${PillTypeNames[reward.pillType as PillType] ?? '丹药'} ×${reward.amount}`;
    case 'talisman':
      return `${TalismanTypeNames[reward.talismanType as TalismanType] ?? '符箓'} ×${reward.amount}`;
    case 'artifact':
      return `${ArtifactTypeNames[reward.artifactType as ArtifactType] ?? '法器'} ×${reward.amount}`;
    case 'contribution':
      return `贡献点 +${reward.amount}`;
    case 'spiritStones':
      return `灵石 +${reward.amount}`;
    case 'reputation':
      return `声望 +${reward.amount}`;
  }
}

export interface RunTournamentParams {
  scope: 'sect' | 'inter-sect';
  frequency: TournamentFrequency;
  config: FrequencyTournamentConfig;
  disciples: Disciple[];
  otherSects: OtherSect[];
  date: { year: number; month: number };
}

// 运行一场大比
export function runTournament(params: RunTournamentParams): TournamentResult {
  const { scope, frequency, config, disciples, otherSects, date } = params;
  const { division } = config;

  // 筛选我方参赛弟子（未成年稚子不参赛）
  const ourParticipants = disciples
    .filter(d => d.age >= ADULT_AGE && discipleMatchesDivision(d, division))
    .map(d => ({
      id: d.id,
      name: d.name,
      realm: d.realm,
      power: calculateDiscipleCombatPower(d),
    }))
    .sort((a, b) => b.power - a.power);

  // 山门大比：纯内部比拼；宗门大比：与其他宗门弟子同台
  let opponents: TournamentOpponent[] = [];
  if (scope === 'inter-sect') {
    // 对手数量 = 我方参赛数 × 1.5，最少 4
    const oppCount = Math.max(4, Math.ceil(ourParticipants.length * 1.5));
    opponents = generateOpponents(otherSects, division, oppCount, ourParticipants.map(p => p.realm));
  }

  // 合并所有参赛者（内部大比时仅我方）
  type Fighter = { name: string; sectName: string; power: number; isOurs: boolean; ourId?: string };
  const allFighters: Fighter[] = ourParticipants.map(p => ({
    name: p.name, sectName: '本宗', power: p.power, isOurs: true, ourId: p.id,
  }));
  opponents.forEach(o => allFighters.push({
    name: o.name, sectName: o.sectName, power: o.combatPower, isOurs: false,
  }));

  const matches: TournamentMatch[] = [];
  const recordMatch = (a: Fighter, b: Fighter, winner: Fighter, round: number) => {
    if (!a.isOurs && !b.isOurs) return;
    const ours = a.isOurs ? a : b;
    const opp = a.isOurs ? b : a;
    matches.push({
      ourName: ours.name,
      opponentName: opp.name,
      opponentSectName: opp.sectName,
      ourPower: ours.power,
      opponentPower: opp.power,
      ourWin: ours === winner,
      round,
    });
  };

  // 单场淘汰：抽签后相邻配对，奇数人时末位轮空；一路打到决赛
  let bracket = shuffle(allFighters);
  let round = 1;
  let champion: Fighter | null = null;
  let runnerUp: Fighter | null = null;
  // 半决赛（四强进二强那一轮）的败者，用于决出季军
  let semifinalLosers: Fighter[] = [];
  // 决赛败者上面单独记；若人数不足 2 则没有名次可排
  if (bracket.length === 1) {
    champion = bracket[0];
  }

  while (bracket.length > 1) {
    const nextRound: Fighter[] = [];
    const losers: Fighter[] = [];
    for (let i = 0; i + 1 < bracket.length; i += 2) {
      const a = bracket[i];
      const b = bracket[i + 1];
      const aWin = runMatch(a.power, b.power);
      const winner = aWin ? a : b;
      const loser = aWin ? b : a;
      nextRound.push(winner);
      losers.push(loser);
      recordMatch(a, b, winner, round);
    }
    // 奇数个：最后一位轮空
    if (bracket.length % 2 === 1) {
      nextRound.push(bracket[bracket.length - 1]);
    }

    if (nextRound.length === 1) {
      // 本轮即决赛
      champion = nextRound[0];
      runnerUp = losers[0] ?? null;
      break;
    }
    if (nextRound.length === 2) {
      semifinalLosers = losers;
    }
    bracket = nextRound;
    round++;
  }

  // 季军：两名半决赛败者加赛一场；只有一名时直接定为季军
  let third: Fighter | null = null;
  const bronzeCandidates = semifinalLosers.filter(f => f !== champion && f !== runnerUp);
  if (bronzeCandidates.length >= 2) {
    const [a, b] = bronzeCandidates;
    const aWin = runMatch(a.power, b.power);
    const winner = aWin ? a : b;
    third = winner;
    recordMatch(a, b, winner, round);
  } else if (bronzeCandidates.length === 1) {
    third = bronzeCandidates[0];
  }

  const podium = [champion, runnerUp, third].filter((f): f is Fighter => f !== null);
  const topThree = podium.map(f => ({
    name: f.name,
    sectName: f.sectName,
    isOurs: f.isOurs,
    id: f.ourId,
  }));

  // 我方名次与冠军身份
  let ourRank = 0;
  let ourChampionId: string | null = null;
  let ourChampionName: string | null = null;
  let ourPodiumId: string | null = null;
  let ourPodiumName: string | null = null;
  const ourIndex = podium.findIndex(f => f.isOurs);
  if (ourIndex >= 0) {
    ourRank = ourIndex + 1;
    ourPodiumId = podium[ourIndex].ourId ?? null;
    ourPodiumName = podium[ourIndex].name;
    if (ourIndex === 0) {
      ourChampionId = ourPodiumId;
      ourChampionName = ourPodiumName;
    }
  }

  // 计算我方获得的奖励（按名次）
  const rewardSummary: string[] = [];
  if (ourRank > 0) {
    const earnedRewards = config.rewards.filter(r => r.rank === ourRank as 1 | 2 | 3);
    earnedRewards.forEach(r => rewardSummary.push(rewardToText(r)));
  }

  return {
    scope,
    frequency,
    division,
    date,
    ourParticipantCount: ourParticipants.length,
    ourParticipantIds: ourParticipants.map(p => p.id),
    ourChampionId,
    ourChampionName,
    ourPodiumId,
    ourPodiumName,
    ourRank,
    topThree,
    matches: matches.slice(-8), // 仅保留最近 8 场关键对战
    rewardSummary,
  };
}

// 判断是否到本次大比时间（指定频率配置版本）：各频率在自己的月份自动举办
export function shouldTournamentTrigger(
  frequency: TournamentFrequency,
  freqConfig: FrequencyTournamentConfig,
  year: number,
  month: number,
  lastTriggerYear: number,
): boolean {
  if (!freqConfig.enabled) return false;
  if (month !== TournamentFrequencyMonths[frequency]) return false;
  const interval = TournamentFrequencyIntervals[frequency];
  if (lastTriggerYear <= 0) return true; // 从未举办过
  return year - lastTriggerYear >= interval;
}

// 玩家手动举办：不受月份限制，只服从冷却（自动举办仍按各自月份）
export function canManuallyHoldTournament(
  frequency: TournamentFrequency,
  freqConfig: FrequencyTournamentConfig,
  year: number,
  lastTriggerYear: number,
): boolean {
  if (!freqConfig.enabled) return false;
  if (lastTriggerYear <= 0) return true;
  return year - lastTriggerYear >= TournamentFrequencyIntervals[frequency];
}

// 单个频率默认配置
function getDefaultFrequencyConfig(scope: 'sect' | 'inter-sect', frequency: TournamentFrequency): FrequencyTournamentConfig {
  // 年度大比：外门比拼，奖励少量贡献
  if (frequency === 'yearly') {
    return {
      enabled: true,
      division: { kind: 'status', value: 'outer' },
      rewards: [
        { type: 'contribution', amount: 100, rank: 1 },
        { type: 'contribution', amount: 50, rank: 2 },
        { type: 'contribution', amount: 25, rank: 3 },
      ],
    };
  }
  // 五年大比：内门或筑基期，奖励中等
  if (frequency === 'every5years') {
    return {
      enabled: true,
      division: scope === 'sect'
        ? { kind: 'status', value: 'inner' }
        : { kind: 'realm', value: 'foundation' },
      rewards: [
        { type: 'contribution', amount: 300, rank: 1 },
        { type: 'spiritStones', amount: scope === 'sect' ? 200 : 400, rank: 1 },
        { type: 'reputation', amount: scope === 'sect' ? 10 : 30, rank: 1 },
        { type: 'contribution', amount: 150, rank: 2 },
        { type: 'contribution', amount: 75, rank: 3 },
        // 宗门大比五年期：跨宗门 rank2/rank3 也给声望；宗内仅冠军得声望
        ...(scope === 'inter-sect'
          ? [
              { type: 'reputation' as const, amount: 15, rank: 2 as const },
              { type: 'reputation' as const, amount: 8, rank: 3 as const },
            ]
          : []),
      ],
    };
  }
  // 十年大比：核心弟子或金丹期，奖励丰厚
  return {
    enabled: true,
    division: scope === 'sect'
      ? { kind: 'status', value: 'core' }
      : { kind: 'realm', value: 'golden' },
    rewards: [
      { type: 'spiritStones', amount: scope === 'sect' ? 500 : 1000, rank: 1 },
      { type: 'reputation', amount: scope === 'sect' ? 20 : 50, rank: 1 },
      { type: 'pill', amount: 1, pillType: 'golden_pill', rank: 1 },
      { type: 'spiritStones', amount: scope === 'sect' ? 250 : 500, rank: 2 },
      { type: 'spiritStones', amount: scope === 'sect' ? 125 : 250, rank: 3 },
    ],
  };
}

// 默认大比配置：三频率同时开启
export function getDefaultTournamentConfig(scope: 'sect' | 'inter-sect'): TournamentConfig {
  return {
    yearly: getDefaultFrequencyConfig(scope, 'yearly'),
    every5years: getDefaultFrequencyConfig(scope, 'every5years'),
    every10years: getDefaultFrequencyConfig(scope, 'every10years'),
  };
}

// 宗门间大比：每年随机生成固定奖励（不由玩家配置）
const INTER_SECT_YEARLY_PILL_POOL: PillType[] = ['foundation_pill', 'golden_pill', 'recovery_pill'];
const INTER_SECT_5Y_PILL_POOL: PillType[] = ['golden_pill', 'nascent_pill', 'longevity_pill'];
const INTER_SECT_10Y_PILL_POOL: PillType[] = ['nascent_pill', 'spirit_pill', 'longevity_pill'];
const INTER_SECT_YEARLY_TALISMAN_POOL: TalismanType[] = ['fire_talisman', 'heal_talisman', 'sword_talisman'];
const INTER_SECT_5Y_TALISMAN_POOL: TalismanType[] = ['thunder_talisman', 'ward_talisman', 'divine_talisman'];
const INTER_SECT_10Y_TALISMAN_POOL: TalismanType[] = ['teleport_talisman', 'stealth_talisman', 'divine_talisman'];
const INTER_SECT_YEARLY_ARTIFACT_POOL: ArtifactType[] = ['flying_sword', 'defensive_shield', 'spirit_bottle'];
const INTER_SECT_5Y_ARTIFACT_POOL: ArtifactType[] = ['attack_talisman', 'space_ring', 'thunder_pearl'];
const INTER_SECT_10Y_ARTIFACT_POOL: ArtifactType[] = ['bagua_mirror', 'demon_pagoda', 'thunder_pearl'];

export function generateInterSectRewards(
  frequency: TournamentFrequency,
  year: number,
): TournamentReward[] {
  // 随年份递增的奖励系数
  const era = Math.floor(year / 50) + 1;
  const baseMult = Math.min(3, 0.5 + era * 0.3);
  const baseStone = Math.floor(200 * baseMult);
  const baseRep = Math.floor(15 * baseMult);

  // 用年份做确定性种子，保证同一年每年奖励相同
  function seededRandom(offset: number): number {
    const x = Math.sin((year * 31 + offset) * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  // 根据频率生成个性化的奖励池
  const rewards: TournamentReward[] = [];

  if (frequency === 'yearly') {
    const pill = INTER_SECT_YEARLY_PILL_POOL[Math.floor(seededRandom(0) * INTER_SECT_YEARLY_PILL_POOL.length)];
    const tal = INTER_SECT_YEARLY_TALISMAN_POOL[Math.floor(seededRandom(4) * INTER_SECT_YEARLY_TALISMAN_POOL.length)];
    const art = INTER_SECT_YEARLY_ARTIFACT_POOL[Math.floor(seededRandom(5) * INTER_SECT_YEARLY_ARTIFACT_POOL.length)];
    rewards.push(
      { type: 'spiritStones', amount: Math.floor(baseStone * 1.0), rank: 1 },
      { type: 'reputation', amount: Math.floor(baseRep * 0.8), rank: 1 },
      { type: 'pill', amount: 1, pillType: pill, rank: 1 },
      { type: 'talisman', amount: 1, talismanType: tal, rank: 2 },
      { type: 'spiritStones', amount: Math.floor(baseStone * 0.5), rank: 2 },
      { type: 'reputation', amount: Math.floor(baseRep * 0.4), rank: 2 },
      { type: 'spiritStones', amount: Math.floor(baseStone * 0.25), rank: 3 },
      { type: 'artifact', amount: 1, artifactType: art, rank: 3 },
    );
  } else if (frequency === 'every5years') {
    const pill = INTER_SECT_5Y_PILL_POOL[Math.floor(seededRandom(1) * INTER_SECT_5Y_PILL_POOL.length)];
    const tal = INTER_SECT_5Y_TALISMAN_POOL[Math.floor(seededRandom(4) * INTER_SECT_5Y_TALISMAN_POOL.length)];
    const art = INTER_SECT_5Y_ARTIFACT_POOL[Math.floor(seededRandom(5) * INTER_SECT_5Y_ARTIFACT_POOL.length)];
    rewards.push(
      { type: 'spiritStones', amount: Math.floor(baseStone * 2.5), rank: 1 },
      { type: 'reputation', amount: Math.floor(baseRep * 2.0), rank: 1 },
      { type: 'pill', amount: 2, pillType: pill, rank: 1 },
      { type: 'talisman', amount: 1, talismanType: tal, rank: 2 },
      { type: 'spiritStones', amount: Math.floor(baseStone * 1.25), rank: 2 },
      { type: 'reputation', amount: Math.floor(baseRep * 1.0), rank: 2 },
      { type: 'spiritStones', amount: Math.floor(baseStone * 0.6), rank: 3 },
      { type: 'reputation', amount: Math.floor(baseRep * 0.5), rank: 3 },
      { type: 'artifact', amount: 1, artifactType: art, rank: 3 },
    );
  } else {
    // every10years
    const pill = INTER_SECT_10Y_PILL_POOL[Math.floor(seededRandom(2) * INTER_SECT_10Y_PILL_POOL.length)];
    const bigPill = INTER_SECT_10Y_PILL_POOL[Math.floor(seededRandom(3) * INTER_SECT_10Y_PILL_POOL.length)];
    const tal = INTER_SECT_10Y_TALISMAN_POOL[Math.floor(seededRandom(4) * INTER_SECT_10Y_TALISMAN_POOL.length)];
    const art = INTER_SECT_10Y_ARTIFACT_POOL[Math.floor(seededRandom(5) * INTER_SECT_10Y_ARTIFACT_POOL.length)];
    rewards.push(
      { type: 'spiritStones', amount: Math.floor(baseStone * 5.0), rank: 1 },
      { type: 'reputation', amount: Math.floor(baseRep * 4.0), rank: 1 },
      { type: 'pill', amount: 3, pillType: bigPill, rank: 1 },
      { type: 'talisman', amount: 2, talismanType: tal, rank: 1 },
      { type: 'spiritStones', amount: Math.floor(baseStone * 2.5), rank: 2 },
      { type: 'reputation', amount: Math.floor(baseRep * 2.0), rank: 2 },
      { type: 'pill', amount: 1, pillType: pill, rank: 2 },
      { type: 'artifact', amount: 1, artifactType: art, rank: 2 },
      { type: 'spiritStones', amount: Math.floor(baseStone * 1.25), rank: 3 },
      { type: 'reputation', amount: Math.floor(baseRep * 1.0), rank: 3 },
    );
  }

  return rewards;
}

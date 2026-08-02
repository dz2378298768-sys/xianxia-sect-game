import type { Disciple } from '@/types/disciple';
import type { Realm, DiscipleStatus } from '@/types/disciple';
import { RealmOrder, RealmNames, DiscipleStatusNames } from '@/types/disciple';
import type { OtherSect } from '@/types/game';
import type {
  FrequencyTournamentConfig, TournamentConfig, TournamentDivision, TournamentOpponent,
  TournamentMatch, TournamentResult, TournamentReward, TournamentFrequency,
} from '@/types/tournament';
import { TournamentRewardTypeNames, TournamentFrequencyIntervals } from '@/types/tournament';
import type { PillType } from '@/types/pill';
import { PillTypeNames } from '@/types/pill';
import { randomInt, pickRandom, weightedRandom } from './random';
import { calculateDiscipleCombatPower } from './gameLogic';

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

// 生成其他宗门的对手弟子
function generateOpponents(
  sects: OtherSect[],
  division: TournamentDivision,
  count: number,
): TournamentOpponent[] {
  const opponents: TournamentOpponent[] = [];
  // 确定对手境界
  let realm: Realm;
  if (division.kind === 'realm') {
    realm = division.value;
  } else if (division.kind === 'status') {
    // 按身份粗略映射到境界
    const statusRealmMap: Record<DiscipleStatus, Realm> = {
      mortal: 'mortal',
      servant: 'mortal',
      outer: 'qi',
      inner: 'foundation',
      core: 'golden',
      elder: 'nascent',
    };
    realm = statusRealmMap[division.value];
  } else {
    realm = 'foundation';
  }

  for (let i = 0; i < count; i++) {
    const sect = pickRandom(sects);
    const [min, max] = realmCombatRange(realm);
    opponents.push({
      name: generateOpponentName(),
      sectName: sect.name,
      realm,
      combatPower: randomInt(min, max),
    });
  }
  return opponents;
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

  // 筛选我方参赛弟子
  const ourParticipants = disciples
    .filter(d => discipleMatchesDivision(d, division))
    .map(d => ({
      id: d.id,
      name: d.name,
      power: calculateDiscipleCombatPower(d),
    }))
    .sort((a, b) => b.power - a.power);

  // 山门大比：纯内部比拼；宗门大比：与其他宗门弟子同台
  let opponents: TournamentOpponent[] = [];
  if (scope === 'inter-sect') {
    // 对手数量 = 我方参赛数 × 1.5，最少 4
    const oppCount = Math.max(4, Math.ceil(ourParticipants.length * 1.5));
    opponents = generateOpponents(otherSects, division, oppCount);
  }

  // 合并所有参赛者（内部大比时仅我方）
  type Fighter = { name: string; sectName: string; power: number; isOurs: boolean; ourId?: string };
  const allFighters: Fighter[] = ourParticipants.map(p => ({
    name: p.name, sectName: '本宗', power: p.power, isOurs: true, ourId: p.id,
  }));
  opponents.forEach(o => allFighters.push({
    name: o.name, sectName: o.sectName, power: o.combatPower, isOurs: false,
  }));

  // 按战力排序后进行"淘汰赛"模拟：用战力+随机性两两对战
  // 为保证名次合理性，采用基于战力的概率晋级
  let bracket = [...allFighters].sort((a, b) => b.power - a.power);
  const matches: TournamentMatch[] = [];
  let round = 1;

  // 模拟淘汰直到决出前3
  while (bracket.length > 3) {
    const nextRound: Fighter[] = [];
    for (let i = 0; i < bracket.length - 1; i += 2) {
      const a = bracket[i];
      const b = bracket[i + 1];
      const aWin = runMatch(a.power, b.power);
      const winner = aWin ? a : b;
      const loser = aWin ? b : a;
      nextRound.push(winner);

      // 记录涉及我方弟子的对战
      if (a.isOurs || b.isOurs) {
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
      }
    }
    // 奇数个：最后一位轮空
    if (bracket.length % 2 === 1) {
      nextRound.push(bracket[bracket.length - 1]);
    }
    bracket = nextRound;
    round++;
  }

  // 最终 bracket 为前3名（按本模拟结果）
  const topThreeFighters = bracket.slice(0, 3);
  const topThree = topThreeFighters.map((f, idx) => ({
    name: f.name,
    sectName: f.sectName,
    isOurs: f.isOurs,
  }));

  // 我方名次
  let ourRank = 0;
  let ourChampionName: string | null = null;
  for (let i = 0; i < topThreeFighters.length; i++) {
    if (topThreeFighters[i].isOurs) {
      ourRank = i + 1;
      if (i === 0) ourChampionName = topThreeFighters[i].name;
      break;
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
    ourChampionName,
    ourRank,
    topThree,
    matches: matches.slice(-6), // 仅保留最近6场关键对战
    rewardSummary,
  };
}

// 判断是否到本次大比时间（指定频率配置版本）
export function shouldTournamentTrigger(
  frequency: TournamentFrequency,
  freqConfig: FrequencyTournamentConfig,
  year: number,
  month: number,
  lastTriggerYear: number,
): boolean {
  if (!freqConfig.enabled) return false;
  // 仅在每年1月触发
  if (month !== 1) return false;
  const interval = TournamentFrequencyIntervals[frequency];
  if (lastTriggerYear <= 0) return true; // 从未举办过
  return year - lastTriggerYear >= interval;
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
        { type: 'contribution', amount: 150, rank: 2 },
        { type: 'contribution', amount: 75, rank: 3 },
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

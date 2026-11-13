import { describe, it, expect } from 'vitest';
import type { Disciple } from '@/types/disciple';
import type { OtherSect, SectLevel } from '@/types/game';
import type { FrequencyTournamentConfig } from '@/types/tournament';
import {
  runTournament, shouldTournamentTrigger, canManuallyHoldTournament,
  sectPowerMultiplier, estimateOpponentRange, getDefaultTournamentConfig,
} from './tournament';

function makeDisciple(id: string, overrides: Record<string, any> = {}): Disciple {
  return {
    id,
    name: `弟子${id}`,
    status: 'outer',
    realm: 'qi',
    realmProgress: 0,
    avatarSeed: 1,
    age: 20,
    lifespan: 100,
    spiritRoots: [],
    hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50, constitution: 50, spiritRoots: [] },
    cultivationSpeed: 100,
    satisfaction: 80,
    contributionPoints: 0,
    breakthroughAttempts: 0,
    breakthroughBonus: 0,
    isBreakingThrough: false,
    learnedTechnique: null,
    learnedBattles: [],
    learnedSecrets: [],
    buffs: [],
    constitutionId: 'normal_1',
    ...overrides,
  } as unknown as Disciple;
}

function makeSect(id: string, level: SectLevel, relation: OtherSect['relation'] = 'neutral'): OtherSect {
  return {
    id, name: `宗门${id}`, level, alignment: 'neutral', relation,
    combatPower: 1000, discipleCount: 10, distance: 100, specialty: '', description: '',
    favorability: 50, baseFavorability: 50, karmaFavorApplied: 0,
    diplomaticStatus: 'neutral', tradeActive: false, tradeFavorBonus: 0,
    tradeInvestment: 0, combatPowerAtTradeStart: 0,
    truceUntilYear: null, lastInteractionYear: null,
  };
}

const allDivisionConfig = (): FrequencyTournamentConfig => ({
  enabled: true,
  division: { kind: 'all', value: 'all' },
  rewards: [
    { rank: 1, type: 'contribution', amount: 100 },
    { rank: 2, type: 'contribution', amount: 50 },
    { rank: 3, type: 'contribution', amount: 25 },
  ],
});

describe('大比淘汰赛', () => {
  it('8 人参赛能打完决赛并给出完整三甲', () => {
    const disciples = Array.from({ length: 8 }, (_, i) => makeDisciple(`d${i}`));
    for (let t = 0; t < 20; t++) {
      const r = runTournament({
        scope: 'sect', frequency: 'yearly', config: allDivisionConfig(),
        disciples, otherSects: [], date: { year: 1, month: 1 },
      });
      expect(r.topThree).toHaveLength(3);
      expect(new Set(r.topThree.map(f => f.name)).size).toBe(3);
      expect(r.ourRank).toBeGreaterThanOrEqual(1);
      expect(r.ourRank).toBeLessThanOrEqual(3);
      // 冠军必须是三甲第一人，且带 id 供发奖使用
      expect(r.topThree[0].isOurs).toBe(true);
      expect(r.ourChampionId).toBe(r.topThree[0].id);
      // 获奖弟子 = 本宗名次最高的那位（奖赏按名次发，不只是冠军）
      expect(r.ourPodiumId).toBe(r.topThree[r.ourRank - 1].id);
      expect(r.ourPodiumName).toBe(r.topThree[r.ourRank - 1].name);
      expect(r.ourParticipantIds).toHaveLength(8);
    }
  });

  it('4 人参赛也会进行决赛（不止半决赛）', () => {
    const disciples = Array.from({ length: 4 }, (_, i) => makeDisciple(`d${i}`));
    for (let t = 0; t < 20; t++) {
      const r = runTournament({
        scope: 'sect', frequency: 'yearly', config: allDivisionConfig(),
        disciples, otherSects: [], date: { year: 1, month: 1 },
      });
      expect(r.topThree).toHaveLength(3);
      // 半决赛 + 决赛（季军赛也在同一轮）至少到第 2 轮
      expect(Math.max(...r.matches.map(m => m.round))).toBeGreaterThanOrEqual(2);
    }
  });

  it('2 人参赛只有冠亚军，不会凭空补出季军', () => {
    const disciples = [makeDisciple('a'), makeDisciple('b')];
    const r = runTournament({
      scope: 'sect', frequency: 'yearly', config: allDivisionConfig(),
      disciples, otherSects: [], date: { year: 1, month: 1 },
    });
    expect(r.topThree).toHaveLength(2);
    expect(r.ourRank).toBeGreaterThanOrEqual(1);
    expect(r.ourPodiumId).toBe(r.topThree[r.ourRank - 1].id);
  });

  it('单人参赛直接夺冠', () => {
    const r = runTournament({
      scope: 'sect', frequency: 'yearly', config: allDivisionConfig(),
      disciples: [makeDisciple('solo')], otherSects: [], date: { year: 1, month: 1 },
    });
    expect(r.topThree).toHaveLength(1);
    expect(r.ourRank).toBe(1);
    expect(r.ourChampionId).toBe('solo');
  });

  it('未成年弟子不参赛', () => {
    const disciples = [makeDisciple('kid', { age: 10 }), makeDisciple('adult')];
    const r = runTournament({
      scope: 'sect', frequency: 'yearly', config: allDivisionConfig(),
      disciples, otherSects: [], date: { year: 1, month: 1 },
    });
    expect(r.ourParticipantCount).toBe(1);
    expect(r.ourParticipantIds).toEqual(['adult']);
  });

  it('奖励文本只包含本宗名次对应的奖励', () => {
    const disciples = Array.from({ length: 4 }, (_, i) => makeDisciple(`d${i}`));
    const r = runTournament({
      scope: 'sect', frequency: 'yearly', config: allDivisionConfig(),
      disciples, otherSects: [], date: { year: 1, month: 1 },
    });
    // 内部大比必定进三甲，名次对应奖励固定条数
    expect(r.rewardSummary).toHaveLength(1);
  });
});

describe('对手强度', () => {
  it('宗门等级越高，派出的弟子越强', () => {
    const founding = sectPowerMultiplier(makeSect('a', 'founding'));
    const known = sectPowerMultiplier(makeSect('b', 'known'));
    const eternal = sectPowerMultiplier(makeSect('c', 'eternal'));
    expect(known).toBeGreaterThan(founding);
    expect(eternal).toBeGreaterThan(known);
  });

  it('交恶宗门比同盟宗门更拼命', () => {
    const ally = sectPowerMultiplier(makeSect('a', 'famous', 'ally'));
    const hostile = sectPowerMultiplier(makeSect('b', 'famous', 'hostile'));
    expect(hostile).toBeGreaterThan(ally);
  });

  it('对手战力区间随在场宗门实力扩大', () => {
    const weak = estimateOpponentRange('foundation', [makeSect('a', 'founding')]);
    const strong = estimateOpponentRange('foundation', [makeSect('b', 'eternal')]);
    expect(strong[1]).toBeGreaterThan(weak[1]);
  });
});

describe('大比触发时机', () => {
  const base = getDefaultTournamentConfig('sect');

  it('三种频率在不同月份自动举办', () => {
    expect(shouldTournamentTrigger('yearly', base.yearly, 2, 1, 1)).toBe(true);
    expect(shouldTournamentTrigger('yearly', base.yearly, 2, 7, 1)).toBe(false);
    expect(shouldTournamentTrigger('every5years', base.every5years, 6, 7, 1)).toBe(true);
    expect(shouldTournamentTrigger('every5years', base.every5years, 2, 7, 1)).toBe(false);
    expect(shouldTournamentTrigger('every10years', base.every10years, 11, 10, 1)).toBe(true);
    expect(shouldTournamentTrigger('every10years', base.every10years, 5, 10, 1)).toBe(false);
  });

  it('关闭的频率不会自动举办', () => {
    const disabled = { ...base.yearly, enabled: false };
    expect(shouldTournamentTrigger('yearly', disabled, 5, 1, 1)).toBe(false);
  });

  it('手动举办不受月份限制，只受冷却限制', () => {
    expect(canManuallyHoldTournament('yearly', base.yearly, 3, 2)).toBe(true);
    expect(canManuallyHoldTournament('every5years', base.every5years, 3, 2)).toBe(false);
    expect(canManuallyHoldTournament('yearly', { ...base.yearly, enabled: false }, 3, 2)).toBe(false);
  });
});

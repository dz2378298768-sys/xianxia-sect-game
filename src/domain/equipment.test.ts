import { describe, it, expect } from 'vitest';
import { calculateDiscipleCombatPower } from '@/utils/gameLogic';
import type { Disciple } from '@/types/disciple';

function makeDisciple(overrides: Partial<Disciple> = {}): Disciple {
  return {
    id: 'd1', name: '甲', age: 20, maxAge: 100,
    status: 'outer', realm: 'qi', realmProgress: 0,
    cultivationSpeed: 10,
    hiddenTalents: { rootBone: 50, spiritRhythm: 50, constitution: 50, daoFate: 50, spiritRoots: [] },
    talentDisplay: { rootBoneDesc: '', spiritRhythmDesc: '', constitutionDesc: '', daoFateDesc: '', nickname: '', spiritRootDesc: '' },
    contributionPoints: 0, assignedBuilding: null, managingBuilding: null,
    joinDate: { year: 1, month: 1 }, breakthroughAttempts: 0, breakthroughBonus: 0,
    isBreakingThrough: false, isAttendingLecture: false, isLecturing: false, isLearningSecret: false,
    learnedSecrets: [], learnedTechnique: null, learnedBattles: [], learningBook: null,
    buffs: [], avatarSeed: 1, constitutionId: 'normal',
    satisfaction: 100, maxSatisfactionLossWork: 0, maxSatisfactionLossResidence: 0,
    attack: 10, defense: 10, dodge: 5, crit: 5, maxHp: 100,
    master: null, friends: [], tournamentHistory: [],
    ...overrides,
  } as Disciple;
}

describe('calculateDiscipleCombatPower — 装备加成', () => {
  it('无装备时为基础战力', () => {
    const d = makeDisciple();
    const base = calculateDiscipleCombatPower(d);
    expect(base).toBeGreaterThan(0);
  });

  it('装备法器后战力提升（combatPowerBonus）', () => {
    const base = calculateDiscipleCombatPower(makeDisciple());
    const equipped = calculateDiscipleCombatPower(makeDisciple({ equippedArtifact: 'flying_sword' }));
    expect(equipped).toBeGreaterThan(base);
  });

  it('装备灵兽后战力提升（combatPowerBonus）', () => {
    const base = calculateDiscipleCombatPower(makeDisciple());
    const equipped = calculateDiscipleCombatPower(makeDisciple({ equippedBeast: 'golden_roc' }));
    expect(equipped).toBeGreaterThan(base);
  });

  it('三槽全装备战力最高', () => {
    const none = calculateDiscipleCombatPower(makeDisciple());
    const all = calculateDiscipleCombatPower(makeDisciple({
      equippedArtifact: 'flying_sword',
      equippedTalisman: 'fire_talisman',
      equippedBeast: 'golden_roc',
    }));
    expect(all).toBeGreaterThan(none);
  });
});

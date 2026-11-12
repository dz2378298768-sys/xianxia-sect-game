import { describe, it, expect } from 'vitest';
import {
  getDiscipleSpecialty, specialtyMatchesBuilding, SPECIALTY_BUILDINGS, SpecialtyNames,
} from './specialty';
import { computeBuildingOutput, computeMonthlyContribution } from './balance';
import {
  autoAssignBuilding, autoAssignManagers, calculateDiscipleCombatPower,
  calculateDiscipleCombatPowerBreakdown,
} from '@/utils/gameLogic';
import type { Disciple } from '@/types/disciple';
import type { Building } from '@/types/building';

// 同一套天赋：背景为炼器世家时专精为器道，凡人出身时专精为斗法
const TALENTS = { rootBone: 60, spiritRhythm: 40, constitution: 50, daoFate: 45, spiritRoots: [] };

function makeDisciple(overrides: Record<string, any> = {}): Disciple {
  return {
    id: 'd1',
    name: '甲',
    status: 'outer',
    realm: 'qi',
    realmStage: 'early',
    realmProgress: 0,
    age: 30,
    maxAge: 100,
    hiddenTalents: { ...TALENTS },
    talentDisplay: {},
    cultivationSpeed: 100,
    satisfaction: 80,
    combatExperience: 0,
    contributionPoints: 200,
    personality: 'peaceful',
    background: 'common_folk',
    assignedBuilding: null,
    master: null,
    daoPartner: null,
    apprenticeIds: [],
    friends: [],
    learnedSecrets: [],
    learnedBattles: [],
    learnedTechnique: null,
    equippedArtifact: null,
    equippedTalisman: null,
    equippedBeast: null,
    ...overrides,
  } as unknown as Disciple;
}

// 器道专精（炼器世家背景）
const forger = makeDisciple({ id: 'forge', name: '器修', background: 'artifact_artisan' });
// 与器修天赋完全一致，但无炼器背景 → 斗法专精
const fighter = makeDisciple({ id: 'fight', name: '斗修' });

function makeHall(type: string, overrides: Record<string, any> = {}): Building {
  return {
    id: `h-${type}`,
    type,
    name: SpecialtyNames.formation,
    level: 1,
    maxLevel: 10,
    status: 'active',
    discipleCapacity: 10,
    assignedDisciples: [],
    managerId: null,
    managerLocked: false,
    minDiscipleStatus: null,
    monthlyContributionCost: 0,
    ...overrides,
  } as unknown as Building;
}

describe('getDiscipleSpecialty — 专精推导', () => {
  it('同一弟子的专精推导结果确定且可复现', () => {
    expect(getDiscipleSpecialty(forger)).toBe('forging');
    expect(getDiscipleSpecialty(forger)).toBe(getDiscipleSpecialty(forger));
  });

  it('炼器世家背景使同一套天赋转为器道，凡人出身则为斗法', () => {
    expect(getDiscipleSpecialty(forger)).toBe('forging');
    expect(getDiscipleSpecialty(fighter)).toBe('combat');
  });

  it('专精与堂口映射正确', () => {
    expect(specialtyMatchesBuilding('forging', 'forge_hall')).toBe(true);
    // 符堂产出符箓，不属于器道，避免「器道弟子被加成到画符」
    expect(specialtyMatchesBuilding('forging', 'talisman_hall')).toBe(false);
    expect(specialtyMatchesBuilding('forging', 'pill_hall')).toBe(false);
    expect(specialtyMatchesBuilding('stewardship', 'servant_hall')).toBe(true);
    expect(specialtyMatchesBuilding('stewardship', 'lecture_hall')).toBe(true);
    expect(SPECIALTY_BUILDINGS.combat).toEqual(['mountain_gate']);
  });
});

describe('专精对产出/贡献/任命/战力的影响', () => {
  it('专精匹配的工人产出更高（同天赋对比）', () => {
    const hall = {
      id: 'a1',
      type: 'forge_hall',
      level: 1,
      status: 'active',
      capacity: 10,
      baseOutput: { artifacts: 10 },
    };
    const matched = computeBuildingOutput(hall, [forger]);
    const unmatched = computeBuildingOutput(hall, [fighter]);
    // 产量取整可能掩盖差距，直接比较总倍率
    expect(matched.breakdown.totalMultiplier).toBeGreaterThan(unmatched.breakdown.totalMultiplier);
  });

  it('专精匹配的堂口贡献额外 +3（同天赋对比）', () => {
    const matched = computeMonthlyContribution(forger, { type: 'forge_hall', status: 'active' });
    const unmatched = computeMonthlyContribution(fighter, { type: 'forge_hall', status: 'active' });
    expect(matched - unmatched).toBe(3);
  });

  it('专精匹配的堂主产出更高', () => {
    const worker = makeDisciple({ id: 'w', name: '工人', status: 'inner' });
    const matchedManager = makeDisciple({ id: 'm1', name: '器堂主', status: 'core', realm: 'golden', background: 'artifact_artisan' });
    const unmatchedManager = makeDisciple({ id: 'm2', name: '斗堂主', status: 'core', realm: 'golden' });
    const building = (managerId: string) => ({
      id: 'a1', type: 'forge_hall', level: 1, status: 'active', capacity: 10,
      managerId, baseOutput: { artifacts: 10 },
    });
    const withMatched = computeBuildingOutput(building('m1'), [worker, matchedManager]);
    const withUnmatched = computeBuildingOutput(building('m2'), [worker, unmatchedManager]);
    expect(withMatched.breakdown.totalMultiplier).toBeGreaterThan(withUnmatched.breakdown.totalMultiplier);
  });

  it('斗法专精战力 ×1.08，明细同步', () => {
    expect(calculateDiscipleCombatPower(fighter)).toBeGreaterThan(calculateDiscipleCombatPower(forger));
    expect(calculateDiscipleCombatPowerBreakdown(fighter).specialtyMultiplier).toBe(1.08);
    expect(calculateDiscipleCombatPowerBreakdown(forger).specialtyMultiplier).toBe(1);
  });

  it('专精匹配的弟子优先被安排进对应堂口', () => {
    const artifactHall = makeHall('forge_hall');
    const pillHall = makeHall('pill_hall');
    const res = autoAssignBuilding(forger, [pillHall, artifactHall]);
    expect(res.buildingId).toBe(artifactHall.id);
  });

  it('专精匹配者优先担任堂主', () => {
    const matched = makeDisciple({ id: 'm1', name: '器修', status: 'core', realm: 'golden', background: 'artifact_artisan' });
    const unmatched = makeDisciple({ id: 'm2', name: '斗修', status: 'core', realm: 'golden' });
    const hall = makeHall('forge_hall', { assignedDisciples: ['m1', 'm2'] });

    const result = autoAssignManagers([matched, unmatched], [hall]);
    expect(result.buildings[0].managerId).toBe('m1');
  });
});

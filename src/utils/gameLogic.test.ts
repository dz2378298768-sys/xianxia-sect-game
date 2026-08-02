import { describe, it, expect } from 'vitest';
import { autoAssignBuilding, autoAssignManagers, autoLearnTechniqueOnBreakthrough } from './gameLogic';
import { BUILDING_CONFIGS } from '@/data/buildings';
import type { Building, BuildingType } from '@/types/building';
import type { BookConfig, BookTier, BookType } from '@/data/buildings';
import type { Disciple, HiddenTalents, DiscipleStatus, Realm } from '@/types/disciple';

// 构造测试弟子。默认 outer / 炼气 / 满意度100 / 贡献0
function makeDisciple(overrides: Record<string, any> = {}): Disciple {
  return {
    id: 'd1',
    name: '甲',
    status: 'outer',
    realm: 'qi',
    realmProgress: 0,
    avatarSeed: 1,
    age: 20,
    lifespan: 100,
    spiritRoots: [],
    hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50, constitution: 50, spiritRoots: [] },
    cultivationSpeed: 100,
    satisfaction: 100,
    contributionPoints: 0,
    breakthroughAttempts: 0,
    breakthroughBonus: 0,
    isBreakingThrough: false,
    learnedTechnique: null,
    learnedSecrets: [],
    buffs: [],
    constitutionId: 'normal_1',
    ...overrides,
  } as unknown as Disciple;
}

function talents(rootBone: number, spiritRhythm: number, daoFate: number): HiddenTalents {
  return { rootBone, spiritRhythm, daoFate, constitution: 50, spiritRoots: [] };
}

// 按 BUILDING_CONFIGS 构造一座活跃、空载、标准容量的建筑
function makeBuilding(type: BuildingType, overrides: Partial<Building> = {}): Building {
  const config = BUILDING_CONFIGS[type];
  return {
    id: `${type}-b`,
    type,
    name: config.name,
    level: 1,
    maxLevel: config.maxLevel,
    status: 'active',
    baseOutput: config.baseOutput,
    baseMaintenanceCost: config.baseMaintenanceCost,
    upgradeCosts: config.upgradeCosts,
    elderBonus: 0,
    discipleCapacity: config.discipleCapacity,
    assignedDisciples: [],
    managerId: null,
    description: config.description,
    category: config.category,
    primaryOutput: config.primaryOutput,
    minDiscipleStatus: config.minDiscipleStatus,
    monthlyContributionCost: config.monthlyContributionCost,
    ...overrides,
  } as Building;
}

// 五大生产堂（用户点名的炼器/丹/符/阵/灵兽园）+ 杂役堂
const PRODUCTION_HALLS: BuildingType[] = [
  'pill_hall', 'sutra_hall', 'artifact_hall', 'array_hall', 'spirit_beast_garden',
];

describe('autoAssignBuilding — 按天赋选最优生产建筑', () => {
  it('高灵韵外门弟子 → 丹堂（灵韵×1.5 最佳匹配），而非杂役堂', () => {
    const d = makeDisciple({ id: 'd-sp', hiddenTalents: talents(30, 80, 30) });
    const buildings = [
      makeBuilding('servant_hall'),
      makeBuilding('mountain_gate'),
      makeBuilding('pill_hall'),
    ];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('pill_hall-b');
  });

  it('高根骨外门弟子 → 炼器堂（根骨×0.6 加成）', () => {
    const d = makeDisciple({ id: 'd-rb', hiddenTalents: talents(80, 30, 30) });
    const buildings = [
      makeBuilding('servant_hall'),
      makeBuilding('sutra_hall'),
      makeBuilding('pill_hall'),
    ];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('sutra_hall-b');
  });

  it('高悟性外门弟子 → 灵兽园或符堂（悟性主导）', () => {
    const d = makeDisciple({ id: 'd-df', hiddenTalents: talents(30, 30, 80) });
    const buildings = [
      makeBuilding('servant_hall'),
      makeBuilding('mountain_gate'),
      makeBuilding('artifact_hall'),
      makeBuilding('spirit_beast_garden'),
    ];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(['artifact_hall-b', 'spirit_beast_garden-b']).toContain(buildingId);
  });
});

describe('autoAssignBuilding — 优先填生产堂，而非堆山门/杂役', () => {
  it('通用外门弟子(50/50/50) 有杂役堂+山门+丹堂时 → 丹堂（生产优先），不进杂役堂/山门', () => {
    const d = makeDisciple({ id: 'd-gen' });
    // 故意把杂役堂排在前面，验证不会被插入顺序带偏
    const buildings = [
      makeBuilding('servant_hall'),
      makeBuilding('mountain_gate'),
      makeBuilding('pill_hall'),
    ];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('pill_hall-b');
    expect(buildingId).not.toBe('servant_hall-b');
    expect(buildingId).not.toBe('mountain_gate-b');
  });

  it('山门(防御驻守)仅在无生产堂可用时才被选用', () => {
    const d = makeDisciple({ id: 'd-only-gate' });
    // 只有山门可用
    const buildings = [makeBuilding('mountain_gate')];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('mountain_gate-b');
  });
});

describe('autoAssignBuilding — 杂役弟子', () => {
  it('杂役弟子 → 杂役堂（生产），而非山门', () => {
    const d = makeDisciple({ id: 'd-sv', status: 'servant', hiddenTalents: talents(50, 50, 50) });
    const buildings = [makeBuilding('mountain_gate'), makeBuilding('servant_hall')];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('servant_hall-b');
  });

  it('杂役弟子不能进入需 outer 及以上的生产堂（minDiscipleStatus 生效）', () => {
    const d = makeDisciple({ id: 'd-sv2', status: 'servant', hiddenTalents: talents(50, 80, 50) });
    const buildings = [makeBuilding('pill_hall'), makeBuilding('servant_hall')];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('servant_hall-b');
  });
});

describe('autoAssignBuilding — 容量与状态', () => {
  it('最优建筑已满员 → 分配到次优可用建筑', () => {
    const d = makeDisciple({ id: 'd-full', hiddenTalents: talents(30, 80, 30) });
    const buildings = [
      makeBuilding('pill_hall', { assignedDisciples: Array.from({ length: 10 }, (_, i) => `occ-${i}`) }),
      makeBuilding('sutra_hall'),
    ];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('sutra_hall-b');
  });

  it('跳过非激活(关闭)建筑', () => {
    const d = makeDisciple({ id: 'd-closed', hiddenTalents: talents(30, 80, 30) });
    const buildings = [
      makeBuilding('pill_hall', { status: 'closed' }),
      makeBuilding('sutra_hall'),
    ];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('sutra_hall-b');
  });

  it('不分配到居所类建筑', () => {
    const d = makeDisciple({ id: 'd-res' });
    const buildings = [
      makeBuilding('outer_residence' as BuildingType),
      makeBuilding('pill_hall'),
    ];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('pill_hall-b');
  });

  it('不分配到藏经阁（学习场所，由 learnBook 主动学习）', () => {
    const d = makeDisciple({ id: 'd-lib' });
    const buildings = [
      makeBuilding('secret_library'),
      makeBuilding('pill_hall'),
    ];
    const { buildingId } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBe('pill_hall-b');
  });

  it('无可用建筑时返回 null', () => {
    const d = makeDisciple({ id: 'd-none' });
    const buildings = [makeBuilding('pill_hall', { status: 'closed' })];
    const { buildingId, newBuildings } = autoAssignBuilding(d, buildings);
    expect(buildingId).toBeNull();
    expect(newBuildings).toBe(buildings);
  });
});

describe('autoAssignBuilding — 在生产堂间分散（不堆在同一座）', () => {
  it('6 名通用外门弟子 + 3 座生产堂(丹/炼器/符，各容10) → 至少填入 2 座堂，而非全堆一座', () => {
    // 旧实现：6 人天赋相同，全部堆进得分最高的炼器堂(6<10 未满)，违背"分散"预期。
    // 新实现：引入空缺系数后，应分散到多座生产堂。
    const halls: Building[] = [
      makeBuilding('pill_hall'),
      makeBuilding('sutra_hall'),
      makeBuilding('artifact_hall'),
    ];
    let currentBuildings = halls;
    for (let i = 0; i < 6; i++) {
      const d = makeDisciple({ id: `d-spread-${i}`, hiddenTalents: talents(50, 50, 50) });
      const res = autoAssignBuilding(d, currentBuildings);
      if (res.buildingId) currentBuildings = res.newBuildings;
    }
    const used = currentBuildings.filter(b => b.assignedDisciples.length > 0);
    expect(used.length).toBeGreaterThanOrEqual(2);
    // 全部 6 人都应被分配
    const totalAssigned = currentBuildings.reduce((s, b) => s + b.assignedDisciples.length, 0);
    expect(totalAssigned).toBe(6);
  });

  it('40 名通用外门弟子 + 五大生产堂(各容10) → 五堂全被使用，无一人落空', () => {
    // 复刻用户场景：40 弟子应分散进五大生产堂(总容50)，而非堆在山门/杂役。
    const halls: Building[] = PRODUCTION_HALLS.map(t => makeBuilding(t));
    let currentBuildings = halls;
    for (let i = 0; i < 40; i++) {
      const d = makeDisciple({ id: `d40-${i}`, hiddenTalents: talents(50, 50, 50) });
      const res = autoAssignBuilding(d, currentBuildings);
      if (res.buildingId) currentBuildings = res.newBuildings;
    }
    const used = currentBuildings.filter(b => b.assignedDisciples.length > 0);
    expect(used.length).toBe(5);
    const totalAssigned = currentBuildings.reduce((s, b) => s + b.assignedDisciples.length, 0);
    expect(totalAssigned).toBe(40);
  });
});

describe('autoAssignManagers — 每月自动任命堂主', () => {
  // 任命优先级：身份(elder>core>inner>outer>servant) > 境界 > 贡献点
  // 堂主任命规则：必须金丹期（golden）及以上
  it('堂内身份最高的弟子成为堂主（core 高于 inner/outer）', () => {
    const outerD = makeDisciple({ id: 'outer-1', status: 'outer', realm: 'golden' });
    const innerD = makeDisciple({ id: 'inner-1', status: 'inner', realm: 'golden' });
    const coreD = makeDisciple({ id: 'core-1', status: 'core', realm: 'golden' });
    const b = makeBuilding('pill_hall', { assignedDisciples: ['outer-1', 'inner-1', 'core-1'] });
    const { buildings, disciples } = autoAssignManagers([outerD, innerD, coreD], [b]);
    expect(buildings[0].managerId).toBe('core-1');
    // 被任命弟子的 managingBuilding 指向该堂
    expect(disciples.find(d => d.id === 'core-1')!.managingBuilding).toBe(b.id);
  });

  it('身份相同则境界更高者任堂主（元婴高于金丹）', () => {
    const qiD = makeDisciple({ id: 'qi-1', status: 'inner', realm: 'golden' });
    const foundD = makeDisciple({ id: 'found-1', status: 'inner', realm: 'nascent' });
    const b = makeBuilding('sutra_hall', { assignedDisciples: ['qi-1', 'found-1'] });
    const { buildings } = autoAssignManagers([qiD, foundD], [b]);
    expect(buildings[0].managerId).toBe('found-1');
  });

  it('身份与境界均同则贡献点更高者任堂主', () => {
    const low = makeDisciple({ id: 'low-c', status: 'outer', realm: 'golden', contributionPoints: 10 });
    const high = makeDisciple({ id: 'high-c', status: 'outer', realm: 'golden', contributionPoints: 200 });
    const b = makeBuilding('artifact_hall', { assignedDisciples: ['low-c', 'high-c'] });
    const { buildings } = autoAssignManagers([low, high], [b]);
    expect(buildings[0].managerId).toBe('high-c');
  });

  it('金丹期以下弟子不得任堂主（筑基期堂内无人可任）', () => {
    const foundationD = makeDisciple({ id: 'found-1', status: 'core', realm: 'foundation' });
    const qiD = makeDisciple({ id: 'qi-1', status: 'inner', realm: 'qi' });
    const b = makeBuilding('pill_hall', { assignedDisciples: ['found-1', 'qi-1'] });
    const { buildings } = autoAssignManagers([foundationD, qiD], [b]);
    expect(buildings[0].managerId).toBeNull();
  });

  it('金丹期为堂主任命的最低境界', () => {
    const goldenD = makeDisciple({ id: 'golden-1', status: 'outer', realm: 'golden' });
    const b = makeBuilding('pill_hall', { assignedDisciples: ['golden-1'] });
    const { buildings } = autoAssignManagers([goldenD], [b]);
    expect(buildings[0].managerId).toBe('golden-1');
  });

  it('空堂(无分配弟子)无堂主', () => {
    const b = makeBuilding('pill_hall', { assignedDisciples: [], managerId: 'stale' });
    const { buildings } = autoAssignManagers([], [b]);
    expect(buildings[0].managerId).toBeNull();
  });

  it('每月重算：新加入的高身份弟子顶替原堂主', () => {
    const outerD = makeDisciple({ id: 'outer-mgr', status: 'outer', realm: 'golden', managingBuilding: 'pill_hall-b' });
    const b = makeBuilding('pill_hall', { assignedDisciples: ['outer-mgr'], managerId: 'outer-mgr' });
    // 第一个月：outer 任堂主
    let res = autoAssignManagers([outerD], [b]);
    expect(res.buildings[0].managerId).toBe('outer-mgr');
    // 第二个月：一名 inner 加入该堂
    const innerD = makeDisciple({ id: 'inner-new', status: 'inner', realm: 'golden' });
    const b2 = { ...res.buildings[0], assignedDisciples: ['outer-mgr', 'inner-new'] };
    res = autoAssignManagers(
      [...res.disciples, innerD],
      [b2],
    );
    expect(res.buildings[0].managerId).toBe('inner-new');
    // 原 outer 不再管理该堂
    expect(res.disciples.find(d => d.id === 'outer-mgr')!.managingBuilding).toBeNull();
  });

  it('一名弟子只能管理一座堂（不会同时管理多座）', () => {
    const coreD = makeDisciple({ id: 'core-only', status: 'core', realm: 'golden' });
    // core-only 同时被分到两座堂（异常场景，验证防呆）
    const b1 = makeBuilding('pill_hall', { assignedDisciples: ['core-only'] });
    const b2 = makeBuilding('sutra_hall', { assignedDisciples: ['core-only'] });
    const { buildings, disciples } = autoAssignManagers([coreD], [b1, b2]);
    const managed = buildings.filter(b => b.managerId === 'core-only');
    expect(managed.length).toBe(1);
    expect(disciples.find(d => d.id === 'core-only')!.managingBuilding).toBe(managed[0].id);
  });

  it('居所类建筑不任命堂主', () => {
    const innerD = makeDisciple({ id: 'inner-res', status: 'inner', realm: 'golden' });
    const res = makeBuilding('inner_residence' as BuildingType, { assignedDisciples: ['inner-res'] });
    const { buildings } = autoAssignManagers([innerD], [res]);
    expect(buildings[0].managerId).toBeNull();
  });

  it('藏经阁不任命堂主（学习场所）', () => {
    const innerD = makeDisciple({ id: 'inner-lib', status: 'inner', realm: 'golden' });
    const lib = makeBuilding('secret_library', { assignedDisciples: ['inner-lib'] });
    const { buildings } = autoAssignManagers([innerD], [lib]);
    expect(buildings[0].managerId).toBeNull();
  });

  it('清除失效堂主：managerId 指向已不在堂内的弟子时清空', () => {
    const b = makeBuilding('pill_hall', { assignedDisciples: ['real-1'], managerId: 'gone-1' });
    const realD = makeDisciple({ id: 'real-1', status: 'outer', realm: 'golden' });
    const { buildings } = autoAssignManagers([realD], [b]);
    expect(buildings[0].managerId).toBe('real-1');
  });
});

// 构造一本藏经阁书籍
function makeBook(overrides: Partial<BookConfig> & { tier: BookTier; type: BookType }): BookConfig {
  return {
    id: 'book-1',
    name: '书',
    description: '',
    attribute: 'universal',
    cultivationBonus: 10,
    combatBonus: 0,
    quality: 50,
    learnDays: 3,
    ...overrides,
  };
}

// 已学功法（LearningBook 结构）
function learnedTechnique(overrides: Record<string, any> = {}) {
  return {
    bookId: 'old-tech',
    name: '旧功法',
    type: 'technique' as const,
    tier: 'qi' as BookTier,
    cultivationBonus: 10,
    combatBonus: 0,
    progress: 100,
    totalDays: 3,
    isLearned: true,
    ...overrides,
  };
}

describe('autoLearnTechniqueOnBreakthrough — 突破后自动学更优功法（可替换）', () => {
  it('突破到筑基且无功法 → 自动开始学习筑基层功法', () => {
    const d = makeDisciple({ id: 'd-brk', realm: 'foundation', learnedTechnique: null, learningBook: null });
    const books = [makeBook({ id: 'b-found', tier: 'foundation', type: 'technique', name: '凝元功', cultivationBonus: 20 })];
    const result = autoLearnTechniqueOnBreakthrough(d, books);
    expect(result.learningBook).not.toBeNull();
    expect(result.learningBook!.bookId).toBe('b-found');
    expect(result.learningBook!.tier).toBe('foundation');
    expect(result.isLearningSecret).toBe(true);
  });

  it('已有炼气功法，突破到筑基 → 替换为更优的筑基功法（开始学习，旧功法暂留至学成）', () => {
    const d = makeDisciple({
      id: 'd-replace',
      realm: 'foundation',
      learnedTechnique: learnedTechnique({ cultivationBonus: 10, tier: 'qi' }),
      learningBook: null,
    });
    const books = [makeBook({ id: 'b-found', tier: 'foundation', type: 'technique', name: '凝元功', cultivationBonus: 20 })];
    const result = autoLearnTechniqueOnBreakthrough(d, books);
    expect(result.learningBook).not.toBeNull();
    expect(result.learningBook!.bookId).toBe('b-found');
    // 旧功法暂保留（学成时由 processMonthlyLearning 替换）
    expect(result.learnedTechnique).not.toBeNull();
    expect(result.learnedTechnique!.cultivationBonus).toBe(10);
  });

  it('当前功法不弱于候选 → 不替换（不开始学习）', () => {
    const d = makeDisciple({
      id: 'd-keep',
      realm: 'foundation',
      learnedTechnique: learnedTechnique({ cultivationBonus: 25, tier: 'foundation' }),
      learningBook: null,
    });
    const books = [makeBook({ id: 'b-found', tier: 'foundation', type: 'technique', cultivationBonus: 20 })];
    const result = autoLearnTechniqueOnBreakthrough(d, books);
    expect(result.learningBook).toBeNull();
  });

  it('多本同层功法 → 选 cultivationBonus 最高的', () => {
    const d = makeDisciple({ id: 'd-best', realm: 'foundation', learnedTechnique: null, learningBook: null });
    const books = [
      makeBook({ id: 'b1', tier: 'foundation', type: 'technique', cultivationBonus: 20 }),
      makeBook({ id: 'b2', tier: 'foundation', type: 'technique', cultivationBonus: 28 }),
      makeBook({ id: 'b3', tier: 'foundation', type: 'technique', cultivationBonus: 24 }),
    ];
    const result = autoLearnTechniqueOnBreakthrough(d, books);
    expect(result.learningBook!.bookId).toBe('b2');
  });

  it('灵根限制：只能学灵根匹配或通用的功法', () => {
    const d = makeDisciple({
      id: 'd-root',
      realm: 'foundation',
      learnedTechnique: null,
      learningBook: null,
      hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50, constitution: 50, spiritRoots: [{ type: 'fire', quality: 60 }] },
    });
    const books = [
      makeBook({ id: 'b-water', tier: 'foundation', type: 'technique', attribute: 'water', cultivationBonus: 30 }),
      makeBook({ id: 'b-fire', tier: 'foundation', type: 'technique', attribute: 'fire', cultivationBonus: 26 }),
      makeBook({ id: 'b-uni', tier: 'foundation', type: 'technique', attribute: 'universal', cultivationBonus: 20 }),
    ];
    const result = autoLearnTechniqueOnBreakthrough(d, books);
    // 水属性不可学(无水灵根)；火属性可学；通用可学。火>通用 → 选火
    expect(result.learningBook!.bookId).toBe('b-fire');
  });

  it('已在学习中 → 不打断当前学习', () => {
    const d = makeDisciple({
      id: 'd-busy',
      realm: 'foundation',
      learningBook: { bookId: 'ongoing', name: '学习中', type: 'technique', tier: 'foundation', cultivationBonus: 20, combatBonus: 0, progress: 40, totalDays: 3, isLearned: false },
    });
    const books = [makeBook({ id: 'b-found', tier: 'foundation', type: 'technique', cultivationBonus: 20 })];
    const result = autoLearnTechniqueOnBreakthrough(d, books);
    expect(result.learningBook!.bookId).toBe('ongoing');
    expect(result.learningBook!.progress).toBe(40);
  });

  it('藏经阁无对应层级功法 → 不变', () => {
    const d = makeDisciple({ id: 'd-none', realm: 'foundation', learnedTechnique: null, learningBook: null });
    const books = [makeBook({ id: 'b-qi', tier: 'qi', type: 'technique', cultivationBonus: 10 })];
    const result = autoLearnTechniqueOnBreakthrough(d, books);
    expect(result.learningBook).toBeNull();
  });

  it('凡人/化神无对应层级 → 不变', () => {
    const mortal = makeDisciple({ id: 'd-m', realm: 'mortal', learnedTechnique: null, learningBook: null });
    expect(autoLearnTechniqueOnBreakthrough(mortal, []).learningBook).toBeNull();
    const spirit = makeDisciple({ id: 'd-s', realm: 'spirit', learnedTechnique: null, learningBook: null });
    expect(autoLearnTechniqueOnBreakthrough(spirit, []).learningBook).toBeNull();
  });

  it('只选 type=technique（功法），不选战技', () => {
    const d = makeDisciple({ id: 'd-tech-only', realm: 'foundation', learnedTechnique: null, learningBook: null });
    const books = [
      makeBook({ id: 'b-battle', tier: 'foundation', type: 'battle', cultivationBonus: 99 }),
      makeBook({ id: 'b-tech', tier: 'foundation', type: 'technique', cultivationBonus: 20 }),
    ];
    const result = autoLearnTechniqueOnBreakthrough(d, books);
    expect(result.learningBook!.bookId).toBe('b-tech');
  });
});

import { describe, it, expect } from 'vitest';
import { computeBuildingOutput, computeMaintenance, recomputeCultivationSpeed, applySatisfactionPenalty, recomputeLifespan, computeMonthlyContribution } from './balance';
import { getRealmBreakthroughRequired } from '@/utils/gameLogic';
import type { Disciple, Realm } from '@/types/disciple';

// 构造测试弟子的工厂：默认灵韵 50（中等天赋）
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

// 切换境界（仅改 realm 字段，模拟突破后状态）
function atRealm(d: Disciple, realm: Realm): Disciple {
  return { ...d, realm };
}

// 构造完整 HiddenTalents（含必需的 constitution / spiritRoots 字段）
function talents(rootBone: number, spiritRhythm: number, daoFate: number) {
  return { rootBone, spiritRhythm, daoFate, constitution: 50, spiritRoots: [] };
}

// 构造建筑输入
function buildingInput(overrides: Record<string, any> = {}) {
  return {
    id: 'b1',
    type: 'servant_hall',
    level: 1,
    status: 'active',
    capacity: 10,
    managerId: null,
    baseOutput: { spiritStones: 60, herbs: 12 },
    ...overrides,
  };
}

describe('computeBuildingOutput — 升级不变量', () => {
  it('升级建筑（工人不变）时灵石产出不应下降', () => {
    const workers = Array.from({ length: 10 }, (_, i) =>
      makeDisciple({ id: `w${i}`, hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50 } })
    );

    const lv1 = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), workers);
    const lv2 = computeBuildingOutput(buildingInput({ level: 2, capacity: 20 }), workers);

    // 核心不变量：升级后产出 >= 升级前
    expect(lv2.spiritStones).toBeGreaterThanOrEqual(lv1.spiritStones);
  });

  it('升级应带来明显的产出增长（L1→L2 至少 +40%）', () => {
    const workers = Array.from({ length: 10 }, (_, i) =>
      makeDisciple({ id: `w${i}`, hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50 } })
    );
    const lv1 = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), workers);
    const lv2 = computeBuildingOutput(buildingInput({ level: 2, capacity: 20 }), workers);
    expect(lv2.spiritStones).toBeGreaterThan(lv1.spiritStones * 1.4);
  });
});

describe('computeBuildingOutput — 产能与人数', () => {
  it('空建筑不产出（无幽灵产出）', () => {
    const out = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), []);
    expect(out.spiritStones).toBe(0);
    expect(out.herbs).toBe(0);
  });

  it('在容量内，工人越多产出越多', () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) =>
      makeDisciple({ id: `w${i}`, hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50 } })
    );
    const few = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), mk(3));
    const many = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), mk(10));
    expect(many.spiritStones).toBeGreaterThan(few.spiritStones);
  });

  it('超出容量的工人不再增加产出（封顶）', () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) =>
      makeDisciple({ id: `w${i}`, hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50 } })
    );
    const full = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), mk(10));
    const overflow = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), mk(20));
    expect(overflow.spiritStones).toBe(full.spiritStones);
  });

  it('扩容后能容纳更多工人，产出随之提升', () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) =>
      makeDisciple({ id: `w${i}`, hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50 } })
    );
    // L2 容量 20，放 20 人应多于放 10 人
    const ten = computeBuildingOutput(buildingInput({ level: 2, capacity: 20 }), mk(10));
    const twenty = computeBuildingOutput(buildingInput({ level: 2, capacity: 20 }), mk(20));
    expect(twenty.spiritStones).toBeGreaterThan(ten.spiritStones);
  });
});

describe('computeBuildingOutput — 管理者与天赋', () => {
  it('长老管理者提供 +80% 加成', () => {
    const workers = Array.from({ length: 5 }, (_, i) =>
      makeDisciple({ id: `w${i}`, hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50 } })
    );
    const elder = makeDisciple({ id: 'mgr', status: 'elder' });
    const noMgr = computeBuildingOutput(buildingInput({ level: 1, capacity: 10, managerId: null }), workers);
    const withMgr = computeBuildingOutput(
      buildingInput({ level: 1, capacity: 10, managerId: 'mgr' }),
      [...workers, elder],
    );
    // 1.8 倍；floor 后允许 1 误差
    expect(withMgr.spiritStones).toBeGreaterThanOrEqual(Math.floor(noMgr.spiritStones * 1.8) - 1);
  });

  it('高天赋工人产出高于低天赋工人', () => {
    const low = Array.from({ length: 5 }, (_, i) =>
      makeDisciple({ id: `l${i}`, hiddenTalents: { rootBone: 20, spiritRhythm: 20, daoFate: 20 } })
    );
    const high = Array.from({ length: 5 }, (_, i) =>
      makeDisciple({ id: `h${i}`, hiddenTalents: { rootBone: 90, spiritRhythm: 90, daoFate: 90 } })
    );
    const lowOut = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), low);
    const highOut = computeBuildingOutput(buildingInput({ level: 1, capacity: 10 }), high);
    expect(highOut.spiritStones).toBeGreaterThan(lowOut.spiritStones);
  });
});

describe('computeBuildingOutput — 状态', () => {
  it('非激活建筑产出为 0', () => {
    const workers = Array.from({ length: 5 }, (_, i) =>
      makeDisciple({ id: `w${i}`, hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50 } })
    );
    const out = computeBuildingOutput(buildingInput({ level: 1, capacity: 10, status: 'inactive' }), workers);
    expect(out.spiritStones).toBe(0);
  });
});

describe('computeMaintenance — 单一来源，无双重计费', () => {
  it('杂役堂各级维护费恒为 10（表设计意图，非随等级线性增长）', () => {
    expect(computeMaintenance('servant_hall', 1)).toBe(10);
    expect(computeMaintenance('servant_hall', 2)).toBe(10);
    expect(computeMaintenance('servant_hall', 3)).toBe(10);
    expect(computeMaintenance('servant_hall', 4)).toBe(10);
  });

  it('山门维护费按表逐级递增：15 / 30 / 60', () => {
    expect(computeMaintenance('mountain_gate', 1)).toBe(15);
    expect(computeMaintenance('mountain_gate', 2)).toBe(30);
    expect(computeMaintenance('mountain_gate', 3)).toBe(60);
  });

  it('丹堂 L2 维护费为表值 55，而非 base×1.75 的双重计费值', () => {
    // 旧实现：baseMaintenanceCost 被覆写为 55 后再 ×1.75 = 96（错误）
    // 新实现：单一查表 = 55
    expect(computeMaintenance('pill_hall', 2)).toBe(55);
    expect(computeMaintenance('pill_hall', 2)).not.toBe(55 * 1.75);
  });

  it('超出表范围按末两级差值线性外推', () => {
    // secret_library 表 [30,60,120,200]，L5 = 200 + (200-120)*1 = 280
    expect(computeMaintenance('secret_library', 5)).toBe(280);
  });

  it('未知建筑类型维护费为 0', () => {
    expect(computeMaintenance('unknown_type', 1)).toBe(0);
  });
});

describe('recomputeCultivationSpeed — 突破后重算（修复 Bug A）', () => {
  it('突破到更高境界后修炼速度应提升', () => {
    const d = makeDisciple({ hiddenTalents: talents(50, 50, 50) });
    const qiSpeed = recomputeCultivationSpeed(atRealm(d, 'qi'));
    const foundationSpeed = recomputeCultivationSpeed(atRealm(d, 'foundation'));
    expect(foundationSpeed).toBeGreaterThan(qiSpeed);
  });

  it('筑基期根骨50、无灵根、凡人体质 → 修炼速度 = 105', () => {
    // 基础 150 × (0.4 + 0.5×0.6=0.7) = 105，无灵根/体质加成
    const d = makeDisciple({ hiddenTalents: talents(50, 50, 50) });
    expect(recomputeCultivationSpeed(atRealm(d, 'foundation'))).toBe(105);
  });

  it('根骨越高修炼速度越快', () => {
    const low = makeDisciple({ hiddenTalents: talents(30, 50, 50) });
    const high = makeDisciple({ hiddenTalents: talents(90, 50, 50) });
    expect(recomputeCultivationSpeed(atRealm(high, 'qi')))
      .toBeGreaterThan(recomputeCultivationSpeed(atRealm(low, 'qi')));
  });
});

describe('recomputeCultivationSpeed — 凡人可修炼（修复 Bug L 死循环）', () => {
  it('凡人修炼速度应 > 0，使其能累积进度突破到炼气', () => {
    const mortal = makeDisciple({ hiddenTalents: talents(50, 50, 50) });
    expect(recomputeCultivationSpeed(atRealm(mortal, 'mortal'))).toBeGreaterThan(0);
  });
});

describe('applySatisfactionPenalty — 满意度惩罚下限（修复 Bug B 负值）', () => {
  it('满满意度无惩罚', () => {
    expect(applySatisfactionPenalty(100, 100)).toBe(100);
  });

  it('中等满意度按 -2%/点 扣减', () => {
    // satisfaction 80 → 惩罚 (100-80)×0.02 = 0.4 → 速度 ×0.6 = 60
    expect(applySatisfactionPenalty(100, 80)).toBe(60);
  });

  it('低满意度不低于 20% 下限，绝不出现负值', () => {
    // satisfaction 40 → 旧公式 1 - 60×0.02 = -0.2（负值）；新实现下限 0.2 → 20
    expect(applySatisfactionPenalty(100, 40)).toBe(20);
    expect(applySatisfactionPenalty(100, 0)).toBe(20);
    expect(applySatisfactionPenalty(100, 40)).toBeGreaterThanOrEqual(0);
  });
});

describe('突破所需修为 — 拉大境界差距，抑制 3 年到金丹', () => {
  // 设计目标：根骨50、无灵根、凡人体质弟子（速度 mortal≈21 / qi≈70 / foundation≈105 / golden≈175）
  // 新表下：mortal→qi(出场即满) + qi→foundation(1200/70≈17月) + foundation→golden(5000/105≈48月) ≈ 66月(5.5年)
  // 3年(36月)仅到筑基中期，不再出现金丹。
  it('炼气→筑基 需 1200（旧 500）', () => {
    expect(getRealmBreakthroughRequired('qi')).toBe(1200);
  });
  it('筑基→金丹 需 5000（旧 2000）', () => {
    expect(getRealmBreakthroughRequired('foundation')).toBe(5000);
  });
  it('金丹→元婴 需 18000（旧 8000）', () => {
    expect(getRealmBreakthroughRequired('golden')).toBe(18000);
  });
  it('元婴→化神 需 60000（旧 25000）', () => {
    expect(getRealmBreakthroughRequired('nascent')).toBe(60000);
  });
  it('凡人→炼气 保持 100', () => {
    expect(getRealmBreakthroughRequired('mortal')).toBe(100);
  });
});

describe('recomputeLifespan — 突破后寿命随境界重算', () => {
  it('境界提升后寿命应增加（炼气→筑基）', () => {
    const d = makeDisciple({ hiddenTalents: talents(50, 50, 50) });
    const qiLife = recomputeLifespan(atRealm(d, 'qi'));
    const foundationLife = recomputeLifespan(atRealm(d, 'foundation'));
    expect(foundationLife).toBeGreaterThan(qiLife);
  });

  it('金丹寿命远高于筑基（境界寿命表 260 vs 110）', () => {
    const d = makeDisciple({ hiddenTalents: talents(50, 50, 50) });
    const foundationLife = recomputeLifespan(atRealm(d, 'foundation'));
    const goldenLife = recomputeLifespan(atRealm(d, 'golden'));
    expect(goldenLife - foundationLife).toBeGreaterThanOrEqual(150);
  });

  it('体质越高寿命越长', () => {
    const low = makeDisciple({ hiddenTalents: { ...talents(50, 50, 50), constitution: 30 } });
    const high = makeDisciple({ hiddenTalents: { ...talents(50, 50, 50), constitution: 90 } });
    expect(recomputeLifespan(atRealm(high, 'qi'))).toBeGreaterThan(recomputeLifespan(atRealm(low, 'qi')));
  });
});

describe('computeMonthlyContribution — 所有生产建筑给正贡献，杜绝进入反扣', () => {
  // outer 弟子在任意生产堂口都应比闲逛(无建筑)赚得多，杜绝"进入反扣"。
  function workIn(type: string | null, overrides: Record<string, any> = {}) {
    return computeMonthlyContribution(
      makeDisciple({ status: 'outer', ...overrides }),
      type ? { type, status: 'active' } : null,
    );
  }

  it('无建筑（闲逛）的 outer 基础净贡献为 +10', () => {
    expect(workIn(null)).toBe(10);
  });

  it('outer 在丹堂/炼器堂/符堂/阵堂/灵兽园都比闲逛赚得多', () => {
    const idle = workIn(null);
    for (const type of ['pill_hall', 'sutra_hall', 'artifact_hall', 'array_hall', 'spirit_beast_garden']) {
      expect(workIn(type)).toBeGreaterThan(idle);
    }
  });

  it('outer 在丹堂的净贡献 = 基础10 + 丹堂加成 + 灵韵/20', () => {
    // 灵韵50 → floor(50/20)=2；丹堂加成 8 → 10+8+2 = 20
    expect(workIn('pill_hall', { hiddenTalents: talents(50, 50, 50) })).toBe(20);
  });

  it('杂役 servant 在杂役堂仍能赚贡献（用于晋升外门）', () => {
    // servant 基础净0 + 杂役堂(5 + 灵韵50/20=2) = 7
    const c = computeMonthlyContribution(
      makeDisciple({ status: 'servant', hiddenTalents: talents(50, 50, 50) }),
      { type: 'servant_hall', status: 'active' },
    );
    expect(c).toBe(7);
    expect(c).toBeGreaterThan(0);
  });

  it('非激活建筑不提供加成（仅基础净贡献）', () => {
    expect(workIn('pill_hall')).toBeGreaterThan(
      computeMonthlyContribution(
        makeDisciple({ status: 'outer', hiddenTalents: talents(50, 50, 50) }),
        { type: 'pill_hall', status: 'inactive' },
      ),
    );
  });
});




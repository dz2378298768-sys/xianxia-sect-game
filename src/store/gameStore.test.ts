import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { Building } from '@/types/building';

// 构造一座可升级的非居所建筑（丹堂 L1→L2）
function makePillHall(overrides: Partial<Building> = {}): Building {
  return {
    id: 'pill-1',
    type: 'pill_hall',
    name: '丹堂',
    level: 1,
    maxLevel: 3,
    status: 'active',
    baseOutput: { spiritStones: 5 },
    baseMaintenanceCost: 60,
    upgradeCosts: [
      { spiritStones: 600 },
      { spiritStones: 1500 },
    ],
    elderBonus: 0,
    discipleCapacity: 10,
    assignedDisciples: [],
    managerId: null,
    description: '',
    category: 'production',
    primaryOutput: 'pills',
    ...overrides,
  } as Building;
}

describe('upgradeBuilding / downgradeBuilding — 两类资源对称扣返', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useGameStore.setState({
      spiritStones: 10000,
      reputation: 1000,
      buildings: [makePillHall()],
    });
  });

  it('升级扣除灵石（按配置 spiritStones）', () => {
    const store = useGameStore.getState();
    const ok = store.upgradeBuilding('pill-1');
    expect(ok).toBe(true);
    const after = useGameStore.getState();
    // L1→L2 费用：spiritStones 600
    expect(after.spiritStones).toBe(10000 - 600);
    expect(after.buildings[0].level).toBe(2);
  });

  it('灵石不足时拒绝升级', () => {
    useGameStore.setState({ spiritStones: 100 }); // 不足 600
    const store = useGameStore.getState();
    const ok = store.upgradeBuilding('pill-1');
    expect(ok).toBe(false);
    const after = useGameStore.getState();
    expect(after.spiritStones).toBe(100); // 未扣
    expect(after.buildings[0].level).toBe(1);
  });

  it('降级返还升级时消耗的灵石', () => {
    // 先升到 L2
    useGameStore.getState().upgradeBuilding('pill-1');
    const before = useGameStore.getState();
    const result = before.downgradeBuilding('pill-1');
    expect(result.success).toBe(true);
    expect(result.refundSpiritStones).toBe(600);
    const after = useGameStore.getState();
    // 返还后应回到升级前的资源水平
    expect(after.spiritStones).toBe(10000);
    expect(after.buildings[0].level).toBe(1);
  });

  it('旧存档中“首次免费”的升级档位不再生效，扣费与返还按配置对称', () => {
    // 旧存档建筑自带 [{ spiritStones: 0 }]，升级应以配置价 600 收取
    useGameStore.setState({
      spiritStones: 10000,
      buildings: [makePillHall({ id: 'legacy-1', upgradeCosts: [{ spiritStones: 0 }] })],
    });
    expect(useGameStore.getState().upgradeBuilding('legacy-1')).toBe(true);
    expect(useGameStore.getState().spiritStones).toBe(10000 - 600);

    // 升级时同步了配置费用，降级返还与支出对称
    const r = useGameStore.getState().downgradeBuilding('legacy-1');
    expect(r.success).toBe(true);
    expect(r.refundSpiritStones).toBe(600);
    expect(useGameStore.getState().spiritStones).toBe(10000);
  });
});

describe('关闭建筑 — 在岗弟子不再视为有工作', () => {
  it('关闭杂役堂后，驻守弟子开始累计“无工作”满意度损失', () => {
    useGameStore.getState().newGame('关闭建筑测试宗');
    const hall = useGameStore.getState().buildings.find(b => b.type === 'servant_hall')!;
    expect(hall.assignedDisciples.length).toBeGreaterThan(0);
    const discipleId = hall.assignedDisciples[0];

    useGameStore.getState().toggleBuilding(hall.id);
    useGameStore.getState().nextMonth();

    const after = useGameStore.getState().disciples.find(d => d.id === discipleId)!;
    expect(after.maxSatisfactionLossWork).toBeGreaterThanOrEqual(1);
  });
});

describe('openReport — 未读去重', () => {
  beforeEach(() => {
    useGameStore.setState({
      activeEventId: null,
      reportView: null,
      unreadReports: { monthly: true, quarterly: true, annual: true },
    });
  });

  it('打开季报时清除月报未读，年报仍保留', () => {
    useGameStore.getState().openReport('quarterly');
    expect(useGameStore.getState().unreadReports).toEqual({
      monthly: false,
      quarterly: false,
      annual: true,
    });
  });

  it('打开年报时清除季报与月报未读', () => {
    useGameStore.getState().openReport('annual');
    expect(useGameStore.getState().unreadReports).toEqual({
      monthly: false,
      quarterly: false,
      annual: false,
    });
  });
});

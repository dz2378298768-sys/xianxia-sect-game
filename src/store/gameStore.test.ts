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
    baseOutput: { spiritStones: 25, pills: 1 },
    baseMaintenanceCost: 25,
    upgradeCosts: [
      { spiritStones: 400, contribution: 200 },
      { spiritStones: 1200, contribution: 600 },
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

describe('upgradeBuilding / downgradeBuilding — 三类资源对称扣返', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useGameStore.setState({
      spiritStones: 10000,
      reputation: 1000,
      sectContribution: 5000,
      buildings: [makePillHall()],
    });
  });

  it('升级扣除灵石 + 宗门贡献（按配置 contribution）', () => {
    const store = useGameStore.getState();
    const ok = store.upgradeBuilding('pill-1');
    expect(ok).toBe(true);
    const after = useGameStore.getState();
    // L1→L2 费用：spiritStones 400, contribution 200
    expect(after.spiritStones).toBe(10000 - 400);
    expect(after.sectContribution).toBe(5000 - 200);
    expect(after.buildings[0].level).toBe(2);
  });

  it('宗门贡献不足时拒绝升级', () => {
    useGameStore.setState({ sectContribution: 100 }); // 不足 200
    const store = useGameStore.getState();
    const ok = store.upgradeBuilding('pill-1');
    expect(ok).toBe(false);
    const after = useGameStore.getState();
    expect(after.spiritStones).toBe(10000); // 未扣
    expect(after.sectContribution).toBe(100);
    expect(after.buildings[0].level).toBe(1);
  });

  it('降级返还升级时消耗的灵石与贡献', () => {
    // 先升到 L2
    useGameStore.getState().upgradeBuilding('pill-1');
    const before = useGameStore.getState();
    const result = before.downgradeBuilding('pill-1');
    expect(result.success).toBe(true);
    expect(result.refundSpiritStones).toBe(400);
    const after = useGameStore.getState();
    // 返还后应回到升级前的资源水平
    expect(after.spiritStones).toBe(10000);
    expect(after.sectContribution).toBe(5000);
    expect(after.buildings[0].level).toBe(1);
  });

  it('声望类升级费用也被同步扣除与返还', () => {
    // 构造一个含 reputation 成本的建筑
    useGameStore.setState({
      spiritStones: 10000,
      reputation: 1000,
      sectContribution: 5000,
      buildings: [makePillHall({
        id: 'rep-1',
        upgradeCosts: [{ spiritStones: 500, reputation: 100 }],
      })],
    });
    const store = useGameStore.getState();
    expect(store.upgradeBuilding('rep-1')).toBe(true);
    const after = useGameStore.getState();
    expect(after.reputation).toBe(1000 - 100);
    // 降级返还
    const r = useGameStore.getState().downgradeBuilding('rep-1');
    expect(r.success).toBe(true);
    expect(useGameStore.getState().reputation).toBe(1000);
  });
});

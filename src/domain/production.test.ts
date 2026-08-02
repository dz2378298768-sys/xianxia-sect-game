import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { createInitialDisciple } from '@/utils/gameLogic';
import type { Building } from '@/types/building';

function makePillHall(target?: Building['productionTarget']): Building {
  return {
    id: 'pill-1',
    type: 'pill_hall',
    name: '丹堂',
    level: 1,
    maxLevel: 3,
    status: 'active',
    baseOutput: { spiritStones: 10 },
    baseMaintenanceCost: 25,
    upgradeCosts: [],
    elderBonus: 0,
    discipleCapacity: 10,
    assignedDisciples: ['d1', 'd2'],
    managerId: null,
    description: '',
    category: 'production',
    primaryOutput: 'pills',
    productionTarget: target,
  } as Building;
}

// 用 createInitialDisciple 构造完整弟子，仅覆盖测试所需字段，避免 nextMonth 因字段缺失崩溃
function makeDisciple(id: string, name: string, spiritRhythm: number) {
  const d = createInitialDisciple('outer', 'qi');
  d.id = id;
  d.name = name;
  d.hiddenTalents = { ...d.hiddenTalents, spiritRhythm };
  d.assignedBuilding = 'pill-1';
  return d;
}

describe('工作建筑生产逻辑 — 消耗材料按配方产出成品', () => {
  beforeEach(() => {
    useGameStore.setState({
      spiritStones: 10000,
      herbInventory: 100,
      ironInventory: 100,
      paperInventory: 100,
      pillInventory: [],
      artifactInventory: [],
      talismanInventory: [],
      unlockedPillRecipes: ['foundation_pill'],
      unlockedArtifactRecipes: [],
      unlockedTalismanRecipes: [],
      buildings: [makePillHall({ pillType: 'foundation_pill' })],
      disciples: [makeDisciple('d1', '甲', 80), makeDisciple('d2', '乙', 70)],
    });
  });

  it('丹堂消耗灵草产出丹药（按配方 materials）', () => {
    // foundation_pill materials: [{ name: '灵草', amount: 3 }]
    const before = useGameStore.getState();
    const herbsBefore = before.herbInventory;
    before.nextMonth();
    const after = useGameStore.getState();
    // 应产出 foundation_pill 至少 1 颗
    const inv = after.pillInventory.find(p => p.type === 'foundation_pill');
    expect(inv?.quantity).toBeGreaterThanOrEqual(1);
    // 灵草应被消耗
    expect(after.herbInventory).toBeLessThan(herbsBefore);
  });

  it('材料不足时不产出该成品（不扣材料不产成品）', () => {
    useGameStore.setState({ herbInventory: 1 }); // 不足 3
    const before = useGameStore.getState();
    before.nextMonth();
    const after = useGameStore.getState();
    const inv = after.pillInventory.find(p => p.type === 'foundation_pill');
    expect(inv?.quantity || 0).toBe(0);
    expect(after.herbInventory).toBe(1); // 未扣
  });

  it('配方未解锁时不产出', () => {
    useGameStore.setState({ unlockedPillRecipes: [] });
    useGameStore.getState().nextMonth();
    const after = useGameStore.getState();
    const inv = after.pillInventory.find(p => p.type === 'foundation_pill');
    expect(inv?.quantity || 0).toBe(0);
  });

  it('未设置生产目标时不产出成品', () => {
    useGameStore.setState({ buildings: [makePillHall(undefined)] });
    useGameStore.getState().nextMonth();
    const after = useGameStore.getState();
    expect(after.pillInventory).toHaveLength(0);
  });

  it('setProductionTarget 更新建筑生产目标', () => {
    useGameStore.setState({ buildings: [makePillHall(undefined)] });
    useGameStore.getState().setProductionTarget('pill-1', { pillType: 'recovery_pill' });
    const after = useGameStore.getState();
    expect(after.buildings[0].productionTarget?.pillType).toBe('recovery_pill');
  });
});

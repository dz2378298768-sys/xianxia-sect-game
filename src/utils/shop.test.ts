import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { SHOP_ITEMS } from '@/data/shop';

describe('buyShopItem — 商店购买逻辑', () => {
  beforeEach(() => {
    useGameStore.setState({
      spiritStones: 100000,
      pillInventory: [],
      artifactInventory: [],
      talismanInventory: [],
      beastInventory: [],
      unlockedPillRecipes: [],
      unlockedArtifactRecipes: [],
      unlockedTalismanRecipes: [],
    });
  });

  it('购买丹药成品：扣灵石，pillInventory +1', () => {
    const item = SHOP_ITEMS.find(i => i.id === 'pill:foundation_pill')!;
    const price = item.price;
    const store = useGameStore.getState();
    const r = store.buyShopItem(item.id);
    expect(r.success).toBe(true);
    const after = useGameStore.getState();
    expect(after.spiritStones).toBe(100000 - price);
    const inv = after.pillInventory.find(p => p.type === 'foundation_pill');
    expect(inv?.quantity).toBe(1);
  });

  it('购买丹方：扣灵石，unlockedPillRecipes 含该类型', () => {
    const item = SHOP_ITEMS.find(i => i.id === 'pill_recipe:golden_pill')!;
    const r = useGameStore.getState().buyShopItem(item.id);
    expect(r.success).toBe(true);
    const after = useGameStore.getState();
    expect(after.unlockedPillRecipes).toContain('golden_pill');
  });

  it('重复购买丹方：返回失败（已解锁）', () => {
    useGameStore.setState({ unlockedPillRecipes: ['golden_pill'] });
    const item = SHOP_ITEMS.find(i => i.id === 'pill_recipe:golden_pill')!;
    const r = useGameStore.getState().buyShopItem(item.id);
    expect(r.success).toBe(false);
    expect(r.reason).toContain('已解锁');
  });

  it('灵石不足：返回失败，不扣费不入库', () => {
    useGameStore.setState({ spiritStones: 10 });
    const item = SHOP_ITEMS.find(i => i.id === 'beast:golden_roc')!;
    const r = useGameStore.getState().buyShopItem(item.id);
    expect(r.success).toBe(false);
    expect(r.reason).toContain('灵石不足');
    expect(useGameStore.getState().beastInventory).toHaveLength(0);
  });

  it('购买灵兽：扣灵石，beastInventory +1', () => {
    const item = SHOP_ITEMS.find(i => i.id === 'beast:spirit_fox')!;
    const r = useGameStore.getState().buyShopItem(item.id);
    expect(r.success).toBe(true);
    const after = useGameStore.getState();
    const inv = after.beastInventory.find(b => b.type === 'spirit_fox');
    expect(inv?.quantity).toBe(1);
  });

  it('购买法器成品与图谱', () => {
    const a = SHOP_ITEMS.find(i => i.id === 'artifact:flying_sword')!;
    expect(useGameStore.getState().buyShopItem(a.id).success).toBe(true);
    expect(useGameStore.getState().artifactInventory.find(x => x.type === 'flying_sword')?.quantity).toBe(1);

    const ar = SHOP_ITEMS.find(i => i.id === 'artifact_recipe:spirit_bottle')!;
    expect(useGameStore.getState().buyShopItem(ar.id).success).toBe(true);
    expect(useGameStore.getState().unlockedArtifactRecipes).toContain('spirit_bottle');
  });
});

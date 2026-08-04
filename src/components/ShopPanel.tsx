import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { SHOP_CATEGORIES, getShopItemsByCategory } from '@/data/shop';
import type { ShopCategory, ShopItem } from '@/types/shop';
import { SectIcon } from '@/components/icons/SectIcons';
import { Button } from '@/components/ui/Button';

export const ShopPanel: React.FC = () => {
  const showShop = useUIStore(s => s.showShop);
  const setShopOpen = useUIStore(s => s.setShopOpen);
  const spiritStones = useGameStore(s => s.spiritStones);
  const pillInventory = useGameStore(s => s.pillInventory);
  const artifactInventory = useGameStore(s => s.artifactInventory);
  const talismanInventory = useGameStore(s => s.talismanInventory);
  const beastInventory = useGameStore(s => s.beastInventory);
  const specialMaterials = useGameStore(s => s.specialMaterials);
  const unlockedPillRecipes = useGameStore(s => s.unlockedPillRecipes);
  const unlockedArtifactRecipes = useGameStore(s => s.unlockedArtifactRecipes);
  const unlockedTalismanRecipes = useGameStore(s => s.unlockedTalismanRecipes);
  const buyShopItem = useGameStore(s => s.buyShopItem);
  const sellShopItem = useGameStore(s => s.sellShopItem);

  const [activeCategory, setActiveCategory] = useState<ShopCategory>('material');
  const [toast, setToast] = useState<string | null>(null);

  const items = useMemo(() => getShopItemsByCategory(activeCategory), [activeCategory]);

  if (!showShop) return null;

  // 取某成品类/原材料商品当前库存数量
  const getStock = (item: ShopItem): number => {
    if (item.pillType) return pillInventory.find(i => i.type === item.pillType)?.quantity ?? 0;
    if (item.artifactType) return artifactInventory.find(i => i.type === item.artifactType)?.quantity ?? 0;
    if (item.talismanType) return talismanInventory.find(i => i.type === item.talismanType)?.quantity ?? 0;
    if (item.beastType) return beastInventory.find(i => i.type === item.beastType)?.quantity ?? 0;
    if (item.materialName) return specialMaterials[item.materialName] ?? 0;
    return 0;
  };

  const isRecipeUnlocked = (cat: ShopCategory, recipeId: string): boolean => {
    if (cat === 'pill_recipe') return unlockedPillRecipes.includes(recipeId as any);
    if (cat === 'artifact_recipe') return unlockedArtifactRecipes.includes(recipeId as any);
    if (cat === 'talisman_recipe') return unlockedTalismanRecipes.includes(recipeId as any);
    return false;
  };

  const handleBuy = (itemId: string, name: string) => {
    const r = buyShopItem(itemId);
    if (r.success) {
      setToast(`已购入「${name}」`);
    } else {
      setToast(r.reason || '购买失败');
    }
    setTimeout(() => setToast(null), 1800);
  };

  const handleSell = (itemId: string, name: string) => {
    const r = sellShopItem(itemId);
    if (r.success) {
      setToast(`已售出「${name}」 +${r.gain} 灵石`);
    } else {
      setToast(r.reason || '出售失败');
    }
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[80] px-4" onClick={() => setShopOpen(false)}>
      <div
        className="max-w-2xl w-full max-h-[85vh] scroll-panel-dark p-4 slide-in-up flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--gold-400)]/20">
          <div className="flex items-center gap-2">
            <SectIcon name="cultivate" size={18} className="text-sect-gold" />
            <h3 className="font-display text-base text-[var(--gold-200)]">坊市交易</h3>
            <span className="text-[10px] text-[var(--ink-400)]">灵石 {Math.floor(spiritStones)}</span>
          </div>
          <button onClick={() => setShopOpen(false)} className="text-[var(--ink-400)] hover:text-[var(--gold-300)] p-1">
            <SectIcon name="close" size={16} strokeWidth={2} />
          </button>
        </div>

        {/* 分类标签 */}
        <div className="flex gap-1 flex-wrap mb-3">
          {SHOP_CATEGORIES.map(c => (
            <button
              key={c.key}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                activeCategory === c.key
                  ? 'bg-[var(--gold-300)]/20 text-[var(--gold-200)] border border-[var(--gold-300)]/50'
                  : 'bg-[rgba(13,17,23,0.5)] text-[var(--ink-300)] border border-transparent hover:border-[var(--gold-400)]/30'
              }`}
              onClick={() => setActiveCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 商品列表 */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {items.map(item => {
            const recipeId = item.recipePillType || item.recipeArtifactType || item.recipeTalismanType || '';
            const unlocked = isRecipeUnlocked(item.category, recipeId);
            const affordable = spiritStones >= item.price;
            const isRecipe = item.category.endsWith('_recipe');
            const isProduct = !isRecipe; // 成品类（含灵兽）支持出售
            const stock = isProduct ? getStock(item) : 0;
            const buyDisabled = !affordable || (isRecipe && unlocked);
            const sellDisabled = stock <= 0;
            const sellPrice = item.sellPrice ?? Math.floor(item.price * 0.5);

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-2 p-2 rounded border ${
                  unlocked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--gold-400)]/20 bg-[rgba(13,17,23,0.4)]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-xs text-[var(--gold-200)] truncate">{item.name}</span>
                    {isProduct && stock > 0 && (
                      <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-[var(--gold-300)]/15 text-[var(--gold-200)] border border-[var(--gold-300)]/30">
                        库存 {stock}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--ink-300)] line-clamp-1">{item.description}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`font-bold ${affordable ? 'text-sect-spirit' : 'text-red-400'}`}>
                      {item.price} 灵石
                    </span>
                    {isProduct && (
                      <span className="text-[9px] text-emerald-400/80">售 {sellPrice}</span>
                    )}
                  </div>
                  {unlocked && <span className="text-[9px] text-emerald-400">已解锁</span>}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={affordable ? 'gold' : 'ghost'}
                      disabled={buyDisabled}
                      className="text-[10px] py-0.5 px-2"
                      onClick={() => handleBuy(item.id, item.name)}
                    >
                      {unlocked ? '已购' : '购买'}
                    </Button>
                    {isProduct && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={sellDisabled}
                        className="text-[10px] py-0.5 px-2"
                        onClick={() => handleSell(item.id, item.name)}
                      >
                        出售
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 提示 toast */}
        {toast && (
          <div className="mt-2 text-center text-xs text-[var(--gold-200)] bg-[var(--gold-300)]/10 rounded py-1.5">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
};

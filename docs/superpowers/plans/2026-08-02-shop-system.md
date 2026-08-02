# 商店系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 TopBar 右上角新增商店入口，弹窗式商店分 7 类商品（丹方/丹药/图谱/法器/符谱/符箓/灵兽），用灵石购买；成品类直接入对应库存，配方类解锁工作建筑生产权限（供计划D消费）。

**Architecture:** 新建 `types/shop.ts` 定义 `ShopItem`/`ShopCategory`；新建 `data/shop.ts` 从既有 Pill/Artifact/Talisman/Beast 配置自动生成商店目录；`GameState` 新增三类 `unlockedRecipes` 数组与 `buyShopItem` action；`uiStore` 新增 `showShop` 开关；新建 `ShopPanel.tsx` 模态弹窗；TopBar 加商店图标按钮。

**前置依赖:** 计划 B（灵兽系统）已完成，提供 `BeastType`/`BEAST_CONFIGS`/`beastInventory`。

**Tech Stack:** TypeScript + Zustand + Vitest

---

## File Structure

- Create: `src/types/shop.ts` — 商店商品类型
- Create: `src/data/shop.ts` — 商店目录（从各配置生成）
- Create: `src/utils/shop.test.ts` — 购买逻辑测试
- Create: `src/components/ShopPanel.tsx` — 商店模态弹窗
- Modify: `src/store/gameStore.ts` — 新增 `unlockedPillRecipes`/`unlockedArtifactRecipes`/`unlockedTalismanRecipes` + `buyShopItem` action
- Modify: `src/store/uiStore.ts` — 新增 `showShop` + `toggleShop`
- Modify: `src/components/TopBar.tsx` — 加商店图标按钮

---

### Task 1: 定义商店商品类型

**Files:**
- Create: `src/types/shop.ts`

- [ ] **Step 1: 创建类型文件**

创建 `src/types/shop.ts`：

```typescript
import type { PillType } from '@/types/pill';
import type { ArtifactType } from '@/types/artifact';
import type { TalismanType } from '@/types/talisman';
import type { BeastType } from '@/types/beast';

// 商店商品七大类
export type ShopCategory =
  | 'pill_recipe'      // 丹方：解锁丹堂生产该丹药
  | 'pill'             // 丹药成品
  | 'artifact_recipe'  // 图谱：解锁炼器堂生产该法器
  | 'artifact'         // 法器成品
  | 'talisman_recipe'  // 符谱：解锁符堂生产该符箓
  | 'talisman'         // 符箓成品
  | 'beast';           // 灵兽

export interface ShopItem {
  id: string;                // 唯一标识，如 'pill:foundation_pill' / 'pill_recipe:golden_pill'
  category: ShopCategory;
  name: string;
  description: string;
  price: number;             // 灵石售价
  // 成品类：购买后增加对应库存
  pillType?: PillType;
  artifactType?: ArtifactType;
  talismanType?: TalismanType;
  beastType?: BeastType;
  // 配方类：购买后解锁对应生产配方
  recipePillType?: PillType;
  recipeArtifactType?: ArtifactType;
  recipeTalismanType?: TalismanType;
}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/types/shop.ts
git commit -m "feat(shop): 定义 ShopItem / ShopCategory 类型"
```

---

### Task 2: 生成商店目录数据

**Files:**
- Create: `src/data/shop.ts`

- [ ] **Step 1: 创建目录文件**

创建 `src/data/shop.ts`：

```typescript
import type { ShopItem, ShopCategory } from '@/types/shop';
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { BEAST_CONFIGS } from '@/data/beasts';

// 丹方：每类丹药的配方，售价 = 该丹药 sellPrice × 3（配方比成品贵）
function buildPillRecipes(): ShopItem[] {
  return Object.values(PILL_CONFIGS).map(p => ({
    id: `pill_recipe:${p.type}`,
    category: 'pill_recipe' as ShopCategory,
    name: `${p.name}丹方`,
    description: `解锁丹堂生产「${p.name}」的配方。${p.effect}`,
    price: Math.floor(p.sellPrice * 3),
    recipePillType: p.type,
  }));
}

// 丹药成品：售价 = sellPrice
function buildPills(): ShopItem[] {
  return Object.values(PILL_CONFIGS).map(p => ({
    id: `pill:${p.type}`,
    category: 'pill' as ShopCategory,
    name: p.name,
    description: p.effect,
    price: p.sellPrice,
    pillType: p.type,
  }));
}

function buildArtifactRecipes(): ShopItem[] {
  return Object.values(ARTIFACT_CONFIGS).map(a => ({
    id: `artifact_recipe:${a.type}`,
    category: 'artifact_recipe' as ShopCategory,
    name: `${a.name}图谱`,
    description: `解锁炼器堂锻造「${a.name}」的图谱。${a.effect}`,
    price: Math.floor(a.sellPrice * 3),
    recipeArtifactType: a.type,
  }));
}

function buildArtifacts(): ShopItem[] {
  return Object.values(ARTIFACT_CONFIGS).map(a => ({
    id: `artifact:${a.type}`,
    category: 'artifact' as ShopCategory,
    name: a.name,
    description: a.effect,
    price: a.sellPrice,
    artifactType: a.type,
  }));
}

function buildTalismanRecipes(): ShopItem[] {
  return Object.values(TALISMAN_CONFIGS).map(t => ({
    id: `talisman_recipe:${t.type}`,
    category: 'talisman_recipe' as ShopCategory,
    name: `${t.name}符谱`,
    description: `解锁符堂绘制「${t.name}」的符谱。${t.effect}`,
    price: Math.floor(t.sellPrice * 3),
    recipeTalismanType: t.type,
  }));
}

function buildTalismans(): ShopItem[] {
  return Object.values(TALISMAN_CONFIGS).map(t => ({
    id: `talisman:${t.type}`,
    category: 'talisman' as ShopCategory,
    name: t.name,
    description: t.effect,
    price: t.sellPrice,
    talismanType: t.type,
  }));
}

function buildBeasts(): ShopItem[] {
  return Object.values(BEAST_CONFIGS).map(b => ({
    id: `beast:${b.type}`,
    category: 'beast' as ShopCategory,
    name: b.name,
    description: b.description,
    price: b.sellPrice,
    beastType: b.type,
  }));
}

export const SHOP_ITEMS: ShopItem[] = [
  ...buildPillRecipes(),
  ...buildPills(),
  ...buildArtifactRecipes(),
  ...buildArtifacts(),
  ...buildTalismanRecipes(),
  ...buildTalismans(),
  ...buildBeasts(),
];

export const SHOP_CATEGORIES: { key: ShopCategory; label: string }[] = [
  { key: 'pill_recipe', label: '丹方' },
  { key: 'pill', label: '丹药' },
  { key: 'artifact_recipe', label: '图谱' },
  { key: 'artifact', label: '法器' },
  { key: 'talisman_recipe', label: '符谱' },
  { key: 'talisman', label: '符箓' },
  { key: 'beast', label: '灵兽' },
];

export function getShopItemsByCategory(category: ShopCategory): ShopItem[] {
  return SHOP_ITEMS.filter(i => i.category === category);
}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误（若 ARTIFACT_CONFIGS / TALISMAN_CONFIGS 导出名不同，按实际文件调整）

- [ ] **Step 3: 确认配置导出名**

Run: `grep -n "export const" src/data/artifacts.ts src/data/talismans.ts src/data/pills.ts`

若导出名不是 `ARTIFACT_CONFIGS`/`TALISMAN_CONFIGS`/`PILL_CONFIGS`，修正 import。

- [ ] **Step 4: Commit**

```bash
git add src/data/shop.ts
git commit -m "feat(shop): 从各配置生成商店目录 SHOP_ITEMS"
```

---

### Task 3: GameState 新增配方解锁字段

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: 添加 import**

在 `src/store/gameStore.ts` import 区追加：

```typescript
import type { PillType } from '@/types/pill';
import type { ArtifactType } from '@/types/artifact';
import type { TalismanType } from '@/types/talisman';
```

（若已有部分导入，合并即可）

- [ ] **Step 2: 接口新增字段**

在 `GameState` 接口（约第 59 行 `talismanInventory` 之后）追加：

```typescript
  unlockedPillRecipes: PillType[];        // 已解锁丹方（丹堂可生产）
  unlockedArtifactRecipes: ArtifactType[]; // 已解锁图谱（炼器堂可生产）
  unlockedTalismanRecipes: TalismanType[]; // 已解锁符谱（符堂可生产）
```

- [ ] **Step 3: 接口新增 buyShopItem action**

在 `GameState` 接口末尾（约第 115 行 `loadFromSlot` 之后）追加：

```typescript
  buyShopItem: (itemId: string) => { success: boolean; reason?: string };
```

- [ ] **Step 4: 初始值**

在 `createInitialState` 返回对象中追加（默认解锁所有 tier1/low 成品配方，使开局可生产基础品）：

```typescript
    unlockedPillRecipes: ['foundation_pill', 'recovery_pill'],
    unlockedArtifactRecipes: ['flying_sword', 'defensive_shield'],
    unlockedTalismanRecipes: ['fire_talisman', 'heal_talisman'],
```

注意：需与 `data/pills.ts` 等实际类型名一致。若不确定，先用空数组 `[]`，开局需玩家购买配方才能生产。

- [ ] **Step 5: migrate 补默认值**

在 `migrate` 函数中追加：

```typescript
            if (!state.unlockedPillRecipes) state.unlockedPillRecipes = [];
            if (!state.unlockedArtifactRecipes) state.unlockedArtifactRecipes = [];
            if (!state.unlockedTalismanRecipes) state.unlockedTalismanRecipes = [];
```

- [ ] **Step 6: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误（buyShopItem 尚未实现，接口声明已满足）

- [ ] **Step 7: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): 新增 unlockedRecipes 三类配方解锁字段"
```

---

### Task 4: 编写 buyShopItem 失败测试

**Files:**
- Create: `src/utils/shop.test.ts`

- [ ] **Step 1: 创建测试文件**

创建 `src/utils/shop.test.ts`：

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/utils/shop.test.ts`
Expected: FAIL — `buyShopItem is not a function`

- [ ] **Step 3: Commit（红测试）**

```bash
git add src/utils/shop.test.ts
git commit -m "test(shop): 新增 buyShopItem 失败测试"
```

---

### Task 5: 实现 buyShopItem action

**Files:**
- Modify: `src/store/gameStore.ts` (实现区)

- [ ] **Step 1: 添加 import**

在 `src/store/gameStore.ts` import 区追加：

```typescript
import { SHOP_ITEMS } from '@/data/shop';
import type { ShopItem } from '@/types/shop';
```

- [ ] **Step 2: 实现 buyShopItem**

在 `loadFromSlot` 实现之后（约第 1830 行附近）追加：

```typescript
      buyShopItem: (itemId: string): { success: boolean; reason?: string } => {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return { success: false, reason: '商品不存在' };

        const state = get();
        if (state.spiritStones < item.price) return { success: false, reason: '灵石不足' };

        // 配方类：检查是否已解锁
        if (item.category === 'pill_recipe') {
          if (item.recipePillType && state.unlockedPillRecipes.includes(item.recipePillType)) {
            return { success: false, reason: '该丹方已解锁' };
          }
        } else if (item.category === 'artifact_recipe') {
          if (item.recipeArtifactType && state.unlockedArtifactRecipes.includes(item.recipeArtifactType)) {
            return { success: false, reason: '该图谱已解锁' };
          }
        } else if (item.category === 'talisman_recipe') {
          if (item.recipeTalismanType && state.unlockedTalismanRecipes.includes(item.recipeTalismanType)) {
            return { success: false, reason: '该符谱已解锁' };
          }
        }

        set(state => {
          const patch: Partial<GameState> = {
            spiritStones: state.spiritStones - item.price,
          };

          // 成品类：增加库存
          if (item.pillType) {
            patch.pillInventory = addItem(state.pillInventory, item.pillType);
          } else if (item.artifactType) {
            patch.artifactInventory = addItem(state.artifactInventory, item.artifactType);
          } else if (item.talismanType) {
            patch.talismanInventory = addItem(state.talismanInventory, item.talismanType);
          } else if (item.beastType) {
            patch.beastInventory = addItem(state.beastInventory, item.beastType);
          }
          // 配方类：加入解锁列表
          else if (item.recipePillType) {
            patch.unlockedPillRecipes = [...state.unlockedPillRecipes, item.recipePillType];
          } else if (item.recipeArtifactType) {
            patch.unlockedArtifactRecipes = [...state.unlockedArtifactRecipes, item.recipeArtifactType];
          } else if (item.recipeTalismanType) {
            patch.unlockedTalismanRecipes = [...state.unlockedTalismanRecipes, item.recipeTalismanType];
          }

          return patch;
        });

        return { success: true };
      },
```

- [ ] **Step 3: 添加 addItem 辅助函数**

在 `createInitialState` 之前（约第 116 行）追加泛型辅助：

```typescript
// 库存累加辅助：找到同类型则 +1，否则新增条目
function addItem<T extends string>(inv: { type: T; quantity: number }[], type: T): { type: T; quantity: number }[] {
  const existing = inv.find(i => i.type === type);
  if (existing) {
    return inv.map(i => i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
  }
  return [...inv, { type, quantity: 1 }];
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/utils/shop.test.ts`
Expected: 全部 PASS（6 个测试）

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(shop): 实现 buyShopItem 购买逻辑"
```

---

### Task 6: uiStore 新增 showShop 开关

**Files:**
- Modify: `src/store/uiStore.ts`

- [ ] **Step 1: 接口新增字段**

在 `src/store/uiStore.ts` 第 20 行 `sectInfoTab: SectInfoTab;` 之后追加：

```typescript
  showShop: boolean;
```

- [ ] **Step 2: 接口新增 action**

在第 30 行 `setSectInfoTab: (tab: SectInfoTab) => void;` 之后追加：

```typescript
  toggleShop: () => void;
  setShopOpen: (open: boolean) => void;
```

- [ ] **Step 3: 初始值**

在第 41 行 `sectInfoTab: 'overview',` 之后追加：

```typescript
  showShop: false,
```

- [ ] **Step 4: 实现 action**

在第 51 行 `setSectInfoTab: (tab) => set({ sectInfoTab: tab }),` 之后追加：

```typescript
  toggleShop: () => set(state => ({ showShop: !state.showShop })),
  setShopOpen: (open) => set({ showShop: open }),
```

- [ ] **Step 5: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/store/uiStore.ts
git commit -m "feat(ui): uiStore 新增 showShop 开关"
```

---

### Task 7: 创建 ShopPanel 组件

**Files:**
- Create: `src/components/ShopPanel.tsx`

- [ ] **Step 1: 创建组件**

创建 `src/components/ShopPanel.tsx`：

```tsx
import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { SHOP_CATEGORIES, getShopItemsByCategory } from '@/data/shop';
import type { ShopCategory } from '@/types/shop';
import { SectIcon } from '@/components/icons/SectIcons';
import { Button } from '@/components/ui/Button';

export const ShopPanel: React.FC = () => {
  const { showShop, setShopOpen } = useUIStore();
  const { spiritStones, buyShopItem, unlockedPillRecipes, unlockedArtifactRecipes, unlockedTalismanRecipes } = useGameStore();
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('pill_recipe');
  const [toast, setToast] = useState<string | null>(null);

  const items = useMemo(() => getShopItemsByCategory(activeCategory), [activeCategory]);

  if (!showShop) return null;

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
            <h3 className="font-display text-base text-[var(--gold-200)]">坊市商店</h3>
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
            const disabled = !affordable || (isRecipe && unlocked);

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-2 p-2 rounded border ${
                  unlocked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--gold-400)]/20 bg-[rgba(13,17,23,0.4)]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-display text-xs text-[var(--gold-200)] truncate">{item.name}</div>
                  <div className="text-[10px] text-[var(--ink-300)] line-clamp-1">{item.description}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-bold ${affordable ? 'text-sect-spirit' : 'text-red-400'}`}>
                    {item.price} 灵石
                  </span>
                  {unlocked && <span className="text-[9px] text-emerald-400">已解锁</span>}
                  <Button
                    size="sm"
                    variant={affordable ? 'gold' : 'ghost'}
                    disabled={disabled}
                    className="text-[10px] py-0.5 px-2"
                    onClick={() => handleBuy(item.id, item.name)}
                  >
                    {unlocked ? '已购' : '购买'}
                  </Button>
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
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误（若 `Button` 的 `disabled` prop 或 `variant` 取值不同，按实际 ui/Button 调整）

- [ ] **Step 3: Commit**

```bash
git add src/components/ShopPanel.tsx
git commit -m "feat(ui): 新建 ShopPanel 商店模态弹窗"
```

---

### Task 8: TopBar 加商店入口 + Game.tsx 挂载 ShopPanel

**Files:**
- Modify: `src/components/TopBar.tsx`
- Modify: `src/pages/Game.tsx`

- [ ] **Step 1: TopBar 添加商店按钮**

在 `src/components/TopBar.tsx` 的菜单按钮（gear 图标）之前，插入商店按钮：

```tsx
          {/* 商店入口 */}
          <button
            className="resource-chip cursor-pointer hover:border-[var(--gold-300)]/50"
            onClick={() => useUIStore.getState().setShopOpen(true)}
            title="坊市商店"
          >
            <SectIcon name="cultivate" size={14} strokeWidth={2} />
          </button>
```

确保 `useUIStore` 已在该文件 import（若未导入，添加 `import { useUIStore } from '@/store/uiStore';`）。

- [ ] **Step 2: Game.tsx 挂载 ShopPanel**

在 `src/pages/Game.tsx` import 区追加：

```typescript
import { ShopPanel } from '@/components/ShopPanel';
```

在 Game.tsx 的 JSX 中（与其他模态弹窗同级，如存档弹窗附近）追加：

```tsx
      {/* 坊市商店 */}
      <ShopPanel />
```

- [ ] **Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.tsx src/pages/Game.tsx
git commit -m "feat(ui): TopBar 新增商店入口，Game 挂载 ShopPanel"
```

---

### Task 9: 全量测试与构建验证

- [ ] **Step 1: 运行全部单元测试**

Run: `npx vitest run`
Expected: 全部 PASS（含新增 6 个 shop 测试）

- [ ] **Step 2: TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 生产构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: 商店系统 - 构建验证通过"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 右上角增加商店：Task 8 TopBar 入口
- ✅ 可用灵石购买：Task 5 buyShopItem 扣 spiritStones
- ✅ 丹方：Task 2 pill_recipe + Task 5 解锁 unlockedPillRecipes
- ✅ 丹药：Task 2 pill + Task 5 入 pillInventory
- ✅ 图谱：Task 2 artifact_recipe + Task 5 解锁 unlockedArtifactRecipes
- ✅ 法器：Task 2 artifact + Task 5 入 artifactInventory
- ✅ 符谱：Task 2 talisman_recipe + Task 5 解锁 unlockedTalismanRecipes
- ✅ 符箓：Task 2 talisman + Task 5 入 talismanInventory
- ✅ 灵兽：Task 2 beast + Task 5 入 beastInventory（依赖计划B）

**2. Placeholder scan:** 无 TBD/TODO，每步含完整代码。

**3. Type consistency:**
- `ShopItem.id` 格式 `'pill:foundation_pill'` / `'pill_recipe:golden_pill'` 在 Task 2 生成、Task 4 测试、Task 5 实现中一致
- `unlockedPillRecipes: PillType[]` 在 Task 3 定义、Task 5 写入、Task 7 读取，类型一致
- `buyShopItem` 返回 `{ success: boolean; reason?: string }` 在 Task 3 声明、Task 4 测试、Task 5 实现一致
- `showShop` 在 Task 6 定义、Task 7/8 引用一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-02-shop-system.md`. 后续计划 D/E 依次创建。

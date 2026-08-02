# 灵兽系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零建立灵兽实体系统：定义 5 类灵兽，新增宗门灵兽库存，灵兽原工作建筑改为产出灵兽（而非灵草），库房界面新增灵兽 Tab 展示库存。

**Architecture:** 新建 `types/beast.ts` 定义 `BeastType`/`Beast`/`BeastInventory`；新建 `data/beasts.ts` 配置 5 类灵兽属性与售价；在 `GameState` 新增 `beastInventory` 字段；扩展 `BuildingOutput` 增加 `beasts` 字段；灵兽原 `baseOutput` 改为 `{ spiritStones: 30, beasts: 1 }`；`computeBuildingOutput` 支持产出灵兽；`WarehousePanel` 新增 `beasts` Tab。

**Tech Stack:** TypeScript + Zustand + Vitest

---

## File Structure

- Create: `src/types/beast.ts` — 灵兽类型与库存接口
- Create: `src/data/beasts.ts` — 5 类灵兽配置
- Create: `src/utils/beast.test.ts` — 灵兽工具测试
- Modify: `src/types/building.ts:41-49` — `BuildingOutput` 增加 `beasts` 字段
- Modify: `src/store/gameStore.ts` — 新增 `beastInventory` 字段与初始值
- Modify: `src/data/buildings.ts:205-229` — 灵兽原 baseOutput 改为产出灵兽
- Modify: `src/domain/balance.ts:89-154` — `computeBuildingOutput` 支持产出 beasts
- Modify: `src/components/WarehousePanel.tsx` — 新增灵兽 Tab
- Modify: `src/utils/gameLogic.ts` — 每月结算累加 beast 产出

---

### Task 1: 定义灵兽类型与接口

**Files:**
- Create: `src/types/beast.ts`

- [ ] **Step 1: 创建类型文件**

创建 `src/types/beast.ts`：

```typescript
// 灵兽种类：5 类，覆盖速、防、攻、辅、均衡
export type BeastType =
  | 'spirit_fox'     // 灵狐：速度/暴击
  | 'mystic_turtle'  // 玄龟：防御
  | 'fire_crow'      // 火鸦：攻击
  | 'jade_rabbit'    // 玉兔：恢复/寿命
  | 'golden_roc';    // 金鹏：均衡

export const BeastTypeNames: Record<BeastType, string> = {
  spirit_fox: '灵狐',
  mystic_turtle: '玄龟',
  fire_crow: '火鸦',
  jade_rabbit: '玉兔',
  golden_roc: '金鹏',
};

export interface Beast {
  type: BeastType;
  name: string;
  description: string;
  tier: number;              // 品阶 1-4，越高越稀有
  combatPowerBonus: number;  // 装备后战力加成（预留，计划E 实装穿戴）
  lifespanBonus?: number;    // 寿命加成（玉兔专属）
  sellPrice: number;         // 售价（商店买入价，卖出价 = floor(sellPrice * 0.5)）
  spiritStoneCost: number;   // 商店购买价（= sellPrice，统一字段）
}

export interface BeastInventory {
  type: BeastType;
  quantity: number;
}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/types/beast.ts
git commit -m "feat(beast): 定义灵兽类型 BeastType / Beast / BeastInventory"
```

---

### Task 2: 配置 5 类灵兽数据

**Files:**
- Create: `src/data/beasts.ts`

- [ ] **Step 1: 创建配置文件**

创建 `src/data/beasts.ts`：

```typescript
import type { Beast, BeastType } from '@/types/beast';

export const BEAST_CONFIGS: Record<BeastType, Beast> = {
  spirit_fox: {
    type: 'spirit_fox',
    name: '灵狐',
    description: '通灵之狐，敏捷灵动，可助主人闪避与暴击。',
    tier: 2,
    combatPowerBonus: 30,
    sellPrice: 800,
    spiritStoneCost: 800,
  },
  mystic_turtle: {
    type: 'mystic_turtle',
    name: '玄龟',
    description: '玄水之龟，甲壳坚厚，可为主人分担损伤。',
    tier: 2,
    combatPowerBonus: 40,
    sellPrice: 900,
    spiritStoneCost: 900,
  },
  fire_crow: {
    type: 'fire_crow',
    name: '火鸦',
    description: '三足火鸦，烈焰焚敌，攻击凌厉。',
    tier: 3,
    combatPowerBonus: 70,
    sellPrice: 1800,
    spiritStoneCost: 1800,
  },
  jade_rabbit: {
    type: 'jade_rabbit',
    name: '玉兔',
    description: '月宫玉兔，灵药伴生，可延寿增元。',
    tier: 3,
    combatPowerBonus: 25,
    lifespanBonus: 50,
    sellPrice: 2200,
    spiritStoneCost: 2200,
  },
  golden_roc: {
    type: 'golden_roc',
    name: '金鹏',
    description: '上古金鹏后裔，攻防兼备，万兽之王。',
    tier: 4,
    combatPowerBonus: 150,
    sellPrice: 6000,
    spiritStoneCost: 6000,
  },
};

export const BEAST_LIST: Beast[] = Object.values(BEAST_CONFIGS);

// 按品阶分组（供商店按品阶陈列）
export const BEASTS_BY_TIER: Record<number, Beast[]> = BEAST_LIST.reduce(
  (acc, b) => {
    (acc[b.tier] = acc[b.tier] || []).push(b);
    return acc;
  },
  {} as Record<number, Beast[]>,
);
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/data/beasts.ts
git commit -m "feat(beast): 配置 5 类灵兽数据（灵狐/玄龟/火鸦/玉兔/金鹏）"
```

---

### Task 3: 扩展 BuildingOutput 与灵兽原产出

**Files:**
- Modify: `src/types/building.ts:41-49`
- Modify: `src/data/buildings.ts:205-229`

- [ ] **Step 1: BuildingOutput 增加 beasts 字段**

将 `src/types/building.ts` 第 41-49 行 `BuildingOutput` 接口替换为：

```typescript
export interface BuildingOutput {
  spiritStones?: number;
  contribution?: number;
  herbs?: number;
  reputation?: number;
  pills?: number;      // 丹药产出
  artifacts?: number;   // 法器产出
  talismans?: number;  // 符箓产出
  beasts?: number;     // 灵兽产出（灵兽原专属）
}
```

- [ ] **Step 2: 灵兽原 baseOutput 改为产出灵兽**

将 `src/data/buildings.ts` 第 209 行：

```typescript
    baseOutput: { spiritStones: 45 },
```

替换为：

```typescript
    baseOutput: { spiritStones: 30, beasts: 1 },
```

- [ ] **Step 3: 更新灵兽原描述与 primaryOutput**

将第 219 行：

```typescript
    primaryOutput: 'spiritStones',
```

替换为：

```typescript
    primaryOutput: 'beasts',
```

将第 223 行 `description` 替换为：

```typescript
    description: '豢养灵兽之所；弟子在此驯养灵兽，每月可产灵兽幼崽。',
```

将第 224-228 行 `discipleEffect` 替换为：

```typescript
    discipleEffect: {
      type: 'morale',
      description: '灵兽产量+10%/人',
      value: '每月产出灵兽',
    },
```

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/types/building.ts src/data/buildings.ts
git commit -m "feat(building): 灵兽原改为产出灵兽，BuildingOutput 增加 beasts 字段"
```

---

### Task 4: GameState 新增 beastInventory 字段

**Files:**
- Modify: `src/store/gameStore.ts:48-77` (接口)
- Modify: `src/store/gameStore.ts:118-200` (初始值)
- Modify: `src/store/gameStore.ts` (import 区)
- Modify: `src/store/gameStore.ts` (migrate)

- [ ] **Step 1: 添加 import**

在 `src/store/gameStore.ts` 第 11 行 `import type { PillInventory, PillType } from '@/types/pill';` 附近追加：

```typescript
import type { BeastInventory } from '@/types/beast';
```

- [ ] **Step 2: 接口新增字段**

在 `src/store/gameStore.ts` 第 59 行 `talismanInventory: TalismanInventory[];` 之后新增：

```typescript
  beastInventory: BeastInventory[];
```

- [ ] **Step 3: 初始值**

在 `createInitialState` 返回对象中（约第 176 行 `talismanInventory: [],` 附近）新增：

```typescript
    beastInventory: [],
```

- [ ] **Step 4: migrate 补默认值**

在 `migrate` 函数中追加：

```typescript
            // v7: 新增 beastInventory 字段
            if (!state.beastInventory) {
              state.beastInventory = [];
            }
```

- [ ] **Step 5: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): GameState 新增 beastInventory 字段"
```

---

### Task 5: computeBuildingOutput 支持产出灵兽

**Files:**
- Modify: `src/domain/balance.ts:89-154`

- [ ] **Step 1: 编写失败测试**

创建 `src/domain/beastOutput.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import type { Building } from '@/types/building';
import { computeBuildingOutput } from './balance';

function makeBeastGarden(overrides: Partial<Building> = {}): Building {
  return {
    id: 'garden-1',
    type: 'spirit_beast_garden',
    name: '灵兽原',
    level: 1,
    maxLevel: 3,
    status: 'active',
    baseOutput: { spiritStones: 30, beasts: 1 },
    baseMaintenanceCost: 40,
    upgradeCosts: [],
    elderBonus: 0,
    discipleCapacity: 10,
    assignedDisciples: ['d1', 'd2'],
    managerId: null,
    description: '',
    category: 'production',
    primaryOutput: 'beasts',
    ...overrides,
  } as Building;
}

describe('computeBuildingOutput — 灵兽原产出灵兽', () => {
  it('灵兽原产出灵兽数量 = baseOutput.beasts × 倍率（向下取整）', () => {
    const b = makeBeastGarden();
    const out = computeBuildingOutput(b, []);
    expect(out.beasts).toBeGreaterThanOrEqual(1);
    expect(typeof out.beasts).toBe('number');
  });

  it('无分配弟子时灵兽产出为 0', () => {
    const b = makeBeastGarden({ assignedDisciples: [] });
    const out = computeBuildingOutput(b, []);
    expect(out.beasts).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/domain/beastOutput.test.ts`
Expected: FAIL — `out.beasts` 为 undefined（computeBuildingOutput 未处理 beasts）

- [ ] **Step 3: 修改 computeBuildingOutput**

在 `src/domain/balance.ts` 的 `computeBuildingOutput` 函数中（约第 143-152 行产出计算块），在 `talismans` 计算之后追加 `beasts` 计算：

```typescript
  // 灵兽产出（灵兽原专属）
  const beasts = baseOutput.beasts ? Math.floor(baseOutput.beasts * totalMultiplier * staffFactor) : 0;
```

并在返回对象中追加 `beasts` 字段。找到返回对象（约第 155-165 行），追加：

```typescript
    beasts,
```

注意：`staffFactor` 与 `totalMultiplier` 是该函数内已有变量，确保 `beasts` 计算在使用它们的代码块之后。

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/domain/beastOutput.test.ts`
Expected: PASS（2 个测试）

- [ ] **Step 5: 验证既有测试不破**

Run: `npx vitest run src/domain/`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/domain/balance.ts src/domain/beastOutput.test.ts
git commit -m "feat(balance): computeBuildingOutput 支持产出灵兽"
```

---

### Task 6: 每月结算累加灵兽产出到 beastInventory

**Files:**
- Modify: `src/store/gameStore.ts:303-450` (nextMonth 中建筑产出累加逻辑)

- [ ] **Step 1: 定位建筑产出累加代码**

Run: `grep -n "pillInventory\|artifactInventory\|talismanInventory\|herbInventory" src/store/gameStore.ts`

在 nextMonth 中找到累加 `pills`/`artifacts`/`talismans` 的代码块（约第 480-520 行）。

- [ ] **Step 2: 累加 beasts 到 beastInventory**

在该累加块中，仿照 pills 的累加方式追加灵兽累加：

```typescript
            // 灵兽产出
            if (output.beasts && output.beasts > 0) {
              // 灵兽产出为随机种类：从低品阶灵兽中按权重抽取
              const BEAST_POOL: BeastType[] = ['spirit_fox', 'mystic_turtle', 'fire_crow', 'jade_rabbit', 'golden_roc'];
              const TIER_WEIGHTS: Record<number, number> = { 2: 60, 3: 30, 4: 10 };
              // 优先低品阶
              for (let i = 0; i < output.beasts; i++) {
                const roll = Math.random() * 100;
                let type: BeastType;
                if (roll < 60) {
                  // tier 2: 灵狐 / 玄龟
                  type = Math.random() < 0.5 ? 'spirit_fox' : 'mystic_turtle';
                } else if (roll < 90) {
                  // tier 3: 火鸦 / 玉兔
                  type = Math.random() < 0.5 ? 'fire_crow' : 'jade_rabbit';
                } else {
                  // tier 4: 金鹏
                  type = 'golden_roc';
                }
                const existing = acc.beastInventory.find(b => b.type === type);
                if (existing) {
                  existing.quantity += 1;
                } else {
                  acc.beastInventory.push({ type, quantity: 1 });
                }
              }
            }
```

在 import 区追加：

```typescript
import type { BeastType } from '@/types/beast';
```

- [ ] **Step 3: 确认 acc.beastInventory 初始化**

在累加 reduce 的初始值中（约第 460 行），确保含 `beastInventory: state.beastInventory` 或新数组。若使用不可变写法，确认 `acc.beastInventory` 在 reduce 起始已存在。

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): 每月结算累加灵兽产出到 beastInventory"
```

---

### Task 7: WarehousePanel 新增灵兽 Tab

**Files:**
- Modify: `src/components/WarehousePanel.tsx:16, 19, 37-41`

- [ ] **Step 1: 读取 WarehousePanel 当前结构**

Run: `head -50 src/components/WarehousePanel.tsx`

- [ ] **Step 2: 扩展 Tab 类型与数据源**

将 `src/components/WarehousePanel.tsx` 第 16 行：

```typescript
type WarehouseTab = 'pills' | 'artifacts' | 'talismans';
```

替换为：

```typescript
type WarehouseTab = 'pills' | 'artifacts' | 'talismans' | 'beasts';
```

在第 19 行数据源解构中追加 `beastInventory`：

```typescript
  const { pillInventory, artifactInventory, talismanInventory, beastInventory, spiritStones, herbInventory } = useGameStore();
```

- [ ] **Step 3: 添加灵兽 Tab 按钮**

在第 37-41 行 Tab 按钮数组中追加：

```typescript
  const tabs: { key: WarehouseTab; label: string; icon: typeof FlaskConical; count: number }[] = [
    { key: 'pills', label: '丹药库', icon: FlaskConical, count: pillInventory.reduce((s, p) => s + p.quantity, 0) },
    { key: 'artifacts', label: '炼器库', icon: Sword, count: artifactInventory.reduce((s, a) => s + a.quantity, 0) },
    { key: 'talismans', label: '符库', icon: ScrollText, count: talismanInventory.reduce((s, t) => s + t.quantity, 0) },
    { key: 'beasts', label: '灵兽', icon: PawPrint, count: beastInventory.reduce((s, b) => s + b.quantity, 0) },
  ];
```

在 lucide-react import 中追加 `PawPrint`。

- [ ] **Step 4: 渲染灵兽 Tab 内容**

在 WarehousePanel 的 Tab 内容渲染区（约第 200 行，talismans 内容之后），追加 beasts 内容：

```tsx
        {activeTab === 'beasts' && (
          <div className="space-y-2">
            {beastInventory.length === 0 ? (
              <div className="text-center py-8 text-sect-jade/40 text-sm">尚未拥有灵兽</div>
            ) : (
              beastInventory.map(inv => {
                const config = BEAST_CONFIGS[inv.type];
                if (!config) return null;
                return (
                  <div key={inv.type} className="warehouse-item">
                    <div className="flex items-center justify-between p-2 rounded bg-[rgba(13,17,23,0.4)] border border-[var(--gold-400)]/20">
                      <div className="flex items-center gap-2">
                        <PawPrint size={20} className="text-sect-gold" />
                        <div>
                          <div className="font-display text-sm text-sect-gold flex items-center gap-1">
                            {config.name}
                            <span className="text-[10px] text-sect-spirit">{config.tier}阶</span>
                          </div>
                          <div className="text-[10px] text-sect-jade/60">{config.description}</div>
                          <div className="text-[10px] text-amber-400">战力+{config.combatPowerBonus}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-sect-gold">×{inv.quantity}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
```

在文件顶部 import 区追加：

```typescript
import { BEAST_CONFIGS } from '@/data/beasts';
```

- [ ] **Step 5: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/components/WarehousePanel.tsx
git commit -m "feat(ui): WarehousePanel 新增灵兽 Tab"
```

---

### Task 8: 全量测试与构建验证

- [ ] **Step 1: 运行全部单元测试**

Run: `npx vitest run`
Expected: 全部 PASS（含新增 2 个 beastOutput 测试）

- [ ] **Step 2: TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 生产构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: 灵兽系统 - 构建验证通过"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 库房界面新增一项灵兽：Task 7 WarehousePanel 灵兽 Tab
- ✅ 灵兽原工作建筑产出灵兽：Task 3 + Task 5 + Task 6
- ✅ 灵兽类型定义：Task 1
- ✅ 灵兽数据配置：Task 2
- ✅ GameState 存储：Task 4

**2. Placeholder scan:** 无 TBD/TODO，每步含完整代码。

**3. Type consistency:**
- `BeastType` 在 Task 1 定义、Task 2/4/6 引用，名称一致
- `BeastInventory` 在 Task 1 定义、Task 4/7 引用，结构 `{type, quantity}` 一致
- `BuildingOutput.beasts` 在 Task 3 定义、Task 5 引用，字段名一致
- `BEAST_CONFIGS` 在 Task 2 定义、Task 7 引用，名称一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-02-spirit-beast-system.md`. 后续计划 C/D/E 依次创建。

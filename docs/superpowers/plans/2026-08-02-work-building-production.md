# 工作建筑产出机制重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 工作建筑（丹堂/炼器堂/符堂）改为消耗材料按配方生产成品：玩家可调整每座建筑的生产目标，每月结算时按配方消耗灵草/灵铁/符纸，产出丹药/法器/符箓入库存；杂役堂改为产出三类基础材料；灵兽原产出灵兽（计划B已实现）。

**Architecture:** `BuildingOutput` 新增 `iron`/`paper` 字段；`GameState` 新增 `ironInventory`/`paperInventory`；`Building` 新增 `productionTarget` 字段（玩家可调）；杂役堂 `baseOutput` 改为产材料；`nextMonth` 建筑产出循环扩展：丹堂/炼器堂/符堂按 `productionTarget` 查配方、校验材料与解锁、消耗材料、产出成品入对应库存；`BuildingsPanel` 增加生产目标选择器。

**前置依赖:** 计划 B（灵兽原产灵兽）、计划 C（unlockedRecipes 解锁字段）已完成。

**Tech Stack:** TypeScript + Zustand + Vitest

---

## File Structure

- Modify: `src/types/building.ts:41-49, 85-110` — BuildingOutput 加 iron/paper；Building 加 productionTarget
- Modify: `src/store/gameStore.ts` — ironInventory/paperInventory 字段；setProductionTarget action；nextMonth 产出重构
- Modify: `src/data/buildings.ts` — 杂役堂 baseOutput 改为产材料；丹堂/炼器堂/符堂 baseOutput 调整
- Modify: `src/domain/balance.ts:89-154` — computeBuildingOutput 支持 iron/paper
- Modify: `src/components/BuildingsPanel.tsx` — 生产目标选择器 UI
- Create: `src/domain/production.test.ts` — 生产逻辑测试

---

### Task 1: 扩展 BuildingOutput 与 Building 类型

**Files:**
- Modify: `src/types/building.ts:41-49` (BuildingOutput)
- Modify: `src/types/building.ts:85-110` (Building)

- [ ] **Step 1: BuildingOutput 增加 iron / paper**

将 `src/types/building.ts` 第 41-49 行 `BuildingOutput` 替换为：

```typescript
export interface BuildingOutput {
  spiritStones?: number;
  contribution?: number;
  herbs?: number;       // 灵草（丹堂原料）
  iron?: number;        // 灵铁（炼器堂原料）
  paper?: number;       // 符纸（符堂原料）
  reputation?: number;
  pills?: number;       // 丹药产出
  artifacts?: number;   // 法器产出
  talismans?: number;   // 符箓产出
  beasts?: number;      // 灵兽产出（灵兽原专属）
}
```

- [ ] **Step 2: Building 增加 productionTarget**

在 `src/types/building.ts` 第 110 行 `discipleEffect?: BuildingDiscipleEffect;` 之后（Building 接口内）追加：

```typescript
  // 生产目标：玩家可调整工作建筑生产哪种成品
  // 丹堂→PillType，炼器堂→ArtifactType，符堂→TalismanType
  productionTarget?: {
    pillType?: import('@/types/pill').PillType;
    artifactType?: import('@/types/artifact').ArtifactType;
    talismanType?: import('@/types/talisman').TalismanType;
  };
```

- [ ] **Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/types/building.ts
git commit -m "feat(building): BuildingOutput 加 iron/paper；Building 加 productionTarget"
```

---

### Task 2: GameState 新增材料库存字段

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: 接口新增字段**

在 `GameState` 接口 `herbInventory` 行（约第 64 行）之后追加：

```typescript
  ironInventory: number;    // 灵铁（炼器堂原料）
  paperInventory: number;   // 符纸（符堂原料）
```

- [ ] **Step 2: 接口新增 setProductionTarget action**

在 `GameState` 接口末尾追加：

```typescript
  setProductionTarget: (buildingId: string, target: NonNullable<Building['productionTarget']>) => void;
```

- [ ] **Step 3: 初始值**

在 `createInitialState` 返回对象中（`herbInventory: 20,` 附近）追加：

```typescript
    ironInventory: 10,
    paperInventory: 10,
```

- [ ] **Step 4: migrate 补默认值**

在 `migrate` 函数中追加：

```typescript
            if (state.ironInventory === undefined) state.ironInventory = 10;
            if (state.paperInventory === undefined) state.paperInventory = 10;
```

- [ ] **Step 5: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): 新增 ironInventory/paperInventory 材料库存字段"
```

---

### Task 3: 杂役堂改为产出三类材料

**Files:**
- Modify: `src/data/buildings.ts:57-80` (servant_hall)

- [ ] **Step 1: 调整杂役堂 baseOutput**

在 `src/data/buildings.ts` 找到 `servant_hall` 配置（约第 57-80 行），将其 `baseOutput`：

```typescript
    baseOutput: { spiritStones: 60, herbs: 12 },
```

替换为：

```typescript
    baseOutput: { spiritStones: 40, herbs: 6, iron: 2, paper: 2 },
```

- [ ] **Step 2: 更新描述**

将杂役堂 `description` 替换为：

```typescript
    description: '宗门杂役之所；弟子在此采集灵草、开采灵铁、制作符纸，为各堂提供原料。',
```

将 `discipleEffect.description` 替换为：

```typescript
      description: '灵草+6/灵铁+2/符纸+2 每月',
```

- [ ] **Step 3: 丹堂/炼器堂/符堂 baseOutput 调整**

丹堂（约第 105-129 行）`baseOutput`：

```typescript
    baseOutput: { spiritStones: 25, pills: 1 },
```

替换为（移除直接产丹，改为按配方生产，保留少量灵石产出）：

```typescript
    baseOutput: { spiritStones: 10 },
```

炼器堂 `sutra_hall`（约第 130-154 行）`baseOutput`：

```typescript
    baseOutput: { spiritStones: 35, artifacts: 1 },
```

替换为：

```typescript
    baseOutput: { spiritStones: 10 },
```

符堂 `artifact_hall`（约第 155-179 行）`baseOutput`：

```typescript
    baseOutput: { spiritStones: 30, talismans: 1 },
```

替换为：

```typescript
    baseOutput: { spiritStones: 10 },
```

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/data/buildings.ts
git commit -m "feat(building): 杂役堂产三类材料；丹/器/符堂改为按配方生产"
```

---

### Task 4: computeBuildingOutput 支持 iron/paper

**Files:**
- Modify: `src/domain/balance.ts:89-154`
- Modify: `src/domain/balance.ts` (BuildingOutputResult 类型)

- [ ] **Step 1: 定位 BuildingOutputResult 类型**

Run: `grep -n "BuildingOutputResult" src/domain/balance.ts`

- [ ] **Step 2: 类型加 iron/paper/beasts**

将 `BuildingOutputResult` 接口（若定义在 balance.ts 顶部）增加字段：

```typescript
  iron: number;
  paper: number;
  beasts: number;
```

- [ ] **Step 3: computeBuildingOutput 计算 iron/paper/beasts**

在 `src/domain/balance.ts` 第 143-153 行 `return` 块之前追加：

```typescript
  const iron = baseOutput.iron ? Math.floor(baseOutput.iron * totalMultiplier * staffFactor) : 0;
  const paper = baseOutput.paper ? Math.floor(baseOutput.paper * totalMultiplier * staffFactor) : 0;
  const beasts = baseOutput.beasts ? Math.floor(baseOutput.beasts * totalMultiplier * staffFactor) : 0;
```

在 `return` 对象中追加：

```typescript
    iron,
    paper,
    beasts,
```

同时在函数顶部 `if (building.status !== 'active')` 的早返回对象（第 94 行）中追加 `iron: 0, paper: 0, beasts: 0`。

- [ ] **Step 4: 验证既有测试**

Run: `npx vitest run src/domain/`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/balance.ts
git commit -m "feat(balance): computeBuildingOutput 支持 iron/paper/beasts 产出"
```

---

### Task 5: 编写生产逻辑失败测试

**Files:**
- Create: `src/domain/production.test.ts`

- [ ] **Step 1: 创建测试文件**

创建 `src/domain/production.test.ts`：

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
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
      disciples: [
        { id: 'd1', name: '甲', hiddenTalents: { spiritRhythm: 80 } as any, status: 'outer', realm: 'qi' } as any,
        { id: 'd2', name: '乙', hiddenTalents: { spiritRhythm: 70 } as any, status: 'outer', realm: 'qi' } as any,
      ],
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/domain/production.test.ts`
Expected: FAIL — 未设置生产目标测试可能过，但消耗材料产出测试失败（nextMonth 未实现生产逻辑）

- [ ] **Step 3: Commit（红测试）**

```bash
git add src/domain/production.test.ts
git commit -m "test(production): 新增工作建筑生产逻辑失败测试"
```

---

### Task 6: 实现 setProductionTarget action

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: 实现 setProductionTarget**

在 `buyShopItem` 实现之后追加：

```typescript
      setProductionTarget: (buildingId: string, target: NonNullable<Building['productionTarget']>) => {
        set(state => ({
          buildings: state.buildings.map(b =>
            b.id === buildingId ? { ...b, productionTarget: target } : b
          ),
        }));
      },
```

- [ ] **Step 2: 验证 setProductionTarget 测试通过**

Run: `npx vitest run src/domain/production.test.ts -t "setProductionTarget"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): 实现 setProductionTarget action"
```

---

### Task 7: 重构 nextMonth 建筑产出循环

**Files:**
- Modify: `src/store/gameStore.ts:328-345` (建筑产出循环)
- Modify: `src/store/gameStore.ts` (import 区)

- [ ] **Step 1: 添加 import**

在 `src/store/gameStore.ts` import 区追加：

```typescript
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
```

- [ ] **Step 2: 扩展建筑产出循环**

将 `src/store/gameStore.ts` 第 328-345 行 `buildings.forEach` 循环替换为：

```typescript
        buildings.forEach(building => {
          if (building.status !== 'active') return;

          const assignedDisciples = disciples.filter(d => building.assignedDisciples.includes(d.id));
          const output = calculateBuildingOutput(building, assignedDisciples);

          if (output.spiritStones > 0) {
            totalSpiritStoneIncome += output.spiritStones;
            spiritStoneIncome.push({ source: building.name, amount: output.spiritStones });
          }
          if (output.herbs > 0) {
            totalHerbIncome += output.herbs;
          }
          // 材料产出累加（杂役堂）
          if (output.iron > 0) accIron += output.iron;
          if (output.paper > 0) accPaper += output.paper;

          const maintenance = calculateBuildingMaintenance(building);
          totalMaintenance += maintenance;
          spiritStoneExpense.push({ source: `${building.name}维护`, amount: maintenance });

          // 工作建筑按配方生产成品
          const prod = produceWorkBuilding(building, output, state);
          if (prod.pillType) {
            const existing = accPillInventory.find(p => p.type === prod.pillType);
            if (existing) existing.quantity += prod.quantity;
            else accPillInventory.push({ type: prod.pillType, quantity: prod.quantity });
            accHerbs -= prod.herbsConsumed;
            accIron -= prod.ironConsumed;
            accPaper -= prod.paperConsumed;
          } else if (prod.artifactType) {
            const existing = accArtifactInventory.find(a => a.type === prod.artifactType);
            if (existing) existing.quantity += prod.quantity;
            else accArtifactInventory.push({ type: prod.artifactType, quantity: prod.quantity });
            accIron -= prod.ironConsumed;
          } else if (prod.talismanType) {
            const existing = accTalismanInventory.find(t => t.type === prod.talismanType);
            if (existing) existing.quantity += prod.quantity;
            else accTalismanInventory.push({ type: prod.talismanType, quantity: prod.quantity });
            accPaper -= prod.paperConsumed;
          }
        });
```

- [ ] **Step 3: 声明累加器变量**

在 `buildings.forEach` 之前（约第 320 行 `let totalHerbIncome = 0;` 附近）追加：

```typescript
        let accIron = state.ironInventory;
        let accPaper = state.paperInventory;
        let accHerbs = state.herbInventory;
        let accPillInventory = state.pillInventory.map(p => ({ ...p }));
        let accArtifactInventory = state.artifactInventory.map(a => ({ ...a }));
        let accTalismanInventory = state.talismanInventory.map(t => ({ ...t }));
```

注意：`totalHerbIncome` 原本用于月报展示，保留；`accHerbs` 用于实际扣减材料。若 `totalHerbIncome` 与 `accHerbs` 语义冲突，统一为 `accHerbs`。

- [ ] **Step 4: 在 set 中回写材料与库存**

在 `nextMonth` 的最终 `set` 调用中（约第 750 行），追加：

```typescript
          herbInventory: Math.max(0, accHerbs),
          ironInventory: Math.max(0, accIron),
          paperInventory: Math.max(0, accPaper),
          pillInventory: accPillInventory,
          artifactInventory: accArtifactInventory,
          talismanInventory: accTalismanInventory,
```

（若 set 已含 herbInventory，替换为 `Math.max(0, accHerbs)`）

- [ ] **Step 5: 实现 produceWorkBuilding 辅助函数**

在 `src/store/gameStore.ts` 的 `createInitialState` 之前追加：

```typescript
// 工作建筑按配方生产成品：返回产出类型、数量、消耗的材料
function produceWorkBuilding(
  building: Building,
  output: { pills: number; artifacts: number; talismans: number },
  state: GameState,
): {
  pillType?: PillType; artifactType?: ArtifactType; talismanType?: TalismanType;
  quantity: number; herbsConsumed: number; ironConsumed: number; paperConsumed: number;
} {
  const empty = { quantity: 0, herbsConsumed: 0, ironConsumed: 0, paperConsumed: 0 };
  const target = building.productionTarget;
  if (!target) return empty;

  // 丹堂
  if (building.type === 'pill_hall' && target.pillType) {
    if (!state.unlockedPillRecipes.includes(target.pillType)) return empty;
    const recipe = PILL_CONFIGS[target.pillType];
    if (!recipe) return empty;
    const herbsPerUnit = recipe.materials.find(m => m.name === '灵草')?.amount ?? 0;
    // 产出数量受建筑产出倍率影响（output.pills 为基础数量，但已移除；改用工人数估算）
    const workerCount = building.assignedDisciples.length;
    const maxUnits = Math.min(
      workerCount,
      Math.floor(state.herbInventory / Math.max(1, herbsPerUnit)),
    );
    if (maxUnits <= 0) return empty;
    return {
      pillType: target.pillType,
      quantity: maxUnits,
      herbsConsumed: maxUnits * herbsPerUnit,
      ironConsumed: 0,
      paperConsumed: 0,
    };
  }

  // 炼器堂（sutra_hall）
  if (building.type === 'sutra_hall' && target.artifactType) {
    if (!state.unlockedArtifactRecipes.includes(target.artifactType)) return empty;
    const recipe = ARTIFACT_CONFIGS[target.artifactType];
    if (!recipe) return empty;
    const ironPerUnit = recipe.materials.find(m => m.name === '灵铁' || m.name === '矿石')?.amount ?? 2;
    const workerCount = building.assignedDisciples.length;
    const maxUnits = Math.min(
      Math.max(1, Math.floor(workerCount / 2)), // 炼器较慢，2人产1件
      Math.floor(state.ironInventory / Math.max(1, ironPerUnit)),
    );
    if (maxUnits <= 0) return empty;
    return {
      artifactType: target.artifactType,
      quantity: maxUnits,
      herbsConsumed: 0,
      ironConsumed: maxUnits * ironPerUnit,
      paperConsumed: 0,
    };
  }

  // 符堂（artifact_hall）
  if (building.type === 'artifact_hall' && target.talismanType) {
    if (!state.unlockedTalismanRecipes.includes(target.talismanType)) return empty;
    const recipe = TALISMAN_CONFIGS[target.talismanType];
    if (!recipe) return empty;
    const paperPerUnit = recipe.materials.find(m => m.name === '符纸')?.amount ?? 1;
    const workerCount = building.assignedDisciples.length;
    const maxUnits = Math.min(
      workerCount,
      Math.floor(state.paperInventory / Math.max(1, paperPerUnit)),
    );
    if (maxUnits <= 0) return empty;
    return {
      talismanType: target.talismanType,
      quantity: maxUnits,
      herbsConsumed: 0,
      ironConsumed: 0,
      paperConsumed: maxUnits * paperPerUnit,
    };
  }

  return empty;
}
```

在 import 区追加（若未导入）：

```typescript
import type { PillType } from '@/types/pill';
import type { ArtifactType } from '@/types/artifact';
import type { TalismanType } from '@/types/talisman';
```

- [ ] **Step 6: 运行生产测试**

Run: `npx vitest run src/domain/production.test.ts`
Expected: 全部 PASS（5 个测试）

- [ ] **Step 7: 验证既有测试不破**

Run: `npx vitest run`
Expected: 全部 PASS

- [ ] **Step 8: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(production): nextMonth 按配方消耗材料生产丹药/法器/符箓"
```

---

### Task 8: BuildingsPanel 生产目标选择器 UI

**Files:**
- Modify: `src/components/BuildingsPanel.tsx`

- [ ] **Step 1: 添加 import**

在 `src/components/BuildingsPanel.tsx` import 区追加：

```typescript
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { PillTypeNames } from '@/types/pill';
import { ArtifactTypeNames } from '@/types/artifact';
import { TalismanTypeNames } from '@/types/talisman';
```

- [ ] **Step 2: 解构 setProductionTarget 与 unlockedRecipes**

在 `BuildingsPanel` 组件中从 `useGameStore` 解构：

```typescript
  const { setProductionTarget, unlockedPillRecipes, unlockedArtifactRecipes, unlockedTalismanRecipes } = useGameStore();
```

- [ ] **Step 3: 生产目标选择器区块**

在 `BuildingsPanel.tsx` 建筑详情面板中（管理者区块之后，约第 730 行后），为丹堂/炼器堂/符堂追加生产目标选择器：

```tsx
                  {/* 生产目标选择器：丹堂/炼器堂/符堂 */}
                  {(selectedBuilding.type === 'pill_hall' || selectedBuilding.type === 'sutra_hall' || selectedBuilding.type === 'artifact_hall') && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FlaskConical size={12} className="text-blue-300" />
                        <span className="font-display text-blue-300 text-xs">生产目标</span>
                      </div>
                      {selectedBuilding.type === 'pill_hall' && (
                        <select
                          className="w-full bg-[rgba(13,17,23,0.6)] border border-[var(--gold-400)]/30 rounded px-2 py-1 text-xs text-sect-jade"
                          value={selectedBuilding.productionTarget?.pillType || ''}
                          onChange={e => setProductionTarget(selectedBuilding.id, { pillType: e.target.value as any })}
                        >
                          <option value="">未设置</option>
                          {unlockedPillRecipes.map(t => (
                            <option key={t} value={t}>{PillTypeNames[t]}</option>
                          ))}
                        </select>
                      )}
                      {selectedBuilding.type === 'sutra_hall' && (
                        <select
                          className="w-full bg-[rgba(13,17,23,0.6)] border border-[var(--gold-400)]/30 rounded px-2 py-1 text-xs text-sect-jade"
                          value={selectedBuilding.productionTarget?.artifactType || ''}
                          onChange={e => setProductionTarget(selectedBuilding.id, { artifactType: e.target.value as any })}
                        >
                          <option value="">未设置</option>
                          {unlockedArtifactRecipes.map(t => (
                            <option key={t} value={t}>{ArtifactTypeNames[t]}</option>
                          ))}
                        </select>
                      )}
                      {selectedBuilding.type === 'artifact_hall' && (
                        <select
                          className="w-full bg-[rgba(13,17,23,0.6)] border border-[var(--gold-400)]/30 rounded px-2 py-1 text-xs text-sect-jade"
                          value={selectedBuilding.productionTarget?.talismanType || ''}
                          onChange={e => setProductionTarget(selectedBuilding.id, { talismanType: e.target.value as any })}
                        >
                          <option value="">未设置</option>
                          {unlockedTalismanRecipes.map(t => (
                            <option key={t} value={t}>{TalismanTypeNames[t]}</option>
                          ))}
                        </select>
                      )}
                      {((selectedBuilding.type === 'pill_hall' && unlockedPillRecipes.length === 0) ||
                        (selectedBuilding.type === 'sutra_hall' && unlockedArtifactRecipes.length === 0) ||
                        (selectedBuilding.type === 'artifact_hall' && unlockedTalismanRecipes.length === 0)) && (
                        <div className="text-[10px] text-yellow-400 mt-1">尚未解锁任何配方，请前往商店购买丹方/图谱/符谱</div>
                      )}
                    </div>
                  )}
```

在 lucide-react import 中确保 `FlaskConical` 已导入。

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/BuildingsPanel.tsx
git commit -m "feat(ui): BuildingsPanel 增加生产目标选择器"
```

---

### Task 9: 全量测试与构建验证

- [ ] **Step 1: 运行全部单元测试**

Run: `npx vitest run`
Expected: 全部 PASS（含新增 5 个 production 测试）

- [ ] **Step 2: TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 生产构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: 工作建筑产出重构 - 构建验证通过"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 除居所外其他建筑为工作建筑：丹堂/炼器堂/符堂/灵兽原/杂役堂均为工作建筑
- ✅ 工作建筑弟子进入后为宗门创造收益：Task 7 生产逻辑
- ✅ 丹堂弟子使用灵草根据丹方生成丹药：Task 7 produceWorkBuilding pill_hall 分支
- ✅ 玩家可以调整生产的丹药种类：Task 8 生产目标选择器
- ✅ 炼器堂、符堂、灵兽原也是如此：Task 7 各分支 + 计划B灵兽原
- ✅ 弟子获取贡献：既有 processMonthlyWork 已发贡献（未改动）

**2. Placeholder scan:** 无 TBD/TODO，每步含完整代码。

**3. Type consistency:**
- `productionTarget` 在 Task 1 定义、Task 6/7/8 引用，结构 `{pillType?/artifactType?/talismanType?}` 一致
- `iron`/`paper` 在 Task 1 BuildingOutput 定义、Task 4 computeBuildingOutput 计算、Task 7 累加，字段名一致
- `produceWorkBuilding` 返回结构在 Task 7 Step 5 定义、Step 2 消费，字段名 `pillType/artifactType/talismanType/quantity/herbsConsumed/ironConsumed/paperConsumed` 一致
- `PILL_CONFIGS`/`ARTIFACT_CONFIGS`/`TALISMAN_CONFIGS` 导出名需 Task 7 Step 1 与实际 data 文件核对

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-02-work-building-production.md`. 最后一份计划 E 接下来创建。

# 建筑降级返还增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让建筑升级同步扣除配置中的灵石/贡献/声望，降级时按原消耗等额返还三类资源，并抽取居所判定常量消除散落字面量。

**Architecture:** 在 `GameState` 新增 `sectContribution`（宗门贡献池）字段承接建筑升级的 contribution 成本；升级/降级函数对称地扣除/返还三类资源；居所类型集合抽取为 `types/building.ts` 的导出常量 `RESIDENCE_TYPES` 与 `RESIDENCE_TYPES_WITH_CAVE`，替换全代码库内联字面量。

**Tech Stack:** TypeScript + Zustand + Vitest

---

## File Structure

- Modify: `src/types/building.ts` — 新增 `RESIDENCE_TYPES` / `RESIDENCE_TYPES_WITH_CAVE` 常量
- Modify: `src/store/gameStore.ts` — 新增 `sectContribution` 字段；重写 `upgradeBuilding` / `downgradeBuilding` 对称扣返三类资源；替换居所字面量
- Modify: `src/utils/gameLogic.ts` — 替换居所字面量为导入常量
- Modify: `src/components/BuildingsPanel.tsx` — 替换居所字面量；升级/降级 UI 展示三类资源
- Modify: `src/components/EldersPanel.tsx` — 替换居所字面量
- Modify: `src/components/AllocationPanel.tsx` — 替换居所字面量（如存在）
- Test: `src/utils/gameLogic.test.ts` — 既有 autoAssignManagers 测试不受影响
- Test: `src/store/gameStore.test.ts` — 新建，覆盖升级扣费与降级返还

---

### Task 1: 抽取居所类型常量到 types/building.ts

**Files:**
- Modify: `src/types/building.ts:16` (在 BuildingType 联合后追加常量)

- [ ] **Step 1: 新增两个导出常量**

在 `src/types/building.ts` 第 16 行 `| 'cave_mansion';` 之后追加：

```typescript

// 居所类建筑判定集合（单一来源，消除散落字面量）
// 不含 cave_mansion：用于"按居所升级公式计算"的场景（洞府 maxLevel=1，不走该分支）
export const RESIDENCE_TYPES: readonly BuildingType[] = ['outer_residence', 'inner_residence', 'core_residence'] as const;

// 含 cave_mansion：用于"是否为居所（不任命堂主/不分配工作）"的场景
export const RESIDENCE_TYPES_WITH_CAVE: readonly BuildingType[] = ['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion'] as const;

export function isResidenceType(type: string): boolean {
  return (RESIDENCE_TYPES_WITH_CAVE as readonly string[]).includes(type);
}
```

- [ ] **Step 2: 验证类型编译通过**

Run: `npx tsc --noEmit`
Expected: 无新增错误（既有错误数不变）

- [ ] **Step 3: Commit**

```bash
git add src/types/building.ts
git commit -m "refactor(building): 抽取居所类型常量 RESIDENCE_TYPES / RESIDENCE_TYPES_WITH_CAVE"
```

---

### Task 2: gameStore 新增 sectContribution 字段

**Files:**
- Modify: `src/store/gameStore.ts:48-77` (GameState 接口)
- Modify: `src/store/gameStore.ts:118-200` (createInitialState)

- [ ] **Step 1: 在 GameState 接口新增字段**

在 `src/store/gameStore.ts` 第 53 行 `reputation: number;` 之后新增：

```typescript
  sectContribution: number; // 宗门贡献池：用于建筑升级等宗门级消耗
```

- [ ] **Step 2: 在 createInitialState 设置初始值**

在 `createInitialState` 返回对象中（约第 167 行 `reputation: 0,` 附近）新增：

```typescript
    sectContribution: 0,
```

- [ ] **Step 3: 在 persist migrate 中补默认值**

在 `src/store/gameStore.ts` 的 `migrate` 函数中（约 version 7 迁移块内）追加：

```typescript
            // v7: 新增 sectContribution 字段，旧存档默认 0
            if (state.sectContribution === undefined) {
              state.sectContribution = 0;
            }
```

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): 新增 sectContribution 宗门贡献池字段"
```

---

### Task 3: 编写升级扣费与降级返还的失败测试

**Files:**
- Create: `src/store/gameStore.test.ts`

- [ ] **Step 1: 创建测试文件，写入失败测试**

创建 `src/store/gameGameStore.test.ts`：

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: FAIL — 升级未扣 contribution（`sectContribution` 仍为 5000），降级未返还 contribution

- [ ] **Step 3: Commit（红测试）**

```bash
git add src/store/gameStore.test.ts
git commit -m "test(store): 新增升级扣费/降级返还三类资源的失败测试"
```

---

### Task 4: 重写 upgradeBuilding 同步扣除三类资源

**Files:**
- Modify: `src/store/gameStore.ts:1057-1100` (upgradeBuilding 实现)

- [ ] **Step 1: 替换 upgradeBuilding 实现**

将 `src/store/gameStore.ts` 第 1057-1100 行 `upgradeBuilding` 函数体替换为：

```typescript
      upgradeBuilding: (buildingId: string): boolean => {
        const state = get();
        const building = state.buildings.find(b => b.id === buildingId);

        if (!building) return false;
        if (building.level >= building.maxLevel) return false;

        // 统一使用配置中的升级费用
        let upgradeCost;
        const isResidence = RESIDENCE_TYPES.includes(building.type);
        if (isResidence) {
          upgradeCost = getResidenceUpgradeCost(building);
          if (!upgradeCost) return false;
        } else {
          upgradeCost = building.upgradeCosts[building.level - 1];
          if (!upgradeCost) return false;
        }

        // 三类资源校验
        if (state.spiritStones < upgradeCost.spiritStones) return false;
        const needContribution = upgradeCost.contribution ?? 0;
        if (state.sectContribution < needContribution) return false;
        const needReputation = upgradeCost.reputation ?? 0;
        if (state.reputation < needReputation) return false;

        // 计算升级后的新容量
        const newLevel = building.level + 1;
        let newCapacity = building.discipleCapacity;
        if (isResidence) {
          newCapacity = getResidenceCapacityByLevel(building.type, newLevel);
        } else if (building.discipleCapacity > 0) {
          newCapacity = building.discipleCapacity + 10;
        }

        // 计算升级后的新维护费
        const newMaintenanceCost = getMaintenanceCostByLevel(building.type, newLevel);

        set(state => ({
          spiritStones: state.spiritStones - upgradeCost.spiritStones,
          sectContribution: state.sectContribution - needContribution,
          reputation: state.reputation - needReputation,
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, level: newLevel, discipleCapacity: newCapacity, baseMaintenanceCost: newMaintenanceCost }
              : b
          ),
        }));

        return true;
      },
```

- [ ] **Step 2: 添加 import**

在 `src/store/gameStore.ts` 顶部 import 区（约第 6 行 `import type { Building, BuildingType } from '@/types/building';`）追加：

```typescript
import { RESIDENCE_TYPES } from '@/types/building';
```

- [ ] **Step 3: 验证升级测试通过**

Run: `npx vitest run src/store/gameStore.test.ts -t "升级扣除灵石"`
Expected: PASS

Run: `npx vitest run src/store/gameStore.test.ts -t "宗门贡献不足"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(building): upgradeBuilding 同步扣除灵石/贡献/声望"
```

---

### Task 5: 重写 downgradeBuilding 对称返还三类资源

**Files:**
- Modify: `src/store/gameStore.ts:1102-1142` (downgradeBuilding 实现)
- Modify: `src/store/gameStore.ts:89` (接口签名)

- [ ] **Step 1: 扩展接口返回类型**

将 `src/store/gameStore.ts` 第 89 行接口签名改为：

```typescript
  downgradeBuilding: (buildingId: string) => { success: boolean; refundSpiritStones: number; refundContribution: number; refundReputation: number; reason?: string };
```

- [ ] **Step 2: 替换 downgradeBuilding 实现**

将第 1102-1142 行 `downgradeBuilding` 函数体替换为：

```typescript
      downgradeBuilding: (buildingId: string): { success: boolean; refundSpiritStones: number; refundContribution: number; refundReputation: number; reason?: string } => {
        const state = get();
        const building = state.buildings.find(b => b.id === buildingId);

        if (!building) return { success: false, refundSpiritStones: 0, refundContribution: 0, refundReputation: 0, reason: '建筑不存在' };
        if (building.level <= 1) return { success: false, refundSpiritStones: 0, refundContribution: 0, refundReputation: 0, reason: '已是最低等级' };

        const isResidence = RESIDENCE_TYPES.includes(building.type);

        // 计算返还资源：从 (level-1) 升级到 level 时花费的全部资源
        let refundSpiritStones = 0;
        let refundContribution = 0;
        let refundReputation = 0;
        if (isResidence) {
          const prevLevelBuilding = { ...building, level: building.level - 1 };
          const cost = getResidenceUpgradeCost(prevLevelBuilding);
          if (cost) {
            refundSpiritStones = cost.spiritStones;
            refundContribution = cost.contribution ?? 0;
            refundReputation = cost.reputation ?? 0;
          }
        } else {
          const cost = building.upgradeCosts[building.level - 2];
          if (cost) {
            refundSpiritStones = cost.spiritStones;
            refundContribution = cost.contribution ?? 0;
            refundReputation = cost.reputation ?? 0;
          }
        }

        const newLevel = building.level - 1;
        let newCapacity = building.discipleCapacity;
        if (isResidence) {
          newCapacity = getResidenceCapacityByLevel(building.type, newLevel);
        } else if (building.discipleCapacity > 0) {
          newCapacity = Math.max(0, building.discipleCapacity - 10);
        }

        const newMaintenanceCost = getMaintenanceCostByLevel(building.type, newLevel);

        set(state => ({
          spiritStones: state.spiritStones + refundSpiritStones,
          sectContribution: state.sectContribution + refundContribution,
          reputation: state.reputation + refundReputation,
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, level: newLevel, discipleCapacity: newCapacity, baseMaintenanceCost: newMaintenanceCost }
              : b
          ),
        }));

        return { success: true, refundSpiritStones, refundContribution, refundReputation };
      },
```

- [ ] **Step 3: 运行全部降级测试**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: 全部 PASS（4 个测试）

- [ ] **Step 4: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(building): downgradeBuilding 对称返还灵石/贡献/声望"
```

---

### Task 6: 替换 gameLogic.ts 中的居所字面量

**Files:**
- Modify: `src/utils/gameLogic.ts:24-26, 100-107, 175, 237`

- [ ] **Step 1: 添加 import**

在 `src/utils/gameLogic.ts` 顶部 import 区追加：

```typescript
import { RESIDENCE_TYPES, RESIDENCE_TYPES_WITH_CAVE } from '@/types/building';
```

- [ ] **Step 2: 替换 autoAssignBuilding 中的居所排除（第 24-26 行）**

将：

```typescript
  if (b.type === 'outer_residence' || b.type === 'inner_residence' ||
      b.type === 'core_residence' || b.type === 'cave_mansion') return false;
```

替换为：

```typescript
  if (RESIDENCE_TYPES_WITH_CAVE.includes(b.type as BuildingType)) return false;
```

（若 `BuildingType` 未导入，则在 import 中补 `import type { BuildingType } from '@/types/building';`）

- [ ] **Step 3: 删除 gameLogic.ts 内的本地居所常量定义**

删除第 100-107 行的：

```typescript
const RESIDENCE_TYPES = ['core_residence', 'inner_residence', 'outer_residence'] as const;
const ALL_RESIDENCE_TYPES = ['core_residence', 'inner_residence', 'outer_residence', 'cave_mansion'] as const;
```

并在所有引用 `RESIDENCE_TYPES`（本地 3 元版）的地方确认语义一致——本地版顺序为 core/inner/outer，导出版为 outer/inner/core。检查 `autoAssignResidence` 是否依赖顺序：

- 若 `autoAssignResidence` 按数组顺序遍历分配居所类型，需保持原顺序。将导出常量改为不依赖顺序的 `includes` 判断，或在 `autoAssignResidence` 内保留局部有序数组。

**安全做法**：保留 `autoAssignResidence` 内的局部有序数组，仅把"是否居所"的判断替换为 `RESIDENCE_TYPES_WITH_CAVE.includes`。删除 `ALL_RESIDENCE_TYPES`，将其引用替换为 `RESIDENCE_TYPES_WITH_CAVE`。

- [ ] **Step 4: 替换 autoAssignManagers / monthlyReassign 中的 Set**

将第 175 行 `const RESIDENCE_TYPES_SET = new Set(['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion']);` 替换为：

```typescript
  const RESIDENCE_TYPES_SET = new Set<string>(RESIDENCE_TYPES_WITH_CAVE);
```

同理替换第 237 行。

- [ ] **Step 5: 验证既有测试不破**

Run: `npx vitest run src/utils/gameLogic.test.ts`
Expected: 全部 PASS（34 个测试）

- [ ] **Step 6: Commit**

```bash
git add src/utils/gameLogic.ts
git commit -m "refactor(gameLogic): 居所判定改用导出常量"
```

---

### Task 7: 替换组件层居所字面量

**Files:**
- Modify: `src/components/BuildingsPanel.tsx:116, 133, 140, 210, 638, 678, 725`
- Modify: `src/components/EldersPanel.tsx:17`
- Modify: `src/components/AllocationPanel.tsx` (如存在居所字面量)

- [ ] **Step 1: BuildingsPanel.tsx 添加 import**

在 `src/components/BuildingsPanel.tsx` 顶部 import 区追加：

```typescript
import { RESIDENCE_TYPES, RESIDENCE_TYPES_WITH_CAVE } from '@/types/building';
```

- [ ] **Step 2: 替换所有居所字面量**

将 `BuildingsPanel.tsx` 中所有 `['outer_residence', 'inner_residence', 'core_residence']` 替换为 `RESIDENCE_TYPES`（注意：此处为数组比较场景，用 `RESIDENCE_TYPES.includes(building.type)`）。

将所有 `['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion']` 替换为 `RESIDENCE_TYPES_WITH_CAVE`。

具体行号：116、133、140、210、638、678、725。

- [ ] **Step 3: EldersPanel.tsx 替换**

将 `src/components/EldersPanel.tsx` 第 17 行 `const RESIDENCE_TYPES = ['outer_residence', 'inner_residence', 'core_residence'];` 删除，改为从 `@/types/building` 导入同名常量。

- [ ] **Step 4: AllocationPanel.tsx 检查并替换**

Run: `grep -n "outer_residence.*inner_residence" src/components/AllocationPanel.tsx`

对每处命中，按语义替换为 `RESIDENCE_TYPES` 或 `RESIDENCE_TYPES_WITH_CAVE`。

- [ ] **Step 5: 验证编译与既有测试**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 无错误；全部测试 PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/BuildingsPanel.tsx src/components/EldersPanel.tsx src/components/AllocationPanel.tsx
git commit -m "refactor(components): 居所判定统一使用导出常量"
```

---

### Task 8: 升级/降级 UI 展示三类资源

**Files:**
- Modify: `src/components/BuildingsPanel.tsx` (升级区域与降级区域)

- [ ] **Step 1: 升级区域展示贡献与声望**

在 `src/components/BuildingsPanel.tsx` 升级区域（约第 651-660 行费用展示处），现有代码已展示 `contribution`（Star 图标）。在 contribution 之后追加声望展示：

```tsx
                          {detailUpgradeCost.reputation && detailUpgradeCost.reputation > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-blue-300">
                              <Star size={12} /> {detailUpgradeCost.reputation}
                            </span>
                          )}
```

- [ ] **Step 2: 降级区域展示三类返还**

在降级区域（约第 676-718 行），现有代码仅展示 `refundStones`。扩展为展示三类返还。将：

```tsx
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0">
                          <Gem size={12} /> 返还 {refundStones}
                        </div>
```

替换为：

```tsx
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400 shrink-0 flex-wrap justify-end">
                          <span className="flex items-center gap-1"><Gem size={12} /> {refundStones}</span>
                          {(() => {
                            const c = isRes
                              ? getResidenceUpgradeCost({ ...selectedBuilding, level: selectedBuilding.level - 1 })?.contribution ?? 0
                              : selectedBuilding.upgradeCosts[selectedBuilding.level - 2]?.contribution ?? 0;
                            return c > 0 ? <span className="flex items-center gap-1 text-amber-400"><Star size={12} /> {c}</span> : null;
                          })()}
                          {(() => {
                            const r = isRes
                              ? getResidenceUpgradeCost({ ...selectedBuilding, level: selectedBuilding.level - 1 })?.reputation ?? 0
                              : selectedBuilding.upgradeCosts[selectedBuilding.level - 2]?.reputation ?? 0;
                            return r > 0 ? <span className="flex items-center gap-1 text-blue-300"><Star size={12} /> {r}</span> : null;
                          })()}
                        </div>
```

- [ ] **Step 3: 更新降级确认弹窗文案**

将降级按钮的 `confirm` 弹窗文案（约第 708 行）从：

```typescript
`确认将「${selectedBuilding.name}」降级至 Lv.${selectedBuilding.level - 1}？返还 ${refundStones} 灵石。`
```

改为：

```typescript
`确认将「${selectedBuilding.name}」降级至 Lv.${selectedBuilding.level - 1}？将返还升级时消耗的资源。`
```

- [ ] **Step 4: 处理 downgradeBuilding 新返回结构**

降级按钮 `onClick` 中现有 `const r = downgradeBuilding(selectedBuilding.id);`，`r` 现含 `refundContribution` / `refundReputation`。若 `!r.success && r.reason` 则 alert（既有逻辑保持）。无需额外改动。

- [ ] **Step 5: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/components/BuildingsPanel.tsx
git commit -m "feat(ui): 升级/降级展示三类资源（灵石/贡献/声望）"
```

---

### Task 9: 全量测试与构建验证

- [ ] **Step 1: 运行全部单元测试**

Run: `npx vitest run`
Expected: 全部 PASS（含新增 4 个 + 既有 76 个）

- [ ] **Step 2: TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 生产构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: Commit 任何遗漏改动**

```bash
git add -A
git commit -m "chore: 建筑降级返还增强 - 构建验证通过"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 建筑降级功能：Task 5 重写 downgradeBuilding
- ✅ 降级后返还升级资源：Task 5 返还灵石+贡献+声望三类
- ✅ 升级同步扣资源（修复既有 bug）：Task 4
- ✅ 居所判定统一：Task 1 + Task 6 + Task 7

**2. Placeholder scan:** 无 TBD/TODO，每步含完整代码。

**3. Type consistency:** `downgradeBuilding` 接口签名（Task 5 Step 1）与实现（Task 5 Step 2）返回结构一致：`{ success, refundSpiritStones, refundContribution, refundReputation, reason? }`。`RESIDENCE_TYPES` 在 Task 1 定义、Task 4/5/6/7 引用，名称一致。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-02-building-downgrade-refund.md`. Two execution options:

1. **Subagent-Driven (recommended)** - 每个任务派发独立子代理，任务间审查
2. **Inline Execution** - 当前会话内批量执行，含检查点

后续计划 B/C/D/E 将依次创建。

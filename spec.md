# 阶段四规格：英灵祠（enshrinement_hall）

## 目标

为宗门增加一座可建造、可升级的「英灵祠」建筑：供奉寿终且生前有功绩的弟子，为全宗提供长期增益。形成「培养弟子 → 弟子立功 → 寿终后入祠 → 宗门获得长期回报」的闭环，而不是单纯多一个数值建筑。

## 设计规则（可玩性优先）

1. **进驻条件**
   - 仅「寿终」弟子可入祠；叛逃者不可入祠。
   - 生前贡献点 ≥ 100（有功绩）。
2. **容量**
   - Lv1 = 2、Lv2 = 4、Lv3 = 6 位英灵（`getEnshrinementCapacity`）。
   - 超出容量的英灵保留记录但「休眠」，不提供加成；降级时自然按顺序保留前 N 位。
3. **单英灵增益（按生前贡献分档）**
   - 功绩一档（贡献 100–299）：每月声望 +1，全宗修炼 +1%
   - 功绩二档（贡献 300–999）：每月声望 +2，全宗修炼 +2%
   - 功绩三档（贡献 ≥1000）：每月声望 +3，全宗修炼 +3%
   - 合计增益 = 所有「入驻且未休眠」英灵之和。
   - 建筑必须 `status === 'active'` 才生效；关闭后增益归零（与其它建筑一致）。
4. **不做的事**
   - 不引入供奉消耗（容量本身就是限制），避免操作繁琐。
   - 不新增战力百分比（战力函数调用点过多，收益/风险不匹配）；修炼与声望已足够体现「英灵庇佑」。
   - 不自动供奉，必须玩家手动选择，保证「纪念谁」的决策感。

## 数据模型

新建 `src/types/enshrinement.ts`：

```ts
import type { Disciple, DiscipleStatus, Realm } from '@/types/disciple';

export interface FallenDisciple {
  id: string;              // 原弟子 id（同一弟子只记录一次）
  name: string;
  status: DiscipleStatus;  // 生前身份
  realm: Realm;            // 生前境界
  contribution: number;    // 寿终时贡献点
  age: number;             // 享年
  avatarSeed: Disciple['avatarSeed'];
  deathYear: number;
  deathMonth: number;
  enshrined: boolean;      // 是否已供奉
}
```

新建 `src/domain/enshrinement.ts`：

```ts
export const ENSHRINEMENT_MIN_CONTRIBUTION = 100;
export function getEnshrinementCapacity(level: number): number; // 0/2/4/6
export function getSpiritMeritTier(contribution: number): 1 | 2 | 3;
export function canEnshrine(
  fallen: FallenDisciple,
  hallLevel: number,
  enshrinedCount: number,
): { ok: boolean; reason?: string };
export interface EnshrinementBonus {
  activeSpirits: FallenDisciple[];
  reputationPerMonth: number;
  cultivationPercent: number;
}
export function getEnshrinementBonus(
  fallen: FallenDisciple[],
  hallLevel: number,
  hallActive: boolean,
): EnshrinementBonus;
```

`getEnshrinementBonus` 只统计 `enshrined === true` 且数量不超过容量的前 N 位（按数组顺序，即供奉先后）。

## 文件与改动清单

### 1. `src/types/building.ts`

- `BuildingType` 联合增加 `'enshrinement_hall'`。
- `BuildingTypeNames` 增加 `enshrinement_hall: '英灵祠'`。

### 2. `src/data/buildings.ts`

新增配置：

```ts
enshrinement_hall: {
  type: 'enshrinement_hall',
  name: '英灵祠',
  maxLevel: 3,
  baseOutput: { spiritStones: 0 },
  baseMaintenanceCost: 20,
  buildCost: { spiritStones: 1500 },
  upgradeCosts: [
    { spiritStones: 1200 },
    { spiritStones: 3000 },
  ],
  discipleCapacity: 0,          // 不驻守弟子，避免堂主/分配逻辑
  category: 'special',
  primaryOutput: 'spiritStones',
  unlockRequirement: {
    buildings: [{ type: 'mountain_gate', level: 2 }],
    reputation: 200,
  },
  description: '供奉寿终有功弟子之祠；英灵按生前功绩庇佑宗门，每月增加声望并提升全宗修炼速度。',
  discipleEffect: {
    type: 'cultivation',
    description: '每位英灵：每月声望+1~3，全宗修炼+1%~3%（按生前贡献分档）',
    value: '声望 / 修炼',
  },
},
```

### 3. `src/utils/gameLogic.ts`

- `MAINTENANCE_COST_TABLE` 增加 `enshrinement_hall: [20, 40, 80]`。
- `DiscipleDepartureResult` 增加字段：

```ts
fallenDisciples: Array<{
  id: string; name: string; status: DiscipleStatus; realm: Realm;
  contributionPoints: number; age: number; avatarSeed: Disciple['avatarSeed'];
}>;
```

- `processDiscipleDepartures`：
  - 初始化 `fallenDisciples: []`；
  - 仅在 `reason === 'death'` 分支 push 一条记录（叛逃不记录）；
  - 不改动现有遗产/通知逻辑。

### 4. `src/store/gameStore.ts`

- `GameState` 增加 `fallenDisciples: FallenDisciple[]`。
- 新增 actions：
  - `enshrineDisciple(fallenId: string): boolean`
  - `unenshrineDisciple(fallenId: string): boolean`
  - 实现：校验英灵祠存在且 active、容量未满、贡献达标；成功后更新 `fallenDisciple` 并弹通知；失败返回 false（UI 显示原因）。
- `nextMonth`：
  - 在弟子月度循环前计算一次：
    ```ts
    const hall = buildings.find(b => b.type === 'enshrinement_hall');
    const enshrineBonus = getEnshrinementBonus(
      state.fallenDisciples, hall?.level ?? 0, hall?.status === 'active',
    );
    ```
  - 弟子 `bonusBuffs` 中追加（仅当 `cultivationPercent > 0`）：
    ```ts
    {
      id: 'enshrinement_blessing', name: '英灵庇佑',
      description: `英灵祠庇佑，修炼+${cultivationPercent}%`,
      type: 'cultivation', value: cultivationPercent,
      duration: 1, remainingMonths: 1,
    }
    ```
    复用现有 buff 机制（`processMonthlyCultivation` 已按根骨发挥比例计入）。
  - 声望结算行改为：
    ```ts
    reputation += reputationChange + buildingReputation + enshrineBonus.reputationPerMonth + rivalRepGain - rivalRepLoss;
    ```
  - 处理 `depResult.fallenDisciples`：追加到 `state.fallenDisciples`，补 `deathYear/deathMonth/enshrined:false`；最终 `set` 中写入。
  - 若英灵祠不存在，`fallenDisciples` 仍记录（可日后建祠再供奉），避免玩家错过。
- persist `version: 13 → 14`，`migrate`：
  - `if (!state.fallenDisciples) state.fallenDisciples = [];`
  - `validTypes` 集合加入 `'enshrinement_hall'`。
- 初始存档/新游戏：`initialState` 中 `fallenDisciples: []`（英灵祠不预建，需玩家建造）。

### 5. `src/components/BuildingsPanel.tsx`

- 从 store 取 `fallenDisciple` 数据与两个新 action。
- 在 `{selectedBuilding.discipleCapacity > 0 && (` 之前新增：

```
{selectedBuilding.type === 'enshrinement_hall' && (...)}
```

面板内容：
- 标题「英灵祠 · 英灵庇佑」+ 当前等级。
- 容量：`已供奉 X / 容量 N`。
- 增益汇总：`每月声望 +A · 全宗修炼 +B%`。
- 已供奉列表：头像、姓名、生前身份/境界、贡献、档位、移出按钮。
- 可供奉候选人（`contribution >= 100 && !enshrined`）：点击供奉；容量满时禁用并提示。
- 升级按钮：复用 `getUpgradeCost` / `canUpgrade` / `handleUpgrade`。
- 关闭/启用按钮：复用 `toggleBuilding`；关闭时提示「英灵庇佑暂停」。
- 空态文案：「尚无弟子入祠。寿终且贡献≥100 的弟子可在此供奉。」

### 6. `src/components/MountainScene.tsx`

`BUILDING_POSITIONS` 增加 `enshrinement_hall: { x: 27, y: 60, scale: 0.8, layer: 3 }`，避免默认坐标导致建筑重叠。

### 7. 建筑图片（视觉完整性）

- 生成一张水墨风「英灵祠」建筑图，保存为 `public/buildings/enshrinement-hall.png`。
- `src/data/buildingImages.ts` 增加 `enshrinement_hall: '/buildings/enshrinement-hall.png'`。
- 若生成失败则不加映射，MountainScene 会自动显示首字回退「英」，不阻塞功能。

## 验证

1. `npx tsc -b --noEmit` 通过。
2. `npx vitest run` 全绿，且新增：
   - `src/domain/enshrinement.test.ts`
     - 容量 0/2/4/6；
     - 功绩档位边界 99/100/299/300/999/1000；
     - `canEnshrine`：贡献不足、容量已满、已供奉、正常；
     - `getEnshrinementBonus`：未开启为 0、关闭为 0、超容量只计前 N、合计数值正确。
   - `src/utils/gameLogic.test.ts`
     - 寿终弟子会生成 `fallenDisciples` 记录（含贡献/享年）；
     - 叛逃弟子不会生成记录。
3. 手工验证：
   - 新游戏可建造英灵祠（山门 Lv2 + 声望 200 + 1500 灵石）。
   - 弟子寿终后出现在候选人列表；供奉后下月声望与修炼 buff 生效；关闭建筑后增益归零。
   - 旧存档可正常读取，`fallenDisciple` 初始化为空。

## 明确不做

- 不做英灵战力加成、不做供奉消耗、不做自动供奉、不做英灵专属技能。
- 不改动现有弟子死亡/继承/遗产规则。

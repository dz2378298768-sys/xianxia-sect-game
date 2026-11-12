# 任务清单：阶段 4 英灵祠

## T1 类型与配置

- [x] T1.1 新建 `src/types/enshrinement.ts`：`FallenDisciple`。
- [x] T1.2 `src/types/building.ts`：`BuildingType` 与 `BuildingTypeNames` 增加 `enshrinement_hall` / 英灵祠。
- [x] T1.3 `src/data/buildings.ts`：新增英灵祠配置（Lv1-3、1500 灵石、山门 Lv2 + 声望 200 解锁、不驻守弟子）。
- [x] T1.4 `src/utils/gameLogic.ts`：`MAINTENANCE_COST_TABLE.enshrinement_hall = [20, 40, 80]`。

## T2 领域逻辑

- [x] T2.1 新建 `src/domain/enshrinement.ts`：
  - `ENSHRINEMENT_MIN_CONTRIBUTION = 100`；
  - `getEnshrinementCapacity`（0/2/4/6）；
  - `getSpiritMeritTier`（100/300/1000 分档）；
  - `canEnshrine`；
  - `getEnshrinementBonus`（仅 active + 前 N 位 enshrined 生效）。

## T3 死亡记录与存档

- [x] T3.1 `DiscipleDepartureResult` 增加 `fallenDisciples`，寿终分支写入记录（叛逃不写）。
- [x] T3.2 `GameState` 增加 `fallenDisciples`，初始为空。
- [x] T3.3 `nextMonth` 追加本月寿终记录（deathYear/deathMonth/enshrined:false）。
- [x] T3.4 persist version 13 → 14；migrate 初始化 `fallenDisciple` 并把 `enshrinement_hall` 加入 validTypes。

## T4 增益接入与操作

- [x] T4.1 store 新增 `enshrineDisciple` / `unenshrineDisciple`（校验建筑、容量、贡献）。
- [x] T4.2 `nextMonth` 弟子 `bonusBuffs` 注入「英灵庇佑」修炼 buff。
- [x] T4.3 声望结算加入 `enshrinement reputationPerMonth`。

## T5 UI 与场景

- [x] T5.1 `BuildingsPanel` 新增英灵祠专属面板：容量、增益汇总、已供奉列表、候选人供奉、移出、升级、关闭/启用。
- [x] T5.2 `MountainScene` 增加英灵祠坐标，避免重叠。
- [x] T5.3 生成水墨建筑图 `public/buildings/enshrinement-hall.png` 并接入 `buildingImages.ts`（失败则回退首字）。

## T6 测试与校验

- [x] T6.1 新增 `src/domain/enshrinement.test.ts`（容量、档位边界、入驻校验、增益聚合）。
- [x] T6.2 `src/utils/gameLogic.test.ts` 补充寿终记录 / 叛逃不记录。
- [x] T6.3 `npx tsc -b --noEmit` 通过。
- [x] T6.4 `npx vitest run` 全绿。

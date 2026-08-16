/** 弟子战力构成明细 */
export interface CombatPowerBreakdown {
  realmBase: number;           // 境界基础战力
  talentBonus: number;         // 天赋加成（根骨/灵韵/道缘贡献值）
  statusMultiplier: number;    // 身份倍率
  basePower: number;           // 基础战力 = realmBase * (1 + talentBonus/100) * statusMultiplier

  secretBonus: number;         // 秘籍加成
  techniqueBonus: number;      // 功法加成
  battleBonus: number;         // 战技加成
  bookBonusTotal: number;      // 总书籍加成百分比

  artifactBonus: number;       // 法器战力
  talismanBonus: number;       // 符箓战力
  beastBonus: number;          // 灵兽战力
  equipmentBonus: number;      // 总装备战力

  total: number;               // 最终战力
}

/** 宗门战力汇总 */
export interface SectCombatSummary {
  totalPower: number;
  basePower: number;
  discipleCount: number;
  /** 按身份分组的战力 */
  byStatus: { status: string; count: number; power: number }[];
  /** 按境界分组的战力 */
  byRealm: { realm: string; count: number; power: number }[];
  /** 建筑加成明细 */
  buildingBonuses: { name: string; multiplier: number; description: string }[];
  /** 最强弟子 Top5 */
  topDisciples: { id: string; name: string; status: string; realm: string; power: number }[];
}
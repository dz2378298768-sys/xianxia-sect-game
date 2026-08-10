/**
 * 围攻战报：本宗被攻时由 gameStore 推入 uiStore.siegeReport，触发 SiegeReportModal。
 * 同时供玩家防守成功 / 失败的弹窗共用。
 */
export interface SiegeReportData {
  /** 弹窗标题，例如「宗门被围攻」「击退来犯」「正道联军破山」 */
  title: string;
  /** 战报描述（攻方名字、战力对比、损失摘要） */
  description: string;
  /** 攻方宗门名称列表 */
  attackers: string[];
  /** 本宗是否获胜（true=击退、false=被攻破） */
  isPlayerVictory: boolean;
  /** 本月灵石损失（仅在被攻破时为正，击退时为 0） */
  stoneLoss: number;
  /** 本月声望变化（正=获得，负=失去） */
  repLoss: number;
  /** 弟子阵亡数量（0 表示无） */
  deadDisciples: number;
  /** 游戏内日期 */
  date: { year: number; month: number };
  /** 触发的源头，用于弹窗额外分支 */
  source: 'rival' | 'coalition';
}
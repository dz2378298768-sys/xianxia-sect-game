/** 物品品质等级 */
export type ItemQuality = 'mortal' | 'fine' | 'perfect' | 'immortal';

export const QualityNames: Record<ItemQuality, string> = {
  mortal: '凡品',
  fine: '良品',
  perfect: '极品',
  immortal: '仙品',
};

export const QualityColors: Record<ItemQuality, string> = {
  mortal: 'text-gray-400',
  fine: 'text-green-400',
  perfect: 'text-purple-400',
  immortal: 'text-yellow-300',
};

export const QualityColorClasses: Record<ItemQuality, string> = {
  mortal: 'from-gray-500/30 to-gray-600/20 border-gray-600/30',
  fine: 'from-green-500/30 to-green-600/20 border-green-600/30',
  perfect: 'from-purple-500/30 to-purple-600/20 border-purple-600/30',
  immortal: 'from-yellow-500/30 to-amber-600/20 border-amber-600/30',
};

/** 品质对基础属性的倍率 */
export const QualityMultipliers: Record<ItemQuality, number> = {
  mortal: 1.0,
  fine: 1.5,
  perfect: 2.5,
  immortal: 4.0,
};

/** 品质对应的炼制难度系数（影响成功率） */
export const QualityDifficulty: Record<ItemQuality, number> = {
  mortal: 1.0,
  fine: 0.75,
  perfect: 0.4,
  immortal: 0.15,
};

/** 辅助材料定义 */
export interface CraftingMaterial {
  name: string;
  amount: number;
  optional?: boolean; // 可选辅料，投入可提升品质概率
}

/** 配方定义 */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  /** 基础材料 */
  baseMaterials: CraftingMaterial[];
  /** 可选辅料（投入可提升品质） */
  optionalMaterials?: CraftingMaterial[];
  /** 基础炼制天数 */
  baseCraftTime: number;
  /** 解锁条件描述 */
  unlockHint?: string;
  /** 来源标签（如：初始、探索获得、传承解锁） */
  source: 'initial' | 'exploration' | 'legacy' | 'tournament' | 'event';
}

/** 炼制任务 */
export interface CraftingTask {
  id: string;
  recipeId: string;
  category: 'pill' | 'artifact' | 'talisman';
  itemType: string;
  /** 炼制弟子 ID */
  discipleId: string | null;
  /** 目标品质 */
  targetQuality: ItemQuality;
  /** 已消耗天数 */
  elapsedDays: number;
  /** 总需天数 */
  totalDays: number;
  /** 数量 */
  quantity: number;
  /** 是否自动续炼 */
  autoRefill: boolean;
  status: 'in_progress' | 'completed';
  /** 最终品质（完成后填充） */
  resultQuality?: ItemQuality;
}

/** 炼制结果 */
export interface CraftingResult {
  taskId: string;
  recipeId: string;
  category: 'pill' | 'artifact' | 'talisman';
  itemType: string;
  quality: ItemQuality;
  quantity: number;
  isCritical: boolean; // 暴击（额外产出）
}
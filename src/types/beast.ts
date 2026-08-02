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

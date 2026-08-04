// 特殊材料配置：炼制丹药/法器/符箓所需的稀有原料。
// 基础材料（灵草/灵铁/符纸）由生产建筑产出，特殊材料需通过商店购买或秘境试炼掉落获得。
import type { IconName } from '@/components/icons/SectIcons';

export interface SpecialMaterialConfig {
  name: string;          // 材料名（与配方 materials[].name 严格一致）
  description: string;   // 描述
  price: number;         // 商店购买价（灵石）；出售价 = floor(price * 0.5)
  rarity: 'common' | 'uncommon' | 'rare' | 'epic'; // 稀有度
  iconName: IconName;    // 图标
  source: string;        // 主要获取渠道描述
}

// 基础材料名集合（用于区分基础/特殊）
export const BASIC_MATERIALS = new Set(['灵草', '玄铁', '灵铁', '矿石', '灵纸', '符纸']);

// 20 种特殊材料（与 PILL/ARTIFACT/TALISMAN_CONFIGS 配方中出现的特殊材料一一对应）
export const SPECIAL_MATERIALS: SpecialMaterialConfig[] = [
  // —— 丹药专用 ——
  { name: '寿元花', description: '蕴含寿元之力的奇花，炼制增寿丹的核心材料', price: 200, rarity: 'rare', iconName: 'herb', source: '秘境试炼掉落' },
  { name: '清心莲', description: '生于灵泉之畔，可清心定神，炼制清心丹所需', price: 80, rarity: 'uncommon', iconName: 'herb', source: '秘境试炼掉落' },
  { name: '灵晶', description: '凝结天地灵气的晶石，炼制聚气丹所需', price: 120, rarity: 'uncommon', iconName: 'gem', source: '秘境试炼掉落' },
  { name: '玄铁粉', description: '玄铁研磨而成的细粉，炼制锻骨丹所需', price: 60, rarity: 'common', iconName: 'crystal', source: '商店购买/秘境' },
  // —— 法器专用 ——
  { name: '龟甲', description: '千年玄龟的甲壳，坚硬异常，炼制玄龟盾所需', price: 90, rarity: 'uncommon', iconName: 'crystal', source: '妖物试炼掉落' },
  { name: '火晶石', description: '蕴含烈焰之力的矿石，炼制赤焰刀所需', price: 150, rarity: 'rare', iconName: 'crystal', source: '秘境试炼掉落' },
  { name: '精钢', description: '百炼成钢的优质金属，炼制赤焰刀所需', price: 50, rarity: 'common', iconName: 'crystal', source: '商店购买/妖物' },
  { name: '灵玉', description: '温润灵秀的玉石，炼制聚灵瓶/八卦玄光镜所需', price: 180, rarity: 'rare', iconName: 'gem', source: '秘境试炼掉落' },
  { name: '灵液', description: '灵泉凝练的液态灵气，炼制聚灵瓶所需', price: 100, rarity: 'uncommon', iconName: 'steam', source: '秘境试炼掉落' },
  { name: '空冥石', description: '蕴含空间之力的奇石，炼制须弥戒/传送符所需', price: 300, rarity: 'epic', iconName: 'crystal', source: '秘境试炼掉落' },
  { name: '万年玄冰', description: '万载不化的玄冰，炼制须弥戒所需', price: 250, rarity: 'epic', iconName: 'crystal', source: '秘境试炼掉落' },
  { name: '雷泽石', description: '雷泽中诞生的雷属性矿石，炼制九霄雷珠/惊雷符所需', price: 200, rarity: 'rare', iconName: 'crystal', source: '秘境试炼掉落' },
  { name: '镜砂', description: '可反光的特殊砂矿，炼制八卦玄光镜所需', price: 120, rarity: 'uncommon', iconName: 'crystal', source: '商店购买/秘境' },
  { name: '七宝砂', description: '七种灵材熔炼而成的神砂，炼制七宝镇妖塔所需', price: 500, rarity: 'epic', iconName: 'gem', source: '秘境试炼掉落' },
  { name: '万年玄铁', description: '万年地火淬炼的玄铁，炼制七宝镇妖塔所需', price: 400, rarity: 'epic', iconName: 'crystal', source: '秘境试炼掉落' },
  // —— 符箓专用 ——
  { name: '冰晶', description: '极寒之地的冰之结晶，炼制寒冰符所需', price: 70, rarity: 'uncommon', iconName: 'crystal', source: '商店购买/秘境' },
  { name: '隐灵草', description: '可隐匿气息的灵草，炼制隐身符所需', price: 90, rarity: 'uncommon', iconName: 'herb', source: '秘境试炼掉落' },
  { name: '朱砂', description: '镇邪驱煞的红色矿石，炼制镇宅符所需', price: 40, rarity: 'common', iconName: 'crystal', source: '商店购买/妖物' },
  { name: '剑意草', description: '蕴含剑意的灵草，炼制剑气符所需', price: 110, rarity: 'rare', iconName: 'herb', source: '秘境试炼掉落' },
  { name: '风灵羽', description: '风灵鸟的羽毛，炼制神行符所需', price: 130, rarity: 'rare', iconName: 'scrollText', source: '秘境试炼掉落' },
];

// 名称 → 配置映射
export const SPECIAL_MATERIAL_MAP: Record<string, SpecialMaterialConfig> = Object.fromEntries(
  SPECIAL_MATERIALS.map(m => [m.name, m]),
);

/** 判断材料名是否为特殊材料（非基础材料） */
export function isSpecialMaterial(name: string): boolean {
  return !BASIC_MATERIALS.has(name);
}

/** 获取特殊材料商店售价（未知材料返回 0） */
export function getSpecialMaterialPrice(name: string): number {
  return SPECIAL_MATERIAL_MAP[name]?.price ?? 0;
}

/** 稀有度展示标签 */
export const RARITY_LABEL: Record<string, string> = {
  common: '凡品',
  uncommon: '灵品',
  rare: '珍品',
  epic: '仙品',
};

/** 稀有度对应颜色 */
export const RARITY_COLOR: Record<string, string> = {
  common: 'text-sect-jade/70',
  uncommon: 'text-green-400',
  rare: 'text-blue-300',
  epic: 'text-amber-300',
};

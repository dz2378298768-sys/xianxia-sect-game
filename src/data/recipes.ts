import type { Recipe } from '@/types/crafting';

/**
 * 丹药配方
 * 每个配方对应一个 PillType，包含基础材料、可选辅料和炼制信息
 */
export const PILL_RECIPES: Recipe[] = [
  {
    id: 'pill_foundation',
    name: '筑基丹',
    description: '辅助炼气期修士突破筑基期的丹药',
    baseMaterials: [{ name: '灵草', amount: 5 }],
    optionalMaterials: [
      { name: '灵晶', amount: 1, optional: true },
    ],
    baseCraftTime: 3,
    source: 'initial',
  },
  {
    id: 'pill_golden',
    name: '金丹破障丹',
    description: '辅助筑基期修士突破金丹期的丹药',
    baseMaterials: [{ name: '灵草', amount: 9 }],
    optionalMaterials: [
      { name: '灵晶', amount: 2, optional: true },
      { name: '火晶石', amount: 1, optional: true },
    ],
    baseCraftTime: 7,
    source: 'initial',
    unlockHint: '宗门达到小有名气',
  },
  {
    id: 'pill_nascent',
    name: '元婴化灵丹',
    description: '辅助金丹期修士突破元婴期的丹药',
    baseMaterials: [{ name: '灵草', amount: 15 }],
    optionalMaterials: [
      { name: '灵玉', amount: 2, optional: true },
      { name: '灵液', amount: 3, optional: true },
    ],
    baseCraftTime: 15,
    source: 'initial',
    unlockHint: '宗门达到声名鹊起',
  },
  {
    id: 'pill_spirit',
    name: '化神渡劫丹',
    description: '辅助元婴期修士突破化神期的丹药',
    baseMaterials: [{ name: '灵草', amount: 20 }],
    optionalMaterials: [
      { name: '万年玄冰', amount: 1, optional: true },
      { name: '七宝砂', amount: 1, optional: true },
    ],
    baseCraftTime: 30,
    source: 'initial',
    unlockHint: '宗门达到一方霸主',
  },
  {
    id: 'pill_recovery',
    name: '回灵丹',
    description: '恢复修炼值的基础丹药，赠送弟子可恢复修为进度',
    baseMaterials: [{ name: '灵草', amount: 4 }],
    baseCraftTime: 1,
    source: 'initial',
  },
  {
    id: 'pill_longevity',
    name: '增寿丹',
    description: '增加十年寿命，赠送弟子可延寿',
    baseMaterials: [{ name: '寿元花', amount: 8 }],
    optionalMaterials: [
      { name: '万年玄冰', amount: 1, optional: true },
    ],
    baseCraftTime: 150,
    source: 'initial',
    unlockHint: '需获得寿元花',
  },
  {
    id: 'pill_detox',
    name: '清心丹',
    description: '祛除心魔杂念，赠送弟子可提升突破成功率',
    baseMaterials: [{ name: '灵草', amount: 5 }, { name: '清心莲', amount: 2 }],
    baseCraftTime: 2,
    source: 'initial',
  },
  {
    id: 'pill_qi_gathering',
    name: '聚气丹',
    description: '凝聚天地灵气，赠送弟子可大幅提升突破成功率',
    baseMaterials: [{ name: '灵草', amount: 6 }, { name: '灵晶', amount: 2 }],
    baseCraftTime: 3,
    source: 'initial',
  },
  {
    id: 'pill_body_forging',
    name: '锻骨丹',
    description: '淬炼筋骨，赠送弟子可提升突破成功率',
    baseMaterials: [{ name: '灵草', amount: 8 }, { name: '玄铁粉', amount: 4 }],
    baseCraftTime: 8,
    source: 'initial',
    unlockHint: '需获得玄铁粉',
  },
];

/**
 * 法器配方
 */
export const ARTIFACT_RECIPES: Recipe[] = [
  {
    id: 'artifact_flying_sword',
    name: '青锋剑',
    description: '入门级法剑，可提升弟子战力',
    baseMaterials: [{ name: '玄铁', amount: 5 }],
    optionalMaterials: [
      { name: '精钢', amount: 2, optional: true },
    ],
    baseCraftTime: 3,
    source: 'initial',
  },
  {
    id: 'artifact_defensive_shield',
    name: '玄龟盾',
    description: '以玄龟甲炼制的防御法器，坚不可摧',
    baseMaterials: [{ name: '玄铁', amount: 15 }, { name: '龟甲', amount: 5 }],
    optionalMaterials: [
      { name: '灵玉', amount: 1, optional: true },
    ],
    baseCraftTime: 80,
    source: 'initial',
    unlockHint: '需获得龟甲',
  },
  {
    id: 'artifact_attack_talisman',
    name: '赤焰刀',
    description: '蕴含烈火之力的长刀法器',
    baseMaterials: [{ name: '火晶石', amount: 8 }, { name: '精钢', amount: 18 }],
    optionalMaterials: [
      { name: '雷泽石', amount: 2, optional: true },
    ],
    baseCraftTime: 150,
    source: 'initial',
    unlockHint: '需获得火晶石',
  },
  {
    id: 'artifact_spirit_bottle',
    name: '聚灵瓶',
    description: '可自动汲取天地灵气的宝瓶',
    baseMaterials: [{ name: '灵玉', amount: 12 }, { name: '灵液', amount: 8 }],
    baseCraftTime: 180,
    source: 'initial',
    unlockHint: '需获得灵玉',
  },
  {
    id: 'artifact_space_ring',
    name: '须弥戒',
    description: '内藏空间的储物法器，方便携带物品',
    baseMaterials: [{ name: '空冥石', amount: 5 }, { name: '万年玄冰', amount: 4 }],
    baseCraftTime: 300,
    source: 'initial',
    unlockHint: '需获得空冥石',
  },
  {
    id: 'artifact_thunder_pearl',
    name: '九霄雷珠',
    description: '封存雷霆之力的珠子，掷出可炸裂群敌',
    baseMaterials: [{ name: '雷泽石', amount: 7 }, { name: '玄铁', amount: 10 }],
    optionalMaterials: [
      { name: '精钢', amount: 3, optional: true },
    ],
    baseCraftTime: 120,
    source: 'initial',
    unlockHint: '需获得雷泽石',
  },
  {
    id: 'artifact_bagua_mirror',
    name: '八卦玄光镜',
    description: '镜面铭刻八卦阵纹，可反制邪术',
    baseMaterials: [{ name: '灵玉', amount: 10 }, { name: '镜砂', amount: 7 }],
    baseCraftTime: 200,
    source: 'initial',
    unlockHint: '需获得镜砂',
  },
  {
    id: 'artifact_demon_pagoda',
    name: '七宝镇妖塔',
    description: '上古镇压妖邪的七层小塔，可收妖炼魔',
    baseMaterials: [{ name: '七宝砂', amount: 8 }, { name: '万年玄铁', amount: 5 }],
    baseCraftTime: 365,
    source: 'initial',
    unlockHint: '需获得七宝砂',
  },
];

/**
 * 符箓配方
 */
export const TALISMAN_RECIPES: Recipe[] = [
  {
    id: 'talisman_fire',
    name: '金刚符',
    description: '坚硬如金刚的防御符箓',
    baseMaterials: [{ name: '灵纸', amount: 2 }],
    optionalMaterials: [
      { name: '朱砂', amount: 1, optional: true },
    ],
    baseCraftTime: 2,
    source: 'initial',
  },
  {
    id: 'talisman_ice',
    name: '寒冰符',
    description: '蕴含寒冰之力的符箓，可冻结敌人',
    baseMaterials: [{ name: '冰晶', amount: 4 }, { name: '灵纸', amount: 3 }],
    baseCraftTime: 3,
    source: 'initial',
  },
  {
    id: 'talisman_thunder',
    name: '惊雷符',
    description: '蕴含雷电之力的符箓，威力强大',
    baseMaterials: [{ name: '雷泽石', amount: 5 }, { name: '灵纸', amount: 4 }],
    baseCraftTime: 7,
    source: 'initial',
    unlockHint: '需获得雷泽石',
  },
  {
    id: 'talisman_heal',
    name: '回春符',
    description: '蕴含生机之力的符箓，可恢复伤势',
    baseMaterials: [{ name: '灵草', amount: 8 }, { name: '灵纸', amount: 4 }],
    baseCraftTime: 5,
    source: 'initial',
    unlockHint: '需获得灵草',
  },
  {
    id: 'talisman_teleport',
    name: '传送符',
    description: '空间类符箓，可短距离传送',
    baseMaterials: [{ name: '空冥石', amount: 2 }, { name: '灵纸', amount: 8 }],
    baseCraftTime: 30,
    source: 'initial',
    unlockHint: '需获得空冥石',
  },
  {
    id: 'talisman_stealth',
    name: '隐身符',
    description: '可隐匿身形的符箓',
    baseMaterials: [{ name: '隐灵草', amount: 5 }, { name: '灵纸', amount: 5 }],
    baseCraftTime: 20,
    source: 'initial',
    unlockHint: '需获得隐灵草',
  },
  {
    id: 'talisman_ward',
    name: '镇宅符',
    description: '贴于山门可抵御外敌侵扰',
    baseMaterials: [{ name: '灵纸', amount: 4 }, { name: '朱砂', amount: 2 }],
    baseCraftTime: 2,
    source: 'initial',
  },
  {
    id: 'talisman_sword',
    name: '剑气符',
    description: '封存一缕剑气，激发可斩敌',
    baseMaterials: [{ name: '剑意草', amount: 4 }, { name: '灵纸', amount: 4 }],
    baseCraftTime: 8,
    source: 'initial',
    unlockHint: '需获得剑意草',
  },
  {
    id: 'talisman_divine',
    name: '神行符',
    description: '贴于腿上可日行千里',
    baseMaterials: [{ name: '风灵羽', amount: 5 }, { name: '灵纸', amount: 6 }],
    baseCraftTime: 15,
    source: 'initial',
    unlockHint: '需获得风灵羽',
  },
];

/** 按类别获取配方映射 */
export const RECIPES_BY_CATEGORY = {
  pill: PILL_RECIPES,
  artifact: ARTIFACT_RECIPES,
  talisman: TALISMAN_RECIPES,
} as const;

/** 配方 ID → 配置映射 */
export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(
  [...PILL_RECIPES, ...ARTIFACT_RECIPES, ...TALISMAN_RECIPES].map(r => [r.id, r]),
);
/**
 * 探索/游历系统数据
 * 与现有试炼系统深度整合，探索任务作为特殊试炼类型
 */

import type { ExplorationEncounter } from '@/types/game';

/** 探索区域定义 */
export interface ExplorationRegion {
  id: string;
  name: string;
  description: string;
  /** 对应试炼类型 */
  trialType: string;
  /** 最低建议战力 */
  minPower: number;
  /** 基础耗时（月） */
  baseDurationMonths: number;
  /** 风险系数 0-1 */
  riskRate: number;
  /** 遭遇概率 0-1（每月） */
  encounterChance: number;
  /** 解锁条件描述 */
  unlockHint: string;
  /** 是否初始解锁 */
  initiallyUnlocked: boolean;
}

/** 探索区域配置 */
export const EXPLORATION_REGIONS: ExplorationRegion[] = [
  {
    id: 'outer',
    name: '宗门周边',
    description: '宗门百里范围内的山野林地，相对安全，偶有低级妖兽出没，适合初出茅庐的弟子历练。',
    trialType: 'explore_outer',
    minPower: 10,
    baseDurationMonths: 1,
    riskRate: 0.1,
    encounterChance: 0.3,
    unlockHint: '初始解锁',
    initiallyUnlocked: true,
  },
  {
    id: 'forest',
    name: '妖兽森林',
    description: '绵延千里的原始森林，妖兽横行，灵草遍地。深处有上古遗迹的传说，但鲜有人敢深入。',
    trialType: 'explore_forest',
    minPower: 200,
    baseDurationMonths: 2,
    riskRate: 0.3,
    encounterChance: 0.5,
    unlockHint: '宗门达到小有名气或完成"宗门周边"探索',
    initiallyUnlocked: false,
  },
  {
    id: 'ruins',
    name: '古战场遗迹',
    description: '上古大能斗法留下的废墟，空间裂隙密布，残留的阵法和魂灵令人生畏。但也埋藏着失传的功法和法器。',
    trialType: 'explore_ruins',
    minPower: 800,
    baseDurationMonths: 3,
    riskRate: 0.5,
    encounterChance: 0.7,
    unlockHint: '宗门达到声名鹊起或在"妖兽森林"中发现地图碎片',
    initiallyUnlocked: false,
  },
  {
    id: 'secret',
    name: '天外秘境',
    description: '传闻中每甲子开启一次的秘境，其中灵气浓郁百倍，天材地宝无数。但进入者十不存一，乃是真正的险地。',
    trialType: 'explore_secret',
    minPower: 3200,
    baseDurationMonths: 6,
    riskRate: 0.7,
    encounterChance: 0.9,
    unlockHint: '宗门达到一方霸主或在"古战场遗迹"中获得完整地图',
    initiallyUnlocked: false,
  },
];

/** 探索遭遇事件池（使用 game.ts 中的 ExplorationEncounter 类型） */
export const EXPLORATION_ENCOUNTERS: ExplorationEncounter[] = [
  // 宗门周边
  {
    id: 'enc_herb_field',
    trialId: '',
    name: '发现灵草圃',
    description: '你在山涧旁发现一片野生灵草，品相不错，但附近有妖兽守护。',
    regionId: 'outer',
    choices: [
      {
        label: '悄悄采集',
        description: '趁妖兽不注意，悄悄采集灵草',
        successChance: 0.7,
        effects: {
          success: { herb: 15, spiritStones: 10, notificationText: '你成功采集到灵草，获得灵草+15，灵石+10。' },
          failure: { discipleInjury: true, notificationText: '被妖兽发现，弟子轻伤逃回，只采到少量灵草。' },
        },
      },
      {
        label: '驱逐妖兽后采集',
        description: '正面击败妖兽，独占灵草',
        successChance: 0.5,
        effects: {
          success: { herb: 30, spiritStones: 30, reputation: 5, notificationText: '你击败妖兽，获得灵草+30，灵石+30，声望+5。' },
          failure: { discipleInjury: true, notificationText: '妖兽凶猛，弟子负伤，灵草被毁。' },
        },
      },
    ],
  },
  {
    id: 'enc_wandering_merchant',
    trialId: '',
    name: '云游商人',
    description: '一位云游商人路过，向你展示了几件稀罕物件，价格公道。',
    regionId: 'outer',
    choices: [
      {
        label: '购买灵草',
        description: '花灵石购买商人的灵草',
        successChance: 0.9,
        effects: {
          success: { herb: 10, spiritStones: -20, notificationText: '你从商人处购得灵草+10，花费灵石20。' },
          failure: { spiritStones: -10, notificationText: '讨价还价失败，高价买下，花费灵石10。' },
        },
      },
      {
        label: '以物易物',
        description: '用身上的物品交换',
        successChance: 0.6,
        effects: {
          success: { specialMaterials: [{ name: '灵晶', amount: 2 }], notificationText: '你成功换得灵晶×2。' },
          failure: { notificationText: '商人看不上你的东西，交易告吹。' },
        },
      },
    ],
  },

  // 妖兽森林
  {
    id: 'enc_ancient_tree',
    trialId: '',
    name: '古树洞天',
    description: '你发现一棵千年古树，树干中空，内有乾坤。洞壁上刻满了古老的文字。',
    regionId: 'forest',
    choices: [
      {
        label: '参悟古文字',
        description: '尝试参悟树洞中的古老文字',
        successChance: 0.5,
        effects: {
          success: { reputation: 20, specialMaterials: [{ name: '灵液', amount: 3 }], notificationText: '你参悟古文字，获得灵液×3，声望+20。' },
          failure: { discipleInjury: true, notificationText: '被古树残魂攻击，神识受损。' },
        },
      },
      {
        label: '搜索树洞',
        description: '仔细搜索树洞内的每个角落',
        successChance: 0.7,
        effects: {
          success: { specialMaterials: [{ name: '万年玄冰', amount: 1 }], spiritStones: 50, notificationText: '你在树洞中找到万年玄冰×1，灵石+50。' },
          failure: { notificationText: '树洞中空空如也，只有一些虫蚁。' },
        },
      },
    ],
  },
  {
    id: 'enc_beast_lair',
    trialId: '',
    name: '妖兽巢穴',
    description: '你发现一处妖兽巢穴，母兽外出觅食，巢中有几枚妖兽蛋和一堆天材地宝。',
    regionId: 'forest',
    choices: [
      {
        label: '取走宝物，速离',
        description: '趁母兽未归，拿走宝物快速离开',
        successChance: 0.6,
        effects: {
          success: { spiritStones: 80, reputation: 5, specialMaterials: [{ name: '灵晶', amount: 5 }], notificationText: '你成功取走宝物，获得灵石+80，灵晶×5，声望+5。' },
          failure: { discipleInjury: true, notificationText: '母兽突然返回，弟子被追咬受伤，宝物散落。' },
        },
      },
      {
        label: '设下埋伏，猎杀母兽',
        description: '布下陷阱，等母兽归来一网打尽',
        successChance: 0.3,
        effects: {
          success: { spiritStones: 200, reputation: 15, herb: 20, notificationText: '你成功猎杀母兽，获得灵石+200，灵草+20，声望+15。' },
          failure: { discipleInjury: true, notificationText: '母兽异常强大，弟子重伤逃遁。' },
        },
      },
    ],
  },

  // 古战场遗迹
  {
    id: 'enc_broken_array',
    trialId: '',
    name: '残破阵眼',
    description: '你踏入一处残破的阵法遗迹，阵眼中插着一柄锈迹斑斑的古剑，隐隐有龙吟之声。',
    regionId: 'ruins',
    choices: [
      {
        label: '拔剑',
        description: '尝试拔出古剑',
        successChance: 0.4,
        effects: {
          success: { spiritStones: 300, reputation: 30, specialMaterials: [{ name: '万年玄铁', amount: 2 }], notificationText: '你成功拔出古剑，获得灵石+300，万年玄铁×2，声望+30。' },
          failure: { discipleInjury: true, notificationText: '古剑反噬，剑气入体，弟子重伤。' },
        },
      },
      {
        label: '研究阵纹',
        description: '仔细研究阵眼周围的阵纹',
        successChance: 0.6,
        effects: {
          success: { reputation: 25, specialMaterials: [{ name: '七宝砂', amount: 2 }], notificationText: '你参透部分阵纹，获得七宝砂×2，声望+25。' },
          failure: { notificationText: '阵纹残缺不全，无法参透。' },
        },
      },
    ],
  },
  {
    id: 'enc_spirit_soul',
    trialId: '',
    name: '大能残魂',
    description: '一道残魂从废墟中飘出，自称是上古大能的一缕神识，愿传你一门失传绝学，但需通过考验。',
    regionId: 'ruins',
    choices: [
      {
        label: '接受考验',
        description: '接受残魂的考验',
        successChance: 0.3,
        effects: {
          success: { reputation: 50, specialMaterials: [{ name: '空冥石', amount: 3 }], notificationText: '你通过考验，获得空冥石×3，声望+50。' },
          failure: { discipleInjury: true, notificationText: '考验失败，被残魂重创，修养数月。' },
        },
      },
      {
        label: '恭敬请教',
        description: '以礼相待，虚心请教',
        successChance: 0.7,
        effects: {
          success: { reputation: 15, specialMaterials: [{ name: '灵玉', amount: 2 }], notificationText: '残魂指点迷津，获得灵玉×2，声望+15。' },
          failure: { notificationText: '残魂消散前留下一句箴言，但未能领悟。' },
        },
      },
    ],
  },

  // 天外秘境
  {
    id: 'enc_immortal_pill',
    trialId: '',
    name: '仙丹出世',
    description: '秘境深处，一座丹炉仍在燃烧，炉中有一颗即将成型的仙丹，霞光万道。',
    regionId: 'secret',
    choices: [
      {
        label: '以精血祭炉',
        description: '以自身精血献祭，加速仙丹成型',
        successChance: 0.2,
        effects: {
          success: { spiritStones: 1000, reputation: 100, specialMaterials: [{ name: '七宝砂', amount: 5 }, { name: '万年玄冰', amount: 3 }], notificationText: '仙丹大成，获得灵石+1000，七宝砂×5，万年玄冰×3，声望+100！' },
          failure: { discipleInjury: true, notificationText: '丹炉炸裂，弟子被气浪震伤，仙丹化为飞灰。' },
        },
      },
      {
        label: '收取丹炉',
        description: '将整座丹炉带走',
        successChance: 0.5,
        effects: {
          success: { spiritStones: 500, specialMaterials: [{ name: '灵玉', amount: 5 }], notificationText: '你成功收取丹炉，获得灵石+500，灵玉×5。' },
          failure: { notificationText: '丹炉沉重无比，无法移动，只得放弃。' },
        },
      },
    ],
  },
  {
    id: 'enc_heavenly_book',
    trialId: '',
    name: '天书玉简',
    description: '一座白玉祭坛上悬浮着三枚玉简，分别记载着丹道、器道和符道的至高奥义。',
    regionId: 'secret',
    choices: [
      {
        label: '参悟丹道玉简',
        description: '集中精力参悟丹道玉简',
        successChance: 0.4,
        effects: {
          success: { reputation: 80, herb: 100, notificationText: '你参悟丹道玉简，获得大量丹道感悟，灵草+100，声望+80。' },
          failure: { discipleInjury: true, notificationText: '玉简中信息量过大，弟子神识承受不住，昏厥过去。' },
        },
      },
      {
        label: '取走所有玉简',
        description: '试图将三枚玉简全部带走',
        successChance: 0.15,
        effects: {
          success: { reputation: 200, spiritStones: 2000, notificationText: '你成功取走三枚玉简，获得灵石+2000，声望+200！' },
          failure: { discipleInjury: true, notificationText: '祭坛触发禁制，雷电交加，玉简尽毁，弟子重伤。' },
        },
      },
    ],
  },
];

/** 按区域ID获取遭遇事件 */
export function getEncountersByRegion(regionId: string): ExplorationEncounter[] {
  return EXPLORATION_ENCOUNTERS.filter(e => e.regionId === regionId);
}

/** 按区域ID获取区域配置 */
export function getRegionById(id: string): ExplorationRegion | undefined {
  return EXPLORATION_REGIONS.find(r => r.id === id);
}
import type { OtherSect, SectAlignment, SectLevel, SectRelation } from '@/types/game';
import { SectLevelOrder } from '@/types/game';
import { randomInt, pickRandom, generateId, weightedRandom } from './random';

// 宗门名字片段
const SECT_PREFIX = [
  '青云', '紫霄', '太虚', '玄天', '无量', '九华', '落霞', '苍澜',
  '碧落', '幽冥', '血月', '万妖', '天剑', '太一', '凌霄', '玉清',
  '上清', '太清', '茅山', '昆仑', '峨眉', '武当', '华山', '青城',
  '龙虎', '罗浮', '蓬莱', '方丈', '瀛洲', '玄都', '大荒', '北冥',
];

const SECT_SUFFIX_BY_ALIGNMENT: Record<SectAlignment, string[]> = {
  righteous: ['宗', '门', '阁', '观', '宫', '派', '院', '道场'],
  demonic: ['教', '魔宗', '邪宗', '鬼楼', '煞门', '渊', '狱'],
  neutral: ['谷', '庄', '楼', '岛', '坞', '会', '盟', '阁'],
};

const SECT_SPECIALTIES = [
  '剑修之道', '丹道闻名', '阵法传承', '炼器世家', '符箓精深',
  '御兽独步', '医道悬壶', '机关之术', '星辰占卜', '雷霆正法',
  '冰寒玄功', '烈焰神诀', '风行身法', '土遁厚土', '木系长生',
  '灵魂神识', '血道秘法', '光影双修', '时空玄妙', '因果天机',
];

const SECT_DESCRIPTIONS = [
  '立派百年，根深叶茂，门下弟子数千。',
  '隐世宗门，不问世事，底蕴深不可测。',
  '新近崛起，锋芒毕露，野心勃勃。',
  '老牌宗门，传承有序，名门正派。',
  '行事诡谲，亦正亦邪，令人难测。',
  '占山为王，独霸一方，实力强悍。',
  '游历天下，行踪不定，门徒稀少。',
  '富甲天下，灵石如山，财大气粗。',
  '以武入道，战力超群，嗜战好斗。',
  '清修之地，与世无争，弟子纯善。',
];

// 不同等级的战力范围
const LEVEL_COMBAT_RANGE: Record<SectLevel, [number, number]> = {
  founding: [50, 300],
  known: [300, 1500],
  famous: [1500, 8000],
  dominant: [8000, 40000],
  eternal: [40000, 200000],
};

// 不同等级的弟子数范围
const LEVEL_DISCIPLE_RANGE: Record<SectLevel, [number, number]> = {
  founding: [5, 30],
  known: [30, 100],
  famous: [100, 400],
  dominant: [400, 1500],
  eternal: [1500, 8000],
};

// 权重表：本宗等级越高，遇到的高级宗门越多
function pickSectLevel(playerLevel: SectLevel): SectLevel {
  const playerIdx = SectLevelOrder.indexOf(playerLevel);
  // 偏向同等级和低等级，少量高等级
  const items: { value: SectLevel; weight: number }[] = SectLevelOrder.map((level, idx) => {
    const diff = idx - playerIdx;
    let weight: number;
    if (diff === 0) weight = 30;
    else if (diff === -1) weight = 25;
    else if (diff === 1) weight = 18;
    else if (diff === -2) weight = 15;
    else if (diff === 2) weight = 8;
    else if (diff < -2) weight = 4;
    else weight = 2;
    return { value: level, weight };
  });
  return weightedRandom(items);
}

function pickAlignment(level: SectLevel): SectAlignment {
  // 高等级宗门魔道比例略高
  const idx = SectLevelOrder.indexOf(level);
  const demonicWeight = 20 + idx * 5;
  const righteousWeight = 50 - idx * 3;
  const neutralWeight = 30;
  return weightedRandom([
    { value: 'righteous' as SectAlignment, weight: righteousWeight },
    { value: 'demonic' as SectAlignment, weight: demonicWeight },
    { value: 'neutral' as SectAlignment, weight: neutralWeight },
  ]);
}

function pickRelation(alignment: SectAlignment, playerAlignment: SectAlignment = 'neutral'): SectRelation {
  // 阵营影响关系
  if (alignment === playerAlignment) {
    return weightedRandom([
      { value: 'ally' as SectRelation, weight: 15 },
      { value: 'friendly' as SectRelation, weight: 35 },
      { value: 'neutral' as SectRelation, weight: 35 },
      { value: 'wary' as SectRelation, weight: 12 },
      { value: 'hostile' as SectRelation, weight: 3 },
    ]);
  }
  // 正魔对立
  if (
    (alignment === 'righteous' && playerAlignment === 'demonic') ||
    (alignment === 'demonic' && playerAlignment === 'righteous')
  ) {
    return weightedRandom([
      { value: 'hostile' as SectRelation, weight: 45 },
      { value: 'wary' as SectRelation, weight: 35 },
      { value: 'neutral' as SectRelation, weight: 15 },
      { value: 'friendly' as SectRelation, weight: 5 },
    ]);
  }
  // 阵营不同但不直接对立
  return weightedRandom([
    { value: 'neutral' as SectRelation, weight: 40 },
    { value: 'wary' as SectRelation, weight: 30 },
    { value: 'friendly' as SectRelation, weight: 20 },
    { value: 'hostile' as SectRelation, weight: 10 },
  ]);
}

function generateSectName(alignment: SectAlignment): string {
  const prefix = pickRandom(SECT_PREFIX);
  const suffix = pickRandom(SECT_SUFFIX_BY_ALIGNMENT[alignment]);
  return prefix + suffix;
}

export function generateOtherSect(playerLevel: SectLevel, playerAlignment: SectAlignment = 'neutral'): OtherSect {
  const level = pickSectLevel(playerLevel);
  const alignment = pickAlignment(level);
  const [cpMin, cpMax] = LEVEL_COMBAT_RANGE[level];
  const [dMin, dMax] = LEVEL_DISCIPLE_RANGE[level];

  return {
    id: generateId(),
    name: generateSectName(alignment),
    level,
    alignment,
    relation: pickRelation(alignment, playerAlignment),
    combatPower: randomInt(cpMin, cpMax),
    discipleCount: randomInt(dMin, dMax),
    distance: randomInt(50, 5000),
    specialty: pickRandom(SECT_SPECIALTIES),
    description: pickRandom(SECT_DESCRIPTIONS),
    favorability: 50,
    diplomaticStatus: 'neutral',
    tradeActive: false,
  };
}

export function generateOtherSects(count: number, playerLevel: SectLevel, playerAlignment: SectAlignment = 'neutral'): OtherSect[] {
  const sects: OtherSect[] = [];
  const usedNames = new Set<string>();

  let attempts = 0;
  while (sects.length < count && attempts < count * 5) {
    attempts++;
    const sect = generateOtherSect(playerLevel, playerAlignment);
    if (usedNames.has(sect.name)) continue;
    usedNames.add(sect.name);
    sects.push(sect);
  }

  return sects;
}

// 刷新关系（每月调用，关系会随机变动）
export function refreshSectRelations(sects: OtherSect[]): OtherSect[] {
  return sects.map(sect => {
    // 15%概率关系变动
    if (Math.random() < 0.15) {
      const relations: SectRelation[] = ['ally', 'friendly', 'neutral', 'wary', 'hostile'];
      const currentIdx = relations.indexOf(sect.relation);
      // 倾向于向相邻关系变动
      const delta = Math.random() < 0.5 ? -1 : 1;
      const newIdx = Math.max(0, Math.min(relations.length - 1, currentIdx + delta));
      // 好感度也小幅波动
      const favDelta = randomInt(-3, 3);
      return {
        ...sect,
        relation: relations[newIdx],
        favorability: Math.max(0, Math.min(100, (sect.favorability ?? 50) + favDelta)),
      };
    }
    return sect;
  });
}

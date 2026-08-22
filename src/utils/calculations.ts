import type { HiddenTalents, TalentDisplay, SpiritRoot, SpiritRootType } from '@/types/disciple';
import { SpiritRootNames } from '@/types/disciple';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成随机灵根
export function generateSpiritRoots(): SpiritRoot[] {
  const fiveElements: SpiritRootType[] = ['gold', 'wood', 'water', 'fire', 'earth'];
  const variantRoots: SpiritRootType[] = ['thunder', 'wind', 'ice', 'light', 'dark'];
  
  // 85%概率五行灵根，15%概率异灵根
  const isVariant = Math.random() < 0.15;
  
  if (isVariant) {
    // 异灵根：只能单个
    const variantType = variantRoots[randomInt(0, variantRoots.length - 1)];
    return [
      {
        type: variantType,
        quality: randomInt(80, 100),
      }
    ];
  }
  
  // 五行灵根：1-5个随机组合
  // 概率：5灵根30%，4灵根25%，3灵根20%，2灵根15%，1灵根10%
  const rand = Math.random();
  let rootCount: number;
  if (rand < 0.3) rootCount = 5;
  else if (rand < 0.55) rootCount = 4;
  else if (rand < 0.75) rootCount = 3;
  else if (rand < 0.9) rootCount = 2;
  else rootCount = 1;
  
  // 随机选择五行灵根
  const shuffledFive = [...fiveElements].sort(() => Math.random() - 0.5);
  const roots: SpiritRoot[] = [];
  
  for (let i = 0; i < rootCount; i++) {
    let quality: number;
    if (rootCount === 1) {
      quality = randomInt(85, 100);
    } else if (rootCount === 2) {
      quality = randomInt(65, 90);
    } else if (rootCount === 3) {
      quality = randomInt(45, 75);
    } else if (rootCount === 4) {
      quality = randomInt(30, 60);
    } else {
      quality = randomInt(20, 40);
    }
    
    roots.push({
      type: shuffledFive[i],
      quality,
    });
  }
  
  return roots;
}

// 计算灵根修炼速度加成（2026-08-04 强化天赋差异：countBonus ×2，qualityBonus ×1.5）
export function calculateSpiritRootBonus(spiritRoots: SpiritRoot[]): number {
  if (spiritRoots.length === 0) return 0;
  
  // 灵根越少越快：放大差异，五灵根甚至略拖后腿，单灵根大幅领先
  const countBonus: Record<number, number> = {
    1: 160,  // 单灵根 +160%（原 80）
    2: 100,  // 双灵根 +100%（原 50）
    3: 50,   // 三灵根  +50%（原 25）
    4: 15,   // 四灵根  +15%（原 10）
    5: -5,   // 五灵根  -5%（原  0，略拖后腿）
  };
  
  const count = Math.min(spiritRoots.length, 5);
  const baseBonus = countBonus[count] || 0;
  
  // 平均品质加成：每点品质 +0.75%（原 0.5%）
  const avgQuality = spiritRoots.reduce((sum, r) => sum + r.quality, 0) / spiritRoots.length;
  const qualityBonus = (avgQuality - 50) * 0.75;
  
  return baseBonus + qualityBonus;
}

// 获取灵根描述
export function getSpiritRootDescription(spiritRoots: SpiritRoot[]): string {
  if (spiritRoots.length === 0) return '无灵根';
  
  const names = spiritRoots.map(r => SpiritRootNames[r.type]).join('');
  
  let quality = '凡';
  const avgQuality = spiritRoots.reduce((sum, r) => sum + r.quality, 0) / spiritRoots.length;
  
  if (avgQuality >= 90) quality = '仙';
  else if (avgQuality >= 80) quality = '天';
  else if (avgQuality >= 60) quality = '地';
  
  const countNames: Record<number, string> = {
    1: '单',
    2: '双',
    3: '三',
    4: '四',
    5: '五',
  };
  const countName = countNames[spiritRoots.length] || `${spiritRoots.length}`;
  
  return `${quality}${countName}灵根（${names}）`;
}

export function getTalentDescription(talent: keyof HiddenTalents, value: number): string {
  if (value >= 90) return '绝世';
  if (value >= 80) return '天纵奇才';
  if (value >= 70) return '出类拔萃';
  if (value >= 60) return '优秀';
  if (value >= 50) return '中上';
  if (value >= 40) return '普通';
  if (value >= 30) return '略逊一筹';
  if (value >= 20) return '愚钝';
  return '朽木不可雕';
}

export function generateTalentDisplay(talents: HiddenTalents): TalentDisplay {
  const nicknames: string[] = [];
  
  if (talents.rootBone >= 80) nicknames.push('天才');
  if (talents.rootBone <= 20) nicknames.push('钝根');
  if (talents.spiritRhythm >= 80) nicknames.push('巧手');
  if (talents.spiritRhythm <= 20) nicknames.push('笨手');
  if (talents.constitution >= 80) nicknames.push('铁骨');
  if (talents.constitution <= 20) nicknames.push('病秧子');
  if (talents.daoFate >= 80) nicknames.push('福星');
  if (talents.daoFate <= 20) nicknames.push('霉星');
  
  // 灵根相关称号
  if (talents.spiritRoots && talents.spiritRoots.length > 0) {
    const variantTypes = ['thunder', 'wind', 'ice', 'light', 'dark'];
    const hasVariant = talents.spiritRoots.some(r => variantTypes.includes(r.type));
    
    if (hasVariant && talents.spiritRoots.length === 1) {
      nicknames.push('异灵根');
    } else if (talents.spiritRoots.length === 1) {
      nicknames.push('天灵根');
    } else if (talents.spiritRoots.length === 2) {
      nicknames.push('双灵根');
    }
    const avgQ = talents.spiritRoots.reduce((s, r) => s + r.quality, 0) / talents.spiritRoots.length;
    if (avgQ >= 90) {
      nicknames.push('仙骨');
    }
  }
  
  if (nicknames.length === 0) {
    nicknames.push('平凡');
  }
  
  const maxTalent = Math.max(talents.rootBone, talents.spiritRhythm, talents.constitution, talents.daoFate);
  if (maxTalent >= 90) {
    if (talents.rootBone === maxTalent) nicknames.unshift('根骨奇佳');
    if (talents.spiritRhythm === maxTalent) nicknames.unshift('匠心独运');
    if (talents.constitution === maxTalent) nicknames.unshift('金刚不坏');
    if (talents.daoFate === maxTalent) nicknames.unshift('仙缘深厚');
  }
  
  const spiritRootDesc = getSpiritRootDescription(talents.spiritRoots || []);
  
  return {
    rootBoneDesc: getTalentDescription('rootBone', talents.rootBone),
    spiritRhythmDesc: getTalentDescription('spiritRhythm', talents.spiritRhythm),
    constitutionDesc: getTalentDescription('constitution', talents.constitution),
    daoFateDesc: getTalentDescription('daoFate', talents.daoFate),
    spiritRootDesc,
    nickname: nicknames.slice(0, 2).join('·'),
  };
}

// 各境界基础寿命（年）— 减半以控制修炼节奏，平庸弟子约 33 年寿命冲击化神
const REALM_BASE_LIFESPAN = [40, 40, 55, 130, 280, 530];

export function calculateLifespan(baseLifespan: number, realmIndex: number): number {
  // 基础寿命 = 境界寿命 + 体质加成
  const realmLifespan = REALM_BASE_LIFESPAN[Math.min(realmIndex, REALM_BASE_LIFESPAN.length - 1)] || 80;
  // 体质影响基础寿命：体质越高，额外寿命越多
  const constitutionBonus = Math.floor((baseLifespan - 60) * 0.4);
  return realmLifespan + constitutionBonus;
}

// 各境界基础修炼速度（修为/月）
const REALM_BASE_CULTIVATION_SPEED = [0, 100, 150, 250, 400, 600];

export function calculateCultivationSpeed(rootBone: number, realmIndex: number): number {
  const baseSpeed = REALM_BASE_CULTIVATION_SPEED[Math.min(realmIndex, REALM_BASE_CULTIVATION_SPEED.length - 1)] || 100;
  // 根骨影响修炼效率：根骨80时100%效率，根骨40时60%效率
  const rootBoneMultiplier = 0.4 + (rootBone / 100) * 0.6;
  return Math.floor(baseSpeed * rootBoneMultiplier);
}

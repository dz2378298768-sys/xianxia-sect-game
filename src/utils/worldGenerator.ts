import type { OtherSect, SectAlignment, SectLevel, SectRelation, Trial, TrialType, TrialDifficulty, TrialReward } from '@/types/game';
import type { Realm } from '@/types/disciple';
import { SectLevelOrder } from '@/types/game';
import { randomInt, pickRandom, generateId, weightedRandom, randomFloat } from './random';
import { SPECIAL_MATERIALS } from '@/data/specialMaterials';

// 每个境界的基础战力（与 calculateDiscipleCombatPower 中的 RealmCombatPower 保持一致，用于试炼战力分层）
const REALM_BASE_COMBAT: Record<Realm, number> = {
  mortal: 10,
  qi: 50,
  foundation: 200,
  golden: 800,
  nascent: 3200,
  spirit: 12800,
};

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
  const discipleCount = randomInt(dMin, dMax);

  // 战力按"弟子数 × 平均弟子战力"估算，使其符合 calculateSectCombatPower 的逻辑
  // 不同等级宗门的弟子境界分布不同，平均单人战力也不同
  const avgDisciplePower: Record<SectLevel, number> = {
    founding: randomInt(8, 15),       // 凡人~练气为主
    known: randomInt(25, 50),         // 练气~筑基
    famous: randomInt(80, 150),       // 筑基~金丹
    dominant: randomInt(250, 500),    // 金丹~元婴
    eternal: randomInt(800, 1600),    // 元婴~化神
  };
  // 基础战力 = 弟子数 × 平均战力，再叠加建筑加成约 5%~25%
  const buildingBonus = 1 + randomInt(5, 25) / 100;
  const estimatedPower = Math.floor(discipleCount * avgDisciplePower[level] * buildingBonus);
  // 确保落在该等级战力区间内（clamp 到区间，避免极端值）
  const combatPower = Math.max(cpMin, Math.min(cpMax, estimatedPower));

  return {
    id: generateId(),
    name: generateSectName(alignment),
    level,
    alignment,
    relation: pickRelation(alignment, playerAlignment),
    combatPower,
    discipleCount,
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

// ===== 试炼生成系统 =====

// 试炼名称池
const TRIAL_NAMES: Record<TrialType, string[]> = {
  town: [
    '清河镇驻扎', '云来城巡查', '落风镇护卫', '苍梧城收税',
    '碧水镇除患', '天枢城协防', '归元镇布防', '望仙城坐镇',
  ],
  monster: [
    '猎杀赤焰虎', '剿灭蛛妖巢', '讨伐蛟龙', '清剿狼妖群',
    '斩杀石魔', '围剿鬼修', '诛灭血蝠', '降服雷鹰',
  ],
  realm: [
    '探索古修洞府', '秘境寻宝', '上古遗迹探险', '仙人洞府探秘',
    '幽冥秘境', '天火秘境', '星辰秘境', '混沌秘境',
  ],
};

const TRIAL_DESCS: Record<TrialType, string[]> = {
  town: [
    '凡人城镇妖患频发，需弟子驻扎守护，定期巡查收税。',
    '附近城镇商路不畅，派遣弟子驻扎可维护秩序并获取税赋。',
    '城镇居民受妖物侵扰，驻扎弟子可保一方平安。',
    '繁华城镇需高人坐镇，派遣弟子可获丰厚报酬。',
  ],
  monster: [
    '妖物盘踞山林为害一方，需弟子前往猎杀。',
    '凶兽出没伤及凡人，宗门有责将其剿灭。',
    '妖王麾下妖兵聚集成患，需及时清剿。',
    '远古妖兽苏醒，威胁周边生灵，须尽快诛杀。',
  ],
  realm: [
    '秘境即将开启，内有上古机缘，探索可获珍稀资源。',
    '古修士洞府现世，可能有功法秘籍和灵药残留。',
    '天地异象引出未知秘境，机遇与危险并存。',
    '上古宗门遗迹浮现，蕴藏大量宝物与传承。',
  ],
};

// 难度配置：建议战力倍率、持续时间、失败/受伤概率、奖励倍率
const DIFFICULTY_CONFIG: Record<TrialDifficulty, {
  powerMul: [number, number];   // 相对宗门平均弟子战力的倍率区间
  duration: [number, number];   // 月数
  risk: [number, number];       // 失败概率
  injury: [number, number];     // 受伤概率
  rewardMul: number;            // 奖励倍率
}> = {
  easy:   { powerMul: [0.3, 0.6],  duration: [1, 2], risk: [0.05, 0.15], injury: [0.1, 0.25],  rewardMul: 1.0 },
  normal: { powerMul: [0.6, 1.0],  duration: [2, 3], risk: [0.15, 0.30], injury: [0.25, 0.45], rewardMul: 2.0 },
  hard:   { powerMul: [1.0, 1.6],  duration: [3, 4], risk: [0.30, 0.50], injury: [0.45, 0.65], rewardMul: 3.5 },
  extreme:{ powerMul: [1.6, 2.5],  duration: [4, 6], risk: [0.50, 0.70], injury: [0.65, 0.85], rewardMul: 6.0 },
};

// 难度权重（偏向简单和普通）
const DIFFICULTY_WEIGHTS: { value: TrialDifficulty; weight: number }[] = [
  { value: 'easy',    weight: 35 },
  { value: 'normal',  weight: 35 },
  { value: 'hard',    weight: 20 },
  { value: 'extreme', weight: 10 },
];

// 根据宗门战力生成年度试炼任务
// sectCombatPower: 本宗总战力（calculateSectCombatPower.totalPower）
// discipleCount: 本宗弟子数（用于估算平均弟子战力）
// year: 当前年份
// realmGuarantee: 是否生成按境界分层的保底试炼（保证炼气~化神各有一项，避免高阶弟子无试炼可做）
export function generateTrials(sectCombatPower: number, discipleCount: number, year: number, realmGuarantee = false): Trial[] {
  // 估算平均弟子战力 = 总战力 / 弟子数（至少 10）
  const avgDisciplePower = discipleCount > 0
    ? Math.max(10, Math.floor(sectCombatPower / discipleCount))
    : 10;

  const count = randomInt(6, 9); // 每年 6~9 个试炼
  const trials: Trial[] = [];
  const usedNames = new Set<string>();

  const generateOne = (forcedPower?: number, forcedDifficulty?: TrialDifficulty): Trial | null => {
    const type = weightedRandom([
      { value: 'town' as TrialType,    weight: 35 },
      { value: 'monster' as TrialType, weight: 35 },
      { value: 'realm' as TrialType,   weight: 30 },
    ]);
    const difficulty = forcedDifficulty ?? weightedRandom(DIFFICULTY_WEIGHTS);
    const diffCfg = DIFFICULTY_CONFIG[difficulty];

    // 建议战力
    let requiredPower: number;
    if (forcedPower !== undefined) {
      requiredPower = forcedPower;
    } else {
      requiredPower = Math.floor(avgDisciplePower * randomFloat(diffCfg.powerMul[0], diffCfg.powerMul[1]));
    }
    const durationMonths = randomInt(diffCfg.duration[0], diffCfg.duration[1]);
    const riskRate = randomFloat(diffCfg.risk[0], diffCfg.risk[1]);
    const injuryRate = randomFloat(diffCfg.injury[0], diffCfg.injury[1]);

    // 名称（去重）
    const namePool = TRIAL_NAMES[type];
    let name = pickRandom(namePool);
    let attempts = 0;
    while (usedNames.has(name) && attempts < 5) {
      name = pickRandom(namePool);
      attempts++;
    }
    if (usedNames.has(name)) return null; // 该类型名称池已满
    usedNames.add(name);

    const desc = pickRandom(TRIAL_DESCS[type]);

    // 奖励：根据难度倍率 × 基础值（基于 requiredPower 估算倍率）
    const baseMul = forcedPower !== undefined
      ? Math.max(1, Math.min(8, requiredPower / Math.max(1, avgDisciplePower)))
      : diffCfg.rewardMul;
    const reward = generateTrialReward(type, difficulty, baseMul);

    return {
      id: generateId(),
      type,
      name,
      description: desc,
      difficulty,
      requiredPower,
      durationMonths,
      rewards: reward,
      riskRate,
      injuryRate,
      status: 'available',
      assignedDiscipleId: null,
      startYear: 0,
      startMonth: 0,
      progress: 0,
      generatedYear: year,
    };
  };

  for (let i = 0; i < count; i++) {
    const t = generateOne();
    if (t) trials.push(t);
  }

  // 按境界分层保底：为常见高阶段弟子生成匹配试炼（每个境界1项，要求战力 ~ 该境界基础战力 × 0.8 ~ 1.2）
  if (realmGuarantee) {
    const guaranteeRealms: Realm[] = ['qi', 'foundation', 'golden', 'nascent', 'spirit'];
    const realmDifficulty: Record<number, TrialDifficulty> = {
      0: 'easy', 1: 'normal', 2: 'normal', 3: 'hard', 4: 'extreme',
    };
    for (let i = 0; i < guaranteeRealms.length; i++) {
      const realm = guaranteeRealms[i];
      const base = REALM_BASE_COMBAT[realm] ?? 50;
      const power = Math.max(5, Math.floor(base * randomFloat(0.85, 1.3)));
      const t = generateOne(power, realmDifficulty[i] || 'easy');
      if (t) trials.push(t);
    }
  }

  return trials;
}

// 生成试炼奖励
function generateTrialReward(type: TrialType, difficulty: TrialDifficulty, mul: number): TrialReward {
  const descParts: string[] = [];

  // 基础灵石奖励
  const baseStones = Math.floor(randomInt(30, 80) * mul);
  descParts.push(`${baseStones}灵石`);

  const reward: TrialReward = {
    spiritStones: baseStones,
    description: '',
  };

  // 声望（怪物和秘境给更多）
  if (type === 'monster' || type === 'realm') {
    const rep = Math.floor(randomInt(3, 8) * mul);
    reward.reputation = rep;
    descParts.push(`${rep}声望`);
  }

  // 类型特色奖励
  if (type === 'town') {
    // 城镇：给原料 + 贡献
    const herbs = Math.floor(randomInt(5, 15) * mul);
    reward.herbs = herbs;
    descParts.push(`${herbs}灵草`);
    if (Math.random() < 0.5) {
      const iron = Math.floor(randomInt(3, 8) * mul);
      reward.iron = iron;
      descParts.push(`${iron}灵铁`);
    }
    const contrib = Math.floor(randomInt(20, 50) * mul);
    reward.contributionPoints = contrib;
    descParts.push(`${contrib}贡献`);
  } else if (type === 'monster') {
    // 妖物：给灵铁/符纸 + 贡献 + 满意度
    const iron = Math.floor(randomInt(5, 12) * mul);
    reward.iron = iron;
    descParts.push(`${iron}灵铁`);
    if (Math.random() < 0.4) {
      const paper = Math.floor(randomInt(3, 8) * mul);
      reward.paper = paper;
      descParts.push(`${paper}符纸`);
    }
    const contrib = Math.floor(randomInt(30, 60) * mul);
    reward.contributionPoints = contrib;
    descParts.push(`${contrib}贡献`);
    const sat = Math.floor(randomInt(5, 15) * Math.min(mul, 3));
    reward.satisfaction = sat;
    descParts.push(`${sat}满意度`);
  } else {
    // 秘境：大量灵石 + 贡献 + 满意度，偶尔给原料
    const extraStones = Math.floor(randomInt(50, 150) * mul);
    reward.spiritStones = baseStones + extraStones;
    descParts[0] = `${reward.spiritStones}灵石`;
    const herbs = Math.floor(randomInt(8, 20) * mul);
    reward.herbs = herbs;
    descParts.push(`${herbs}灵草`);
    const iron = Math.floor(randomInt(5, 15) * mul);
    reward.iron = iron;
    descParts.push(`${iron}灵铁`);
    const paper = Math.floor(randomInt(5, 12) * mul);
    reward.paper = paper;
    descParts.push(`${paper}符纸`);
    const contrib = Math.floor(randomInt(50, 100) * mul);
    reward.contributionPoints = contrib;
    descParts.push(`${contrib}贡献`);
    const sat = Math.floor(randomInt(10, 25) * Math.min(mul, 3));
    reward.satisfaction = sat;
    descParts.push(`${sat}满意度`);
    // 秘境额外掉落特殊材料（60% 概率掉 1~2 种）
    if (Math.random() < 0.6) {
      const dropCount = randomInt(1, 2);
      const drops: { name: string; amount: number }[] = [];
      const pool = [...SPECIAL_MATERIALS];
      for (let i = 0; i < dropCount && pool.length > 0; i++) {
        const idx = randomInt(0, pool.length - 1);
        const mat = pool.splice(idx, 1)[0];
        const amount = randomInt(1, 3);
        drops.push({ name: mat.name, amount });
        descParts.push(`${amount}${mat.name}`);
      }
      if (drops.length > 0) reward.specialMaterials = drops;
    }
  }

  reward.description = descParts.join('、');
  return reward;
}

import type { BookConfig, BookTier, BookType, BookAttribute } from '@/data/buildings';
import { BookAttributeNames, BookTierNames, BOOK_TIER_BONUSES, BOOK_TIER_COSTS, INITIAL_LIBRARY_BOOKS } from '@/data/buildings';
import { generateId, randomInt, pickRandom } from '@/utils/random';

// 功法名称前缀
const techniquePrefixes = [
  '太乙', '玉清', '上清', '太清', '紫霄', '混元', '太极', '两仪', '三才', '四象',
  '五行', '六合', '七星', '八卦', '九宫', '十方', '无极', '混沌', '鸿蒙', '先天',
  '后天', '纯阳', '纯阴', '玄元', '玄天', '玄阴', '玄阳', '太虚', '太上', '元始',
  '灵宝', '道德', '通天', '女娲', '伏羲', '神农', '黄帝', '老子', '庄子', '列子',
  '南华', '冲虚', '洞玄', '洞真', '洞神', '太玄', '太平', '太清', '玉清', '上清',
];

// 功法名称后缀
const techniqueSuffixes = [
  '诀', '功', '法', '经', '典', '录', '籍', '谱', '秘', '要',
  '真解', '大义', '心印', '秘要', '神枢', '玄纲', '真诠', '正脉', '正宗', '正传',
  '大法', '无上', '真经', '真诀', '秘法', '玄功', '神功', '仙诀', '仙法', '圣经',
];

// 战技名称前缀
const battlePrefixes = [
  '御', '斩', '破', '碎', '裂', '崩', '毁', '灭', '诛', '戮',
  '斩妖', '除魔', '诛邪', '卫道', '镇山', '开山', '裂地', '翻天', '倒海', '移山',
  '追风', '逐月', '追星', '逐日', '擒龙', '伏虎', '降龙', '伏魔', '诛仙', '弑神',
  '金刚', '般若', '罗汉', '菩提', '达摩', '须弥', '芥子', '恒沙', '刹那', '永恒',
];

// 战技名称后缀
const battleSuffixes = [
  '剑', '刀', '枪', '拳', '掌', '指', '爪', '腿', '步', '身法',
  '术', '法', '诀', '咒', '印', '阵', '符', '禁', '神通', '秘术',
  '十三式', '七十二变', '三十六式', '一百零八式', '九式', '三式', '一式',
  '真经', '秘录', '图鉴', '全谱', '全集',
];

// 属性描述词
const attributeDescriptors: Record<BookAttribute, string[]> = {
  gold: ['金', '庚金', '辛金', '太白', '锐金', '金刚', '金光', '金乌', '庚金', '白'],
  wood: ['木', '青', '乙木', '甲木', '青龙', '长生', '苍翠', '神木', '灵木', '枯荣'],
  water: ['水', '玄', '癸水', '壬水', '玄冥', '沧海', '寒潭', '冰', '天河', '弱水'],
  fire: ['火', '赤', '丙火', '丁火', '朱雀', '离火', '烈焰', '三昧', '纯阳', '南明'],
  earth: ['土', '黄', '戊土', '己土', '后土', '厚土', '坤元', '黄山', '大地', '中央'],
  thunder: ['雷', '紫', '神雷', '天罚', '紫霄', '九天', '天劫', '神霄', '雷', '五雷'],
  wind: ['风', '青', '巽风', '清风', '狂风', '飙风', '旋风', '龙卷风', '御风', '追风'],
  ice: ['冰', '寒', '玄冰', '极寒', '北冥', '冰川', '寒冰', '冻', '雪', '霜'],
  universal: ['混元', '太极', '两仪', '三才', '五行', '六合', '七星', '八卦', '九宫', '十方'],
};

// 书籍描述模板
const techniqueDescriptions = [
  '{}之法，夺天地之造化，侵日月之玄机',
  '此功法自{}中悟出，直指大道本源',
  '{}正宗，传承千古，威力无穷',
  '{}大道，玄妙无方，非大机缘者不可得',
  '此乃{}秘术，修成可移山填海',
  '{}真解，详尽阐述修行之要',
  '上古{}功法，历经岁月而不朽',
  '{}一脉的镇派绝学，非嫡传不可修习',
];

const battleDescriptions = [
  '{}战技，威力绝伦，斩妖除魔不在话下',
  '此{}神通，乃上古仙人所创',
  '{}秘术，一经施展，天崩地裂',
  '{}绝学，攻无不克，战无不胜',
  '此乃{}神技，威力不可测',
  '{}传承的杀伐之术，煞气冲天',
  '{}中的佼佼者，同阶几乎无敌',
  '传说由{}老祖所创，威力无穷',
];

// 各层级的基础加成（从配置读取）
const tierBaseCultivationBonus: Record<BookTier, number> = {
  qi: BOOK_TIER_BONUSES.qi.cultivation,
  foundation: BOOK_TIER_BONUSES.foundation.cultivation,
  golden: BOOK_TIER_BONUSES.golden.cultivation,
  nascent: BOOK_TIER_BONUSES.nascent.cultivation,
};

const tierBaseCombatBonus: Record<BookTier, number> = {
  qi: BOOK_TIER_BONUSES.qi.combat,
  foundation: BOOK_TIER_BONUSES.foundation.combat,
  golden: BOOK_TIER_BONUSES.golden.combat,
  nascent: BOOK_TIER_BONUSES.nascent.combat,
};

// 学习时间：炼气1月，筑基2月，金丹3月，元婴4月
const tierLearnDays: Record<BookTier, number> = {
  qi: 1,
  foundation: 2,
  golden: 3,
  nascent: 4,
};

// 生成随机功法名称
function generateTechniqueName(attribute: BookAttribute, quality: number): string {
  const attrDesc = pickRandom(attributeDescriptors[attribute]);
  const prefix = pickRandom(techniquePrefixes);
  const suffix = pickRandom(techniqueSuffixes);
  
  // 高品质有更多特殊名称
  if (quality >= 80) {
    const specialNames = [
      `${attrDesc}阳神功`, `${prefix}${attrDesc}经`, `${attrDesc}元真经`,
      `大${prefix}${attrDesc}诀`, `无上${attrDesc}法典`, `先天${attrDesc}诀`,
    ];
    return pickRandom(specialNames);
  }
  
  return `${prefix}${attrDesc}${suffix}`;
}

// 生成随机战技名称
function generateBattleName(attribute: BookAttribute, quality: number): string {
  const attrDesc = pickRandom(attributeDescriptors[attribute]);
  const prefix = pickRandom(battlePrefixes);
  const suffix = pickRandom(battleSuffixes);
  
  if (quality >= 80) {
    const specialNames = [
      `${prefix}${attrDesc}大神通`, `${attrDesc}诛仙${suffix}`,
      `大${prefix}${attrDesc}术`, `无上${attrDesc}神${suffix}`,
      `先天${attrDesc}${suffix}`,
    ];
    return pickRandom(specialNames);
  }
  
  return `${prefix}${attrDesc}${suffix}`;
}

// 生成随机描述
function generateDescription(type: BookType, attribute: BookAttribute): string {
  const templates = type === 'technique' ? techniqueDescriptions : battleDescriptions;
  const template = pickRandom(templates);
  const attrName = BookAttributeNames[attribute];
  return template.replace('{}', attrName);
}

// 生成单本随机书籍
export function generateRandomBook(tier: BookTier, type: BookType, forceAttribute?: BookAttribute): BookConfig {
  const attributes: BookAttribute[] = ['gold', 'wood', 'water', 'fire', 'earth', 'thunder', 'wind', 'ice', 'universal'];
  
  // 选择属性
  let attribute: BookAttribute;
  if (forceAttribute) {
    attribute = forceAttribute;
  } else {
    // 20%概率是通用，80%是单属性
    if (Math.random() < 0.2) {
      attribute = 'universal';
    } else {
      const normalAttrs: BookAttribute[] = ['gold', 'wood', 'water', 'fire', 'earth', 'thunder', 'wind', 'ice'];
      attribute = pickRandom(normalAttrs);
    }
  }
  
  // 随机品质 20-100
  const quality = randomInt(20, 100);
  
  // 计算加成（基础 + 品质加成
  const baseCult = tierBaseCultivationBonus[tier];
  const baseCombat = tierBaseCombatBonus[tier];
  const qualityMultiplier = 0.5 + (quality / 100) * 1.5; // 0.5x ~ 2.0x
  
  const cultivationBonus = type === 'technique' 
    ? Math.round(baseCult * qualityMultiplier)
    : 0;
  
  const combatBonus = type === 'technique'
    ? Math.round(baseCombat * qualityMultiplier * 0.5)
    : Math.round(baseCombat * qualityMultiplier);
  
  // 学习时间
  const baseDays = tierLearnDays[tier];
  const qualityExtra = Math.floor(quality / 30); // 高品质多花时间
  const learnDays = baseDays + qualityExtra;
  
  const name = type === 'technique'
    ? generateTechniqueName(attribute, quality)
    : generateBattleName(attribute, quality);
  
  const description = generateDescription(type, attribute);
  
  return {
    id: generateId(),
    type,
    tier,
    attribute,
    name,
    description,
    cultivationBonus,
    combatBonus,
    quality,
    learnDays,
  };
}

// 生成一批随机书籍（默认各层级各类型都有）
export function generateBatchBooks(count: number): BookConfig[] {
  const books: BookConfig[] = [];
  const tiers: BookTier[] = ['qi', 'foundation', 'golden', 'nascent'];
  const types: BookType[] = ['technique', 'battle'];
  
  // 按概率分配：炼气40%，筑基30%，金丹20%，元婴10%
  const tierWeights = [0.4, 0.3, 0.2, 0.1];
  
  for (let i = 0; i < count; i++) {
    // 选层级
    const rand = Math.random();
    let tier: BookTier = 'qi';
    let cumulative = 0;
    for (let t = 0; t < tiers.length; t++) {
      cumulative += tierWeights[t];
      if (rand < cumulative) {
        tier = tiers[t];
        break;
      }
    }
    
    // 选类型
    const type = Math.random() < 0.4 ? 'technique' : 'battle'; // 40%功法，60%战技
    
    books.push(generateRandomBook(tier, type));
  }
  
  return books;
}

// 生成初始藏经阁书籍（每层1本通用功法 + 1本通用战技）
export function generateInitialLibraryBooks(): BookConfig[] {
  const books: BookConfig[] = [];
  
  INITIAL_LIBRARY_BOOKS.forEach(bookDef => {
    books.push({
      id: generateId(),
      type: bookDef.type,
      tier: bookDef.tier,
      attribute: 'universal',
      name: bookDef.name,
      description: bookDef.description,
      cultivationBonus: bookDef.cultivationBonus,
      combatBonus: bookDef.combatBonus,
      quality: 50, // 通用功法品质50
      learnDays: tierLearnDays[bookDef.tier],
    });
  });
  
  return books;
}

// 计算购买随机书的价格（从配置读取）
export function getBookPrice(tier: BookTier): number {
  return BOOK_TIER_COSTS[tier].buyPrice;
}

// 获取学习消耗（贡献点）
export function getBookLearnCost(tier: BookTier): number {
  return BOOK_TIER_COSTS[tier].learnCost;
}

// 判断弟子是否能学习某本书（灵根匹配）
export function canLearnBook(spiritRoots: { type: string; quality: number }[], book: BookConfig): boolean {
  // 通用功法谁都能学
  if (book.attribute === 'universal') return true;
  
  // 检查灵根是否匹配
  return spiritRoots.some(root => root.type === book.attribute);
}

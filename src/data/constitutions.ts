export interface Constitution {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  effects: {
    cultivationBonus?: number;
    attackBonus?: number;
    defenseBonus?: number;
    hpBonus?: number;
    critBonus?: number;
    dodgeBonus?: number;
    breakthroughBonus?: number;
    lifespanBonus?: number;
  };
}

export const CONSTITUTIONS: Constitution[] = [
  { id: 'normal_1', name: '凡人体质', rarity: 'common', description: '最普通的体质，没有特殊效果', effects: {} },
  { id: 'normal_2', name: '健壮体质', rarity: 'common', description: '身体较为健壮', effects: { hpBonus: 50 } },
  { id: 'normal_3', name: '灵巧体质', rarity: 'common', description: '身形灵巧，擅长闪避', effects: { dodgeBonus: 2 } },
  { id: 'normal_4', name: '敏锐体质', rarity: 'common', description: '感知敏锐，容易发现弱点', effects: { critBonus: 1 } },
  { id: 'normal_5', name: '坚韧体质', rarity: 'common', description: '意志坚韧，防御较强', effects: { defenseBonus: 5 } },
  { id: 'normal_6', name: '活力体质', rarity: 'common', description: '精力充沛，修炼勤勉', effects: { cultivationBonus: 2 } },
  { id: 'normal_7', name: '大力体质', rarity: 'common', description: '天生力气较大', effects: { attackBonus: 5 } },
  { id: 'normal_8', name: '长寿体质', rarity: 'common', description: '寿命稍长', effects: { lifespanBonus: 10 } },
  { id: 'normal_9', name: '静心体质', rarity: 'common', description: '心平气和，突破较为顺利', effects: { breakthroughBonus: 2 } },
  { id: 'normal_10', name: '普通体质', rarity: 'common', description: '平平无奇的体质', effects: {} },
  { id: 'normal_11', name: '清瘦体质', rarity: 'common', description: '身形清瘦，动作敏捷', effects: { dodgeBonus: 1 } },
  { id: 'normal_12', name: '魁梧体质', rarity: 'common', description: '身材魁梧，力量不俗', effects: { attackBonus: 3, hpBonus: 20 } },
  { id: 'normal_13', name: '儒雅体质', rarity: 'common', description: '温文尔雅，悟性尚可', effects: { cultivationBonus: 1 } },
  { id: 'normal_14', name: '勇武体质', rarity: 'common', description: '好勇斗狠，战力不俗', effects: { attackBonus: 4 } },
  { id: 'normal_15', name: '沉稳体质', rarity: 'common', description: '性格沉稳，防守稳固', effects: { defenseBonus: 3 } },
  { id: 'normal_16', name: '飘逸体质', rarity: 'common', description: '气质飘逸，身法灵动', effects: { dodgeBonus: 1, cultivationBonus: 1 } },
  { id: 'normal_17', name: '刚猛体质', rarity: 'common', description: '刚猛无双，攻势凌厉', effects: { attackBonus: 5, critBonus: 1 } },
  { id: 'normal_18', name: '阴柔体质', rarity: 'common', description: '阴柔绵长，后劲十足', effects: { defenseBonus: 2, hpBonus: 30 } },
  { id: 'normal_19', name: '耿直体质', rarity: 'common', description: '性格耿直，心无旁骛', effects: { breakthroughBonus: 1 } },
  { id: 'normal_20', name: '聪慧体质', rarity: 'common', description: '头脑聪慧，领悟力强', effects: { cultivationBonus: 3 } },
  
  { id: 'uncommon_1', name: '铁骨体质', rarity: 'uncommon', description: '骨骼坚硬如铁，防御极强', effects: { defenseBonus: 15, hpBonus: 100 } },
  { id: 'uncommon_2', name: '风灵体质', rarity: 'uncommon', description: '身轻如燕，闪避出众', effects: { dodgeBonus: 5, cultivationBonus: 3 } },
  { id: 'uncommon_3', name: '烈焰体质', rarity: 'uncommon', description: '内蕴火性，攻击力强', effects: { attackBonus: 15, critBonus: 2 } },
  { id: 'uncommon_4', name: '厚土体质', rarity: 'uncommon', description: '土行旺相，气血充盈', effects: { hpBonus: 200, defenseBonus: 10 } },
  { id: 'uncommon_5', name: '庚金体质', rarity: 'uncommon', description: '金气凛然，锋锐无匹', effects: { attackBonus: 20, critBonus: 3 } },
  { id: 'uncommon_6', name: '碧水体质', rarity: 'uncommon', description: '水性柔和，生生不息', effects: { cultivationBonus: 5, lifespanBonus: 20 } },
  { id: 'uncommon_7', name: '青木体质', rarity: 'uncommon', description: '生机盎然，恢复力强', effects: { hpBonus: 150, breakthroughBonus: 3 } },
  { id: 'uncommon_8', name: '雷音体质', rarity: 'uncommon', description: '雷音贯耳，悟性超群', effects: { cultivationBonus: 8, critBonus: 2 } },
  { id: 'uncommon_9', name: '冰心体质', rarity: 'uncommon', description: '冰心玉骨，心境澄澈', effects: { breakthroughBonus: 5, defenseBonus: 8 } },
  { id: 'uncommon_10', name: '剑骨体质', rarity: 'uncommon', description: '天生剑骨，剑道奇才', effects: { attackBonus: 18, critBonus: 4 } },
  { id: 'uncommon_11', name: '药体', rarity: 'uncommon', description: '百毒不侵，药石无效', effects: { hpBonus: 100, lifespanBonus: 15 } },
  { id: 'uncommon_12', name: '悟道体质', rarity: 'uncommon', description: '与道相合，领悟极快', effects: { cultivationBonus: 10, breakthroughBonus: 4 } },
  { id: 'uncommon_13', name: '战狼体质', rarity: 'uncommon', description: '嗜血好战，越战越勇', effects: { attackBonus: 12, critBonus: 3 } },
  { id: 'uncommon_14', name: '玄龟体质', rarity: 'uncommon', description: '玄龟转世，防御惊人', effects: { defenseBonus: 20, hpBonus: 180 } },
  { id: 'uncommon_15', name: '灵狐体质', rarity: 'uncommon', description: '狡黠如狐，身法诡异', effects: { dodgeBonus: 6, critBonus: 2 } },
  { id: 'uncommon_16', name: '金翅体质', rarity: 'uncommon', description: '身法如电，快逾闪电', effects: { dodgeBonus: 8, attackBonus: 8 } },
  { id: 'uncommon_17', name: '磐石体质', rarity: 'uncommon', description: '稳如磐石，不动如山', effects: { defenseBonus: 18, hpBonus: 120 } },
  { id: 'uncommon_18', name: '烈火体质', rarity: 'uncommon', description: '烈火焚心，攻击暴增', effects: { attackBonus: 25, critBonus: 2 } },
  { id: 'uncommon_19', name: '幽水体质', rarity: 'uncommon', description: '上善若水，以柔克刚', effects: { defenseBonus: 12, cultivationBonus: 5 } },
  { id: 'uncommon_20', name: '狂风体质', rarity: 'uncommon', description: '疾风骤雨，攻势连绵', effects: { attackBonus: 10, dodgeBonus: 4 } },
  
  { id: 'rare_1', name: '先天道体', rarity: 'rare', description: '天生道体，与道相合，修炼速度极快', effects: { cultivationBonus: 20, breakthroughBonus: 8 } },
  { id: 'rare_2', name: '纯阳之体', rarity: 'rare', description: '至阳至刚，攻击力强横无匹', effects: { attackBonus: 40, critBonus: 6 } },
  { id: 'rare_3', name: '纯阴之体', rarity: 'rare', description: '至阴至柔，防御与恢复极强', effects: { defenseBonus: 30, hpBonus: 300 } },
  { id: 'rare_4', name: '五行灵体', rarity: 'rare', description: '五行俱全，万法皆通', effects: { cultivationBonus: 15, attackBonus: 15, defenseBonus: 15 } },
  { id: 'rare_5', name: '空间灵体', rarity: 'rare', description: '空间亲和，身法莫测', effects: { dodgeBonus: 12, critBonus: 8 } },
  { id: 'rare_6', name: '时间灵体', rarity: 'rare', description: '时间玄妙，修炼加速', effects: { cultivationBonus: 25, lifespanBonus: 30 } },
  { id: 'rare_7', name: '混沌之体', rarity: 'rare', description: '混沌初开，潜力无限', effects: { cultivationBonus: 18, breakthroughBonus: 10, hpBonus: 200 } },
  { id: 'rare_8', name: '龙血体质', rarity: 'rare', description: '蕴含真龙血脉，战力强横', effects: { attackBonus: 35, defenseBonus: 20, hpBonus: 250 } },
  { id: 'rare_9', name: '凤骨体质', rarity: 'rare', description: '凤骨天成，涅槃重生之兆', effects: { breakthroughBonus: 12, lifespanBonus: 50, hpBonus: 200 } },
  { id: 'rare_10', name: '麒麟体质', rarity: 'rare', description: '瑞兽麒麟，福缘深厚', effects: { cultivationBonus: 12, breakthroughBonus: 8, hpBonus: 150 } },
  { id: 'rare_11', name: '白虎之体', rarity: 'rare', description: '白虎煞气，攻伐无双', effects: { attackBonus: 45, critBonus: 7 } },
  { id: 'rare_12', name: '玄武之体', rarity: 'rare', description: '玄武镇守，防御无双', effects: { defenseBonus: 40, hpBonus: 400 } },
  { id: 'rare_13', name: '朱雀之体', rarity: 'rare', description: '朱雀浴火，涅槃重生', effects: { breakthroughBonus: 15, attackBonus: 25, lifespanBonus: 40 } },
  { id: 'rare_14', name: '青龙之体', rarity: 'rare', description: '青龙入海，身法如龙', effects: { dodgeBonus: 15, cultivationBonus: 15, attackBonus: 20 } },
  { id: 'rare_15', name: '星辰之体', rarity: 'rare', description: '星辰之力加身，潜力无穷', effects: { cultivationBonus: 18, attackBonus: 20, critBonus: 5 } },
  { id: 'rare_16', name: '太阴之体', rarity: 'rare', description: '月华加持，阴柔之力', effects: { defenseBonus: 25, cultivationBonus: 12, dodgeBonus: 8 } },
  { id: 'rare_17', name: '太阳之体', rarity: 'rare', description: '烈日当空，刚猛绝伦', effects: { attackBonus: 38, critBonus: 8, hpBonus: 150 } },
  { id: 'rare_18', name: '剑心通明', rarity: 'rare', description: '剑心通透，剑道奇才', effects: { attackBonus: 42, critBonus: 10, breakthroughBonus: 5 } },
  { id: 'rare_19', name: '丹火之体', rarity: 'rare', description: '丹火内蕴，炼丹奇才', effects: { cultivationBonus: 15, breakthroughBonus: 8, hpBonus: 100 } },
  { id: 'rare_20', name: '阵道之体', rarity: 'rare', description: '阵道天赋，阵法大家', effects: { defenseBonus: 25, cultivationBonus: 10, breakthroughBonus: 6 } },
  { id: 'rare_21', name: '雷霆之体', rarity: 'rare', description: '雷霆万钧，势不可挡', effects: { attackBonus: 30, critBonus: 10, dodgeBonus: 5 } },
  { id: 'rare_22', name: '冰封之体', rarity: 'rare', description: '冰封万里，寒气逼人', effects: { defenseBonus: 28, attackBonus: 15, hpBonus: 180 } },
  { id: 'rare_23', name: '毒灵之体', rarity: 'rare', description: '万毒不侵，反哺自身', effects: { hpBonus: 250, lifespanBonus: 35, defenseBonus: 15 } },
  { id: 'rare_24', name: '吞噬之体', rarity: 'rare', description: '吞噬万物，化为己用', effects: { cultivationBonus: 22, hpBonus: 200, attackBonus: 15 } },
  { id: 'rare_25', name: '镜像之体', rarity: 'rare', description: '镜像分身，虚实难辨', effects: { dodgeBonus: 14, critBonus: 6, defenseBonus: 12 } },
  { id: 'rare_26', name: '音波之体', rarity: 'rare', description: '音波攻敌，防不胜防', effects: { attackBonus: 28, critBonus: 7, cultivationBonus: 8 } },
  { id: 'rare_27', name: '影遁之体', rarity: 'rare', description: '影遁无形，来去自如', effects: { dodgeBonus: 18, critBonus: 5, breakthroughBonus: 5 } },
  { id: 'rare_28', name: '金刚之体', rarity: 'rare', description: '金刚不坏，万法不侵', effects: { defenseBonus: 35, hpBonus: 350, attackBonus: 10 } },
  { id: 'rare_29', name: '琉璃之体', rarity: 'rare', description: '琉璃剔透，心境无暇', effects: { breakthroughBonus: 15, cultivationBonus: 12, defenseBonus: 10 } },
  { id: 'rare_30', name: '如意之体', rarity: 'rare', description: '如意变化，随心所欲', effects: { attackBonus: 20, defenseBonus: 15, dodgeBonus: 8, cultivationBonus: 10 } },
  
  { id: 'epic_1', name: '鸿蒙道体', rarity: 'epic', description: '鸿蒙紫气加身，道祖之姿', effects: { cultivationBonus: 40, breakthroughBonus: 20, attackBonus: 30, defenseBonus: 25 } },
  { id: 'epic_2', name: '混沌神体', rarity: 'epic', description: '混沌之力，创世之姿', effects: { cultivationBonus: 35, attackBonus: 50, defenseBonus: 40, hpBonus: 500, critBonus: 10 } },
  { id: 'epic_3', name: '盘古真身', rarity: 'epic', description: '盘古血脉，开天辟地', effects: { attackBonus: 80, defenseBonus: 50, hpBonus: 600, critBonus: 12 } },
  { id: 'epic_4', name: '女娲灵体', rarity: 'epic', description: '女娲造化，生机无限', effects: { hpBonus: 800, lifespanBonus: 100, breakthroughBonus: 25, defenseBonus: 30 } },
  { id: 'epic_5', name: '太上道体', rarity: 'epic', description: '太上忘情，大道可期', effects: { cultivationBonus: 50, breakthroughBonus: 30, defenseBonus: 20, lifespanBonus: 80 } },
  { id: 'epic_6', name: '元始真体', rarity: 'epic', description: '元始之力，造化万千', effects: { cultivationBonus: 45, attackBonus: 40, defenseBonus: 35, breakthroughBonus: 20 } },
  { id: 'epic_7', name: '通天剑体', rarity: 'epic', description: '通天剑意，一剑破万法', effects: { attackBonus: 70, critBonus: 18, breakthroughBonus: 15, dodgeBonus: 10 } },
  { id: 'epic_8', name: '菩提道体', rarity: 'epic', description: '菩提证道，明心见性', effects: { cultivationBonus: 55, breakthroughBonus: 35, wisdomBonus: 10 } as any },
  { id: 'epic_9', name: '斗战圣体', rarity: 'epic', description: '斗战圣王，越战越强', effects: { attackBonus: 90, defenseBonus: 40, hpBonus: 700, critBonus: 15 } },
  { id: 'epic_10', name: '九幽冥体', rarity: 'epic', description: '九幽之力，生死莫测', effects: { attackBonus: 50, defenseBonus: 45, hpBonus: 600, breakthroughBonus: 20 } },
  { id: 'epic_11', name: '血魔之体', rarity: 'epic', description: '血河老祖，以血证道', effects: { attackBonus: 60, hpBonus: 900, critBonus: 12, cultivationBonus: 20 } },
  { id: 'epic_12', name: '天机神体', rarity: 'epic', description: '天机演算，料敌先机', effects: { cultivationBonus: 40, breakthroughBonus: 30, dodgeBonus: 20, critBonus: 15 } },
  { id: 'epic_13', name: '太阴道体', rarity: 'epic', description: '太阴星主，月华满身', effects: { defenseBonus: 55, hpBonus: 700, cultivationBonus: 35, lifespanBonus: 120 } },
  { id: 'epic_14', name: '太阳战体', rarity: 'epic', description: '太阳神焰，焚尽万物', effects: { attackBonus: 100, critBonus: 20, hpBonus: 500, breakthroughBonus: 15 } },
  { id: 'epic_15', name: '五行道体', rarity: 'epic', description: '五行循环，相生相克', effects: { attackBonus: 45, defenseBonus: 45, hpBonus: 500, cultivationBonus: 30, breakthroughBonus: 20 } },
  { id: 'epic_16', name: '空间神体', rarity: 'epic', description: '空间主宰，瞬移万里', effects: { dodgeBonus: 30, critBonus: 20, attackBonus: 35, breakthroughBonus: 18 } },
  { id: 'epic_17', name: '时间王体', rarity: 'epic', description: '时间之王，岁月如梭', effects: { cultivationBonus: 60, lifespanBonus: 150, breakthroughBonus: 25, defenseBonus: 25 } },
  { id: 'epic_18', name: '阴阳圣体', rarity: 'epic', description: '阴阳调和，万法归一', effects: { attackBonus: 55, defenseBonus: 50, hpBonus: 650, cultivationBonus: 40, breakthroughBonus: 22 } },
  { id: 'epic_19', name: '乾坤之体', rarity: 'epic', description: '乾坤在握，天地我掌', effects: { attackBonus: 65, defenseBonus: 55, hpBonus: 750, cultivationBonus: 35, breakthroughBonus: 20 } },
  { id: 'epic_20', name: '不灭金身', rarity: 'epic', description: '金身不灭，万古长存', effects: { defenseBonus: 70, hpBonus: 1000, lifespanBonus: 200, breakthroughBonus: 15 } },
  
  { id: 'legendary_1', name: '仙帝之体', rarity: 'legendary', description: '仙帝转世，统御万仙', effects: { cultivationBonus: 100, attackBonus: 100, defenseBonus: 80, hpBonus: 1500, breakthroughBonus: 50, critBonus: 25, dodgeBonus: 20, lifespanBonus: 500 } },
  { id: 'legendary_2', name: '魔神之体', rarity: 'legendary', description: '上古魔神，毁天灭地', effects: { attackBonus: 200, defenseBonus: 60, hpBonus: 1200, critBonus: 35, cultivationBonus: 50, breakthroughBonus: 30 } },
  { id: 'legendary_3', name: '创世神体', rarity: 'legendary', description: '创世之力，开天辟地', effects: { cultivationBonus: 150, breakthroughBonus: 80, attackBonus: 120, defenseBonus: 100, hpBonus: 2000, critBonus: 30, dodgeBonus: 25, lifespanBonus: 1000 } },
  { id: 'legendary_4', name: '天道之体', rarity: 'legendary', description: '天道化身，万法归一', effects: { cultivationBonus: 200, breakthroughBonus: 100, defenseBonus: 120, hpBonus: 1800, attackBonus: 80, lifespanBonus: 800, dodgeBonus: 30 } },
  { id: 'legendary_5', name: '命运之体', rarity: 'legendary', description: '命运之子，天道眷顾', effects: { cultivationBonus: 120, breakthroughBonus: 120, critBonus: 50, dodgeBonus: 50, attackBonus: 100, defenseBonus: 80, hpBonus: 1500, lifespanBonus: 600 } },
  { id: 'legendary_6', name: '混沌至尊体', rarity: 'legendary', description: '混沌至尊，凌驾诸天', effects: { attackBonus: 250, defenseBonus: 150, hpBonus: 3000, cultivationBonus: 180, breakthroughBonus: 90, critBonus: 40, dodgeBonus: 35, lifespanBonus: 1200 } },
  { id: 'legendary_7', name: '鸿蒙圣体', rarity: 'legendary', description: '鸿蒙紫气，大道之基', effects: { cultivationBonus: 250, breakthroughBonus: 120, attackBonus: 150, defenseBonus: 130, hpBonus: 2500, critBonus: 35, dodgeBonus: 30, lifespanBonus: 1000 } },
  { id: 'legendary_8', name: '万古长青体', rarity: 'legendary', description: '长生不死，万古长青', effects: { lifespanBonus: 5000, hpBonus: 2000, defenseBonus: 100, cultivationBonus: 100, breakthroughBonus: 60 } },
  { id: 'legendary_9', name: '万界之主', rarity: 'legendary', description: '万界臣服，唯我独尊', effects: { attackBonus: 300, defenseBonus: 200, hpBonus: 5000, cultivationBonus: 200, breakthroughBonus: 100, critBonus: 50, dodgeBonus: 40, lifespanBonus: 2000 } },
  { id: 'legendary_10', name: '太初神体', rarity: 'legendary', description: '太初有道，道生一，一生二，二生三，三生万物', effects: { cultivationBonus: 300, breakthroughBonus: 150, attackBonus: 200, defenseBonus: 180, hpBonus: 4000, critBonus: 45, dodgeBonus: 40, lifespanBonus: 3000 } },
];

export const RARITY_WEIGHTS: Record<string, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

export const RARITY_COLORS: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

export const RARITY_NAMES: Record<string, string> = {
  common: '凡品',
  uncommon: '良品',
  rare: '极品',
  epic: '仙品',
  legendary: '神品',
};

export function getRandomConstitution(): Constitution {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  let selectedRarity = 'common';
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      selectedRarity = rarity;
      break;
    }
  }
  
  const constitutionsOfRarity = CONSTITUTIONS.filter(c => c.rarity === selectedRarity);
  return constitutionsOfRarity[Math.floor(Math.random() * constitutionsOfRarity.length)];
}

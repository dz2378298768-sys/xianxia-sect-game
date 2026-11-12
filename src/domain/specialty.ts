// 弟子专精系统（纯派生，不写入存档）：
// 专精由天赋、性格、背景共同决定，同一弟子在任何时刻推导结果一致。
// 专精影响打工选址、建筑产出、月度贡献、堂主任命与斗法战力。
import type { Disciple } from '@/types/disciple';
import type { BuildingType } from '@/types/building';

export type Specialty =
  | 'alchemy'      // 丹道
  | 'forging'      // 器道
  | 'formation'    // 阵道
  | 'beast'        // 御兽
  | 'combat'       // 斗法
  | 'stewardship'; // 庶务

/** 固定顺序：分数并列时取靠前者，保证推导确定性 */
export const SPECIALTY_ORDER: Specialty[] = [
  'alchemy', 'forging', 'formation', 'beast', 'combat', 'stewardship',
];

export const SpecialtyNames: Record<Specialty, string> = {
  alchemy: '丹道',
  forging: '器道',
  formation: '阵道',
  beast: '御兽',
  combat: '斗法',
  stewardship: '庶务',
};

export const SpecialtyDescriptions: Record<Specialty, string> = {
  alchemy: '精通药理丹方，在丹堂炼制丹药事半功倍。',
  forging: '善辨矿材火候，在炼器堂锻造法器更显锋芒。',
  formation: '精研符纹法阵，坐镇阵堂可稳固宗门根基。',
  beast: '通晓兽语灵性，在灵兽原驯养灵兽得心应手。',
  combat: '醉心攻伐之道，驻守山门时战力更胜一筹。',
  stewardship: '长于统筹杂务，在杂役堂与讲经堂调度有方。',
};

/** 专精适配的堂口：弟子在这些堂口能发挥专长 */
export const SPECIALTY_BUILDINGS: Record<Specialty, BuildingType[]> = {
  alchemy: ['pill_hall'],
  // 器道对应炼器堂（forge_hall 产法器）；符堂（talisman_hall）产符箓，另属符道
  forging: ['forge_hall'],
  formation: ['array_hall'],
  beast: ['spirit_beast_garden'],
  combat: ['mountain_gate'],
  stewardship: ['servant_hall', 'lecture_hall'],
};

/** 专精是否匹配某一堂口 */
export function specialtyMatchesBuilding(specialty: Specialty, buildingType: string): boolean {
  return SPECIALTY_BUILDINGS[specialty].includes(buildingType as BuildingType);
}

/** 推导所需的最小弟子信息（隐藏天赋 + 性格 + 背景） */
export type SpecialtyInput = Pick<Disciple, 'hiddenTalents' | 'personality' | 'background'>;

/**
 * 按天赋、性格、背景加权打分推导专精。
 * 分值完全由数据决定，不引入随机数。
 */
export function getDiscipleSpecialty(disciple: SpecialtyInput): Specialty {
  const { rootBone, spiritRhythm, constitution, daoFate } = disciple.hiddenTalents;
  const personality = disciple.personality;
  const background = disciple.background;

  const scores: Record<Specialty, number> = {
    alchemy:
      spiritRhythm * 1.2 + daoFate * 0.3 +
      (personality === 'diligent' ? 10 : 0) +
      (background === 'cultivation_family' || background === 'ancient_heritage' ? 8 : 0),
    forging:
      rootBone * 0.9 + daoFate * 0.6 +
      (personality === 'diligent' ? 5 : 0) +
      (background === 'artifact_artisan' ? 25 : 0),
    formation:
      rootBone * 0.8 + spiritRhythm * 0.7 +
      (personality === 'peaceful' ? 8 : 0) +
      (background === 'wandering_scholar' ? 12 : 0),
    beast:
      daoFate * 0.9 + constitution * 0.7 +
      (personality === 'friendly' ? 6 : 0) +
      (background === 'beast_tamer' ? 25 : 0),
    combat:
      rootBone * 1.0 + constitution * 0.6 +
      (personality === 'aggressive' ? 15 : 0) +
      (background === 'fallen_noble' ? 8 : background === 'sect_orphan' ? 6 : 0),
    stewardship:
      spiritRhythm * 0.6 + constitution * 0.5 +
      (personality === 'generous' ? 15 : personality === 'friendly' ? 6 : 0) +
      (background === 'common_folk' ? 12 : background === 'cultivation_family' ? 5 : 0),
  };

  let best: Specialty = SPECIALTY_ORDER[0];
  let bestScore = -Infinity;
  for (const specialty of SPECIALTY_ORDER) {
    if (scores[specialty] > bestScore) {
      best = specialty;
      bestScore = scores[specialty];
    }
  }
  return best;
}

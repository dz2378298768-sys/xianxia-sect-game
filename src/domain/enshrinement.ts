import type { FallenDisciple } from '@/types/enshrinement';

/** 入祠最低生前贡献 */
export const ENSHRINEMENT_MIN_CONTRIBUTION = 100;

const CAPACITY_BY_LEVEL = [0, 2, 4, 6];

/** 英灵祠容量：Lv1=2，Lv2=4，Lv3=6 */
export function getEnshrinementCapacity(level: number): number {
  if (level <= 0) return 0;
  return CAPACITY_BY_LEVEL[Math.min(level, CAPACITY_BY_LEVEL.length - 1)];
}

/** 功绩档位：100 起一档、300 起二档、1000 起三档 */
export function getSpiritMeritTier(contribution: number): 1 | 2 | 3 {
  if (contribution >= 1000) return 3;
  if (contribution >= 300) return 2;
  return 1;
}

/** 单英灵增益：声望/月与修炼百分比均等于功绩档位 */
export function getSpiritBonus(contribution: number): { reputation: number; cultivation: number } {
  const tier = getSpiritMeritTier(contribution);
  return { reputation: tier, cultivation: tier };
}

/** 校验某位已故弟子能否供奉入祠 */
export function canEnshrine(
  fallen: FallenDisciple,
  hallLevel: number,
  enshrinedCount: number,
): { ok: boolean; reason?: string } {
  if (fallen.enshrined) return { ok: false, reason: '该英灵已在祠中' };
  if (fallen.contribution < ENSHRINEMENT_MIN_CONTRIBUTION) {
    return { ok: false, reason: `生前贡献不足 ${ENSHRINEMENT_MIN_CONTRIBUTION}` };
  }
  const capacity = getEnshrinementCapacity(hallLevel);
  if (capacity <= 0) return { ok: false, reason: '英灵祠等级不足' };
  if (enshrinedCount >= capacity) return { ok: false, reason: '英灵祠已满，请先升级' };
  return { ok: true };
}

export interface EnshrinementBonus {
  /** 实际提供加成的英灵（未休眠） */
  activeSpirits: FallenDisciple[];
  reputationPerMonth: number;
  cultivationPercent: number;
}

/** 汇总英灵祠当前增益：仅建筑启用、且容量内的已供奉英灵生效 */
export function getEnshrinementBonus(
  fallen: FallenDisciple[],
  hallLevel: number,
  hallActive: boolean,
): EnshrinementBonus {
  const empty: EnshrinementBonus = { activeSpirits: [], reputationPerMonth: 0, cultivationPercent: 0 };
  if (!hallActive) return empty;

  const capacity = getEnshrinementCapacity(hallLevel);
  if (capacity <= 0) return empty;

  const activeSpirits = fallen.filter(f => f.enshrined).slice(0, capacity);
  let reputationPerMonth = 0;
  let cultivationPercent = 0;
  for (const spirit of activeSpirits) {
    const bonus = getSpiritBonus(spirit.contribution);
    reputationPerMonth += bonus.reputation;
    cultivationPercent += bonus.cultivation;
  }
  return { activeSpirits, reputationPerMonth, cultivationPercent };
}

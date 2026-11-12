import type { Disciple, DiscipleStatus, Realm } from '@/types/disciple';

/** 已故弟子记录：用作英灵祠的供奉候选 */
export interface FallenDisciple {
  /** 原弟子 id（同一弟子只记录一次） */
  id: string;
  name: string;
  /** 生前身份 */
  status: DiscipleStatus;
  /** 生前境界 */
  realm: Realm;
  /** 寿终时贡献点 */
  contribution: number;
  /** 享年 */
  age: number;
  avatarSeed: Disciple['avatarSeed'];
  deathYear: number;
  deathMonth: number;
  /** 是否已供奉入祠 */
  enshrined: boolean;
}

/** 弟子心愿类型 */
export type WishKind = 'pill' | 'book' | 'home_visit' | 'reconcile' | 'explore';

export const WishKindNames: Record<WishKind, string> = {
  pill: '求丹问药',
  book: '渴求典籍',
  home_visit: '思乡探亲',
  reconcile: '化解宿怨',
  explore: '结伴历练',
};

/** 心愿的代价（玩家应允时支付） */
export interface WishCost {
  spiritStones?: number;
  /** 求丹：需要支付的具体丹药类型 */
  pillType?: string;
  /** 结伴历练：目的地区域 ID */
  regionId?: string;
}

export type WishStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

/** 弟子心愿：独立于随机事件队列，不阻塞月度推进 */
export interface Wish {
  id: string;
  discipleId: string;
  discipleName: string;
  kind: WishKind;
  title: string;
  description: string;
  cost: WishCost;
  createdYear: number;
  createdMonth: number;
  expiresYear: number;
  expiresMonth: number;
  status: WishStatus;
  resolvedYear?: number;
  resolvedMonth?: number;
}

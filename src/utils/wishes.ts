import type { Disciple } from '@/types/disciple';
import type { Notification } from '@/types/game';
import type { Wish, WishKind, WishCost } from '@/types/wish';
import { ADULT_AGE } from '@/utils/gameLogic';
import { getRegionById } from '@/data/exploration';
import { PillTypeNames } from '@/types/pill';
import type { PillType } from '@/types/pill';
import { generateId } from '@/utils/random';

/** 心愿提出后 3 个月内未答复则自动作废 */
export const WISH_EXPIRE_MONTHS = 3;
/** 同一名弟子两次心愿之间至少间隔 12 个月 */
export const WISH_MIN_INTERVAL_MONTHS = 12;
/** 每名符合条件弟子每月的提心愿概率 */
export const WISH_MONTHLY_CHANCE = 0.04;
/** 同时待答复的心愿上限 */
export const WISH_MAX_PENDING = 5;
/** 结算后保留的历史心愿条数 */
const WISH_HISTORY_LIMIT = 30;

/**
 * 心愿实际灵石花费：
 *  - 有师傅的弟子，师傅代为贴补一半（向上取整），与 store 扣费、UI 展示保持一致；
 *  - 无灵石花费的心愿返回 0（不因师徒关系产生额外效果）。
 */
export function getEffectiveWishStoneCost(cost: WishCost, hasMaster: boolean): number {
  const stone = cost.spiritStones ?? 0;
  if (stone <= 0) return 0;
  return hasMaster ? Math.ceil(stone / 2) : stone;
}

const absMonth = (year: number, month: number) => year * 12 + month;

const fromAbsMonth = (abs: number) => {
  const zeroBased = abs - 1;
  return {
    year: Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1,
  };
};

export interface WishProcessOptions {
  disciples: Disciple[];
  wishes: Wish[];
  year: number;
  month: number;
  pillInventory: { type: string; quantity: number }[];
  spiritStones: number;
  unlockedRegions: string[];
  createNotification: (
    type: 'info' | 'success' | 'warning' | 'danger',
    title: string,
    content: string,
    date: { year: number; month: number },
  ) => Notification;
  random?: () => number;
}

export interface WishProcessResult {
  wishes: Wish[];
  notifications: Notification[];
  /** 本月新提出的心愿，便于调用方追加提示 */
  newWishes: Wish[];
}

/**
 * 为弟子生成一条心愿。返回 null 表示当前没有合适的心愿类型。
 */
function createWish(
  disciple: Disciple,
  options: Pick<WishProcessOptions, 'pillInventory' | 'spiritStones' | 'unlockedRegions' | 'year' | 'month'>,
  random: () => number,
): Wish | null {
  const { pillInventory, spiritStones, unlockedRegions, year, month } = options;

  const availablePills = pillInventory.filter(p => p.quantity > 0).map(p => p.type);
  const candidates: WishKind[] = [];
  if (availablePills.length > 0) candidates.push('pill');
  if (spiritStones >= 150) candidates.push('book');
  candidates.push('home_visit');
  if (disciple.rival) candidates.push('reconcile');
  if (unlockedRegions.length > 0) candidates.push('explore');
  if (candidates.length === 0) return null;

  const kind = candidates[Math.floor(random() * candidates.length)];

  let title = '';
  let description = '';
  const cost: Wish['cost'] = {};

  switch (kind) {
    case 'pill': {
      // 优先索要弟子偏好的丹药
      const liked = disciple.preferences?.likedPillTypes?.find(t => availablePills.includes(t));
      const pillType = liked ?? availablePills[Math.floor(random() * availablePills.length)];
      const pillName = PillTypeNames[pillType as PillType] ?? pillType;
      title = '求丹问药';
      description = `${disciple.name}修行遇到瓶颈，恳请宗门赐下一枚「${pillName}」以助修行。`;
      cost.pillType = pillType;
      break;
    }
    case 'book': {
      title = '渴求典籍';
      description = `${disciple.name}渴望研读藏经阁中的高深典籍，请求宗门拨下购置与抄录之资。`;
      cost.spiritStones = 120;
      break;
    }
    case 'home_visit': {
      title = '思乡探亲';
      description = `${disciple.name}久未归家，想请假回乡探望亲人，只求宗门赐些盘缠。`;
      cost.spiritStones = 50;
      break;
    }
    case 'reconcile': {
      title = '化解宿怨';
      description = `${disciple.name}与${disciple.rival}积怨已久，希望宗门出面调停，从此了断恩怨。`;
      cost.spiritStones = 150;
      break;
    }
    case 'explore': {
      const regionId = unlockedRegions[Math.floor(random() * unlockedRegions.length)];
      const regionName = getRegionById(regionId)?.name ?? regionId;
      title = '结伴历练';
      description = `${disciple.name}想与同门结伴前往「${regionName}」历练，请宗门准许。`;
      cost.regionId = regionId;
      break;
    }
  }

  const expires = fromAbsMonth(absMonth(year, month) + WISH_EXPIRE_MONTHS);
  return {
    id: generateId(),
    discipleId: disciple.id,
    discipleName: disciple.name,
    kind,
    title,
    description,
    cost,
    createdYear: year,
    createdMonth: month,
    expiresYear: expires.year,
    expiresMonth: expires.month,
    status: 'pending',
  };
}

/**
 * 月度心愿结算：
 *  - 过期未答复的心愿自动作废；
 *  - 为符合条件（成年、无待答复心愿、距上次心愿满 12 个月）的弟子按概率生成心愿；
 *  - 待答复心愿总数不超过 WISH_MAX_PENDING。
 */
export function processMonthlyWishes(options: WishProcessOptions): WishProcessResult {
  const {
    disciples, wishes, year, month, pillInventory, spiritStones, unlockedRegions,
    createNotification, random = Math.random,
  } = options;
  const nowAbs = absMonth(year, month);
  const notifications: Notification[] = [];

  // 1. 过期作废
  let nextWishes = wishes.map(w => {
    if (w.status !== 'pending') return w;
    if (absMonth(w.expiresYear, w.expiresMonth) > nowAbs) return w;
    notifications.push(createNotification(
      'info', '心愿落空',
      `${w.discipleName}的心愿「${w.title}」久候无音，已悄然作罢。`,
      { year, month },
    ));
    return { ...w, status: 'expired' as const, resolvedYear: year, resolvedMonth: month };
  });

  // 2. 生成新心愿
  const pending = nextWishes.filter(w => w.status === 'pending');
  const newWishes: Wish[] = [];
  let pendingCount = pending.length;

  for (const d of disciples) {
    if (pendingCount >= WISH_MAX_PENDING) break;
    if (d.age < ADULT_AGE || d.status === 'mortal') continue;
    if (nextWishes.some(w => w.status === 'pending' && w.discipleId === d.id)) continue;

    // 距上次提心愿是否已满间隔
    const lastAbs = nextWishes
      .filter(w => w.discipleId === d.id)
      .reduce((max, w) => Math.max(max, absMonth(w.createdYear, w.createdMonth)), 0);
    if (lastAbs > 0 && nowAbs - lastAbs < WISH_MIN_INTERVAL_MONTHS) continue;

    if (random() >= WISH_MONTHLY_CHANCE) continue;

    const wish = createWish(d, { pillInventory, spiritStones, unlockedRegions, year, month }, random);
    if (!wish) continue;

    newWishes.push(wish);
    nextWishes.push(wish);
    pendingCount += 1;
    notifications.push(createNotification(
      'info', '弟子心愿',
      `${d.name}向你吐露心愿：「${wish.title}」，可在弟子详情中答复，逾期作罢。`,
      { year, month },
    ));
  }

  // 3. 控制历史长度：待答复全保留，已了结只留最近 30 条
  const pendingAfter = nextWishes.filter(w => w.status === 'pending');
  const resolvedAfter = nextWishes
    .filter(w => w.status !== 'pending')
    .sort((a, b) => absMonth(b.createdYear, b.createdMonth) - absMonth(a.createdYear, a.createdMonth))
    .slice(0, WISH_HISTORY_LIMIT);

  return { wishes: [...pendingAfter, ...resolvedAfter], notifications, newWishes };
}

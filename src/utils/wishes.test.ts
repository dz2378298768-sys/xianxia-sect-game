import { describe, it, expect } from 'vitest';
import {
  processMonthlyWishes, WISH_MAX_PENDING, WISH_EXPIRE_MONTHS, getEffectiveWishStoneCost,
} from './wishes';
import type { Disciple } from '@/types/disciple';
import type { Wish } from '@/types/wish';
import type { GameDate, Notification } from '@/types/game';

function makeDisciple(overrides: Record<string, any> = {}): Disciple {
  return {
    id: 'd1',
    name: '甲',
    status: 'outer',
    realm: 'qi',
    realmStage: 'early',
    realmProgress: 0,
    age: 30,
    maxAge: 100,
    hiddenTalents: { rootBone: 50, spiritRhythm: 50, daoFate: 50, constitution: 50, spiritRoots: [] },
    talentDisplay: {},
    cultivationSpeed: 100,
    satisfaction: 100,
    contributionPoints: 0,
    constitutionId: 'normal_1',
    friends: [],
    ...overrides,
  } as unknown as Disciple;
}

function makeWish(overrides: Partial<Wish> = {}): Wish {
  return {
    id: 'w1',
    discipleId: 'd1',
    discipleName: '甲',
    kind: 'home_visit',
    title: '思乡探亲',
    description: '想回家看看',
    cost: { spiritStones: 50 },
    createdYear: 1,
    createdMonth: 1,
    expiresYear: 1,
    expiresMonth: 4,
    status: 'pending',
    ...overrides,
  };
}

function notifier(type: 'info' | 'success' | 'warning' | 'danger', title: string, content: string, date: GameDate): Notification {
  return { id: `${title}-${content}`, type, title, content, read: false, timestamp: date };
}

const baseOptions = {
  pillInventory: [{ type: 'qi_gathering_pill', quantity: 2 }],
  spiritStones: 1000,
  unlockedRegions: ['outer'],
  createNotification: notifier,
};

describe('processMonthlyWishes — 过期与生成', () => {
  it('待答复心愿到期后自动作废并留下通知', () => {
    const result = processMonthlyWishes({
      disciples: [makeDisciple()],
      wishes: [makeWish()],
      year: 1,
      month: 5,
      ...baseOptions,
      random: () => 0.99, // 不生成新心愿
    });
    expect(result.wishes[0].status).toBe('expired');
    expect(result.wishes[0].resolvedYear).toBe(1);
    expect(result.notifications.some(n => n.title === '心愿落空')).toBe(true);
  });

  it('未到期的心愿保持待答复', () => {
    const result = processMonthlyWishes({
      disciples: [makeDisciple()],
      wishes: [makeWish()],
      year: 1,
      month: 3,
      ...baseOptions,
      random: () => 0.99,
    });
    expect(result.wishes[0].status).toBe('pending');
  });

  it('未成年弟子不会提出心愿', () => {
    const result = processMonthlyWishes({
      disciples: [makeDisciple({ age: 10 })],
      wishes: [],
      year: 1,
      month: 1,
      ...baseOptions,
      random: () => 0,
    });
    expect(result.newWishes).toHaveLength(0);
  });

  it('同一弟子 12 个月内不会重复提心愿', () => {
    const recent = makeWish({
      status: 'accepted',
      createdYear: 1,
      createdMonth: 1,
    });
    const result = processMonthlyWishes({
      disciples: [makeDisciple()],
      wishes: [recent],
      year: 1,
      month: 6,
      ...baseOptions,
      random: () => 0,
    });
    expect(result.newWishes).toHaveLength(0);
  });

  it('满足条件时按概率生成心愿（求丹优先索要库存丹药）', () => {
    const result = processMonthlyWishes({
      disciples: [makeDisciple()],
      wishes: [],
      year: 2,
      month: 1,
      ...baseOptions,
      random: () => 0,
    });
    expect(result.newWishes).toHaveLength(1);
    const wish = result.newWishes[0];
    expect(wish.kind).toBe('pill');
    expect(wish.cost.pillType).toBe('qi_gathering_pill');
    expect(wish.status).toBe('pending');
    expect(wish.expiresMonth).toBe(1 + WISH_EXPIRE_MONTHS);
    expect(result.notifications.some(n => n.title === '弟子心愿')).toBe(true);
  });

  it('待答复心愿总数不超过上限', () => {
    const disciples = Array.from({ length: 8 }, (_, i) =>
      makeDisciple({ id: `d${i}`, name: `弟子${i}` }));
    const result = processMonthlyWishes({
      disciples,
      wishes: [],
      year: 2,
      month: 1,
      ...baseOptions,
      random: () => 0,
    });
    const pending = result.wishes.filter(w => w.status === 'pending');
    expect(pending.length).toBe(WISH_MAX_PENDING);
  });
});

describe('getEffectiveWishStoneCost — 师傅代付计价', () => {
  it('无师傅时按原价', () => {
    expect(getEffectiveWishStoneCost({ spiritStones: 120 }, false)).toBe(120);
  });

  it('有师傅时折半并向上取整', () => {
    expect(getEffectiveWishStoneCost({ spiritStones: 120 }, true)).toBe(60);
    expect(getEffectiveWishStoneCost({ spiritStones: 121 }, true)).toBe(61);
  });

  it('无灵石花费的心愿返回 0，师徒关系不产生折价', () => {
    expect(getEffectiveWishStoneCost({}, true)).toBe(0);
    expect(getEffectiveWishStoneCost({ regionId: 'outer' }, true)).toBe(0);
  });
});

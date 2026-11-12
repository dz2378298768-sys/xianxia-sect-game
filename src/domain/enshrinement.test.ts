import { describe, it, expect } from 'vitest';
import {
  ENSHRINEMENT_MIN_CONTRIBUTION,
  getEnshrinementCapacity,
  getSpiritMeritTier,
  canEnshrine,
  getEnshrinementBonus,
} from './enshrinement';
import type { FallenDisciple } from '@/types/enshrinement';

function makeFallen(overrides: Partial<FallenDisciple> = {}): FallenDisciple {
  return {
    id: 'f1',
    name: '甲',
    status: 'outer',
    realm: 'qi',
    contribution: 150,
    age: 80,
    avatarSeed: 1,
    deathYear: 1,
    deathMonth: 1,
    enshrined: false,
    ...overrides,
  };
}

describe('getEnshrinementCapacity', () => {
  it('Lv0/1/2/3 对应 0/2/4/6', () => {
    expect(getEnshrinementCapacity(0)).toBe(0);
    expect(getEnshrinementCapacity(1)).toBe(2);
    expect(getEnshrinementCapacity(2)).toBe(4);
    expect(getEnshrinementCapacity(3)).toBe(6);
  });

  it('超过最高等级时封顶为 6', () => {
    expect(getEnshrinementCapacity(5)).toBe(6);
  });
});

describe('getSpiritMeritTier — 功绩档位边界', () => {
  it.each([
    [0, 1],
    [99, 1],
    [100, 1],
    [299, 1],
    [300, 2],
    [999, 2],
    [1000, 3],
    [5000, 3],
  ])('贡献 %i → %i 档', (contribution, tier) => {
    expect(getSpiritMeritTier(contribution)).toBe(tier);
  });
});

describe('canEnshrine', () => {
  it('贡献不足不可供奉', () => {
    const result = canEnshrine(makeFallen({ contribution: ENSHRINEMENT_MIN_CONTRIBUTION - 1 }), 1, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain(String(ENSHRINEMENT_MIN_CONTRIBUTION));
  });

  it('已供奉不可重复供奉', () => {
    expect(canEnshrine(makeFallen({ enshrined: true }), 1, 0).ok).toBe(false);
  });

  it('容量已满不可供奉', () => {
    const result = canEnshrine(makeFallen(), 1, 2);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('已满');
  });

  it('建筑未建造/等级为 0 不可供奉', () => {
    expect(canEnshrine(makeFallen(), 0, 0).ok).toBe(false);
  });

  it('条件满足可供奉', () => {
    expect(canEnshrine(makeFallen({ contribution: 100 }), 1, 1).ok).toBe(true);
  });
});

describe('getEnshrinementBonus', () => {
  it('建筑未启用时增益为 0', () => {
    const bonus = getEnshrinementBonus([makeFallen({ enshrined: true })], 3, false);
    expect(bonus.reputationPerMonth).toBe(0);
    expect(bonus.cultivationPercent).toBe(0);
    expect(bonus.activeSpirits).toHaveLength(0);
  });

  it('等级为 0 时增益为 0', () => {
    const bonus = getEnshrinementBonus([makeFallen({ enshrined: true })], 0, true);
    expect(bonus.reputationPerMonth).toBe(0);
    expect(bonus.cultivationPercent).toBe(0);
  });

  it('只统计已供奉英灵，并按贡献档位累加', () => {
    const fallen = [
      makeFallen({ id: 'a', contribution: 100, enshrined: true }),  // 一档 +1/+1
      makeFallen({ id: 'b', contribution: 300, enshrined: true }),  // 二档 +2/+2
      makeFallen({ id: 'c', contribution: 1000, enshrined: true }), // 三档 +3/+3
      makeFallen({ id: 'd', contribution: 800, enshrined: false }), // 未供奉，不计
    ];
    const bonus = getEnshrinementBonus(fallen, 3, true);
    expect(bonus.activeSpirits.map(s => s.id)).toEqual(['a', 'b', 'c']);
    expect(bonus.reputationPerMonth).toBe(6);
    expect(bonus.cultivationPercent).toBe(6);
  });

  it('超出容量时只计前 N 位，其余休眠', () => {
    const fallen = [
      makeFallen({ id: 'a', contribution: 100, enshrined: true }),
      makeFallen({ id: 'b', contribution: 100, enshrined: true }),
      makeFallen({ id: 'c', contribution: 1000, enshrined: true }),
    ];
    const bonus = getEnshrinementBonus(fallen, 1, true); // 容量 2
    expect(bonus.activeSpirits.map(s => s.id)).toEqual(['a', 'b']);
    expect(bonus.reputationPerMonth).toBe(2);
    expect(bonus.cultivationPercent).toBe(2);
  });
});

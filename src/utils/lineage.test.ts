import { describe, it, expect } from 'vitest';
import { processMonthlyLineage, createChildDisciple, ADULT_AGE } from './gameLogic';
import type { Disciple } from '@/types/disciple';
import type { Building } from '@/types/building';
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

/** 一对互为道侣、均已成年的弟子 */
function makeCouple(): Disciple[] {
  const a = makeDisciple({
    id: 'a', name: '李青云', age: 30,
    daoPartner: '王紫烟',
    hiddenTalents: { rootBone: 60, spiritRhythm: 60, daoFate: 60, constitution: 60, spiritRoots: [] },
  });
  const b = makeDisciple({
    id: 'b', name: '王紫烟', age: 28,
    daoPartner: '李青云',
    hiddenTalents: { rootBone: 80, spiritRhythm: 80, daoFate: 80, constitution: 80, spiritRoots: [] },
  });
  return [a, b];
}

function makeOuterResidence(capacity = 4, occupied: string[] = []): Building {
  return {
    id: 'outer-1',
    type: 'outer_residence',
    name: '外门居所',
    level: 1,
    maxLevel: 3,
    status: 'active',
    discipleCapacity: capacity,
    assignedDisciples: occupied,
  } as unknown as Building;
}

const gameDate: GameDate = { year: 2, month: 5 };

function notifier(type: 'info' | 'success' | 'warning' | 'danger', title: string, content: string, date: GameDate): Notification {
  return { id: 'n1', type, title, content, read: false, timestamp: date };
}

describe('createChildDisciple — 血脉天赋继承', () => {
  it('天赋取双亲均值（random=0.5 时无波动）', () => {
    const [a, b] = makeCouple();
    const child = createChildDisciple(a, b, gameDate, 'founding', () => 0.5);
    expect(child.hiddenTalents.rootBone).toBe(70);
    expect(child.hiddenTalents.spiritRhythm).toBe(70);
    expect(child.hiddenTalents.daoFate).toBe(70);
  });

  it('天赋不会溢出边界（100 + 8 波动仍被钳制在 100）', () => {
    const [a, b] = makeCouple();
    const pa = { ...a, hiddenTalents: { ...a.hiddenTalents, rootBone: 100 } };
    const pb = { ...b, hiddenTalents: { ...b.hiddenTalents, rootBone: 100 } };
    const child = createChildDisciple(pa as Disciple, pb as Disciple, gameDate, 'founding', () => 0.99);
    expect(child.hiddenTalents.rootBone).toBe(100);
  });

  it('新生儿为 0 岁、凡人境、继承姓氏与代数、记录父母', () => {
    const [a, b] = makeCouple();
    const child = createChildDisciple(a, b, gameDate, 'founding', () => 0.5);
    expect(child.age).toBe(0);
    expect(child.realm).toBe('mortal');
    expect(child.age).toBeLessThan(ADULT_AGE);
    expect(['李', '王']).toContain(child.name[0]);
    expect(child.generation).toBe(2);
    expect(child.parents).toEqual(['李青云', '王紫烟']);
    expect(child.assignedBuilding).toBeNull();
  });
});

describe('processMonthlyLineage — 月度生育约束', () => {
  it('政策关闭时不生育', () => {
    const result = processMonthlyLineage(makeCouple(), [makeOuterResidence()], {
      enabled: false,
      discipleCap: null,
      sectLevel: 'founding',
      gameDate,
      createNotification: notifier,
      random: () => 0,
    });
    expect(result.newborns).toHaveLength(0);
  });

  it('弟子已达上限时不生育', () => {
    const result = processMonthlyLineage(makeCouple(), [makeOuterResidence()], {
      enabled: true,
      discipleCap: 2,
      sectLevel: 'founding',
      gameDate,
      createNotification: notifier,
      random: () => 0,
    });
    expect(result.newborns).toHaveLength(0);
  });

  it('外门床位已满时不生育', () => {
    const result = processMonthlyLineage(makeCouple(), [makeOuterResidence(2, ['a', 'b'])], {
      enabled: true,
      discipleCap: null,
      sectLevel: 'founding',
      gameDate,
      createNotification: notifier,
      random: () => 0,
    });
    expect(result.newborns).toHaveLength(0);
  });

  it('条件齐备且随机命中时诞生 1 名子嗣并占用床位', () => {
    const result = processMonthlyLineage(makeCouple(), [makeOuterResidence()], {
      enabled: true,
      discipleCap: null,
      sectLevel: 'founding',
      gameDate,
      createNotification: notifier,
      random: () => 0,
    });
    expect(result.newborns).toHaveLength(1);
    const residence = result.buildings.find(b => b.id === 'outer-1')!;
    expect(residence.assignedDisciples).toContain(result.newborns[0].id);
    expect(result.notifications.some(n => n.type === 'success')).toBe(true);
  });

  it('没有道侣时不生育', () => {
    const singles = [makeDisciple({ id: 'x', name: '独行客', age: 40 })];
    const result = processMonthlyLineage(singles, [makeOuterResidence()], {
      enabled: true,
      discipleCap: null,
      sectLevel: 'founding',
      gameDate,
      createNotification: notifier,
      random: () => 0,
    });
    expect(result.newborns).toHaveLength(0);
  });
});

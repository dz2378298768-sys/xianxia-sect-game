import { describe, it, expect } from 'vitest';
import { autoAssignMasters, MAX_APPRENTICES_PER_MASTER } from './gameLogic';
import type { Disciple } from '@/types/disciple';

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
    assignedBuilding: null,
    master: null,
    daoPartner: null,
    apprenticeIds: [],
    friends: [],
    ...overrides,
  } as unknown as Disciple;
}

describe('autoAssignMasters — 每月自动收徒', () => {
  it('外门弟子拜入高出两个大境界的核心弟子门下', () => {
    const apprentice = makeDisciple({ id: 'a', name: '林小子', status: 'outer', realm: 'qi' });
    const master = makeDisciple({ id: 'm', name: '云长老', status: 'core', realm: 'golden' });

    const result = autoAssignMasters([apprentice, master]);

    const a = result.find(d => d.id === 'a')!;
    const m = result.find(d => d.id === 'm')!;
    expect(a.master).toBe('云长老');
    expect(m.apprenticeIds).toContain('a');
    // 不修改入参
    expect(apprentice.master).toBeNull();
  });

  it('金丹核心弟子可以收筑基内门弟子为徒（高出 1 个大境界）', () => {
    const apprentice = makeDisciple({ id: 'a', name: '林小子', status: 'inner', realm: 'foundation' });
    const master = makeDisciple({ id: 'm', name: '云长老', status: 'core', realm: 'golden' });

    const result = autoAssignMasters([apprentice, master]);

    expect(result.find(d => d.id === 'a')!.master).toBe('云长老');
  });

  it('境界不高于对方时不收徒', () => {
    const apprentice = makeDisciple({ id: 'a', name: '林小子', status: 'inner', realm: 'foundation' });
    const master = makeDisciple({ id: 'm', name: '云长老', status: 'core', realm: 'foundation' });

    const result = autoAssignMasters([apprentice, master]);

    expect(result.find(d => d.id === 'a')!.master).toBeNull();
  });

  it(`单个师傅最多收 ${MAX_APPRENTICES_PER_MASTER} 名徒弟`, () => {
    const master = makeDisciple({ id: 'm', name: '云长老', status: 'core', realm: 'golden' });
    const existing = Array.from({ length: MAX_APPRENTICES_PER_MASTER }, (_, i) =>
      makeDisciple({ id: `e${i}`, name: `旧徒${i}`, realm: 'qi', master: '云长老' }));
    const newcomer = makeDisciple({ id: 'new', name: '新弟子', realm: 'qi' });

    const result = autoAssignMasters([master, ...existing, newcomer]);

    expect(result.find(d => d.id === 'new')!.master).toBeNull();
  });

  it('道侣之间不结师徒', () => {
    const apprentice = makeDisciple({ id: 'a', name: '林小子', realm: 'qi', daoPartner: '云长老' });
    const master = makeDisciple({ id: 'm', name: '云长老', status: 'core', realm: 'golden', daoPartner: '林小子' });

    const result = autoAssignMasters([apprentice, master]);

    expect(result.find(d => d.id === 'a')!.master).toBeNull();
  });

  it('未成年弟子不参与收徒', () => {
    const apprentice = makeDisciple({ id: 'a', name: '稚子', realm: 'qi', age: 10 });
    const master = makeDisciple({ id: 'm', name: '云长老', status: 'core', realm: 'golden' });

    const result = autoAssignMasters([apprentice, master]);

    expect(result.find(d => d.id === 'a')!.master).toBeNull();
  });

  it('师傅已不在宗门时解除旧师承并另投名师', () => {
    const apprentice = makeDisciple({ id: 'a', name: '林小子', realm: 'qi', master: '已故长老' });
    const master = makeDisciple({ id: 'm', name: '云长老', status: 'core', realm: 'golden' });

    const result = autoAssignMasters([apprentice, master]);

    expect(result.find(d => d.id === 'a')!.master).toBe('云长老');
  });

  it('优先拜入同堂口的师傅', () => {
    const apprentice = makeDisciple({ id: 'a', name: '林小子', realm: 'qi', assignedBuilding: 'pill-1' });
    const sameHall = makeDisciple({ id: 'm1', name: '丹堂长老', status: 'core', realm: 'golden', assignedBuilding: 'pill-1' });
    const otherHall = makeDisciple({ id: 'm2', name: '剑堂长老', status: 'elder', realm: 'spirit', assignedBuilding: 'array-1' });

    const result = autoAssignMasters([apprentice, sameHall, otherHall]);

    expect(result.find(d => d.id === 'a')!.master).toBe('丹堂长老');
  });
});

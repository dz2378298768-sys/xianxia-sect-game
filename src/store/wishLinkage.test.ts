import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { Disciple } from '@/types/disciple';
import type { Wish } from '@/types/wish';

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
    hiddenTalents: { rootBone: 50, spiritRhythm: 50, constitution: 50, daoFate: 50, spiritRoots: [] },
    talentDisplay: {},
    cultivationSpeed: 100,
    satisfaction: 50,
    combatExperience: 0,
    contributionPoints: 100,
    personality: 'peaceful',
    background: 'common_folk',
    assignedBuilding: null,
    master: null,
    daoPartner: null,
    apprenticeIds: [],
    friends: [],
    learnedSecrets: [],
    learnedBattles: [],
    learnedTechnique: null,
    ...overrides,
  } as unknown as Disciple;
}

function makeWish(overrides: Partial<Wish> = {}): Wish {
  return {
    id: 'w1',
    discipleId: 'd1',
    discipleName: '甲',
    kind: 'book',
    title: '渴求典籍',
    description: '',
    cost: { spiritStones: 120 },
    createdYear: 1,
    createdMonth: 1,
    expiresYear: 1,
    expiresMonth: 4,
    status: 'pending',
    ...overrides,
  };
}

describe('acceptWish — 师徒/道侣联动', () => {
  beforeEach(() => {
    useGameStore.setState({
      year: 2,
      month: 3,
      spiritStones: 1000,
      disciples: [],
      wishes: [],
      trials: [],
      pillInventory: [],
      notifications: [],
      unlockedExplorationRegions: ['outer'],
    });
  });

  it('有师傅时灵石花费折半，师徒双方满意度提升', () => {
    const apprentice = makeDisciple({ id: 'a', name: '徒弟', master: '师父' });
    const master = makeDisciple({ id: 'm', name: '师父', status: 'core', realm: 'golden' });
    useGameStore.setState({
      disciples: [apprentice, master],
      wishes: [makeWish({ discipleId: 'a', discipleName: '徒弟', cost: { spiritStones: 120 } })],
    });

    const res = useGameStore.getState().acceptWish('w1');

    expect(res.ok).toBe(true);
    const st = useGameStore.getState();
    expect(st.spiritStones).toBe(940); // 120 折半 → 60
    expect(st.disciples.find(d => d.id === 'm')!.satisfaction).toBe(54);
    expect(st.disciples.find(d => d.id === 'a')!.satisfaction).toBe(64); // 10 + 师傅代付额外 4
  });

  it('无师傅时全额扣费，无师徒加成', () => {
    const apprentice = makeDisciple({ id: 'a', name: '徒弟' });
    useGameStore.setState({
      disciples: [apprentice],
      wishes: [makeWish({ discipleId: 'a', discipleName: '徒弟', cost: { spiritStones: 120 } })],
    });

    const res = useGameStore.getState().acceptWish('w1');

    expect(res.ok).toBe(true);
    const st = useGameStore.getState();
    expect(st.spiritStones).toBe(880);
    expect(st.disciples.find(d => d.id === 'a')!.satisfaction).toBe(60);
  });

  it('结伴历练时道侣同行，获得满意度与战斗经验', () => {
    const explorer = makeDisciple({ id: 'e', name: '探险者', daoPartner: '道侣' });
    const partner = makeDisciple({ id: 'p', name: '道侣' });
    useGameStore.setState({
      disciples: [explorer, partner],
      wishes: [makeWish({
        discipleId: 'e',
        discipleName: '探险者',
        kind: 'explore',
        title: '结伴历练',
        cost: { regionId: 'outer' },
      })],
    });

    const res = useGameStore.getState().acceptWish('w1');

    expect(res.ok).toBe(true);
    const st = useGameStore.getState();
    expect(st.trials).toHaveLength(1);
    expect(st.disciples.find(d => d.id === 'p')!.satisfaction).toBe(56);
    expect(st.disciples.find(d => d.id === 'p')!.combatExperience).toBe(10);
  });
});

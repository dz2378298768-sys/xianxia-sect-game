import { describe, it, expect } from 'vitest';
import {
  createInitialDisciple, createChildDisciple, generateAmbition,
  processMonthlyCultivation, calculateDiscipleCombatPower,
} from './gameLogic';
import type { Disciple } from '@/types/disciple';
import type { GameDate } from '@/types/game';

function makeDisciple(overrides: Record<string, any> = {}): Disciple {
  return {
    id: 'd1',
    name: '甲',
    status: 'inner',
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
    learnedSecrets: [],
    learnedTechnique: null,
    learnedBattles: [],
    buffs: [],
    ...overrides,
  } as unknown as Disciple;
}

const gameDate: GameDate = { year: 1, month: 6 };

describe('弟子志向', () => {
  it('新弟子必定拥有志向', () => {
    const d = createInitialDisciple('outer', 'qi', 'founding');
    expect(d.ambition).toBeTruthy();
  });

  it('generateAmbition 覆盖全部志向', () => {
    const all = new Set([0, 0.2, 0.4, 0.6, 0.99].map(r => generateAmbition(() => r)));
    expect(all.size).toBe(5);
  });

  it('子嗣随机继承父母一方的志向', () => {
    const a = makeDisciple({ id: 'a', name: '父', ambition: 'dao' });
    const b = makeDisciple({ id: 'b', name: '母', ambition: 'longevity' });
    const child = createChildDisciple(a, b, gameDate, 'founding', () => 0.1);
    expect(child.ambition).toBe('dao');
  });

  it('求道志向修炼更快', () => {
    const normal = processMonthlyCultivation(makeDisciple({ ambition: undefined }));
    const dao = processMonthlyCultivation(makeDisciple({ ambition: 'dao' }));
    expect(dao.realmProgress).toBeGreaterThan(normal.realmProgress);
  });

  it('复仇志向战力更强', () => {
    const normal = calculateDiscipleCombatPower(makeDisciple({ ambition: undefined }));
    const revenge = calculateDiscipleCombatPower(makeDisciple({ ambition: 'revenge' }));
    expect(revenge).toBeGreaterThan(normal);
  });
});

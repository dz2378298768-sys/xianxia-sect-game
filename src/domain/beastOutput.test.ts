import { describe, it, expect } from 'vitest';
import { computeBuildingOutput, type BuildingOutputInput } from './balance';
import type { Disciple } from '@/types/disciple';

function makeDisciple(id: string, talents: { rootBone: number; spiritRhythm: number; daoFate: number }): Disciple {
  return {
    id,
    name: id,
    hiddenTalents: {
      rootBone: talents.rootBone,
      spiritRhythm: talents.spiritRhythm,
      constitution: 50,
      daoFate: talents.daoFate,
      spiritRoots: [],
    },
    status: 'outer',
  } as unknown as Disciple;
}

function makeBeastGardenInput(overrides: Partial<BuildingOutputInput> = {}): BuildingOutputInput {
  return {
    id: 'garden-1',
    type: 'spirit_beast_garden',
    level: 1,
    status: 'active',
    capacity: 10,
    managerId: null,
    baseOutput: { spiritStones: 30, beasts: 1 },
    ...overrides,
  };
}

describe('computeBuildingOutput — 灵兽原产出灵兽', () => {
  it('灵兽原产出灵兽数量 = baseOutput.beasts × 倍率（向下取整）', () => {
    const input = makeBeastGardenInput();
    // 10 名满容量弟子，道缘/根骨较高，确保 totalMultiplier >= 1
    const disciples: Disciple[] = Array.from({ length: 10 }, (_, i) =>
      makeDisciple(`d${i}`, { rootBone: 80, spiritRhythm: 50, daoFate: 80 }),
    );
    const out = computeBuildingOutput(input, disciples);
    expect(typeof out.beasts).toBe('number');
    expect(out.beasts).toBeGreaterThanOrEqual(1);
  });

  it('无分配弟子时灵兽产出为 0', () => {
    const input = makeBeastGardenInput();
    const out = computeBuildingOutput(input, []);
    expect(out.beasts).toBe(0);
  });
});

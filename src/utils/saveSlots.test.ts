import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractSlotMeta,
  getSlots,
  saveToSlot,
  loadFromSlot,
  deleteSlot,
  SAVE_SLOT_COUNT,
  type SaveSlotMeta,
} from './saveSlots';

// 内存版 localStorage 替身，用于 node 测试环境
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

// 构造一个最小可用的 game state 快照
function makeState(overrides: Record<string, any> = {}): any {
  return {
    year: 3,
    month: 5,
    sectName: '青云宗',
    sectLevel: 'known',
    reputation: 200,
    spiritStones: 1500,
    disciples: [{ id: 'd1' }, { id: 'd2' }],
    buildings: [{ id: 'b1' }],
    ...overrides,
  };
}

describe('saveSlots - extractSlotMeta', () => {
  it('从游戏状态提取存档摘要', () => {
    const state = makeState();
    const meta = extractSlotMeta(state);
    expect(meta.sectName).toBe('青云宗');
    expect(meta.year).toBe(3);
    expect(meta.month).toBe(5);
    expect(meta.discipleCount).toBe(2);
    expect(meta.sectLevel).toBe('known');
    expect(meta.timestamp).toBeGreaterThan(0);
  });

  it('sectName 缺失时回退默认名', () => {
    const meta = extractSlotMeta(makeState({ sectName: undefined }));
    expect(meta.sectName).toBe('修仙宗门');
  });
});

describe('saveSlots - 6 个槽位管理', () => {
  let storage: Storage;
  beforeEach(() => { storage = createMemoryStorage(); });

  it('初始返回 6 个空槽位', () => {
    const slots = getSlots(storage);
    expect(slots).toHaveLength(SAVE_SLOT_COUNT);
    expect(slots.every(s => s === null)).toBe(true);
  });

  it('保存到指定槽位后，getSlots 返回该槽位摘要', () => {
    const state = makeState();
    saveToSlot(2, state, storage);
    const slots = getSlots(storage);
    expect(slots[2]).not.toBeNull();
    expect((slots[2] as SaveSlotMeta).sectName).toBe('青云宗');
    expect((slots[2] as SaveSlotMeta).discipleCount).toBe(2);
    // 其他槽位仍为空
    expect(slots[0]).toBeNull();
    expect(slots[5]).toBeNull();
  });

  it('删除槽位后该槽位恢复为空', () => {
    const state = makeState();
    saveToSlot(1, state, storage);
    expect(getSlots(storage)[1]).not.toBeNull();
    deleteSlot(1, storage);
    expect(getSlots(storage)[1]).toBeNull();
  });

  it('loadFromSlot 返回完整游戏状态', () => {
    const state = makeState({ year: 7, sectName: '紫霄宫' });
    saveToSlot(3, state, storage);
    const loaded = loadFromSlot(3, storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.year).toBe(7);
    expect(loaded!.sectName).toBe('紫霄宫');
    expect(loaded!.disciples).toHaveLength(2);
  });

  it('loadFromSlot 空槽位返回 null', () => {
    expect(loadFromSlot(0, storage)).toBeNull();
  });

  it('覆盖保存同一槽位时更新摘要', () => {
    saveToSlot(0, makeState({ sectName: '旧名' }), storage);
    saveToSlot(0, makeState({ sectName: '新名' }), storage);
    const slots = getSlots(storage);
    expect(slots[0]!.sectName).toBe('新名');
  });
});

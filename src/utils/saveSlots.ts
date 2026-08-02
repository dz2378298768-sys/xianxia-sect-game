import type { SectLevel } from '@/types/game';

/** 存档槽位数量 */
export const SAVE_SLOT_COUNT = 6;
/** localStorage 键：存档槽位元数据 + 完整快照 */
const SLOTS_KEY = 'sect-save-slots';

/** 单个存档槽位的摘要信息（用于列表展示） */
export interface SaveSlotMeta {
  index: number;
  sectName: string;
  sectLevel: SectLevel;
  year: number;
  month: number;
  discipleCount: number;
  spiritStones: number;
  timestamp: number;
}

/** 完整存档槽位：摘要 + 游戏状态快照 */
interface SaveSlot extends SaveSlotMeta {
  snapshot: any;
}

type GameStateLike = {
  year: number;
  month: number;
  sectName?: string;
  sectLevel: SectLevel;
  reputation?: number;
  spiritStones: number;
  disciples: any[];
  buildings?: any[];
};

/** 从游戏状态提取存档摘要（纯函数，可独立测试） */
export function extractSlotMeta(state: GameStateLike, index = 0): SaveSlotMeta {
  return {
    index,
    sectName: state.sectName && state.sectName.trim() ? state.sectName.trim() : '修仙宗门',
    sectLevel: state.sectLevel,
    year: state.year,
    month: state.month,
    discipleCount: state.disciples.length,
    spiritStones: Math.floor(state.spiritStones),
    timestamp: Date.now(),
  };
}

/** 读取所有槽位的摘要（空槽位为 null），默认使用 localStorage */
export function getSlots(storage: Storage = getLocalStorage()): (SaveSlotMeta | null)[] {
  const raw = storage.getItem(SLOTS_KEY);
  if (!raw) return new Array(SAVE_SLOT_COUNT).fill(null);
  try {
    const arr = JSON.parse(raw) as (SaveSlot | null)[];
    // 补齐到 6 个槽位
    const result: (SaveSlotMeta | null)[] = new Array(SAVE_SLOT_COUNT).fill(null);
    for (let i = 0; i < SAVE_SLOT_COUNT && i < arr.length; i++) {
      if (arr[i]) {
        const { snapshot, ...meta } = arr[i]!;
        result[i] = meta;
      }
    }
    return result;
  } catch {
    return new Array(SAVE_SLOT_COUNT).fill(null);
  }
}

/** 保存当前游戏状态到指定槽位 */
export function saveToSlot(index: number, state: GameStateLike, storage: Storage = getLocalStorage()): void {
  if (index < 0 || index >= SAVE_SLOT_COUNT) return;
  const slots = readRawSlots(storage);
  const meta = extractSlotMeta(state, index);
  slots[index] = { ...meta, snapshot: JSON.parse(JSON.stringify(state)) };
  storage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

/** 从指定槽位加载完整游戏状态，空槽位返回 null */
export function loadFromSlot(index: number, storage: Storage = getLocalStorage()): any | null {
  const slots = readRawSlots(storage);
  if (!slots[index]) return null;
  return slots[index]!.snapshot;
}

/** 删除指定槽位 */
export function deleteSlot(index: number, storage: Storage = getLocalStorage()): void {
  if (index < 0 || index >= SAVE_SLOT_COUNT) return;
  const slots = readRawSlots(storage);
  slots[index] = null;
  storage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

/** 读取原始槽位数组（含快照） */
function readRawSlots(storage: Storage): (SaveSlot | null)[] {
  const raw = storage.getItem(SLOTS_KEY);
  if (!raw) return new Array(SAVE_SLOT_COUNT).fill(null);
  try {
    const arr = JSON.parse(raw) as (SaveSlot | null)[];
    const result: (SaveSlot | null)[] = new Array(SAVE_SLOT_COUNT).fill(null);
    for (let i = 0; i < SAVE_SLOT_COUNT && i < arr.length; i++) {
      result[i] = arr[i] ?? null;
    }
    return result;
  } catch {
    return new Array(SAVE_SLOT_COUNT).fill(null);
  }
}

/** 安全获取 localStorage（SSR/node 环境回退） */
function getLocalStorage(): Storage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  // node 测试环境无 localStorage，返回抛错的占位（生产代码不会走到这里）
  throw new Error('localStorage 不可用');
}

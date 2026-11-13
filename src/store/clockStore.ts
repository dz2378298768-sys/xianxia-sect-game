import { create } from 'zustand';

/** 1 个游戏月按 30 日计，日历 12 月/年 */
export const DAYS_PER_MONTH = 30;
/** 1 个游戏日 = 1 秒实时（1x 速度）：1 倍速下 1 秒走 1 天，一月 30 秒 */
export const DAY_DURATION_MS = 1000;
/** 1 个游戏月 = 30 日 * 1 秒 = 30 秒实时（1x 速度） */
export const MONTH_DURATION_MS = DAY_DURATION_MS * DAYS_PER_MONTH;
/** 世界事件节拍：每 5 个游戏日一次（1x 下 5 秒），一月共 6 次。
 *  随机异闻、建筑变故、弟子结交、分支抉择都挂在这个节拍上各自掷骰，
 *  于是事件散布在整月的任意时刻，而不是堆在月结算那一瞬间。 */
export const WORLD_TICK_INTERVAL_MS = DAY_DURATION_MS * 5;
/** 节拍初始相位偏移：首次检定落在第 3 日左右，避免开局立刻来事件 */
export const WORLD_TICK_PHASE_OFFSET_MS = 2500;
/** 一个游戏月内的世界节拍次数 */
export const WORLD_TICKS_PER_MONTH = MONTH_DURATION_MS / WORLD_TICK_INTERVAL_MS;

export type GameSpeed = 1 | 2 | 4;

// ===== 弹窗强制暂停 =====
// 用引用计数锁协调多个弹窗同时打开的情况：只有全部关闭才恢复时间，
// 且恢复到「第一个弹窗打开前」的暂停状态，不会覆盖玩家手动暂停。
const modalPauseLocks: Record<string, boolean> = {};
let pausedBeforeModalLocks = false;

const hasModalLock = () => Object.keys(modalPauseLocks).length > 0;

interface ClockState {
  speed: GameSpeed;
  paused: boolean;
  monthElapsed: number;
  /** 当前世界节拍内的进度 */
  tickElapsed: number;
  setSpeed: (speed: GameSpeed) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  /** 弹窗持有暂停锁（同一 id 重复调用不会重复计数） */
  pauseForModal: (id: string) => void;
  /** 释放暂停锁；所有锁释放后才恢复时间 */
  resumeForModal: (id: string) => void;
  /** 重置当前月进度（读档、重开等场景） */
  resetMonth: () => void;
  reset: () => void;
  /**
   * 推进时钟，返回本次应触发的月度结算次数与世界事件节拍次数。
   * 只在未暂停时推进；调用方限制单帧 dt 以避免卡顿后补算。
   */
  advance: (dtMs: number) => { months: number; worldTicks: number };
}

const initial = {
  speed: 1 as GameSpeed,
  paused: false,
  monthElapsed: 0,
  tickElapsed: WORLD_TICK_PHASE_OFFSET_MS,
};

export const useClockStore = create<ClockState>()((set, get) => ({
  ...initial,
  setSpeed: (speed) => set({ speed }),
  togglePause: () => set(state => (hasModalLock() ? { paused: true } : { paused: !state.paused })),
  setPaused: (paused) => set({ paused: hasModalLock() ? true : paused }),
  pauseForModal: (id) => {
    if (modalPauseLocks[id]) return;
    if (!hasModalLock()) pausedBeforeModalLocks = get().paused;
    modalPauseLocks[id] = true;
    set({ paused: true });
  },
  resumeForModal: (id) => {
    if (!modalPauseLocks[id]) return;
    delete modalPauseLocks[id];
    if (!hasModalLock()) set({ paused: pausedBeforeModalLocks });
  },
  resetMonth: () => set({ monthElapsed: 0 }),
  reset: () => set({ ...initial }),
  advance: (dtMs) => {
    const state = get();
    if (state.paused) return { months: 0, worldTicks: 0 };
    const scaled = Math.max(0, dtMs) * state.speed;
    const monthTotal = state.monthElapsed + scaled;
    const tickTotal = state.tickElapsed + scaled;
    const months = Math.floor(monthTotal / MONTH_DURATION_MS);
    const worldTicks = Math.floor(tickTotal / WORLD_TICK_INTERVAL_MS);
    set({
      monthElapsed: monthTotal % MONTH_DURATION_MS,
      tickElapsed: tickTotal % WORLD_TICK_INTERVAL_MS,
    });
    return { months, worldTicks };
  },
}));

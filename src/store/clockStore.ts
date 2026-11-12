import { create } from 'zustand';

/** 1 个游戏月按 30 日计，日历 12 月/年 */
export const DAYS_PER_MONTH = 30;
/** 1 个游戏日 = 1 秒实时（1x 速度）：1 倍速下 1 秒走 1 天，一月 30 秒 */
export const DAY_DURATION_MS = 1000;
/** 1 个游戏月 = 30 日 * 1 秒 = 30 秒实时（1x 速度） */
export const MONTH_DURATION_MS = DAY_DURATION_MS * DAYS_PER_MONTH;
/** 独立事件检定间隔：每 1 个游戏月检定一次，约 15% 概率触发（连续 4 次未中保底） */
export const EVENT_CHECK_INTERVAL_MS = MONTH_DURATION_MS;
/** 事件检定初始相位偏移，使首次检定落在月中（约第 9 日） */
export const EVENT_CHECK_PHASE_OFFSET_MS = 9000;

export type GameSpeed = 1 | 2 | 4;

interface ClockState {
  speed: GameSpeed;
  paused: boolean;
  monthElapsed: number;
  eventElapsed: number;
  setSpeed: (speed: GameSpeed) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  /** 重置当前月进度（读档、重开等场景） */
  resetMonth: () => void;
  reset: () => void;
  /**
   * 推进时钟，返回本次应触发的结算次数。
   * 只在未暂停时推进；调用方限制单帧 dt 以避免卡顿后补算。
   */
  advance: (dtMs: number) => { months: number; eventChecks: number };
}

const initial = {
  speed: 1 as GameSpeed,
  paused: false,
  monthElapsed: 0,
  eventElapsed: EVENT_CHECK_PHASE_OFFSET_MS,
};

export const useClockStore = create<ClockState>()((set, get) => ({
  ...initial,
  setSpeed: (speed) => set({ speed }),
  togglePause: () => set(state => ({ paused: !state.paused })),
  setPaused: (paused) => set({ paused }),
  resetMonth: () => set({ monthElapsed: 0 }),
  reset: () => set({ ...initial }),
  advance: (dtMs) => {
    const state = get();
    if (state.paused) return { months: 0, eventChecks: 0 };
    const scaled = Math.max(0, dtMs) * state.speed;
    const monthTotal = state.monthElapsed + scaled;
    const eventTotal = state.eventElapsed + scaled;
    const months = Math.floor(monthTotal / MONTH_DURATION_MS);
    const eventChecks = Math.floor(eventTotal / EVENT_CHECK_INTERVAL_MS);
    set({
      monthElapsed: monthTotal % MONTH_DURATION_MS,
      eventElapsed: eventTotal % EVENT_CHECK_INTERVAL_MS,
    });
    return { months, eventChecks };
  },
}));

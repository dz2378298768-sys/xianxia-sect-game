import { create } from 'zustand';

/** 1 个游戏月 = 10 秒实时（1x 速度），约 3 个月为一季，节奏与旧版每季一回合接近 */
export const MONTH_DURATION_MS = 10000;
/** 独立事件检定间隔（与月度结算错开，保证事件可在月中弹出） */
export const EVENT_CHECK_INTERVAL_MS = 20000;
/** 事件检定初始相位偏移，使首次检定落在月中 */
export const EVENT_CHECK_PHASE_OFFSET_MS = 7000;

export type GameSpeed = 1 | 2 | 4;

interface ClockState {
  speed: GameSpeed;
  paused: boolean;
  monthElapsed: number;
  eventElapsed: number;
  setSpeed: (speed: GameSpeed) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  /** 重置当前月进度（跳过本月后使用） */
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

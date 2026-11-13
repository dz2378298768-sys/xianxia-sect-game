import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGameStore } from './gameStore';
import { GAME_EVENT_MAP } from '@/data/events';
import { MONTH_DURATION_MS, DAY_DURATION_MS, WORLD_TICK_INTERVAL_MS, WORLD_TICKS_PER_MONTH } from './clockStore';

/** 确定性伪随机，避免长跑测试抖动 */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const originalRandom = Math.random;

/**
 * 长跑回归（36 个游戏月）：
 * 不做建造/升阶等主动操作，只模拟「处理弹窗 + 卖掉多余灵草」的最低限度操作，
 * 用于发现资源变负、NaN、日期倒退、待处理事件堆积等系统性问题。
 */
describe('长跑回归：36 个月', () => {
  beforeEach(() => {
    Math.random = makeRng(20261112);
  });
  afterEach(() => {
    Math.random = originalRandom;
  });

  it('资源与日期不出现异常，待处理事件不堆积', () => {
    useGameStore.getState().newGame('长跑测试宗');

    const rows: {
      year: number; month: number; stones: number; delta: number;
      disciples: number; pending: number;
    }[] = [];
    let prevAbs = 0;

    for (let i = 0; i < 36; i++) {
      // 处理待处理事件：选第一个选项，买不起则留给月初自动结算
      for (const pending of [...useGameStore.getState().pendingEvents]) {
        const cfg = GAME_EVENT_MAP[pending.eventId];
        const choice = cfg?.choices[0];
        if (cfg && choice) useGameStore.getState().resolveEvent(pending.eventId, choice.id);
        useGameStore.getState().closeEvent();
      }

      const spiritBefore = useGameStore.getState().spiritStones;
      useGameStore.getState().nextMonth();

      // 玩家最低限度操作：卖掉超出 20 的灵草
      for (let sold = 0; sold < 20; sold++) {
        if (useGameStore.getState().herbInventory <= 20) break;
        if (!useGameStore.getState().sellShopItem('material:灵草').success) break;
      }

      // 模拟实时的世界事件节拍（一月 6 次）
      for (let tick = 0; tick < WORLD_TICKS_PER_MONTH; tick++) {
        useGameStore.getState().tickWorldEvents();
      }
      const after = useGameStore.getState();

      const abs = after.year * 12 + after.month;
      expect(abs).toBeGreaterThan(prevAbs);
      prevAbs = abs;

      expect(Number.isFinite(after.spiritStones)).toBe(true);
      expect(Number.isFinite(after.reputation)).toBe(true);
      expect(after.reputation).toBeGreaterThanOrEqual(0);
      expect(after.herbInventory).toBeGreaterThanOrEqual(0);
      expect(after.ironInventory).toBeGreaterThanOrEqual(0);
      expect(after.paperInventory).toBeGreaterThanOrEqual(0);
      expect(after.eventHistory.length).toBeLessThanOrEqual(200);
      expect(after.pendingEvents.length).toBeLessThanOrEqual(3);

      rows.push({
        year: after.year,
        month: after.month,
        stones: after.spiritStones,
        delta: after.spiritStones - spiritBefore,
        disciples: after.disciples.length,
        pending: after.pendingEvents.length,
      });

      // 清掉阻塞型弹窗，模拟玩家关闭
      useGameStore.setState({
        reportView: null,
        activeEventId: null,
        choiceEvent: null,
        pendingEncounters: [],
      });

      if (after.gameWon) break;
    }

    // 存档健康度：事件历史有记录，弟子规模没有被异常清空
    const final = useGameStore.getState();
    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(final.disciples.length).toBeGreaterThan(0);

    // 保留经济曲线摘要，便于后续调平衡时对比
    const pick = (i: number) => rows[i] && `Y${rows[i].year}M${rows[i].month} 灵石${rows[i].stones}`;
    console.log(`[长跑] ${pick(11)} | ${pick(23)} | ${pick(rows.length - 1)}`);
  });
});

describe('事件节奏参数', () => {
  it('世界事件节拍每 5 日一次，一月共 6 次，事件散布在整月', () => {
    expect(WORLD_TICK_INTERVAL_MS).toBe(DAY_DURATION_MS * 5);
    expect(WORLD_TICKS_PER_MONTH).toBe(6);
    // 节拍必须能整除月长，否则月内节拍数会漂移
    expect(MONTH_DURATION_MS % WORLD_TICK_INTERVAL_MS).toBe(0);
  });
});

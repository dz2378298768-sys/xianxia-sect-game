import { describe, it, expect } from 'vitest';
import { TASKS, TASK_MAP, MONTHLY_TASK_POOL } from '@/data/tasks';
import {
  canClaimTask, getTaskProgress, isTaskUnlocked, selectMonthlyTaskIds,
} from '@/domain/taskEngine';
import type { TaskStateView } from '@/types/task';
import { createInitialBuildings, createInitialDisciple } from '@/utils/gameLogic';

function makeState(overrides: Partial<TaskStateView> = {}): TaskStateView {
  return {
    sectLevel: 'founding',
    reputation: 10,
    spiritStones: 500,
    disciples: [createInitialDisciple('servant', 'qi')],
    buildings: createInitialBuildings(),
    otherSects: [],
    beastInventory: [],
    gameWon: false,
    taskCounters: {},
    monthlyTaskCounters: {},
    claimedTasks: {},
    monthlyTaskIds: [],
    ...overrides,
  };
}

describe('taskEngine · 进度', () => {
  it('派生指标：弟子数、建筑等级、境界人数', () => {
    const state = makeState();
    const disciples = [
      createInitialDisciple('servant', 'qi'),
      createInitialDisciple('servant', 'qi'),
      createInitialDisciple('servant', 'golden'),
    ];
    state.disciples = disciples;
    expect(getTaskProgress(TASK_MAP.M01, state).current).toBe(3);
    const hall = state.buildings.find(b => b.type === 'servant_hall')!;
    hall.level = 2;
    expect(getTaskProgress(TASK_MAP.M02, state).current).toBe(2);
    expect(getTaskProgress(TASK_MAP.M07, state).current).toBe(1);
  });

  it('计数指标读取正确（含境界细分）', () => {
    const state = makeState({ taskCounters: { breakthroughCount: 2, breakthrough_foundation: 1 } });
    expect(getTaskProgress(TASK_MAP.M03, state).current).toBe(1);
    state.taskCounters.pillCraftCount = 3;
    expect(getTaskProgress(TASK_MAP.M06, state).completed).toBe(true);
  });

  it('宗门等级用序号比较', () => {
    const state = makeState({ sectLevel: 'known' });
    expect(getTaskProgress(TASK_MAP.M04, state).completed).toBe(true);
    expect(getTaskProgress(TASK_MAP.M08, state).completed).toBe(false);
  });

  it('月度计数独立读取', () => {
    const state = makeState({ monthlyTaskCounters: { monthlyTrial: 1 } });
    expect(getTaskProgress(TASK_MAP.MT2, state).completed).toBe(true);
  });
});

describe('taskEngine · 领奖校验', () => {
  it('前置任务未完成时不可领奖', () => {
    const state = makeState({ disciples: Array.from({ length: 5 }, () => createInitialDisciple('servant', 'qi')) });
    expect(isTaskUnlocked(TASK_MAP.M02, state)).toBe(false);
    expect(canClaimTask(TASK_MAP.M02, state)).toMatchObject({ ok: false });
  });

  it('未达标不可领奖', () => {
    const state = makeState();
    expect(canClaimTask(TASK_MAP.M01, state).ok).toBe(false);
  });

  it('达标且未领取可领奖，重复领取失败', () => {
    const state = makeState({
      disciples: Array.from({ length: 5 }, () => createInitialDisciple('servant', 'qi')),
    });
    expect(canClaimTask(TASK_MAP.M01, state).ok).toBe(true);
    state.claimedTasks = { M01: { year: 1, month: 1 } };
    expect(canClaimTask(TASK_MAP.M01, state).ok).toBe(false);
  });
});

describe('taskEngine · 月度任务', () => {
  it('从 6 个月度任务中抽取 3 个且不重复', () => {
    const ids = selectMonthlyTaskIds(MONTHLY_TASK_POOL, () => 0.42);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it('任务池共 39 个且 ID 唯一', () => {
    expect(TASKS).toHaveLength(39);
    expect(new Set(TASKS.map(t => t.id)).size).toBe(39);
  });
});

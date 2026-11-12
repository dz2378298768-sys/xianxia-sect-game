import type { TaskConfig, TaskProgress, TaskStateView } from '@/types/task';
import { SectLevelOrder } from '@/types/game';

function applyScale(base: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(1, base / target);
}

/** 读取任务当前进度（纯函数，渲染时调用） */
export function getTaskProgress(task: TaskConfig, state: TaskStateView): TaskProgress {
  let current = 0;
  const p = task.params || {};

  switch (task.metric) {
    case 'sectLevel':
      current = SectLevelOrder.indexOf(state.sectLevel);
      break;
    case 'reputation':
      current = state.reputation;
      break;
    case 'spiritStones':
      current = state.spiritStones;
      break;
    case 'discipleCount':
      current = state.disciples.length;
      break;
    case 'elderCount':
      current = state.disciples.filter(d => d.status === 'elder').length;
      break;
    case 'buildingCount':
      current = state.buildings.filter(b => b.type === p.type).length;
      break;
    case 'buildingLevel': {
      const levels = state.buildings.filter(b => b.type === p.type).map(b => b.level);
      current = levels.length > 0 ? Math.max(...levels) : 0;
      break;
    }
    case 'discipleRealmCount':
      current = state.disciples.filter(d => d.realm === p.realm).length;
      break;
    case 'allyCount':
      current = state.otherSects.filter(s => s.diplomaticStatus === 'ally').length;
      break;
    case 'vassalCount':
      current = state.otherSects.filter(s => s.diplomaticStatus === 'vassal').length;
      break;
    case 'beastKinds':
      current = new Set(state.beastInventory.filter(b => b.quantity > 0).map(b => b.type)).size;
      break;
    case 'booksLearned':
      current = state.disciples.reduce(
        (n, d) => n + (d.learnedTechnique ? 1 : 0) + (d.learnedBattles?.length || 0),
        0,
      );
      break;
    case 'gameWon':
      current = state.gameWon ? 1 : 0;
      break;
    case 'breakthroughCount': {
      const realm = p.realm as string | undefined;
      current = realm ? (state.taskCounters[`breakthrough_${realm}`] || 0) : (state.taskCounters.breakthroughCount || 0);
      break;
    }
    case 'tournamentChampion': {
      const scope = p.scope === 'inter-sect' ? 'inter' : 'sect';
      current = state.taskCounters[`tournamentChampion_${scope}`] || 0;
      break;
    }
    case 'monthlyAdvance':
      current = state.monthlyTaskCounters.monthlyAdvance || 0;
      break;
    case 'monthlyTrial':
      current = state.monthlyTaskCounters.monthlyTrial || 0;
      break;
    case 'monthlyRecruit':
      current = state.monthlyTaskCounters.monthlyRecruit || 0;
      break;
    case 'monthlyCraft':
      current = state.monthlyTaskCounters.monthlyCraft || 0;
      break;
    case 'monthlyEvent':
      current = state.monthlyTaskCounters.monthlyEvent || 0;
      break;
    case 'monthlyUpgrade':
      current = state.monthlyTaskCounters.monthlyUpgrade || 0;
      break;
    default:
      current = state.taskCounters[task.metric] || 0;
      break;
  }

  const claimed = !!state.claimedTasks[task.id];
  return {
    current,
    target: task.target,
    completed: current >= task.target,
    claimed,
  };
}

/** 前置任务是否均已完成（已领取） */
export function isTaskUnlocked(task: TaskConfig, state: TaskStateView): boolean {
  if (!task.prerequisite || task.prerequisite.length === 0) return true;
  return task.prerequisite.every(id => !!state.claimedTasks[id]);
}

/** 领奖校验 */
export function canClaimTask(task: TaskConfig, state: TaskStateView): { ok: boolean; reason?: string } {
  if (state.claimedTasks[task.id]) return { ok: false, reason: '已领取' };
  if (!isTaskUnlocked(task, state)) return { ok: false, reason: '前置任务未完成' };
  const progress = getTaskProgress(task, state);
  if (!progress.completed) return { ok: false, reason: '尚未完成' };
  return { ok: true };
}

/** 任务进度百分比 0-100 */
export function getTaskPercent(progress: TaskProgress): number {
  return Math.round(applyScale(progress.current, progress.target) * 100);
}

/** 从月度任务池中抽取 3 个（不重复） */
export function selectMonthlyTaskIds(pool: TaskConfig[], rng: () => number = Math.random): string[] {
  const candidates = pool.filter(t => t.type === 'monthly');
  const shuffled = [...candidates].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3).map(t => t.id);
}

/** 计数键 → 目标 +1，返回新对象（供 store 埋点） */
export function incCounter(counters: Record<string, number>, key: string, amount = 1): Record<string, number> {
  return { ...counters, [key]: (counters[key] || 0) + amount };
}

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { SectIcon } from '@/components/icons/SectIcons';
import { MiniAvatar } from '@/components/ui/Avatar';
import { DiscipleStatusNames, getRealmDisplay } from '@/types/disciple';
import type { Disciple } from '@/types/disciple';
import type { TaskConfig, TaskMetric, TaskStateView } from '@/types/task';
import { TASKS } from '@/data/tasks';
import { canClaimTask, getTaskProgress, isTaskUnlocked } from '@/domain/taskEngine';
import type { PanelType } from '@/store/uiStore';

interface Props {
  mobileMode?: boolean;
  /** 密排模式：用于左侧状态栏的任务弹窗，一行一条 */
  dense?: boolean;
}

type TabKey = 'main' | 'side' | 'monthly' | 'achievement';

const TAB_LABELS: Record<TabKey, string> = {
  main: '主线',
  side: '支线',
  monthly: '月度',
  achievement: '成就',
};

const taskPanelTarget = (metric: TaskMetric): PanelType => {
  switch (metric) {
    case 'buildingLevel':
    case 'buildingCount':
    case 'buildingUpgradeCount':
      return 'buildings';
    case 'spiritStones':
      return 'affairs';
    case 'allyCount':
    case 'vassalCount':
      return 'world';
    case 'beastKinds':
      return 'warehouse';
    case 'trialCompleteCount':
    case 'tournamentTop3':
    case 'tournamentChampion':
    case 'monthlyTrial':
      return 'activities';
    case 'discipleCount':
    case 'elderCount':
    case 'discipleRealmCount':
    case 'breakthroughCount':
    case 'booksLearned':
    case 'monthlyRecruit':
      return 'disciples';
    default:
      return 'affairs';
  }
};

export const TasksPanel: React.FC<Props> = ({ mobileMode, dense = false }) => {
  const {
    disciples, buildings, reputation, spiritStones, sectLevel,
    otherSects, beastInventory, gameWon,
    taskCounters, monthlyTaskCounters, claimedTasks, monthlyTaskIds,
    claimTaskReward,
    followedDiscipleIds, toggleFollowDisciple,
  } = useGameStore();
  const { setMobileSidePanel, setSelectedDiscipleId, setActivePanel } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabKey>('main');
  const [expanded, setExpanded] = useState(false);
  // 桌面端浮动任务栏默认收起为左侧竖条，避免长期遮挡山景
  const [minimized, setMinimized] = useState(!mobileMode && !dense);

  const view: TaskStateView = {
    sectLevel,
    reputation,
    spiritStones,
    disciples,
    buildings,
    otherSects,
    beastInventory,
    gameWon,
    taskCounters,
    monthlyTaskCounters,
    claimedTasks,
    monthlyTaskIds,
  };

  const claimableCount = useMemo(
    () => TASKS.filter(t => {
      if (t.type === 'monthly' && !monthlyTaskIds.includes(t.id)) return false;
      return canClaimTask(t, view).ok;
    }).length,
    // view 由上述字段派生，字段变化时重新计算
    [sectLevel, reputation, spiritStones, disciples, buildings, otherSects, beastInventory, gameWon, taskCounters, monthlyTaskCounters, claimedTasks, monthlyTaskIds],
  );

  const tasks = useMemo(() => {
    const base = activeTab === 'monthly'
      ? TASKS.filter(t => t.type === 'monthly' && monthlyTaskIds.includes(t.id))
      : TASKS.filter(t => t.type === activeTab);
    // 已领取的任务不再列出；成就需要长期回看，已完成的仍然保留
    if (activeTab === 'achievement') return base;
    return base.filter(t => !getTaskProgress(t, view).claimed);
    // view 由上述字段派生，字段变化时重新计算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, monthlyTaskIds, sectLevel, reputation, spiritStones, disciples, buildings, otherSects, beastInventory, gameWon, taskCounters, monthlyTaskCounters, claimedTasks]);

  const visibleTasks = dense ? tasks : expanded ? tasks : tasks.slice(0, 6);

  const followedDisciples = followedDiscipleIds
    .map(id => disciples.find(d => d.id === id))
    .filter((d): d is Disciple => !!d);

  const hasFollowed = followedDisciples.length > 0;

  const tabBadge = (tab: TabKey): number => {
    if (tab === 'monthly') {
      return TASKS.filter(t => t.type === 'monthly' && monthlyTaskIds.includes(t.id) && canClaimTask(t, view).ok).length;
    }
    return TASKS.filter(t => t.type === tab && canClaimTask(t, view).ok).length;
  };

  const renderRewards = (task: TaskConfig) => {
    const r = task.rewards;
    return (
      <div className="text-[10px] text-[var(--ink-400)] flex items-center gap-2 flex-wrap">
        {!!r.spiritStones && (
          <span className="flex items-center gap-0.5">
            <SectIcon name="gem" size={12} strokeWidth={1.8} className="text-[var(--gold-300)]" />
            {r.spiritStones}
          </span>
        )}
        {!!r.reputation && (
          <span className="flex items-center gap-0.5">
            <SectIcon name="scroll" size={12} strokeWidth={1.8} className="text-[var(--gold-200)]" />
            {r.reputation}
          </span>
        )}
        {!!r.contribution && (
          <span className="flex items-center gap-0.5">
            <SectIcon name="crystal" size={12} strokeWidth={1.8} className="text-[var(--violet)]" />
            {r.contribution}
          </span>
        )}
        {!!r.pills?.length && <span>丹药×{r.pills.reduce((n, p) => n + p.qty, 0)}</span>}
        {!!r.artifacts?.length && <span>法器×{r.artifacts.reduce((n, p) => n + p.qty, 0)}</span>}
        {!!r.talismans?.length && <span>符箓×{r.talismans.reduce((n, p) => n + p.qty, 0)}</span>}
        {!!r.beasts?.length && <span>灵兽×{r.beasts.reduce((n, p) => n + p.qty, 0)}</span>}
        {!!r.specialMaterials?.length && (
          <span>{r.specialMaterials.map(m => `${m.name}×${m.amount}`).join('、')}</span>
        )}
        {!!r.unlockPillRecipes?.length && <span className="text-[var(--jade-light)]">解锁丹方</span>}
        {!!r.unlockArtifactRecipes?.length && <span className="text-[var(--jade-light)]">解锁图谱</span>}
      </div>
    );
  };

  const renderTask = (task: TaskConfig) => {
    const progress = getTaskProgress(task, view);
    const unlocked = isTaskUnlocked(task, view);
    const claim = canClaimTask(task, view);
    const percent = Math.min(100, (progress.current / task.target) * 100);
    const hidden = task.hidden && progress.current === 0 && !progress.claimed;
    const label = activeTab === 'achievement' ? '成就' : activeTab === 'monthly' ? '月度' : task.type === 'main' ? '主线' : '支线';

    // 密排：一条任务一行，标题 + 进度 + 奖励 + 操作
    if (dense) {
      return (
        <div
          key={task.id}
          className="flex items-start gap-2.5 py-2 border-b border-[rgba(212,168,87,0.08)] last:border-0"
        >
          <span className={`${activeTab === 'achievement' ? 'jade-badge' : 'seal-badge'} mt-0.5 shrink-0`}>{label}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-display text-[13px] text-[var(--gold-200)]">
                {hidden ? '？？？' : task.title}
              </span>
              {!hidden && (
                <span className="ml-auto shrink-0 font-mono text-[11.5px] text-[var(--ink-400)]">
                  {Math.min(progress.current, task.target)}/{task.target}
                </span>
              )}
            </div>
            {!hidden && (
              <>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-300)]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-1 truncate">{renderRewards(task)}</div>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            {progress.claimed ? (
              <span className="text-[11.5px] text-[var(--jade-light)]">已领取</span>
            ) : claim.ok ? (
              <button
                onClick={() => claimTaskReward(task.id)}
                className="rounded-full border border-[rgba(212,168,87,0.45)] bg-[rgba(212,168,87,0.16)] px-3 py-1 text-[11.5px] text-[var(--gold-200)]"
              >
                领取
              </button>
            ) : !unlocked ? (
              <span className="text-[11.5px] text-[var(--ink-400)]">未解锁</span>
            ) : (
              <button
                onClick={() => setActivePanel(taskPanelTarget(task.metric))}
                className="rounded-full border border-[rgba(212,168,87,0.25)] px-3 py-1 text-[11.5px] text-[var(--gold-300)]"
              >
                前往
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={task.id} className="quest-item">
        <div className="flex items-center justify-between mb-1">
          <span className={activeTab === 'achievement' ? 'jade-badge' : 'seal-badge'}>{label}</span>
          {progress.claimed && <span className="text-[10px] text-[var(--jade-light)]">已领取</span>}
        </div>
        <div className="font-display text-sm text-[var(--gold-200)] mb-1">
          {hidden ? '？？？' : task.title}
        </div>
        <div className="text-xs text-[var(--ink-300)] mb-2">
          {hidden ? '达成一定进度后揭晓' : task.description}
        </div>
        {!hidden && (
          <>
            <div className="scroll-progress mb-1">
              <div
                className="scroll-progress-fill bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-300)]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--ink-400)] tabular-nums">
                {Math.min(progress.current, task.target)} / {task.target}
              </span>
              {renderRewards(task)}
            </div>
            <div className="flex items-center justify-end gap-2">
              {progress.claimed ? (
                <span className="text-[10px] text-[var(--jade-light)]">已领取</span>
              ) : claim.ok ? (
                <button
                  onClick={() => claimTaskReward(task.id)}
                  className="text-xs text-[var(--gold-200)] hover:text-[var(--gold-300)] transition-colors"
                >
                  领取奖励
                </button>
              ) : !unlocked ? (
                <span className="text-[10px] text-[var(--ink-400)]">前置任务未完成</span>
              ) : (
                <button
                  onClick={() => setActivePanel(taskPanelTarget(task.metric))}
                  className="text-xs text-[var(--gold-300)] hover:text-[var(--gold-200)] transition-colors flex items-center gap-1"
                >
                  前往
                  <SectIcon name="arrowRight" size={12} strokeWidth={1.8} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // 最小化后只保留左侧竖条，点击展开
  if (!mobileMode && minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        title="展开任务栏"
        className="absolute top-[calc(var(--hud-h)+8px)] left-0 z-20 flex flex-col items-center gap-1 pr-1.5 pl-1 py-2.5 rounded-r-lg border border-l-0 border-[rgba(212,168,87,0.35)] bg-[rgba(18,22,26,0.92)] text-[var(--gold-200)] hover:text-[var(--gold-300)] btn-press"
      >
        <SectIcon name="chevronUp" size={13} strokeWidth={2} />
        <span className="text-[10px] font-display [writing-mode:vertical-rl] tracking-widest">任务</span>
        {claimableCount > 0 ? (
          <span className="mt-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-[var(--cinnabar)] text-white text-[9px]">
            {claimableCount}
          </span>
        ) : (
          <SectIcon name="scroll" size={12} strokeWidth={1.6} className="text-[var(--gold-300)]/60" />
        )}
      </button>
    );
  }

  const containerClass = dense
    ? 'w-full flex flex-col'
    : mobileMode
      ? 'w-full h-full flex flex-col'
      : 'absolute top-[calc(var(--hud-h)+8px)] left-2 w-80 max-h-[48vh] scroll-panel-dark slide-in-left flex flex-col overflow-hidden';
  const containerStyle = mobileMode || dense ? {} : { zIndex: 20 };

  return (
    <div className={containerClass} style={containerStyle}>
      {/* 标签页 */}
      <div className="flex border-b border-[rgba(212,168,87,0.3)] shrink-0">
        {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => {
          const badge = tabBadge(tab);
          return (
            <button
              key={tab}
              className={`tab-btn flex-1 !px-1 ${activeTab === tab ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab); setExpanded(false); }}
            >
              {TAB_LABELS[tab]}
              {badge > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-[var(--cinnabar)] text-white text-[9px]">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
        {!dense && (mobileMode ? (
          <button className="text-[var(--ink-400)] hover:text-[var(--gold-300)] px-2 flex items-center"
            onClick={() => setMobileSidePanel('tasks')}
            title="关闭">
            <SectIcon name="close" size={16} strokeWidth={2} />
          </button>
        ) : (
          <button className="text-[var(--ink-400)] hover:text-[var(--gold-300)] px-2 flex items-center shrink-0"
            onClick={() => setMinimized(true)}
            title="最小化">
            <SectIcon name="minus" size={16} strokeWidth={2} />
          </button>
        ))}
      </div>

      {/* 可领取提示 */}
      {claimableCount > 0 && (
        <div className="px-3 py-1 text-[10px] text-[var(--gold-200)] bg-[rgba(212,168,87,0.08)] border-b border-[rgba(212,168,87,0.15)] shrink-0">
          有 {claimableCount} 个任务可领取奖励
        </div>
      )}

      <div className={dense ? 'flex-1 min-h-0 overflow-y-auto' : 'p-3 overflow-y-auto flex-1 min-h-0'}>
        {tasks.length === 0 ? (
          <div className="text-[10px] text-[var(--ink-400)] text-center py-2">暂无可显示的任务</div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map(renderTask)}
            {!dense && tasks.length > 6 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-full text-[10px] text-[var(--gold-300)] hover:text-[var(--gold-200)] py-1"
              >
                {expanded ? '收起' : `展开全部（${tasks.length}）`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 常驻：关注弟子（悬浮状态，密排弹窗里由左侧状态栏单独承载） */}
      {!mobileMode && !dense && (
        <>
          <div className="scroll-title !mt-0 shrink-0 !py-2">
            <span className="text-base">星</span>
            <span className="text-[11px]">关注</span>
            <span className="ml-auto text-[10px] text-[var(--ink-400)]">{followedDisciples.length}</span>
          </div>
          <div className="px-2.5 pb-2.5 shrink-0 overflow-y-auto scroll-panel-dark" style={{ maxHeight: 150 }}>
            {!hasFollowed ? (
              <div className="text-[10px] text-[var(--ink-400)] text-center py-1.5 leading-relaxed">
                弟子列表中关注弟子，状态在此常驻
              </div>
            ) : (
              <div className="space-y-1">
                {followedDisciples.map(d => (
                  <div
                    key={d.id}
                    className="group flex items-center gap-1.5 p-1 rounded hover:bg-sect-gold/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedDiscipleId(d.id)}
                    title={`${d.name} · ${getRealmDisplay(d)} · ${DiscipleStatusNames[d.status]}`}
                  >
                    <MiniAvatar seed={d.avatarSeed} name={d.name} status={d.status} realm={d.realm} size={24} />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className="text-[10.5px] font-display text-[var(--gold-200)] truncate">
                        {d.name}
                      </span>
                      <span className="text-[9.5px] text-[var(--ink-400)] truncate shrink-0">
                        {getRealmDisplay(d)}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleFollowDisciple(d.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-sect-gold/80"
                      title="取消关注"
                    >
                      <SectIcon name="close" size={10} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

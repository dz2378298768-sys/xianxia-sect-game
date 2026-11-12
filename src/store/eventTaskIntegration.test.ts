import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { GAME_EVENT_MAP } from '@/data/events';
import { createInitialDisciple } from '@/utils/gameLogic';

function resetGame() {
  useGameStore.getState().newGame('测试宗');
  useGameStore.setState({
    gameStarted: true,
    showMainMenu: false,
    reportView: null,
    showReport: false,
    activeEventId: null,
    pendingEvents: [],
    eventHistory: [],
    eventCooldowns: {},
    eventFlags: {},
    eventCheckMisses: 0,
    spiritStones: 5000,
    taskCounters: {},
    monthlyTaskCounters: { monthlyAdvance: 1 },
    claimedTasks: {},
  });
}

describe('随机事件与任务 · store 集成', () => {
  beforeEach(resetGame);

  it('保底触发事件并进入待处理队列（不主动弹窗）', () => {
    useGameStore.setState({ eventCheckMisses: 4 });
    const pending = useGameStore.getState().checkEventTrigger();
    expect(pending).not.toBeNull();
    expect(useGameStore.getState().activeEventId).toBeNull();
    expect(useGameStore.getState().pendingEvents).toHaveLength(1);
  });

  it('结算事件：写入历史、冷却与事件计数', () => {
    useGameStore.setState({ eventCheckMisses: 4 });
    const pending = useGameStore.getState().checkEventTrigger()!;
    const config = GAME_EVENT_MAP[pending.eventId];
    const res = useGameStore.getState().resolveEvent(pending.eventId, config.choices[0].id);
    expect(res.ok).toBe(true);
    const state = useGameStore.getState();
    expect(state.pendingEvents).toHaveLength(0);
    expect(state.eventHistory[0].eventId).toBe(pending.eventId);
    expect(state.eventCooldowns[pending.eventId]).toBeDefined();
    expect(state.taskCounters.eventResolveCount).toBe(1);
  });

  it('任务领奖真实发放并记录领取状态', () => {
    const disciples = Array.from({ length: 5 }, () => createInitialDisciple('servant', 'qi'));
    useGameStore.setState({ disciples, spiritStones: 500 });
    const res = useGameStore.getState().claimTaskReward('M01');
    expect(res.ok).toBe(true);
    const state = useGameStore.getState();
    expect(state.spiritStones).toBe(600);
    expect(state.claimedTasks.M01).toBeDefined();
    // 重复领取失败
    expect(useGameStore.getState().claimTaskReward('M01').ok).toBe(false);
  });

  it('季度末生成季报并按设置强制弹出', () => {
    useGameStore.setState({
      year: 1, month: 3,
      reportSettings: { monthly: false, quarterly: true, annual: true },
    });
    useGameStore.getState().nextMonth(); // 结算第 3 月，触发季末
    const state = useGameStore.getState();
    expect(state.quarterlyReport).not.toBeNull();
    expect(state.reportView).toBe('quarterly');
  });

  it('事件结算真实发放资源与物品', () => {
    useGameStore.setState({
      spiritStones: 5000,
      specialMaterials: {},
      pendingEvents: [{
        eventId: 'W06',
        triggeredAt: { year: 1, month: 1 },
        targetDiscipleId: undefined,
        expiresAt: 999,
      }],
    });
    const res = useGameStore.getState().resolveEvent('W06', 'a');
    expect(res.ok).toBe(true);
    const state = useGameStore.getState();
    expect(state.spiritStones).toBe(4800); // 成本 200
    expect(state.specialMaterials['商队奇珍']).toBe(5);
    expect(state.taskCounters.eventResolveCount).toBe(1);
  });

  it('逾期事件在月初自动按默认选项结算', () => {
    useGameStore.setState({
      spiritStones: 5000,
      pendingEvents: [{
        eventId: 'W06',
        triggeredAt: { year: 1, month: 1 },
        targetDiscipleId: undefined,
        expiresAt: 0,
      }],
    });
    useGameStore.getState().expireEvents();
    const state = useGameStore.getState();
    expect(state.pendingEvents).toHaveLength(0);
    // W06 的默认选项为 b「只购所需」（-80 灵石），而非首项「大量采购」（-200）
    expect(state.spiritStones).toBe(4920);
    expect(state.eventHistory[0].eventId).toBe('W06');
    expect(state.eventHistory[0].choiceId).toBe('b');
    expect(state.notifications[0].title).toBe('事件自行发展');
  });

  it('逾期事件优先执行配置的默认选项', () => {
    useGameStore.setState({
      spiritStones: 5000,
      pendingEvents: [{
        eventId: 'D01',
        triggeredAt: { year: 1, month: 1 },
        targetDiscipleId: undefined,
        expiresAt: 0,
      }],
    });
    useGameStore.getState().expireEvents();
    const state = useGameStore.getState();
    // D01 默认选项为 b「顺其自然」，不消耗灵石
    expect(state.eventHistory[0].choiceId).toBe('b');
    expect(state.spiritStones).toBe(5000);
  });

  it('任务贡献奖励真实发放到弟子贡献点', () => {
    const disciples = Array.from({ length: 5 }, () => {
      const d: any = createInitialDisciple('servant', 'qi');
      d.learnedTechnique = { name: '测试功法' };
      d.learnedBattles = [{ name: '测试战技' }];
      d.contributionPoints = 0;
      return d as any;
    });
    useGameStore.setState({
      disciples,
      spiritStones: 0,
      claimedTasks: {},
    });
    const res = useGameStore.getState().claimTaskReward('S11');
    expect(res.ok).toBe(true);
    const state = useGameStore.getState();
    expect(state.spiritStones).toBe(500);
    state.disciples.forEach(d => expect(d.contributionPoints).toBe(200));
  });

  it('月度任务跨月轮换后可以再次领取', () => {
    useGameStore.setState({
      year: 1, month: 2,
      monthlyTaskIds: ['MT1'],
      monthlyTaskCounters: { monthlyAdvance: 1 },
      claimedTasks: { MT1: { year: 1, month: 2 }, M01: { year: 1, month: 1 } },
      reportSettings: { monthly: false, quarterly: false, annual: false },
    });
    useGameStore.getState().nextMonth();
    const state = useGameStore.getState();
    // 新一轮抽到的月度任务不应残留上一轮领取记录
    state.monthlyTaskIds.forEach(id => {
      expect(state.claimedTasks[id]).toBeUndefined();
    });
    // 非月度任务领取记录保留
    expect(state.claimedTasks.M01).toBeDefined();
  });

  it('事件导致弟子离宗时同步清理分配、关注与试炼', () => {
    useGameStore.setState({ spiritStones: 5000, reputation: 100 });
    const state = useGameStore.getState();
    const target = state.disciples[0];
    const building = state.buildings.find(b => b.assignedDisciples.length >= 0)!;
    useGameStore.setState({
      disciples: state.disciples.map((d, i) => (i === 0 ? { ...d, satisfaction: 10 } : d)),
      buildings: state.buildings.map(b => (b.id === building.id
        ? { ...b, assignedDisciples: [...b.assignedDisciples, target.id] }
        : b)),
      followedDiscipleIds: [target.id],
      trials: [{
        id: 'trial-test', name: '测试试炼', description: '', difficulty: 1,
        rewards: { spiritStones: 10 }, duration: 1, requirements: {},
        status: 'in-progress', assignedDiscipleId: target.id, progress: 50,
        year: 1, month: 1,
      } as any],
      pendingEvents: [{
        eventId: 'D06',
        triggeredAt: { year: 1, month: 1 },
        targetDiscipleId: target.id,
        expiresAt: 999,
      }],
    });
    const res = useGameStore.getState().resolveEvent('D06', 'b');
    expect(res.ok).toBe(true);
    const after = useGameStore.getState();
    expect(after.disciples.some(d => d.id === target.id)).toBe(false);
    expect(after.buildings.find(b => b.id === building.id)!.assignedDisciples).not.toContain(target.id);
    expect(after.followedDiscipleIds).not.toContain(target.id);
    expect(after.trials[0].status).toBe('available');
    expect(after.trials[0].assignedDiscipleId).toBeNull();
    expect(after.reputation).toBe(105);
  });

  it('任务奖励解锁丹方真实写入', () => {
    useGameStore.setState({
      sectLevel: 'known',
      claimedTasks: { M01: { year: 1, month: 1 }, M02: { year: 1, month: 1 }, M03: { year: 1, month: 1 } },
      unlockedPillRecipes: [],
    });
    const res = useGameStore.getState().claimTaskReward('M04');
    expect(res.ok).toBe(true);
    expect(useGameStore.getState().unlockedPillRecipes).toContain('foundation_pill');
  });

  it('年末生成年报', () => {
    useGameStore.setState({
      year: 1, month: 12,
      reportSettings: { monthly: false, quarterly: false, annual: false },
    });
    useGameStore.getState().nextMonth();
    const state = useGameStore.getState();
    expect(state.annualReport).not.toBeNull();
    // 全部关闭强制弹出时，不弹窗但记录未读
    expect(state.reportView).toBeNull();
    expect(state.unreadReports.annual).toBe(true);
  });
});

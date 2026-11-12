import { describe, it, expect } from 'vitest';
import { GAME_EVENTS, GAME_EVENT_MAP } from '@/data/events';
import {
  applyEventEffects, canAffordChoice, canTriggerEvent, pickTargetDisciple, selectEvent,
} from '@/domain/eventEngine';
import type { EventStateView } from '@/types/event';
import { createInitialBuildings, createInitialDisciple } from '@/utils/gameLogic';

function makeState(overrides: Partial<EventStateView> = {}): EventStateView {
  return {
    year: 2,
    month: 1,
    sectLevel: 'founding',
    reputation: 10,
    karma: 0,
    spiritStones: 500,
    herbInventory: 20,
    ironInventory: 10,
    paperInventory: 10,
    specialMaterials: {},
    disciples: [createInitialDisciple('outer', 'qi'), createInitialDisciple('servant', 'qi')],
    buildings: createInitialBuildings(),
    otherSects: [],
    pillInventory: [],
    artifactInventory: [],
    talismanInventory: [],
    beastInventory: [],
    unlockedPillRecipes: ['recovery_pill'],
    unlockedArtifactRecipes: [],
    unlockedTalismanRecipes: [],
    libraryBooks: [],
    pendingEvents: [],
    eventHistory: [],
    eventCooldowns: {},
    ...overrides,
  };
}

describe('eventEngine · 条件与抽取', () => {
  it('等级不足时高等级事件不进入候选', () => {
    const state = makeState({ sectLevel: 'founding' });
    expect(canTriggerEvent(GAME_EVENT_MAP.O03, state)).toBe(false);
    expect(canTriggerEvent(GAME_EVENT_MAP.D01, state)).toBe(true);
  });

  it('缺少建筑时不触发对应宗门事件', () => {
    const state = makeState({ buildings: [] });
    expect(canTriggerEvent(GAME_EVENT_MAP.S01, state)).toBe(false);
  });

  it('冷却期内不重复触发', () => {
    const state = makeState({ eventCooldowns: { D01: 24 } }); // 第 25 个月结算过
    expect(canTriggerEvent(GAME_EVENT_MAP.D01, state)).toBe(false);
    const later = makeState({ eventCooldowns: { D01: 5 } });
    expect(canTriggerEvent(GAME_EVENT_MAP.D01, later)).toBe(true);
  });

  it('oncePerGame 事件触发后不再进入候选', () => {
    const state = makeState({ sectLevel: 'famous', eventHistory: [
      { eventId: 'O03', title: '古碑现世', choiceId: 'a', choiceLabel: '', year: 1, month: 1, resultText: '' },
    ] });
    expect(canTriggerEvent(GAME_EVENT_MAP.O03, state)).toBe(false);
  });

  it('待处理中的事件不重复抽取', () => {
    const state = makeState({ pendingEvents: [
      { eventId: 'D01', triggeredAt: { year: 2, month: 1 }, expiresAt: 30 },
    ] });
    expect(canTriggerEvent(GAME_EVENT_MAP.D01, state)).toBe(false);
  });

  it('加权抽取在固定随机数下命中首个候选', () => {
    const state = makeState({ sectLevel: 'founding' });
    const picked = selectEvent([GAME_EVENT_MAP.D01], state, () => 0);
    expect(picked?.id).toBe('D01');
  });

  it('按满意度挑选目标弟子', () => {
    const state = makeState();
    state.disciples[0].satisfaction = 90;
    state.disciples[1].satisfaction = 10;
    expect(pickTargetDisciple(GAME_EVENT_MAP.D06, state.disciples, () => 0)).toBe(state.disciples[1].id);
  });
});

describe('eventEngine · 效果结算', () => {
  it('灵石扣减不为负且资源按等级缩放', () => {
    const state = makeState({ spiritStones: 50, sectLevel: 'famous' });
    const event = GAME_EVENT_MAP.D01;
    const res = applyEventEffects(state, event, event.choices[0], state.disciples[0].id, () => 0);
    expect(res.patch.spiritStones).toBe(0);
  });

  it('目标弟子已离开时安全跳过', () => {
    const state = makeState();
    const event = GAME_EVENT_MAP.D01;
    const res = applyEventEffects(state, event, event.choices[0], 'missing-id', () => 0);
    expect(res.patch.disciples?.length).toBe(state.disciples.length);
  });

  it('物品累加', () => {
    const state = makeState();
    const event = GAME_EVENT_MAP.W06;
    const res = applyEventEffects(state, event, event.choices[0], undefined, () => 0);
    expect(res.patch.specialMaterials?.['商队奇珍']).toBe(5);
    expect(res.patch.spiritStones).toBe(300);
  });

  it('成本不足时 canAffordChoice 返回失败', () => {
    const state = makeState({ spiritStones: 10 });
    const event = GAME_EVENT_MAP.D01;
    expect(canAffordChoice(state, event.choices[0]).ok).toBe(false);
  });

  it('弟子求去可将目标移出宗门', () => {
    const state = makeState();
    const event = GAME_EVENT_MAP.D06;
    const targetId = state.disciples[1].id;
    const res = applyEventEffects(state, event, event.choices[1], targetId, () => 0);
    expect(res.patch.disciples?.some(d => d.id === targetId)).toBe(false);
    expect(res.patch.removeDiscipleIds).toContain(targetId);
  });

  it('事件池共 24 个且 ID 唯一', () => {
    expect(GAME_EVENTS).toHaveLength(24);
    expect(new Set(GAME_EVENTS.map(e => e.id)).size).toBe(24);
  });
});

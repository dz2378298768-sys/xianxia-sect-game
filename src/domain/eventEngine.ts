import type {
  EventChoice, EventEffect, EventResolution, EventStateView, GameEventConfig,
  PendingEvent,
} from '@/types/event';
import { EventRarityWeights, getAbsMonth, getLevelMultiplier, getTargetStatus } from '@/types/event';
import { SectLevelDiscipleCap, SectLevelOrder } from '@/types/game';
import type { SectLevel } from '@/types/game';
import { RealmOrder } from '@/types/disciple';
import type { Disciple } from '@/types/disciple';
import type { OtherSect } from '@/types/game';

type Rng = () => number;

function pickOne<T>(list: T[], rng: Rng): T | undefined {
  if (list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length) % list.length];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getChoiceCost(choice: EventChoice, sectLevel: SectLevel): { spiritStones: number; pill?: string } {
  const mul = getLevelMultiplier(sectLevel);
  return {
    spiritStones: choice.cost?.spiritStones ? Math.round(choice.cost.spiritStones * mul) : 0,
    pill: choice.cost?.pill,
  };
}

export function canAffordChoice(state: EventStateView, choice: EventChoice): { ok: boolean; reason?: string } {
  const cost = getChoiceCost(choice, state.sectLevel);
  if (cost.spiritStones > state.spiritStones) {
    return { ok: false, reason: `灵石不足（需 ${cost.spiritStones}）` };
  }
  if (cost.pill) {
    const has = state.pillInventory.some(p => p.type === cost.pill && p.quantity > 0);
    if (!has) return { ok: false, reason: '缺少所需丹药' };
  }
  return { ok: true };
}

/** 判断事件当前是否满足触发条件（不含冷却与一次性检查之外的历史判断） */
export function canTriggerEvent(event: GameEventConfig, state: EventStateView): boolean {
  const c = event.conditions;
  const absNow = getAbsMonth(state.year, state.month);
  if (c) {
    if (c.minYear !== undefined && state.year < c.minYear) return false;
    if (c.minSectLevel && SectLevelOrder.indexOf(state.sectLevel) < SectLevelOrder.indexOf(c.minSectLevel)) return false;
    if (c.minReputation !== undefined && state.reputation < c.minReputation) return false;
    if (c.minDisciples !== undefined && state.disciples.length < c.minDisciples) return false;
    if (c.minSpiritStones !== undefined && state.spiritStones < c.minSpiritStones) return false;
    if (c.maxSpiritStones !== undefined && state.spiritStones > c.maxSpiritStones) return false;
    if (c.minRealm) {
      const need = RealmOrder.indexOf(c.minRealm);
      if (!state.disciples.some(d => RealmOrder.indexOf(d.realm) >= need)) return false;
    }
    if (c.needsBuilding && !state.buildings.some(b => b.type === c.needsBuilding && b.status === 'active')) return false;
    if (c.requiresElderCount !== undefined && state.disciples.filter(d => d.status === 'elder').length < c.requiresElderCount) return false;
    if (c.requiresAlly && !state.otherSects.some(s => s.diplomaticStatus === 'ally')) return false;
    if (c.requiresVassal && !state.otherSects.some(s => s.diplomaticStatus === 'vassal')) return false;
    if (c.requiresDemonicHostile) {
      const hostile = state.otherSects.some(s => s.alignment === 'demonic' && (s.relation === 'hostile' || s.diplomaticStatus === 'rival'));
      if (!hostile) return false;
    }
    if (c.minRealmProgress !== undefined && !state.disciples.some(d => d.realmProgress >= c.minRealmProgress!)) return false;
    if (c.maxSpiritRootQuality !== undefined) {
      const hasLowRoot = state.disciples.some(d =>
        (d.hiddenTalents.spiritRoots || []).some(r => r.quality < c.maxSpiritRootQuality!),
      );
      if (!hasLowRoot) return false;
    }
    if (c.maxSatisfaction !== undefined && !state.disciples.some(d => d.satisfaction < c.maxSatisfaction!)) return false;
    if (c.minPills !== undefined) {
      const total = state.pillInventory.reduce((n, p) => n + p.quantity, 0);
      if (total < c.minPills) return false;
    }
    if (c.hasDiscipleCapacity) {
      const cap = SectLevelDiscipleCap[state.sectLevel];
      if (cap !== null && state.disciples.length >= cap) return false;
    }
  }

  // 一次性事件
  if (c?.oncePerGame && state.eventHistory.some(h => h.eventId === event.id)) return false;

  // 冷却
  const cd = state.eventCooldowns[event.id];
  if (cd !== undefined) {
    const months = c?.cooldownMonths ?? 12;
    if (absNow - cd < months) return false;
  }

  // 已在待处理列表中的不重复抽取
  if (state.pendingEvents.some(p => p.eventId === event.id)) return false;

  return true;
}

/** 加权抽取一个可触发事件；无候选返回 null */
export function selectEvent(
  events: GameEventConfig[],
  state: EventStateView,
  rng: Rng = Math.random,
): GameEventConfig | null {
  const candidates = events.filter(e => canTriggerEvent(e, state));
  if (candidates.length === 0) return null;
  const total = candidates.reduce((n, e) => n + (e.weight ?? EventRarityWeights[e.rarity]), 0);
  let roll = rng() * total;
  for (const e of candidates) {
    roll -= e.weight ?? EventRarityWeights[e.rarity];
    if (roll <= 0) return e;
  }
  return candidates[candidates.length - 1];
}

/** 按事件配置挑选目标弟子 id */
export function pickTargetDisciple(
  event: GameEventConfig,
  disciples: Disciple[],
  rng: Rng = Math.random,
): string | undefined {
  if (!event.targetDisciple) return undefined;
  const status = getTargetStatus(event.targetDisciple);
  let pool = status ? disciples.filter(d => d.status === status) : [...disciples];
  if (pool.length === 0) pool = [...disciples];
  if (pool.length === 0) return undefined;
  switch (event.targetDisciple) {
    case 'highestRealm': {
      const sorted = [...pool].sort((a, b) => RealmOrder.indexOf(b.realm) - RealmOrder.indexOf(a.realm));
      return sorted[0]?.id;
    }
    case 'lowestSatisfaction': {
      const sorted = [...pool].sort((a, b) => a.satisfaction - b.satisfaction);
      return sorted[0]?.id;
    }
    default:
      return pickOne(pool, rng)?.id;
  }
}

/** 创建待处理事件 */
export function createPendingEvent(
  event: GameEventConfig,
  state: EventStateView,
  rng: Rng = Math.random,
  expireMonths = 1,
): PendingEvent {
  const absNow = getAbsMonth(state.year, state.month);
  return {
    eventId: event.id,
    triggeredAt: { year: state.year, month: state.month },
    targetDiscipleId: pickTargetDisciple(event, state.disciples, rng),
    expiresAt: absNow + expireMonths,
  };
}

function addInv<T extends string>(inv: { type: T; quantity: number }[], type: T, qty: number): { type: T; quantity: number }[] {
  if (qty <= 0) return inv;
  const existing = inv.find(i => i.type === type);
  if (existing) {
    return inv.map(i => (i.type === type ? { ...i, quantity: i.quantity + qty } : i));
  }
  return [...inv, { type, quantity: qty }];
}

function removeInv<T extends string>(inv: { type: T; quantity: number }[], type: T, qty: number): { type: T; quantity: number }[] {
  const existing = inv.find(i => i.type === type);
  if (!existing) return inv;
  const left = existing.quantity - qty;
  if (left <= 0) return inv.filter(i => i.type !== type);
  return inv.map(i => (i.type === type ? { ...i, quantity: left } : i));
}

/**
 * 结算事件选项：纯函数，返回状态补丁与结果文本。
 * cost 已足够（调用方先用 canAffordChoice 校验）。
 */
export function applyEventEffects(
  state: EventStateView,
  event: GameEventConfig,
  choice: EventChoice,
  targetId: string | undefined,
  rng: Rng = Math.random,
): EventResolution {
  const mul = getLevelMultiplier(state.sectLevel);
  let spiritStones = state.spiritStones;
  let reputation = state.reputation;
  let karma = state.karma;
  let herbs = state.herbInventory;
  let iron = state.ironInventory;
  let paper = state.paperInventory;
  const specialMaterials: Record<string, number> = { ...state.specialMaterials };
  let disciples = state.disciples.map(d => ({ ...d, hiddenTalents: { ...d.hiddenTalents } }));
  let buildings = state.buildings.map(b => ({ ...b, assignedDisciples: [...b.assignedDisciples] }));
  let otherSects: OtherSect[] = state.otherSects.map(s => ({ ...s }));
  let pillInventory = state.pillInventory.map(p => ({ ...p }));
  let artifactInventory = state.artifactInventory.map(a => ({ ...a }));
  let talismanInventory = state.talismanInventory.map(t => ({ ...t }));
  let beastInventory = state.beastInventory.map(b => ({ ...b }));
  const unlockedPillRecipes = [...state.unlockedPillRecipes];
  const unlockedArtifactRecipes = [...state.unlockedArtifactRecipes];
  const unlockedTalismanRecipes = [...state.unlockedTalismanRecipes];
  const removeDiscipleIds: string[] = [];
  let addDiscipleRequest: { talentBonus: number } | undefined;
  const flags: string[] = [];

  // 成本
  const cost = getChoiceCost(choice, state.sectLevel);
  spiritStones -= cost.spiritStones;
  if (cost.pill) {
    pillInventory = removeInv(pillInventory as any, cost.pill, 1) as any;
  }

  // 抽取分支
  let effects = choice.effects;
  let resultText = choice.resultText;
  let success: boolean | undefined;
  if (choice.gamble) {
    success = rng() < choice.gamble.chance;
    effects = success ? choice.gamble.successEffects : choice.gamble.failureEffects;
    resultText = success ? choice.gamble.successText : choice.gamble.failureText;
  }

  const applyOne = (effect: EventEffect) => {
    if (effect.spiritStones !== undefined) spiritStones += Math.round(effect.spiritStones * mul);
    if (effect.herbs !== undefined) herbs += Math.round(effect.herbs * mul);
    if (effect.iron !== undefined) iron += Math.round(effect.iron * mul);
    if (effect.paper !== undefined) paper += Math.round(effect.paper * mul);
    if (effect.contribution !== undefined) {
      // 贡献作用于目标弟子
      const t = disciples.find(d => d.id === targetId);
      if (t) t.contributionPoints = Math.max(0, t.contributionPoints + Math.round(effect.contribution * mul));
    }
    if (effect.reputation !== undefined) reputation += effect.reputation;
    if (effect.karma !== undefined) karma += effect.karma;
    if (effect.specialMaterial) {
      const { name, amount } = effect.specialMaterial;
      specialMaterials[name] = Math.max(0, (specialMaterials[name] ?? 0) + amount);
    }

    if (effect.satisfaction !== undefined) {
      const t = disciples.find(d => d.id === targetId);
      if (t) t.satisfaction = clamp(t.satisfaction + effect.satisfaction, 0, 100);
    }
    if (effect.realmProgress !== undefined) {
      const t = disciples.find(d => d.id === targetId);
      if (t) t.realmProgress = Math.max(0, t.realmProgress + effect.realmProgress);
    }
    if (effect.spiritRootQuality !== undefined) {
      const t = disciples.find(d => d.id === targetId);
      if (t && t.hiddenTalents.spiritRoots?.length) {
        t.hiddenTalents.spiritRoots = t.hiddenTalents.spiritRoots.map((r, i) =>
          i === 0 ? { ...r, quality: clamp(r.quality + effect.spiritRootQuality!, 0, 100) } : r,
        );
      }
    }
    if (effect.allSatisfaction !== undefined) {
      disciples = disciples.map(d => ({ ...d, satisfaction: clamp(d.satisfaction + effect.allSatisfaction!, 0, 100) }));
    }
    if (effect.allRealmProgress !== undefined) {
      disciples = disciples.map(d => ({ ...d, realmProgress: Math.max(0, d.realmProgress + effect.allRealmProgress!) }));
    }
    if (effect.allEldersSatisfaction !== undefined) {
      disciples = disciples.map(d => (d.status === 'elder'
        ? { ...d, satisfaction: clamp(d.satisfaction + effect.allEldersSatisfaction!, 0, 100) }
        : d));
    }
    if (effect.randomDisciplesSatisfaction) {
      const { count, amount } = effect.randomDisciplesSatisfaction;
      const shuffled = [...disciples].sort(() => rng() - 0.5).slice(0, Math.max(0, count));
      const ids = new Set(shuffled.map(d => d.id));
      disciples = disciples.map(d => (ids.has(d.id)
        ? { ...d, satisfaction: clamp(d.satisfaction + amount, 0, 100) }
        : d));
    }

    if (effect.favorability !== undefined && otherSects.length > 0) {
      const hostile = otherSects.filter(s => s.relation === 'hostile' || s.diplomaticStatus === 'rival');
      const target = pickOne(hostile.length > 0 ? hostile : otherSects, rng);
      if (target) {
        otherSects = otherSects.map(s => (s.id === target.id
          ? { ...s, favorability: clamp((s.favorability ?? 50) + effect.favorability!, 0, 100) }
          : s));
      }
    }

    if (effect.addPill) pillInventory = addInv(pillInventory as any, effect.addPill.type, effect.addPill.qty) as any;
    if (effect.addArtifact) artifactInventory = addInv(artifactInventory as any, effect.addArtifact.type, effect.addArtifact.qty) as any;
    if (effect.addTalisman) talismanInventory = addInv(talismanInventory as any, effect.addTalisman.type, effect.addTalisman.qty) as any;
    if (effect.addBeast) beastInventory = addInv(beastInventory as any, effect.addBeast.type, effect.addBeast.qty) as any;

    if (effect.loseRandomPill && effect.loseRandomPill > 0) {
      let left = effect.loseRandomPill;
      while (left > 0 && pillInventory.length > 0) {
        const idx = Math.floor(rng() * pillInventory.length) % pillInventory.length;
        const p = pillInventory[idx];
        pillInventory = removeInv(pillInventory as any, p.type, 1) as any;
        left -= 1;
      }
    }
    if (effect.gainRandomPill && effect.gainRandomPill > 0) {
      const source = pillInventory.length > 0
        ? pillInventory
        : state.unlockedPillRecipes.map(t => ({ type: t, quantity: 1 }));
      for (let i = 0; i < effect.gainRandomPill; i++) {
        const pick = pickOne(source, rng);
        if (pick) pillInventory = addInv(pillInventory as any, pick.type, 1) as any;
      }
    }

    if (effect.unlockRecipe) {
      const { kind, type } = effect.unlockRecipe;
      if (kind === 'pill' && !unlockedPillRecipes.includes(type as any)) unlockedPillRecipes.push(type as any);
      if (kind === 'artifact' && !unlockedArtifactRecipes.includes(type as any)) unlockedArtifactRecipes.push(type as any);
      if (kind === 'talisman' && !unlockedTalismanRecipes.includes(type as any)) unlockedTalismanRecipes.push(type as any);
    }

    if (effect.removeDisciple && targetId) {
      const t = disciples.find(d => d.id === targetId);
      if (t) {
        removeDiscipleIds.push(t.id);
        disciples = disciples.filter(d => d.id !== t.id);
        buildings = buildings.map(b => ({ ...b, assignedDisciples: b.assignedDisciples.filter(id => id !== t.id) }));
      }
    }
    if (effect.addDisciple) addDiscipleRequest = { talentBonus: effect.addDisciple.talentBonus };
    if (effect.learnRandomTechnique) {
      const t = disciples.find(d => d.id === targetId);
      if (t) {
        const books = state.libraryBooks.filter(b => b.type === 'technique');
        const book = pickOne(books.length > 0 ? books : state.libraryBooks, rng);
        if (book) {
          t.learnedTechnique = {
            bookId: book.id,
            name: book.name,
            type: book.type,
            tier: book.tier,
            attribute: book.attribute,
            cultivationBonus: book.cultivationBonus,
            combatBonus: book.combatBonus,
            progress: 100,
            totalDays: book.learnDays,
            isLearned: true,
          };
        }
      }
    }
    if (effect.eventFlag) flags.push(effect.eventFlag);
  };

  effects.forEach(applyOne);

  return {
    patch: {
      spiritStones: Math.max(0, spiritStones),
      reputation: Math.max(0, reputation),
      karma: clamp(karma, -100, 100),
      herbInventory: Math.max(0, herbs),
      ironInventory: Math.max(0, iron),
      paperInventory: Math.max(0, paper),
      specialMaterials,
      disciples,
      buildings,
      otherSects,
      pillInventory,
      artifactInventory,
      talismanInventory,
      beastInventory,
      unlockedPillRecipes,
      unlockedArtifactRecipes,
      unlockedTalismanRecipes,
      removeDiscipleIds,
      addDiscipleRequest,
    },
    resultText,
    success,
    flags,
  };
}

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GAME_EVENT_MAP } from '@/data/events';
import {
  EventCategoryNames, EventRarityColors, EventRarityNames, getLevelMultiplier,
} from '@/types/event';
import type { EventChoice, EventEffect } from '@/types/event';
import { PillTypeNames } from '@/types/pill';
import { ArtifactTypeNames } from '@/types/artifact';
import { TalismanTypeNames } from '@/types/talisman';
import { BeastTypeNames } from '@/types/beast';

type EffectChip = { text: string; tone: 'good' | 'bad' | 'neutral' };

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** 把事件效果翻译成可读词条：资源类按宗门等级系数缩放，与结算保持一致 */
function formatEventEffects(effects: EventEffect[], mul: number): EffectChip[] {
  const chips: EffectChip[] = [];
  const addNum = (value: number, label: string, scaled = false) => {
    const v = scaled ? Math.round(value * mul) : value;
    chips.push({ text: `${label} ${signed(v)}`, tone: v > 0 ? 'good' : v < 0 ? 'bad' : 'neutral' });
  };
  for (const e of effects) {
    if (e.spiritStones !== undefined) addNum(e.spiritStones, '灵石', true);
    if (e.herbs !== undefined) addNum(e.herbs, '灵草', true);
    if (e.iron !== undefined) addNum(e.iron, '玄铁', true);
    if (e.paper !== undefined) addNum(e.paper, '灵纸', true);
    if (e.contribution !== undefined) addNum(e.contribution, '弟子贡献', true);
    if (e.reputation !== undefined) addNum(e.reputation, '声望');
    if (e.karma !== undefined) addNum(e.karma, '正邪');
    if (e.specialMaterial) {
      const { name, amount } = e.specialMaterial;
      chips.push({ text: `${name} ${signed(amount)}`, tone: amount > 0 ? 'good' : 'bad' });
    }
    if (e.satisfaction !== undefined) addNum(e.satisfaction, '该弟子满意度');
    if (e.realmProgress !== undefined) addNum(e.realmProgress, '该弟子修为');
    if (e.spiritRootQuality !== undefined) addNum(e.spiritRootQuality, '该弟子灵根纯度');
    if (e.allSatisfaction !== undefined) addNum(e.allSatisfaction, '全体满意度');
    if (e.allRealmProgress !== undefined) addNum(e.allRealmProgress, '全体修为');
    if (e.allEldersSatisfaction !== undefined) addNum(e.allEldersSatisfaction, '长老满意度');
    if (e.randomDisciplesSatisfaction) {
      const { count, amount } = e.randomDisciplesSatisfaction;
      chips.push({ text: `${count}名随机弟子满意度 ${signed(amount)}`, tone: amount > 0 ? 'good' : 'bad' });
    }
    if (e.favorability !== undefined) addNum(e.favorability, '随机宗门好感');
    if (e.addPill) chips.push({ text: `${PillTypeNames[e.addPill.type] ?? '丹药'} ×${e.addPill.qty}`, tone: 'good' });
    if (e.addArtifact) chips.push({ text: `${ArtifactTypeNames[e.addArtifact.type] ?? '法宝'} ×${e.addArtifact.qty}`, tone: 'good' });
    if (e.addTalisman) chips.push({ text: `${TalismanTypeNames[e.addTalisman.type] ?? '符箓'} ×${e.addTalisman.qty}`, tone: 'good' });
    if (e.addBeast) chips.push({ text: `${BeastTypeNames[e.addBeast.type] ?? '灵兽'} ×${e.addBeast.qty}`, tone: 'good' });
    if (e.loseRandomPill) chips.push({ text: `随机失去 ${e.loseRandomPill} 枚丹药`, tone: 'bad' });
    if (e.gainRandomPill) chips.push({ text: `随机获得 ${e.gainRandomPill} 枚丹药`, tone: 'good' });
    if (e.unlockRecipe) chips.push({ text: '解锁新配方', tone: 'good' });
    if (e.removeDisciple) chips.push({ text: '失去该弟子', tone: 'bad' });
    if (e.addDisciple) chips.push({ text: `新增弟子（天赋 +${e.addDisciple.talentBonus}）`, tone: 'good' });
    if (e.learnRandomTechnique) chips.push({ text: '习得随机功法', tone: 'good' });
  }
  return chips;
}

const EffectChips: React.FC<{ chips: EffectChip[] }> = ({ chips }) => {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`text-[10px] px-1.5 py-0.5 rounded border ${
            c.tone === 'good'
              ? 'text-green-400 border-green-500/25 bg-green-500/10'
              : c.tone === 'bad'
                ? 'text-red-400 border-red-500/25 bg-red-500/10'
                : 'text-sect-jade/60 border-sect-jade/20 bg-black/20'
          }`}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
};

export const EventModal: React.FC = () => {
  const {
    activeEventId, pendingEvents, closeEvent, resolveEvent,
    spiritStones, pillInventory, disciples, sectLevel, reportView,
  } = useGameStore();
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResultText(null);
    setError(null);
  }, [activeEventId]);

  // 异闻弹窗需要玩家做选择，期间由 Modal 统一暂停时间
  if (!activeEventId || reportView) return null;
  const config = GAME_EVENT_MAP[activeEventId];
  const pending = pendingEvents.find(p => p.eventId === activeEventId);
  if (!config) return null;

  const targetDisciple = pending?.targetDiscipleId
    ? disciples.find(d => d.id === pending.targetDiscipleId)
    : null;
  const mul = getLevelMultiplier(sectLevel);
  // 超时未处理时自动执行的选项
  const defaultChoice = config.choices.find(c => c.id === config.defaultChoiceId) ?? config.choices[0];

  const choiceCost = (choice: EventChoice) => {
    const stones = choice.cost?.spiritStones ? Math.round(choice.cost.spiritStones * mul) : 0;
    const pillName = choice.cost?.pill
      ? (PillTypeNames[choice.cost.pill] ?? '丹药')
      : '';
    return { stones, pillName };
  };

  const choiceAffordable = (choice: EventChoice): { ok: boolean; reason?: string } => {
    const { stones, pillName } = choiceCost(choice);
    if (stones > spiritStones) return { ok: false, reason: `灵石不足（需 ${stones}）` };
    if (choice.cost?.pill) {
      const has = pillInventory.some(p => p.type === choice.cost!.pill && p.quantity > 0);
      if (!has) return { ok: false, reason: `缺少${pillName}` };
    }
    return { ok: true };
  };

  const handleChoose = (choice: EventChoice) => {
    const res = resolveEvent(activeEventId, choice.id);
    if (!res.ok) {
      setError(res.reason || '无法执行');
      return;
    }
    setError(null);
    setResultText(res.resultText || choice.resultText);
  };

  return (
    <Modal
      isOpen
      onClose={closeEvent}
      title={resultText ? `${config.title} · 结果` : config.title}
      size="md"
    >
      <div className="space-y-3">
        {/* 稀有度 / 类别 */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-[11px] border"
            style={{
              color: EventRarityColors[config.rarity],
              borderColor: `${EventRarityColors[config.rarity]}55`,
              backgroundColor: `${EventRarityColors[config.rarity]}14`,
            }}
          >
            {EventRarityNames[config.rarity]}
          </span>
          <span className="text-[11px] text-sect-jade/60">{EventCategoryNames[config.category]}</span>
          {pending && (
            <span className="text-[11px] text-sect-jade/40 ml-auto">
              第 {pending.triggeredAt.year} 年 {pending.triggeredAt.month} 月
            </span>
          )}
        </div>

        {/* 描述 */}
        <p className="text-sm text-sect-jade/80 leading-relaxed">{config.description}</p>
        {targetDisciple && (
          <div className="text-xs text-sect-jade/60">
            涉及弟子：<span className="text-sect-gold">{targetDisciple.name}</span>
          </div>
        )}
        {!resultText && pending && (
          <div className="text-[11px] text-sect-jade/40">
            超时未处理将自动选择「{defaultChoice.label}」
          </div>
        )}

        {resultText ? (
          <div className="space-y-3">
            <div className="rounded border border-sect-gold/25 bg-sect-gold/5 px-3 py-2 text-sm text-sect-jade/85 leading-relaxed">
              {resultText}
            </div>
            <div className="flex justify-end">
              <Button onClick={closeEvent} className="text-xs px-3 py-1">收下结果</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {config.choices.map(choice => {
              const afford = choiceAffordable(choice);
              const { stones, pillName } = choiceCost(choice);
              return (
                <button
                  key={choice.id}
                  disabled={!afford.ok}
                  onClick={() => handleChoose(choice)}
                  className={`w-full text-left rounded border px-3 py-2 transition-colors ${
                    afford.ok
                      ? 'border-sect-gold/25 bg-black/25 hover:border-sect-gold/60 hover:bg-sect-gold/10'
                      : 'border-white/5 bg-black/10 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-sect-gold font-display">
                      {choice.label}
                      {choice.id === defaultChoice.id && (
                        <span className="ml-1.5 align-middle text-[10px] px-1 py-0.5 rounded border border-sect-gold/30 text-sect-gold/70">
                          默认
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-sect-jade/50 shrink-0">
                      {stones > 0 && `-${stones} 灵石`}
                      {stones > 0 && pillName && ' · '}
                      {pillName && `-1 ${pillName}`}
                      {!afford.ok && afford.reason ? `（${afford.reason}）` : ''}
                    </span>
                  </div>
                  {choice.hint && (
                    <div className="text-[11px] text-sect-jade/50 mt-0.5">{choice.hint}</div>
                  )}
                  {choice.gamble ? (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] text-green-400 shrink-0 mt-0.5 font-mono">
                          成功 {Math.round(choice.gamble.chance * 100)}%
                        </span>
                        <EffectChips chips={formatEventEffects(choice.gamble.successEffects, mul)} />
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] text-red-400 shrink-0 mt-0.5 font-mono">
                          失败 {Math.round((1 - choice.gamble.chance) * 100)}%
                        </span>
                        <EffectChips chips={formatEventEffects(choice.gamble.failureEffects, mul)} />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <EffectChips chips={formatEventEffects(choice.effects, mul)} />
                    </div>
                  )}
                </button>
              );
            })}
            {error && <div className="text-[11px] text-red-400">{error}</div>}
          </div>
        )}
      </div>
    </Modal>
  );
};

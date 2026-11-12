import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GAME_EVENT_MAP } from '@/data/events';
import {
  EventCategoryNames, EventRarityColors, EventRarityNames, getLevelMultiplier,
} from '@/types/event';
import type { EventChoice } from '@/types/event';
import { PillTypeNames } from '@/types/pill';

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
                  {choice.gamble && (
                    <div className="text-[11px] text-sect-jade/40 mt-0.5">
                      成败难料 · 成功率约 {Math.round(choice.gamble.chance * 100)}%
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

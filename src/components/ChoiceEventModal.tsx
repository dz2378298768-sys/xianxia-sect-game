import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Swords, Scale, UserCheck, UserX } from 'lucide-react';

const choiceIcons = [Swords, Scale, UserCheck, UserX];

/**
 * 分支选择事件弹窗
 * 每月有概率弹出，玩家做出选择后影响灵石/声望/正邪度
 */
export const ChoiceEventModal: React.FC = () => {
  const choiceEvent = useGameStore(s => s.choiceEvent);
  const resolveChoiceEvent = useGameStore(s => s.resolveChoiceEvent);

  if (!choiceEvent) return null;

  const handleChoice = (index: number) => {
    resolveChoiceEvent(index);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4"
      onClick={() => {}} // 不允许点击外部关闭，必须做选择
    >
      <div
        className="scroll-panel-dark slide-in-up max-w-md w-full p-4 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
            style={{ background: 'rgba(251,191,36,0.15)' }}>
            <Swords size={20} className="text-[var(--gold-300)]" />
          </div>
          <h3 className="font-display text-base" style={{ color: 'var(--gold-200)' }}>
            {choiceEvent.title}
          </h3>
        </div>

        <div className="text-xs leading-relaxed px-2 py-3 rounded"
          style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(251,191,36,0.15)', color: 'var(--ink-200)' }}>
          {choiceEvent.description}
        </div>

        <div className="space-y-2">
          {choiceEvent.choices.map((choice, i) => {
            const Icon = choiceIcons[i % choiceIcons.length];
            const effectsText = [];
            if (choice.effects.spiritStoneChange) effectsText.push(`${choice.effects.spiritStoneChange > 0 ? '+' : ''}${choice.effects.spiritStoneChange}灵石`);
            if (choice.effects.reputationChange) effectsText.push(`${choice.effects.reputationChange > 0 ? '+' : ''}${choice.effects.reputationChange}声望`);
            if (choice.effects.karmaChange) effectsText.push(`正邪度${choice.effects.karmaChange > 0 ? '+' : ''}${choice.effects.karmaChange}`);
            if (choice.effects.satisfactionChange) effectsText.push(`满意度${choice.effects.satisfactionChange > 0 ? '+' : ''}${choice.effects.satisfactionChange}`);

            return (
              <button
                key={i}
                onClick={() => handleChoice(i)}
                className="w-full text-left p-3 rounded transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'rgba(13,17,23,0.5)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.5)'; e.currentTarget.style.background = 'rgba(251,191,36,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.2)'; e.currentTarget.style.background = 'rgba(13,17,23,0.5)'; }}
              >
                <div className="flex items-start gap-2">
                  <Icon size={14} className="text-[var(--gold-300)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--gold-200)' }}>
                      {choice.label}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
                      {choice.description}
                    </div>
                    {effectsText.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {effectsText.map((text, j) => (
                          <span
                            key={j}
                            className="px-1.5 py-0.5 rounded text-[9px]"
                            style={{
                              background: 'rgba(59,130,246,0.15)',
                              border: '1px solid rgba(59,130,246,0.2)',
                              color: 'var(--ink-200)',
                            }}
                          >
                            {text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
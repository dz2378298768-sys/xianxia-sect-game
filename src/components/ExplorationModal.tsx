import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Compass, Shield, Swords, Skull, Award, Sparkles, Map } from 'lucide-react';

const encounterIcons = [Swords, Shield, Award, Sparkles, Map];

/**
 * 探索遭遇弹窗
 * 探索试炼过程中触发，玩家做出选择影响结果
 */
export const ExplorationEncounterModal: React.FC = () => {
  const pendingEncounter = useGameStore(s => s.pendingEncounter);
  const resolveEncounter = useGameStore(s => s.resolveExplorationEncounter);

  if (!pendingEncounter) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 px-4">
      <div
        className="scroll-panel-dark slide-in-up max-w-md w-full p-4 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
            style={{ background: 'rgba(56,189,248,0.15)' }}>
            <Compass size={20} className="text-sky-400" />
          </div>
          <h3 className="font-display text-base" style={{ color: 'var(--gold-200)' }}>
            {pendingEncounter.name}
          </h3>
        </div>

        <div className="text-xs leading-relaxed px-2 py-3 rounded"
          style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(56,189,248,0.2)', color: 'var(--ink-200)' }}>
          {pendingEncounter.description}
        </div>

        <div className="space-y-2">
          {pendingEncounter.choices.map((choice, i) => {
            const Icon = encounterIcons[i % encounterIcons.length];
            const isHighRisk = choice.successChance < 0.4;

            return (
              <button
                key={i}
                onClick={() => resolveEncounter(i)}
                className="w-full text-left p-3 rounded transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'rgba(13,17,23,0.5)',
                  border: `1px solid ${isHighRisk ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.25)'}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = isHighRisk ? 'rgba(239,68,68,0.5)' : 'rgba(56,189,248,0.5)';
                  e.currentTarget.style.background = isHighRisk ? 'rgba(239,68,68,0.08)' : 'rgba(56,189,248,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isHighRisk ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.25)';
                  e.currentTarget.style.background = 'rgba(13,17,23,0.5)';
                }}
              >
                <div className="flex items-start gap-2">
                  <Icon size={14} className="text-sky-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--gold-200)' }}>
                      {choice.label}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
                      {choice.description}
                    </div>
                  </div>
                  <div className={`text-[10px] shrink-0 px-2 py-0.5 rounded ${
                    isHighRisk
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {Math.round(choice.successChance * 100)}%
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
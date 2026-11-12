import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { MONTH_DURATION_MS, useClockStore } from '@/store/clockStore';
import type { GameSpeed } from '@/store/clockStore';
import { Pause, Play, FastForward } from 'lucide-react';

const speeds: GameSpeed[] = [1, 2, 4];

/** 顶部即时时间进度条：暂停/继续、倍速、月进度、跳过本月 */
export const TimeControls: React.FC = () => {
  const { paused, speed, monthElapsed, togglePause, setSpeed, resetMonth } = useClockStore();
  const nextMonth = useGameStore(s => s.nextMonth);

  const progress = Math.min(100, (monthElapsed / MONTH_DURATION_MS) * 100);

  const handleSkip = () => {
    nextMonth();
    resetMonth();
  };

  return (
    <div className="relative z-20 flex items-center gap-2 px-3 py-1 shrink-0 border-b border-sect-gold/20 bg-black/55 backdrop-blur-sm text-sect-jade/80">
      <button
        onClick={togglePause}
        title={paused ? '继续' : '暂停'}
        className="p-1 rounded hover:bg-sect-gold/15 text-sect-gold transition-colors"
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
      <div className="flex items-center gap-0.5">
        {speeds.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
              speed === s
                ? 'border-sect-gold/60 bg-sect-gold/20 text-sect-gold'
                : 'border-white/10 text-sect-jade/50 hover:text-sect-gold'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
      <div className="flex-1 h-1.5 rounded bg-white/10 overflow-hidden">
        <div
          className="h-full bg-sect-gold/70 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-sect-jade/50 w-8 text-right">
        {Math.floor(progress)}%
      </span>
      <button
        onClick={handleSkip}
        title="跳过本月（立即结算）"
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border border-white/10 text-sect-jade/60 hover:text-sect-gold hover:border-sect-gold/40 transition-colors whitespace-nowrap"
      >
        <FastForward size={11} />
        跳过本月
      </button>
    </div>
  );
};

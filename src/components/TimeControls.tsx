import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { DAY_DURATION_MS, DAYS_PER_MONTH, MONTH_DURATION_MS, useClockStore } from '@/store/clockStore';
import type { GameSpeed } from '@/store/clockStore';
import { Pause, Play } from 'lucide-react';

const SPEEDS: GameSpeed[] = [1, 2, 4];

/** 把 1-30 日写成「初一 / 十五 / 廿三 / 三十」这类农历日名 */
function formatDay(day: number): string {
  const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (day <= 10) return `初${digits[day - 1]}`;
  if (day < 20) return `十${digits[day - 11]}`;
  if (day === 20) return '二十';
  if (day < 30) return `廿${digits[day - 21]}`;
  return '三十';
}

/**
 * 常驻时间栏：日期 + 当月日进度 + 倍速 + 暂停。
 * 1x 下 1 秒走 1 日，进度条按日分段；暂停时进度条变暗并提示「已暂停」。
 */
export const TimeControls: React.FC = () => {
  const { year, month } = useGameStore();
  const { paused, speed, monthElapsed, togglePause, setSpeed } = useClockStore();

  const day = Math.min(DAYS_PER_MONTH, Math.floor(monthElapsed / DAY_DURATION_MS) + 1);
  const progress = Math.min(100, (monthElapsed / MONTH_DURATION_MS) * 100);

  return (
    <div className="clock-bar">
      <div className="clock-date">
        <span className="clock-date-main">
          第{year}年 {month}月
        </span>
        <span className="clock-date-day">{formatDay(day)}</span>
      </div>

      <div className="clock-track">
        <div
          className={`clock-fill ${paused ? 'clock-fill-paused' : ''}`}
          style={{ width: `${progress}%` }}
        />
        <div className="clock-ticks" />
      </div>

      {paused && <span className="clock-paused-tag">已暂停</span>}

      <div className="clock-speed">
        {SPEEDS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`clock-speed-btn ${speed === s ? 'clock-speed-btn-active' : ''}`}
            title={`${s} 倍速${s === 1 ? '（1 秒 1 日）' : ''}`}
          >
            {s}x
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={togglePause}
        className={`clock-pause-btn ${paused ? 'clock-pause-btn-paused' : ''}`}
        title={paused ? '继续时间' : '暂停时间'}
        aria-label={paused ? '继续时间' : '暂停时间'}
        aria-pressed={paused}
      >
        {paused
          ? <Play size={16} strokeWidth={2.4} fill="currentColor" />
          : <Pause size={16} strokeWidth={2.4} fill="currentColor" />}
      </button>
    </div>
  );
};

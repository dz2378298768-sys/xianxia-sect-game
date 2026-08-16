import React from 'react';
import type { CombatPowerBreakdown } from '@/types/combat';
import { Sword, Shield, Zap, BookOpen, Swords, Activity, Star } from 'lucide-react';

/**
 * 战力构成明细条状图（纯 CSS 柱状条）
 * 每行：图标 + 名称 + 数值 + 占总量比例的条
 */
const PowerBar: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
  icon?: React.ReactNode;
  suffix?: string;
}> = ({ label, value, total, color, icon, suffix }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {icon && <span className="shrink-0 w-3.5 flex justify-center">{icon}</span>}
      <span className="text-[var(--ink-300)] w-16 shrink-0">{label}</span>
      <span className="text-[var(--ink-100)] font-mono w-16 text-right shrink-0">
        {value.toFixed(0)}{suffix ?? ''}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-[rgba(13,17,23,0.5)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <span className="text-[var(--ink-400)] w-9 text-right shrink-0">{pct.toFixed(0)}%</span>
    </div>
  );
};

interface Props {
  breakdown: CombatPowerBreakdown;
}

export const CombatPowerBreakdownView: React.FC<Props> = ({ breakdown }) => {
  const b = breakdown;
  const total = b.total;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-[var(--gold-300)]" style={{ fontSize: '13px' }}>
          战力构成
        </span>
        <span className="font-bold text-[var(--gold-200)] font-mono" style={{ fontSize: '14px' }}>
          {total.toLocaleString()}
        </span>
      </div>

      <PowerBar
        label="境界基础"
        value={b.realmBase}
        total={total}
        color="linear-gradient(90deg, #3b82f6, #60a5fa)"
        icon={<Star size={11} className="text-blue-400" />}
      />
      <PowerBar
        label="天赋加成"
        value={b.talentBonus}
        total={total}
        color="linear-gradient(90deg, #8b5cf6, #a78bfa)"
        icon={<Activity size={11} className="text-purple-400" />}
      />
      {b.statusMultiplier > 1 && (
        <PowerBar
          label="身份倍率"
          value={b.basePower - b.realmBase * (1 + b.talentBonus / 100)}
          total={total}
          color="linear-gradient(90deg, #f59e0b, #fbbf24)"
          icon={<Shield size={11} className="text-amber-400" />}
          suffix="×"
        />
      )}
      {b.bookBonusTotal > 0 && (
        <PowerBar
          label="功法·战技"
          value={b.basePower * (b.bookBonusTotal / 100)}
          total={total}
          color="linear-gradient(90deg, #10b981, #34d399)"
          icon={<BookOpen size={11} className="text-emerald-400" />}
          suffix="%"
        />
      )}
      {b.equipmentBonus > 0 && (
        <PowerBar
          label="装备加成"
          value={b.equipmentBonus}
          total={total}
          color="linear-gradient(90deg, #ef4444, #f87171)"
          icon={<Swords size={11} className="text-red-400" />}
        />
      )}

      {/* 装备明细（微缩） */}
      {(b.artifactBonus > 0 || b.talismanBonus > 0 || b.beastBonus > 0) && (
        <div className="pl-5 space-y-0.5 text-[10px] text-[var(--ink-400)]">
          {b.artifactBonus > 0 && <div>法器 +{b.artifactBonus}</div>}
          {b.talismanBonus > 0 && <div>符箓 +{b.talismanBonus}</div>}
          {b.beastBonus > 0 && <div>灵兽 +{b.beastBonus}</div>}
        </div>
      )}
    </div>
  );
};
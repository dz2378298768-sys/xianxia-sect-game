import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 弟子详情弹窗的基础展示组件。
 * 全页所有区块统一使用 Section / StatCell / DetailBar / DetailChip，
 * 避免出现各式各样的手写卡片，保证字号与间距一致。
 */

/** 区块：标题 +（可选）右侧说明 + 内容卡片 */
export const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  /** 右侧说明，例如「共 3 件」「天骄 · 82」 */
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, hint, children, className }) => (
  <section
    className={cn(
      'rounded-lg border border-sect-gold/15 bg-[rgba(18,26,40,0.65)]',
      className
    )}
  >
    <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1.5">
      {icon && <span className="shrink-0 text-sect-gold/70">{icon}</span>}
      <h3 className="min-w-0 truncate font-display text-[12px] leading-none text-sect-gold">
        {title}
      </h3>
      {hint != null && (
        <span className="ml-auto shrink-0 text-[10px] leading-none text-sect-jade/50">
          {hint}
        </span>
      )}
    </div>
    <div className="px-2.5 pb-2.5">{children}</div>
  </section>
);

/** 小格：标签 10px + 数值 13px（可选说明/效果 9px） */
export const StatCell: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  /** 数值下方的补充说明（如天赋描述、效果文本） */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  valueClassName?: string;
  className?: string;
}> = ({ label, value, hint, icon, valueClassName, className }) => (
  <div
    className={cn(
      'min-w-0 rounded-md border border-sect-gold/10 bg-black/25 px-2 py-1.5',
      className
    )}
  >
    <div className="flex items-center gap-1 text-[10px] leading-none text-sect-jade/50">
      {icon && <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
      <span className="min-w-0 truncate">{label}</span>
    </div>
    <div
      className={cn(
        'mt-1 break-words text-[13px] leading-tight text-sect-jade',
        valueClassName
      )}
    >
      {value}
    </div>
    {hint != null && (
      <div className="mt-1 text-[9px] leading-snug text-sect-jade/40">{hint}</div>
    )}
  </div>
);

/** 关键指标行：标签 + 细进度条 + 右侧数值（默认显示百分比，横屏隐藏明细） */
export const DetailBar: React.FC<{
  label: string;
  pct: number;
  /** 明细文本（如 10/100）：宽屏显示为「明细 · 百分比」，横屏仅保留百分比 */
  detail?: React.ReactNode;
  /** 自定义右侧数值节点（默认渲染 pct%），用于需要 tooltip 等交互的场景 */
  valueNode?: React.ReactNode;
  tone?: 'cyan' | 'amber' | 'gold' | 'green' | 'yellow' | 'orange' | 'red';
  extra?: React.ReactNode;
  /** 紧凑模式：标签更窄、间距更小，用于详情弹窗吸顶头 */
  compact?: boolean;
  className?: string;
}> = ({ label, pct, detail, valueNode, tone = 'cyan', extra, compact, className }) => {
  const tones = {
    cyan: 'bg-gradient-to-r from-cyan-600 to-cyan-300',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-300',
    gold: 'bg-gradient-to-r from-sect-gold-dark to-sect-gold-light',
    green: 'bg-gradient-to-r from-green-600 to-green-300',
    yellow: 'bg-gradient-to-r from-yellow-600 to-yellow-300',
    orange: 'bg-gradient-to-r from-orange-600 to-orange-300',
    red: 'bg-gradient-to-r from-red-600 to-red-300',
  };
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5', className)}>
      <span
        className={cn(
          'shrink-0 text-[10px] leading-none text-sect-jade/50',
          compact ? 'w-6' : 'w-7'
        )}
      >
        {label}
      </span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/40">
        <div
          className={cn('h-full rounded-full transition-all duration-300', tones[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="shrink-0 whitespace-nowrap text-[10px] leading-none tabular-nums text-sect-jade/70">
        {detail != null && <span className="hidden landscape:inline">{detail} · </span>}
        {valueNode ?? <span>{Math.round(clamped)}%</span>}
      </div>
      {extra}
    </div>
  );
};

/** 明细行：左侧标签 + 右侧数值（用于修炼速度拆解、战斗明细等） */
export const DetailRow: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
  className?: string;
}> = ({ label, value, valueClassName, className }) => (
  <div className={cn('flex items-center justify-between gap-2', className)}>
    <span className="min-w-0 truncate text-[10px] text-sect-jade/50">{label}</span>
    <span
      className={cn(
        'shrink-0 text-[11px] tabular-nums text-sect-jade/80',
        valueClassName
      )}
    >
      {value}
    </span>
  </div>
);

/** 状态 chip：图标 + 标签 + 值（高度 36px，满足移动端点击区要求） */
export const DetailChip: React.FC<{
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  className?: string;
}> = ({ icon, label, value, valueClassName, className }) => (
  <span
    className={cn(
      'inline-flex h-9 max-w-full min-w-0 items-center gap-1 rounded-full border border-sect-gold/20 bg-black/25 px-2.5',
      className
    )}
  >
    {icon && <span className="shrink-0 text-sect-gold/60 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
    <span className="shrink-0 text-[10px] leading-none text-sect-jade/45">{label}</span>
    <span
      className={cn(
        'min-w-0 truncate text-[11px] leading-none text-sect-gold',
        valueClassName
      )}
    >
      {value}
    </span>
  </span>
);

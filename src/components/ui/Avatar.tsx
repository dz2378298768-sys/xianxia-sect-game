import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DiscipleStatus, Realm } from '@/types/disciple';
import { RealmOrder } from '@/types/disciple';
import { getAIAvatarPath } from '@/data/discipleAvatars';

/**
 * 统一弟子头像组件
 *
 * 设计语言：
 * - 优先使用 AI 生成的弟子头像（基于 seed 取模 30 张）
 * - 头像加载失败时回退到程序化生成的 SVG 头像
 * - 按身份（凡人/杂役/外门/内门/核心/长老）决定边框材质与顶饰
 * - 按境界（炼气/筑基/金丹/元婴/化神）决定灵气底色
 * - 姓名首字用书法字体
 */

// ===== 身份主题 =====
interface StatusTheme {
  ring: string;          // 边框渐变 class
  ringColor: string;     // SVG 边框色
  glow: string;          // 外光晕 class
  topOrnament: boolean;  // 是否有顶饰（核心/长老）
  borderW: number;       // 边框粗细
}
const STATUS_THEME: Record<DiscipleStatus, StatusTheme> = {
  mortal:  { ring: 'from-stone-500 to-stone-700',   ringColor: '#6b6b6b', glow: '',                              topOrnament: false, borderW: 2 },
  servant: { ring: 'from-amber-700 to-amber-900',   ringColor: '#92651a', glow: '',                              topOrnament: false, borderW: 2 },
  outer:   { ring: 'from-emerald-500 to-teal-700',  ringColor: '#10b981', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]',  topOrnament: false, borderW: 2 },
  inner:   { ring: 'from-violet-500 to-purple-700', ringColor: '#a855f7', glow: 'shadow-[0_0_14px_rgba(168,85,247,0.45)]', topOrnament: false, borderW: 2.5 },
  core:    { ring: 'from-amber-400 via-yellow-500 to-amber-600', ringColor: '#f59e0b', glow: 'shadow-[0_0_18px_rgba(245,158,11,0.55)]', topOrnament: true,  borderW: 3 },
  elder:   { ring: 'from-yellow-300 via-amber-400 to-orange-500', ringColor: '#fbbf24', glow: 'shadow-[0_0_22px_rgba(251,191,36,0.6)]', topOrnament: true,  borderW: 3.5 },
};

// ===== 境界灵气底色 =====
interface RealmTheme {
  bg1: string;   // 背景渐变起
  bg2: string;   // 背景渐变止
  qi: string;    // 灵气粒子色
}
const REALM_THEME: Record<Realm, RealmTheme> = {
  mortal:     { bg1: '#2a2622', bg2: '#1a1614', qi: '#6b6b6b' },
  qi:         { bg1: '#2d3a3a', bg2: '#1a2424', qi: '#a7d8d8' },
  foundation: { bg1: '#1e3a4a', bg2: '#0f2530', qi: '#67e8f9' },
  golden:     { bg1: '#3a2e14', bg2: '#1f1808', qi: '#fbbf24' },
  nascent:    { bg1: '#2a1a3a', bg2: '#160a22', qi: '#c084fc' },
  spirit:     { bg1: '#3a1424', bg2: '#1f0814', qi: '#fb7185' },
};

// 确定性伪随机
function seededRand(seed: number, i: number): number {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
  return x - Math.floor(x);
}

// 生成 SVG 纹样（云纹 + 星点），基于 seed 确定性
function PatternLayer({ seed, qiColor, size }: { seed: number; qiColor: string; size: number }) {
  const stars = Array.from({ length: 7 }, (_, i) => ({
    cx: seededRand(seed, i) * size,
    cy: seededRand(seed, i + 10) * size,
    r: 0.6 + seededRand(seed, i + 20) * 1.2,
    o: 0.25 + seededRand(seed, i + 30) * 0.45,
  }));
  // 一道云纹 path（确定性起伏）
  const yBase = size * (0.7 + seededRand(seed, 99) * 0.15);
  const amp = size * 0.06;
  const path = `M0,${yBase} Q${size * 0.25},${yBase - amp} ${size * 0.5},${yBase} T${size},${yBase}`;
  return (
    <g>
      <path d={path} fill="none" stroke={qiColor} strokeWidth={size * 0.012} opacity={0.35} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={qiColor} opacity={s.o} />
      ))}
    </g>
  );
}

export interface AvatarProps {
  seed: number;
  name?: string;
  status?: DiscipleStatus;
  realm?: Realm;
  size?: number;
  className?: string;
  showOrnament?: boolean; // 是否显示顶饰（小尺寸可关闭）
}

/**
 * AI 头像图片层：基于 seed 取模选择 30 张 AI 头像之一
 * 加载失败时回退到 children（程序化 SVG 头像）
 */
const AIAvatarImage: React.FC<{
  seed: number;
  size: number;
  ringColor: string;
  borderW: number;
  children: React.ReactNode;
}> = ({ seed, size, ringColor, borderW, children }) => {
  const [failed, setFailed] = useState(false);
  const src = getAIAvatarPath(seed);

  if (failed || !src) return <>{children}</>;

  return (
    <div
      className="absolute inset-0 rounded-full overflow-hidden"
      style={{ border: `${Math.max(1, size * 0.05)}px solid ${ringColor}`, borderWidth: borderW * 0.4 }}
    >
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
        draggable={false}
      />
      {children}
    </div>
  );
};

/** 精美头像：身份边框 + 境界灵气 + SVG 纹样 + 书法首字（叠加 AI 头像） */
export const DiscipleAvatar: React.FC<AvatarProps> = ({
  seed, name = '', status = 'servant', realm = 'qi', size = 48, className, showOrnament = true,
}) => {
  const st = STATUS_THEME[status] || STATUS_THEME.servant;
  const rt = REALM_THEME[realm] || REALM_THEME.qi;
  const initial = name ? name.charAt(0) : '道';
  const id = `av-${seed}-${status}`;
  const showTop = showOrnament && st.topOrnament && size >= 40;

  // 程序化 SVG 头像（作为 AI 头像加载失败时的回退）
  const fallback = (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="rounded-full">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={rt.bg1} />
          <stop offset="100%" stopColor={rt.bg2} />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor={rt.qi} stopOpacity="0.35" />
          <stop offset="100%" stopColor={rt.qi} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 0.5} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width={size} height={size} fill={`url(#${id}-bg)`} />
        <rect width={size} height={size} fill={`url(#${id}-halo)`} />
        <PatternLayer seed={seed} qiColor={rt.qi} size={size} />
        <text
          x="50%" y="52%"
          textAnchor="middle" dominantBaseline="central"
          fontFamily="'LXGW WenKai','Noto Serif SC',serif"
          fontWeight="700"
          fontSize={size * 0.46}
          fill="#f5e6b8"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
        >
          {initial}
        </text>
        {/* 顶部高光 */}
        <ellipse cx={size * 0.4} cy={size * 0.28} rx={size * 0.3} ry={size * 0.14} fill="#fff" opacity="0.1" />
      </g>
      {/* 边框描边 */}
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="none" stroke={st.ringColor} strokeWidth={st.borderW * 0.5} opacity="0.9" />
    </svg>
  );

  return (
    <div className={cn('relative shrink-0', st.glow, className)} style={{ width: size, height: size }}>
      {showTop && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          style={{ top: -size * 0.08 }}
        >
          <div
            className="rounded-full bg-gradient-to-br from-yellow-200 to-amber-500"
            style={{ width: size * 0.22, height: size * 0.22, boxShadow: '0 0 8px rgba(251,191,36,0.8)' }}
          />
        </div>
      )}
      <div
        className={cn('absolute inset-0 rounded-full bg-gradient-to-br p-[2px]', st.ring)}
        style={{ padding: st.borderW * 0.4 }}
      >
        {/* AI 头像图片层（失败回退到 SVG） */}
        <AIAvatarImage seed={seed} size={size} ringColor={st.ringColor} borderW={st.borderW}>
          {fallback}
        </AIAvatarImage>
      </div>
    </div>
  );
};

/** 简化头像：用于列表，无边框装饰但保留身份色 + AI 头像（回退 SVG 纹样） */
export const SimpleAvatar: React.FC<AvatarProps> = ({
  seed, name = '', status = 'servant', realm = 'qi', size = 36, className,
}) => {
  const rt = REALM_THEME[realm] || REALM_THEME.qi;
  const st = STATUS_THEME[status] || STATUS_THEME.servant;
  const initial = name ? name.charAt(0) : '道';
  const id = `sa-${seed}-${status}-${size}`;

  // 程序化 SVG 回退
  const fallback = (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={rt.bg1} />
          <stop offset="100%" stopColor={rt.bg2} />
        </linearGradient>
        <clipPath id={`${id}-clip`}><circle cx={size/2} cy={size/2} r={size/2} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width={size} height={size} fill={`url(#${id}-bg)`} />
        <PatternLayer seed={seed} qiColor={rt.qi} size={size} />
        <text x="50%" y="54%" textAnchor="middle" dominantBaseline="central"
          fontFamily="'LXGW WenKai','Noto Serif SC',serif" fontWeight="700"
          fontSize={size * 0.5} fill="#f5e6b8"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          {initial}
        </text>
      </g>
    </svg>
  );

  return (
    <div
      className={cn('relative rounded-full overflow-hidden shrink-0', className)}
      style={{ width: size, height: size, border: `${Math.max(1, size * 0.06)}px solid ${st.ringColor}` }}
    >
      <AIAvatarImage seed={seed} size={size} ringColor={st.ringColor} borderW={2}>
        {fallback}
      </AIAvatarImage>
    </div>
  );
};

/** 迷你头像：用于紧凑列表/任务条，AI 头像 + 身份色边框（回退首字） */
export const MiniAvatar: React.FC<AvatarProps> = ({
  seed, name = '', status = 'servant', realm = 'qi', size = 24, className,
}) => {
  const rt = REALM_THEME[realm] || REALM_THEME.qi;
  const st = STATUS_THEME[status] || STATUS_THEME.servant;
  const initial = name ? name.charAt(0) : '道';
  return (
    <div
      className={cn('relative rounded-full overflow-hidden flex items-center justify-center shrink-0', className)}
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${rt.bg1}, ${rt.bg2})`,
        border: `${Math.max(1, size * 0.08)}px solid ${st.ringColor}`,
      }}
    >
      <AIAvatarImage seed={seed} size={size} ringColor={st.ringColor} borderW={2}>
        <span
          className="font-display"
          style={{
            fontSize: size * 0.5,
            color: '#f5e6b8',
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      </AIAvatarImage>
    </div>
  );
};

/** 默认导出：根据 size 自动选择变体 */
const Avatar: React.FC<AvatarProps> = (props) => {
  if (props.size && props.size <= 28) return <MiniAvatar {...props} />;
  if (props.size && props.size <= 40) return <SimpleAvatar {...props} />;
  return <DiscipleAvatar {...props} />;
};

export default Avatar;

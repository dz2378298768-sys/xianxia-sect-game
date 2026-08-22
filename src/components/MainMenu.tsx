import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Play, PlusCircle, LogOut, Mountain,
  Users, Gem, Trash2, Clock, LogIn, Trophy,
} from 'lucide-react';
import { getSlots, deleteSlot, SAVE_SLOT_COUNT, type SaveSlotMeta } from '@/utils/saveSlots';
import { SectLevelNames } from '@/types/game';
import { login, getCurrentAccount, logout, type TapAccount } from '@/services/tapLogin';
import { openLeaderboard, LEADERBOARD_IDS } from '@/services/tapLeaderboard';

interface MainMenuProps {
  onStartNew: (sectName: string) => void;
  onContinue: (slotIndex: number) => void;
}

/** 装饰性金印徽记：八卦外框 + 旋转金环 + 朱砂心 + 书法字 */
const SectEmblem: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <svg className="emblem-ring-spin absolute inset-0" width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <linearGradient id="emblem-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5e6b8" />
          <stop offset="50%" stopColor="#d4a857" />
          <stop offset="100%" stopColor="#8a6a2a" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="url(#emblem-gold)" strokeWidth="1" strokeDasharray="2 5" opacity="0.7" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        const x1 = 60 + Math.cos(a) * 50, y1 = 60 + Math.sin(a) * 50;
        const x2 = 60 + Math.cos(a) * 54, y2 = 60 + Math.sin(a) * 54;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#emblem-gold)" strokeWidth="1.4" opacity="0.8" />;
      })}
    </svg>
    <svg className="absolute inset-0" width={size} height={size} viewBox="0 0 120 120" style={{ filter: 'drop-shadow(0 0 10px rgba(212,168,87,0.45))' }}>
      <polygon points="60,8 88,20 108,44 112,72 100,100 72,112 44,108 20,88 8,60 16,32 36,14" fill="none" stroke="url(#emblem-gold)" strokeWidth="1.6" opacity="0.85" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="url(#emblem-gold)" strokeWidth="1.2" opacity="0.6" />
      <circle cx="60" cy="60" r="38" fill="rgba(20,28,42,0.55)" stroke="url(#emblem-gold)" strokeWidth="0.8" />
      <circle cx="60" cy="60" r="30" fill="url(#emblem-cinnabar)" opacity="0.92" />
      <defs>
        <radialGradient id="emblem-cinnabar" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#d94a3e" />
          <stop offset="70%" stopColor="#c23a2e" />
          <stop offset="100%" stopColor="#8b2820" />
        </radialGradient>
      </defs>
      <text x="60" y="62" textAnchor="middle" dominantBaseline="central" fontFamily="'LXGW WenKai','Noto Serif SC',serif" fontWeight="700" fontSize="34" fill="#fdf8ec" style={{ textShadow: '0 1px 3px rgba(60,5,0,0.6)' }}>仙</text>
      {[[60, 14], [106, 60], [60, 106], [14, 60]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.6" fill="#f5e6b8" opacity="0.85" />
      ))}
    </svg>
  </div>
);

export const MainMenu: React.FC<MainMenuProps> = ({ onStartNew, onContinue }) => {
  // TapTap 排行榜 ID（在 TapTap 开发者中心 → 游戏服务 → 排行榜 创建后获得）
  const LEADERBOARDS = LEADERBOARD_IDS;
  const [slots, setSlots] = useState<(SaveSlotMeta | null)[]>(new Array(SAVE_SLOT_COUNT).fill(null));
  // 选中的空槽位（用于开辟新宗时填名）
  const [newSlotIndex, setNewSlotIndex] = useState<number | null>(null);
  const [sectName, setSectName] = useState('');
  // TapTap 登录状态
  const [tapAccount, setTapAccount] = useState<TapAccount | null>(null);
  const [tapLogging, setTapLogging] = useState(false);

  // 读取存档槽位
  const refreshSlots = () => {
    setSlots(getSlots());
  };

  useEffect(() => {
    refreshSlots();
    // 尝试检查是否已登录
    getCurrentAccount().then(status => {
      if (status.hasAccount && status.account) {
        setTapAccount(status.account);
      }
    });
  }, []);

  // TapTap 登录
  const handleTapLogin = async () => {
    setTapLogging(true);
    const result = await login();
    setTapLogging(false);
    if (result.success && result.account) {
      setTapAccount(result.account);
    } else if (result.error) {
      alert('TapTap 登录失败: ' + result.error);
    }
  };

  // TapTap 登出
  const handleTapLogout = async () => {
    const result = await logout();
    if (result.success) {
      setTapAccount(null);
    }
  };

  // 点击空槽位 → 打开命名弹窗
  const handleEmptySlotClick = (index: number) => {
    setNewSlotIndex(index);
    setSectName('');
  };

  // 确认开辟新宗
  const confirmNewGame = () => {
    const name = sectName.trim() || '修仙宗门';
    onStartNew(name);
  };

  // 删除存档槽位
  const handleDeleteSlot = (index: number) => {
    deleteSlot(index);
    refreshSlots();
  };

  return (
    <div className="h-full w-full relative overflow-hidden menu-stage">
      <div className="absolute inset-0 menu-backdrop" style={{ backgroundImage: 'url(/buildings/mountain-gate.jpg)' }} />
      <div className="absolute inset-0 menu-shade" />
      <div className="absolute inset-0 pointer-events-none">
        <span className="menu-ember" style={{ left: '12%', animationDelay: '0s' }} />
        <span className="menu-ember" style={{ left: '28%', animationDelay: '2.4s' }} />
        <span className="menu-ember" style={{ left: '72%', animationDelay: '1.2s' }} />
        <span className="menu-ember" style={{ left: '88%', animationDelay: '3.6s' }} />
      </div>

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4 py-4 overflow-y-auto">
        <div className="w-full max-w-2xl menu-enter flex flex-col items-center">
          {/* 紧凑头部：徽记 + 标题 */}
          <div className="flex items-center gap-3 mb-3">
            <SectEmblem size={64} />
            <div>
              <h1 className="font-display text-3xl text-gold-gradient tracking-[0.25em] pl-[0.25em] menu-title-glow leading-none">
                宗 门 录
              </h1>
              <p className="text-[var(--gold-200)]/70 font-display text-xs tracking-[0.2em] pl-[0.2em] mt-1">
                修仙界 · 宗门管理模拟
              </p>
            </div>
          </div>

          {/* 金线分隔 */}
          <div className="flex items-center justify-center gap-2 mb-3 w-full max-w-md">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[var(--gold-400)]" />
            <span className="text-[var(--gold-300)] text-[10px]">❖</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[var(--gold-400)]" />
          </div>

          {/* TapTap 登录 */}
          <div className="w-full max-w-2xl mb-3">
            {tapAccount ? (
              <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--gold-300)]/70">
                <span className="w-5 h-5 rounded-full bg-[var(--gold-400)]/20 flex items-center justify-center text-[10px]">
                  {tapAccount.name?.charAt(0) || 'T'}
                </span>
                <span>{tapAccount.name || tapAccount.openid?.slice(0, 8)}</span>
                <button
                  onClick={handleTapLogout}
                  className="text-[10px] text-[var(--ink-400)] hover:text-red-400 ml-1"
                >
                  退出
                </button>
              </div>
            ) : (
              <button
                onClick={handleTapLogin}
                disabled={tapLogging}
                className="mx-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border border-[var(--gold-400)]/20 text-[var(--gold-300)]/60 hover:text-[var(--gold-200)] hover:border-[var(--gold-400)]/40 transition-colors disabled:opacity-40"
              >
                <LogIn size={13} />
                {tapLogging ? '登录中…' : 'TapTap 登录'}
              </button>
            )}
          </div>

          {/* 排行榜入口（仅 TapTap 已登录时显示） */}
          {tapAccount && (
            <div className="w-full max-w-2xl mb-3 flex items-center justify-center gap-2">
              <button
                onClick={async () => {
                  const r = await openLeaderboard(LEADERBOARDS.SPIRIT_STONES);
                  if (!r.success) {
                    alert('打开排行榜失败: ' + (r.error || '未知错误'));
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] border border-[var(--gold-400)]/20 text-[var(--gold-300)]/60 hover:text-[var(--gold-200)] hover:border-[var(--gold-400)]/40 transition-colors"
              >
                <Trophy size={13} />
                灵石榜
              </button>
              <button
                onClick={async () => {
                  const r = await openLeaderboard(LEADERBOARDS.COMBAT_POWER);
                  if (!r.success) {
                    alert('打开排行榜失败: ' + (r.error || '未知错误'));
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] border border-[var(--gold-400)]/20 text-[var(--gold-300)]/60 hover:text-[var(--gold-200)] hover:border-[var(--gold-400)]/40 transition-colors"
              >
                <Trophy size={13} />
                战力榜
              </button>
            </div>
          )}

          {/* 六个存档槽位：3列 × 2行 */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-2xl mb-3">
            {slots.map((slot, i) => (
              <SaveSlotCard
                key={i}
                index={i}
                slot={slot}
                onContinue={() => onContinue(i)}
                onDelete={() => handleDeleteSlot(i)}
                onCreate={() => handleEmptySlotClick(i)}
              />
            ))}
          </div>

          {/* 底部：开辟新宗 + 离开 */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="px-4"
              onClick={() => {
                // 找第一个空槽位
                const emptyIdx = slots.findIndex(s => s === null);
                handleEmptySlotClick(emptyIdx >= 0 ? emptyIdx : 0);
              }}
            >
              <PlusCircle size={16} className="mr-1.5" />
              开辟新宗
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-4 opacity-60 hover:opacity-100"
              onClick={() => { if (confirm('确定要退出游戏吗？')) window.close(); }}
            >
              <LogOut size={16} className="mr-1.5" />
              离开此界
            </Button>
          </div>

          <p className="text-[var(--gold-300)]/40 text-xs mt-3 font-display tracking-[0.3em] pl-[0.3em]">
            天道酬勤 · 道法自然
          </p>
        </div>
      </div>

      {/* 开辟新宗命名弹窗 */}
      {newSlotIndex !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="max-w-sm w-full scroll-panel-dark p-5 slide-in-up">
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-sect-gold/20 flex items-center justify-center">
                <Mountain size={28} className="text-sect-gold" />
              </div>
              <h3 className="font-display text-lg text-sect-gold mb-1">开辟新宗</h3>
              <p className="text-sect-jade/60 text-xs">
                将占据第 {newSlotIndex + 1} 号存档位
              </p>
            </div>
            <div className="mb-4">
              <label className="text-xs text-[var(--gold-300)] mb-1.5 block">宗门名称</label>
              <input
                type="text"
                value={sectName}
                onChange={e => setSectName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmNewGame(); }}
                placeholder="如：青云宗、紫霄宫…"
                maxLength={12}
                autoFocus
                className="w-full px-3 py-2 bg-[rgba(13,17,23,0.6)] border border-[var(--gold-400)]/30 rounded text-sect-jade placeholder:text-sect-jade/30 focus:outline-none focus:border-[var(--gold-300)]/60 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setNewSlotIndex(null)}>
                取消
              </Button>
              <Button variant="gold" className="flex-1" onClick={confirmNewGame}>
                立即开辟
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** 单个存档槽位卡片 */
const SaveSlotCard: React.FC<{
  index: number;
  slot: SaveSlotMeta | null;
  onContinue: () => void;
  onDelete: () => void;
  onCreate: () => void;
}> = ({ index, slot, onContinue, onDelete, onCreate }) => {
  if (!slot) {
    // 空槽位
    return (
      <button
        onClick={onCreate}
        className="save-slot-card save-slot-empty group"
        title={`在第 ${index + 1} 号位开辟新宗`}
      >
        <PlusCircle size={20} className="text-[var(--gold-400)]/40 group-hover:text-[var(--gold-300)] transition-colors mb-1" />
        <span className="text-[10px] text-[var(--ink-400)]">第 {index + 1} 位</span>
        <span className="text-[10px] text-[var(--gold-300)]/50 group-hover:text-[var(--gold-300)]">空 · 开辟新宗</span>
      </button>
    );
  }

  // 有存档的槽位
  return (
    <div className="save-slot-card save-slot-filled">
      <button
        onClick={onContinue}
        className="flex-1 text-left min-w-0"
        title={`继续 ${slot.sectName}`}
      >
        <div className="flex items-center gap-1 mb-1">
          <span className="font-display text-sm text-[var(--gold-200)] truncate flex-1">
            {slot.sectName}
          </span>
          <span className="seal-badge text-[9px] !px-1 !py-0 shrink-0">
            {SectLevelNames[slot.sectLevel]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--ink-300)]">
          <span className="flex items-center gap-0.5">
            <Clock size={10} /> {slot.year}年{['春', '夏', '秋', '冬'][slot.month - 1]}
          </span>
          <span className="flex items-center gap-0.5">
            <Users size={10} /> {slot.discipleCount}
          </span>
          <span className="flex items-center gap-0.5">
            <Gem size={10} /> {slot.spiritStones}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <Play size={11} className="text-[var(--gold-300)]" />
          <span className="text-[10px] text-[var(--gold-300)]">继续修行</span>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`确定删除「${slot.sectName}」的存档吗？`)) onDelete();
        }}
        className="absolute top-1.5 right-1.5 p-1 rounded text-[var(--ink-500)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
        title="删除存档"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

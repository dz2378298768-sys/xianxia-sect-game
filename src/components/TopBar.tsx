import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SectLevelNames, SectLevelOrder } from '@/types/game';
import { useUIStore } from '@/store/uiStore';
import { SectIcon } from '@/components/icons/SectIcons';
import { getSlots, SAVE_SLOT_COUNT, type SaveSlotMeta } from '@/utils/saveSlots';

export const TopBar: React.FC = () => {
  const { year, month, sectName, sectLevel, reputation, spiritStones, karma, disciples, herbInventory, ironInventory, paperInventory, setReturnToMenuConfirm, newGame, saveToSlot, redeemCodeUsed, useRedeemCode, grantAdReward, adRewardTotal } = useGameStore();
  const { sectInfoOpen, toggleSectInfo } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [slots, setSlots] = useState<(SaveSlotMeta | null)[]>(new Array(SAVE_SLOT_COUNT).fill(null));
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showRedeemCode, setShowRedeemCode] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const refreshSlots = () => setSlots(getSlots());
  useEffect(() => { refreshSlots(); }, [showSavePicker]);

  const handleSave = (slotIndex: number) => {
    saveToSlot(slotIndex);
    setShowSavePicker(false);
    setSaveToast(`已保存到第 ${slotIndex + 1} 号存档位`);
    setTimeout(() => setSaveToast(null), 2000);
  };

  const currentLevelIndex = SectLevelOrder.indexOf(sectLevel);

  return (
    <div className="absolute top-0 left-0 right-0 z-30">
      <div className="absolute inset-0 topbar-shade pointer-events-none" />
      <div className="relative px-1.5 py-1">
        <div className="flex items-center justify-between gap-1">
          {/* 宗门名 */}
          <button
            className={`flex items-center gap-1.5 sect-name-btn ${sectInfoOpen ? 'sect-name-btn-active' : ''}`}
            onClick={toggleSectInfo}
            title="点击查看宗门信息"
          >
            <div className="topbar-emblem topbar-emblem-compact shrink-0">
              <span className="font-display text-xs">宗</span>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <h1 className="font-display text-xs text-[var(--gold-200)] tracking-wider max-w-[80px] truncate">{sectName || '修仙宗门'}</h1>
                <span className="seal-badge text-[9px] px-1">{SectLevelNames[sectLevel]}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-[var(--ink-300)] mt-0.5">
                <span className="text-[var(--gold-300)]">声望</span>
                <span className="font-bold text-[var(--gold-100)]">{Math.floor(reputation)}</span>
                <span className="text-[var(--ink-400)]">|</span>
                <span className="text-[var(--gold-300)]">灵石</span>
                <span className={`font-bold ${spiritStones < 0 ? 'text-red-400' : 'text-[var(--gold-100)]'}`}>{Math.floor(spiritStones)}</span>
                <span className="text-[var(--ink-400)]">|</span>
                <span className="text-[var(--gold-300)]">正邪</span>
                <span className={`font-bold ${karma > 0 ? 'text-emerald-400' : karma < 0 ? 'text-red-400' : 'text-[var(--ink-300)]'}`}>
                  {karma > 0 ? '+' : ''}{karma}
                </span>
              </div>
            </div>
          </button>

          {/* 中央：年份和弟子数 */}
          <div className="flex items-center gap-2 text-[9px] text-[var(--ink-300)]">
            <span>第{year}年{['春', '夏', '秋', '冬'][month - 1]}</span>
            <span className="text-[var(--ink-400)]">|</span>
            <span className="flex items-center gap-0.5">
              <SectIcon name="disciple" size={10} strokeWidth={1.6} />
              {disciples.length}
            </span>
          </div>

          {/* 右侧：菜单按钮 */}
          <div className="relative">
            <button
              className="text-[var(--ink-300)] hover:text-[var(--gold-200)] p-1"
              onClick={() => setMenuOpen(!menuOpen)}
              title="菜单"
            >
              <SectIcon name="list" size={16} strokeWidth={1.8} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 scroll-panel-dark p-1.5 flex flex-col gap-0.5 z-50 shadow-xl" style={{ borderRadius: '8px' }}>
                <button className="text-[11px] text-left px-2 py-1.5 rounded hover:bg-sect-ink-light/50 text-sect-jade" onClick={() => { setMenuOpen(false); setShowSavePicker(true); }}>
                  保存 / 读取
                </button>
                <button className="text-[11px] text-left px-2 py-1.5 rounded hover:bg-sect-ink-light/50 text-sect-jade" onClick={() => { setMenuOpen(false); setShowRedeemCode(true); }}>
                  兑换码
                </button>
                <button className="text-[11px] text-left px-2 py-1.5 rounded hover:bg-sect-ink-light/50 text-sect-jade" onClick={() => { setMenuOpen(false); grantAdReward(); }} disabled={adRewardTotal <= 0}>
                  广告奖励({adRewardTotal})
                </button>
                <div className="border-t border-sect-ink-light/30 my-1" />
                <button className="text-[11px] text-left px-2 py-1.5 rounded hover:bg-red-500/10 text-red-400" onClick={() => { setMenuOpen(false); setReturnToMenuConfirm(true); }}>
                  返回主菜单
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 保存/读取弹窗 */}
      {showSavePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" onClick={() => setShowSavePicker(false)}>
          <div className="scroll-panel-dark slide-in-up max-w-sm w-full p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm" style={{ color: 'var(--gold-200)' }}>保存 / 读取</h3>
              <button className="text-[var(--ink-300)] hover:text-[var(--gold-200)] text-xs" onClick={() => setShowSavePicker(false)}>关闭</button>
            </div>
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-sect-ink-light/30">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-sect-jade">存档位 {i + 1}</div>
                  {slot ? (
                    <div className="text-[10px] text-sect-jade/50 truncate">
                      {slot.sectName} · 第{slot.year}年{['春', '夏', '秋', '冬'][slot.month - 1]} · {slot.sectLevel}
                    </div>
                  ) : (
                    <div className="text-[10px] text-sect-jade/30">空</div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button className="btn-ink text-[10px] px-2 py-1" onClick={() => handleSave(i)}>保存</button>
                  {slot && (
                    <button className="btn-ink text-[10px] px-2 py-1" onClick={() => { setShowSavePicker(false); }}>读取</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 兑换码弹窗 */}
      {showRedeemCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" onClick={() => { setShowRedeemCode(false); setRedeemResult(null); }}>
          <div className="scroll-panel-dark slide-in-up max-w-xs w-full p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-sm" style={{ color: 'var(--gold-200)' }}>兑换码</h3>
            <input
              className="w-full bg-sect-ink-light/50 border border-sect-ink-light/50 rounded px-3 py-2 text-xs text-sect-jade outline-none focus:border-sect-gold/50"
              placeholder="输入兑换码"
              value={redeemInput}
              onChange={e => setRedeemInput(e.target.value)}
            />
            {redeemResult && (
              <div className={`text-[11px] ${redeemResult.ok ? 'text-green-400' : 'text-red-400'}`}>{redeemResult.msg}</div>
            )}
            <div className="flex gap-2">
              <button className="btn-ink flex-1 text-xs" onClick={() => {
                const result = useRedeemCode(redeemInput);
                setRedeemResult({ ok: result.ok, msg: result.reason || (result.ok ? '兑换成功！' : '兑换失败') });
                setRedeemInput('');
              }}>兑换</button>
              <button className="btn-ink flex-1 text-xs" onClick={() => { setShowRedeemCode(false); setRedeemResult(null); }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 保存成功提示 */}
      {saveToast && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-sect-gold/20 border border-sect-gold/30 px-3 py-1 rounded text-[10px] text-sect-gold whitespace-nowrap">
          {saveToast}
        </div>
      )}
    </div>
  );
};
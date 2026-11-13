import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SectLevelNames, SectLevelOrder } from '@/types/game';
import { useUIStore } from '@/store/uiStore';
import { SectIcon } from '@/components/icons/SectIcons';
import { getSlots, SAVE_SLOT_COUNT, type SaveSlotMeta } from '@/utils/saveSlots';
import { isMusicEnabled, isSfxEnabled, setMusicEnabled, setSfxEnabled } from '@/utils/audio';
import { useModalPause } from '@/hooks/useModalPause';
import { useDevice } from '@/hooks/useDevice';
import { TimeControls } from '@/components/TimeControls';

export const TopBar: React.FC = () => {
  // 手机横屏：时间控件并进本行，HUD 只占一条，给面板腾出竖向空间
  const { isCompact } = useDevice();
  const { sectName, sectLevel, reputation, spiritStones, karma, disciples, buildings, herbInventory, ironInventory, paperInventory, setReturnToMenuConfirm, newGame, saveToSlot, redeemCodeUsed, useRedeemCode, grantAdReward, adRewardTotal, pendingEvents, openEvent } = useGameStore();
  const { sectInfoOpen, toggleSectInfo, setShowOpeningGuide } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [slots, setSlots] = useState<(SaveSlotMeta | null)[]>(new Array(SAVE_SLOT_COUNT).fill(null));
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showRedeemCode, setShowRedeemCode] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());

  const refreshSlots = () => setSlots(getSlots());
  useEffect(() => { refreshSlots(); }, [showSavePicker]);

  // 存档/兑换码/设置等全屏弹窗打开时暂停时间
  useModalPause('topbar-save', showSavePicker);
  useModalPause('topbar-redeem', showRedeemCode);
  useModalPause('topbar-settings', showSettings);

  const handleSave = (slotIndex: number) => {
    saveToSlot(slotIndex);
    setShowSavePicker(false);
    setSaveToast(`已保存到第 ${slotIndex + 1} 号存档位`);
    setTimeout(() => setSaveToast(null), 2000);
  };

  const currentLevelIndex = SectLevelOrder.indexOf(sectLevel);

  return (
    <div className="relative z-30 shrink-0 topbar-root">
      <div className="absolute inset-0 topbar-shade pointer-events-none" />
      <div className={`relative ${isCompact ? 'px-2 py-1' : 'px-1.5 py-1'}`}>
        <div className="flex items-center justify-between gap-2 whitespace-nowrap">
          {/* 宗门名 */}
          <button
            className={`flex items-center gap-1.5 sect-name-btn min-w-0 ${sectInfoOpen ? 'sect-name-btn-active' : ''}`}
            onClick={toggleSectInfo}
            title="点击查看宗门信息"
          >
            <div className="topbar-emblem topbar-emblem-compact shrink-0">
              <span className="font-display text-xs">宗</span>
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className={`font-display text-[13px] text-[var(--gold-200)] tracking-wider truncate ${isCompact ? 'max-w-[92px]' : 'max-w-[110px]'}`}>{sectName || '修仙宗门'}</h1>
                <span className="seal-badge text-[10px] px-1">{SectLevelNames[sectLevel]}</span>
                {/* 手机横屏：资源并进同一行，HUD 只占一行 */}
                {isCompact && (
                  <>
                    <span className="text-[11.5px] text-[var(--gold-300)]">灵石</span>
                    <span className={`text-[11.5px] font-bold ${spiritStones < 0 ? 'text-red-400' : 'text-[var(--gold-100)]'}`}>{Math.floor(spiritStones)}</span>
                    <span className="text-[11.5px] text-[var(--gold-300)]">声望</span>
                    <span className="text-[11.5px] font-bold text-[var(--gold-100)]">{Math.floor(reputation)}</span>
                  </>
                )}
              </div>
              {!isCompact && (
                <div className="flex items-center gap-2 text-[10.5px] text-[var(--ink-300)] mt-0.5">
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
                  {pendingEvents.length > 0 && (
                    <span
                      onClick={e => { e.stopPropagation(); openEvent(pendingEvents[0].eventId); }}
                      className="px-1.5 py-0.5 rounded border border-amber-400/40 bg-amber-400/10 text-amber-300 text-[10.5px] hover:bg-amber-400/20 transition-colors cursor-pointer"
                    >
                      待处理 {pendingEvents.length}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>

          {/* 中央：弟子与建筑数量（手机横屏隐藏，把宽度让给时间控件） */}
          {!isCompact && (
            <div className="flex items-center gap-2 text-[10.5px] text-[var(--ink-300)]">
              <span className="flex items-center gap-1">
                <SectIcon name="disciple" size={12} strokeWidth={1.8} />
                {disciples.length}
              </span>
              <span className="text-[var(--ink-400)]">|</span>
              <span className="flex items-center gap-1">
                <SectIcon name="building" size={12} strokeWidth={1.8} />
                {buildings.filter(b => b.status === 'active').length}/{buildings.length}
              </span>
            </div>
          )}

          {/* 右侧：手机内联时间控件 + 菜单按钮 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isCompact && <TimeControls inline />}
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
                <button className="text-[11.5px] text-left px-2 py-2 rounded hover:bg-sect-ink-light/50 text-sect-jade" onClick={() => { setMenuOpen(false); setShowSavePicker(true); }}>
                  保存 / 读取
                </button>
                <button className="text-[11.5px] text-left px-2 py-2 rounded hover:bg-sect-ink-light/50 text-sect-jade" onClick={() => { setMenuOpen(false); setShowRedeemCode(true); }}>
                  兑换码
                </button>
                <button className="text-[11.5px] text-left px-2 py-2 rounded hover:bg-sect-ink-light/50 text-sect-jade" onClick={() => { setMenuOpen(false); grantAdReward(); }} disabled={adRewardTotal <= 0}>
                  广告奖励({adRewardTotal})
                </button>
                <button className="text-[11.5px] text-left px-2 py-2 rounded hover:bg-sect-ink-light/50 text-sect-jade" onClick={() => { setMenuOpen(false); setShowOpeningGuide(true); }}>
                  引路篇（新手引导）
                </button>
                <button className="text-[11.5px] text-left px-2 py-2 rounded hover:bg-sect-ink-light/50 text-sect-jade" onClick={() => { setMenuOpen(false); setShowSettings(true); }}>
                  设置
                </button>
                <div className="border-t border-sect-ink-light/30 my-1" />
                <button className="text-[11.5px] text-left px-2 py-2 rounded hover:bg-red-500/10 text-red-400" onClick={() => { setMenuOpen(false); setReturnToMenuConfirm(true); }}>
                  返回主菜单
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* 保存/读取弹窗 */}
      {showSavePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" onClick={() => setShowSavePicker(false)}>
          <div className="scroll-panel-dark slide-in-up w-full max-w-[400px] p-3.5 flex flex-col gap-2.5 max-h-[calc(100dvh-24px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                      {slot.sectName} · 第{slot.year}年{slot.month}月 · {slot.sectLevel}
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

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" onClick={() => setShowSettings(false)}>
          <div className="scroll-panel-dark slide-in-up w-full max-w-[360px] p-3.5 flex flex-col gap-2.5 max-h-[calc(100dvh-24px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm" style={{ color: 'var(--gold-200)' }}>设置</h3>
              <button className="text-[var(--ink-300)] hover:text-[var(--gold-200)] text-xs" onClick={() => setShowSettings(false)}>关闭</button>
            </div>

            {/* 音乐开关 */}
            <div className="flex items-center justify-between p-2.5 rounded bg-sect-ink-light/20">
              <div className="flex items-center gap-2">
                <span className="text-base">🎵</span>
                <div>
                  <div className="text-[12px] text-sect-jade">背景音乐</div>
                  <div className="text-[10px] text-sect-jade/50">两首修仙配乐循环播放</div>
                </div>
              </div>
              <button
                className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${musicOn ? 'bg-sect-gold/50' : 'bg-sect-ink-light/50'}`}
                onClick={() => {
                  const next = !musicOn;
                  setMusicOn(next);
                  setMusicEnabled(next);
                }}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${musicOn ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* 音效开关 */}
            <div className="flex items-center justify-between p-2.5 rounded bg-sect-ink-light/20">
              <div className="flex items-center gap-2">
                <span className="text-base">🔊</span>
                <div>
                  <div className="text-[12px] text-sect-jade">音效</div>
                  <div className="text-[10px] text-sect-jade/50">按键点击、通知等操作音效</div>
                </div>
              </div>
              <button
                className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${sfxOn ? 'bg-sect-gold/50' : 'bg-sect-ink-light/50'}`}
                onClick={() => {
                  const next = !sfxOn;
                  setSfxOn(next);
                  setSfxEnabled(next);
                }}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sfxOn ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* 版本号：方便确认装的是哪次构建 */}
            <div className="text-center text-[10px] text-sect-jade/40">
              版本 {__APP_VERSION__}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
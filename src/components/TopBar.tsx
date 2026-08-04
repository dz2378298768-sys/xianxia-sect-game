import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SectLevelNames, SectLevelOrder } from '@/types/game';
import { useDevice } from '@/hooks/useDevice';
import { useUIStore } from '@/store/uiStore';
import { SectIcon } from '@/components/icons/SectIcons';
import { getSlots, SAVE_SLOT_COUNT, type SaveSlotMeta } from '@/utils/saveSlots';

export const TopBar: React.FC = () => {
  const { year, month, sectName, sectLevel, reputation, spiritStones, disciples, herbInventory, ironInventory, paperInventory, returnToMenu, newGame, saveToSlot } = useGameStore();
  const { sectInfoOpen, toggleSectInfo } = useUIStore();
  const device = useDevice();
  const isCompact = device.isCompact;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [slots, setSlots] = useState<(SaveSlotMeta | null)[]>(new Array(SAVE_SLOT_COUNT).fill(null));
  const [saveToast, setSaveToast] = useState<string | null>(null);

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
      {/* 顶部渐变背板：提升在山景上的可读性 */}
      <div className="absolute inset-0 topbar-shade pointer-events-none" />
      <div className="relative px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        {/* 宗门名 — 可点击打开左上角抽屉 */}
        <button
          className={`flex items-center gap-2 slide-in-left sect-name-btn ${sectInfoOpen ? 'sect-name-btn-active' : ''}`}
          onClick={toggleSectInfo}
          title="点击查看修炼与宗门战"
        >
          <div className={`topbar-emblem ${isCompact ? 'topbar-emblem-compact' : ''} shrink-0`}>
            <span className={`font-display ${isCompact ? 'text-sm' : 'text-xl'}`}>宗</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <h1 className={`font-display ${isCompact ? 'text-sm' : 'text-xl'} text-[var(--gold-200)] tracking-wider`}>{sectName || '修仙宗门'}</h1>
              <span className="seal-badge">{SectLevelNames[sectLevel]}</span>
              <span className={`sect-name-caret ${sectInfoOpen ? 'sect-name-caret-open' : ''}`}>
                <SectIcon name="arrowRight" size={12} strokeWidth={2.2} />
              </span>
            </div>
            <div className={`flex items-center gap-2 ${isCompact ? 'text-[10px]' : 'text-xs'} text-[var(--ink-300)] mt-0.5`}>
              <span className="flex items-center gap-1">
                <span className="text-[var(--gold-300)]">声望</span>
                <span className="font-bold text-[var(--gold-100)]">{Math.floor(reputation)}</span>
              </span>
              {!isCompact && <span className="text-[var(--ink-500)]">|</span>}
              <span>{year}年{month}月</span>
            </div>
          </div>
        </button>

        {/* 资源 */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <div className="resource-chip" title="灵石">
            <span className="icon resource-icon-gem">
              <SectIcon name="cultivate" size={14} strokeWidth={2} />
            </span>
            {!isCompact && <span className="text-[var(--gold-300)] text-[11px]">灵石</span>}
            <span>{Math.floor(spiritStones).toLocaleString()}</span>
          </div>
          <div className="resource-chip" title="弟子">
            <span className="icon resource-icon-people">
              <SectIcon name="disciple" size={14} strokeWidth={2} />
            </span>
            {!isCompact && <span className="text-[var(--gold-300)] text-[11px]">弟子</span>}
            <span>{disciples.length}</span>
          </div>

          {/* 生产原材料：灵草/灵铁/符纸 */}
          <div className="resource-chip" title="灵草（炼丹原料）">
            <span className="icon" style={{ color: 'var(--herb-300, #7dd87d)' }}>
              <SectIcon name="herb" size={14} strokeWidth={2} />
            </span>
            {!isCompact && <span className="text-[var(--gold-300)] text-[11px]">灵草</span>}
            <span>{Math.floor(herbInventory || 0)}</span>
          </div>
          <div className="resource-chip" title="灵铁（炼器原料）">
            <span className="icon" style={{ color: 'var(--ink-200, #c8c8d0)' }}>
              <SectIcon name="sword" size={14} strokeWidth={2} />
            </span>
            {!isCompact && <span className="text-[var(--gold-300)] text-[11px]">灵铁</span>}
            <span>{Math.floor(ironInventory || 0)}</span>
          </div>
          <div className="resource-chip" title="符纸（制符原料）">
            <span className="icon" style={{ color: 'var(--gold-200, #e8d9a0)' }}>
              <SectIcon name="scrollText" size={14} strokeWidth={2} />
            </span>
            {!isCompact && <span className="text-[var(--gold-300)] text-[11px]">符纸</span>}
            <span>{Math.floor(paperInventory || 0)}</span>
          </div>

          {/* 交易入口 */}
          <button
            className="resource-chip cursor-pointer hover:border-[var(--gold-300)]/50"
            onClick={() => useUIStore.getState().setShopOpen(true)}
            title="坊市交易"
          >
            <SectIcon name="warehouse" size={14} strokeWidth={2} />
            {!isCompact && <span className="text-[var(--gold-300)] text-[11px]">交易</span>}
          </button>

          {/* 设置菜单按钮 */}
          <div className="relative">
            <button
              className="resource-chip cursor-pointer hover:border-[var(--gold-300)]/50"
              onClick={() => setMenuOpen(!menuOpen)}
              title="设置"
            >
              <SectIcon name="gear" size={14} strokeWidth={2} />
              {!isCompact && <span className="text-[var(--gold-300)] text-[11px]">设置</span>}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-40 scroll-panel-dark slide-in-up overflow-hidden">
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--gold-200)] hover:bg-[var(--gold-300)]/10 transition-colors flex items-center gap-2"
                    onClick={() => { setMenuOpen(false); setShowSavePicker(true); }}
                  >
                    <SectIcon name="cultivate" size={14} strokeWidth={1.8} />
                    保存存档
                  </button>
                  <div className="h-px bg-[var(--gold-300)]/15" />
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--gold-200)] hover:bg-[var(--gold-300)]/10 transition-colors flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      if (confirm('开始新游戏将覆盖当前进度，确定吗？')) {
                        newGame();
                      }
                    }}
                  >
                    <SectIcon name="nextMonth" size={14} strokeWidth={1.8} />
                    开始新游戏
                  </button>
                  <div className="h-px bg-[var(--gold-300)]/15" />
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400/80 hover:bg-red-400/10 transition-colors flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      returnToMenu();
                    }}
                  >
                    <SectIcon name="close" size={14} strokeWidth={1.8} />
                    退出游戏
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 等级进度 — 紧凑模式隐藏 */}
      {!isCompact && (
        <div className="mt-1.5 px-20">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-[10px] text-[var(--gold-400)]/70 tracking-[0.2em]">宗门境界</span>
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--gold-400)]/30 to-transparent" />
          </div>
          <div className="flex items-center gap-1">
            {SectLevelOrder.map((level, i) => (
              <React.Fragment key={level}>
                <div
                  className={`topbar-level-dot ${i <= currentLevelIndex ? 'topbar-level-dot-on' : ''}`}
                />
                {i < SectLevelOrder.length - 1 && (
                  <div
                    className={`flex-1 h-px transition-colors ${
                      i < currentLevelIndex ? 'bg-[var(--gold-300)]' : 'bg-[var(--ink-500)]/60'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* 保存存档：槽位选择弹窗 */}
      {showSavePicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-4">
          <div className="max-w-md w-full scroll-panel-dark p-5 slide-in-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base text-[var(--gold-200)]">保存存档</h3>
              <button
                onClick={() => setShowSavePicker(false)}
                className="text-[var(--ink-400)] hover:text-[var(--gold-300)] p-1"
              >
                <SectIcon name="close" size={16} strokeWidth={2} />
              </button>
            </div>
            <p className="text-[10px] text-[var(--ink-400)] mb-3">
              选择一个存档位保存当前进度（覆盖已有存档）
            </p>
            <div className="save-slot-picker">
              {slots.map((slot, i) => (
                <button
                  key={i}
                  className={`save-pick-slot ${slot ? 'save-pick-slot-filled' : 'save-pick-slot-empty'}`}
                  onClick={() => {
                    if (slot && !confirm(`将覆盖第 ${i + 1} 号「${slot.sectName}」存档，确定吗？`)) return;
                    handleSave(i);
                  }}
                >
                  {slot ? (
                    <>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display text-xs text-[var(--gold-200)] truncate">{slot.sectName}</span>
                        <span className="seal-badge text-[8px] !px-1 !py-0 shrink-0">{SectLevelNames[slot.sectLevel]}</span>
                      </div>
                      <div className="text-[9px] text-[var(--ink-400)] mt-1">
                        第 {slot.year} 年 {slot.month} 月 · {slot.discipleCount} 弟子
                      </div>
                      <div className="text-[9px] text-[var(--gold-300)] mt-1">点击覆盖保存</div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs">第 {i + 1} 位</span>
                      <span className="text-[9px] text-[var(--gold-300)] mt-1">空 · 点击保存</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 保存成功提示 */}
      {saveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-lg bg-green-600/90 text-white text-sm slide-in-up shadow-lg">
          {saveToast}
        </div>
      )}
    </div>
  );
};

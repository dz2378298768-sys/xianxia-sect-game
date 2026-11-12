import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useClockStore } from '@/store/clockStore';
import { useUIStore } from '@/store/uiStore';

/**
 * 即时时钟驱动：每帧推进时钟，跨过月长时执行月度结算；
 * 独立事件检定按自身节奏运行，可发生在两次结算之间。
 * 存在阻塞弹窗（报告/事件/胜利/主菜单）时自动暂停，避免后台堆叠结算。
 */
export const GameClock: React.FC = () => {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(now - last, 250);
      last = now;

      const gs = useGameStore.getState();
      const blocked = !gs.gameStarted
        || gs.showMainMenu
        || !!gs.reportView
        || !!gs.activeEventId
        || !!gs.choiceEvent
        || gs.pendingEncounters.length > 0
        || gs.returnToMenuConfirm
        || gs.sectCollapsed
        || gs.gameWon
        || !!useUIStore.getState().siegeReport;

      if (!blocked) {
        const { months, eventChecks } = useClockStore.getState().advance(dt);
        // 单帧最多补算 2 个月，防止卡顿后长时间阻塞
        for (let i = 0; i < Math.min(months, 2); i++) {
          useGameStore.getState().nextMonth();
        }
        for (let i = 0; i < Math.min(eventChecks, 1); i++) {
          const cur = useGameStore.getState();
          if (!cur.reportView && !cur.activeEventId) cur.checkEventTrigger();
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
};

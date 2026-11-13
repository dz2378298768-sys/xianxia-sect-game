import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useClockStore } from '@/store/clockStore';
import { useUIStore } from '@/store/uiStore';

/**
 * 即时时钟驱动：每帧推进时钟，跨过月长时执行月度结算；
 * 世界事件节拍独立运行（每 5 日一次），异闻 / 建筑变故 / 弟子结交 / 分支抉择
 * 都可能落在月中任意时刻，与结算解耦。
 * 存在阻塞弹窗（报告/分支选择/探索遭遇/胜利/灭亡/主菜单）时自动暂停；
 * 普通异闻只进待处理队列，不暂停时钟。
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
        || !!gs.choiceEvent
        || gs.pendingEncounters.length > 0
        || gs.returnToMenuConfirm
        || gs.sectCollapsed
        || gs.gameWon
        || !!useUIStore.getState().siegeReport;

      if (!blocked) {
        const { months, worldTicks } = useClockStore.getState().advance(dt);
        // 单帧最多补算 2 个月，防止卡顿后长时间阻塞
        for (let i = 0; i < Math.min(months, 2); i++) {
          useGameStore.getState().nextMonth();
        }
        // 节拍补算同上：最多补 2 次，避免切回页面时事件连发
        for (let i = 0; i < Math.min(worldTicks, 2); i++) {
          useGameStore.getState().tickWorldEvents();
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
};

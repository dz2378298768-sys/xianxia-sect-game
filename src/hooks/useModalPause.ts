import { useEffect } from 'react';
import { useClockStore } from '@/store/clockStore';

/**
 * 弹窗打开期间暂停游戏时间。
 * id 需全局唯一：多个弹窗同时打开时由 clockStore 的引用计数协调，
 * 全部关闭后才恢复到「第一个弹窗打开前」的暂停状态。
 */
export function useModalPause(id: string, active: boolean): void {
  const pauseForModal = useClockStore(s => s.pauseForModal);
  const resumeForModal = useClockStore(s => s.resumeForModal);

  useEffect(() => {
    if (!active) return;
    pauseForModal(id);
    return () => resumeForModal(id);
  }, [active, id, pauseForModal, resumeForModal]);
}

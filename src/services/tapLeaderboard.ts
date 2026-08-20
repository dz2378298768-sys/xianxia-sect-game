/**
 * TapTap 排行榜服务
 *
 * 封装 Capacitor 原生插件 TapLeaderboard 的调用接口。
 * 在非 Android 环境（如浏览器开发模式）下自动降级为模拟/空实现，不阻塞游戏流程。
 */

const isNativePlatform = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
};

/** TapTap 排行榜 ID */
export const LEADERBOARD_IDS = {
  SPIRIT_STONES: '056tc103xlh7vqybs8',  // 宗门灵石榜
  COMBAT_POWER: '9bc3oax7otn7skthk5',   // 宗门战力榜
} as const;

/** 防抖：同一排行榜两次提交之间至少间隔 30 秒 */
const lastSubmitTime: Record<string, number> = {};
const MIN_SUBMIT_INTERVAL = 30_000;

export interface LeaderboardResult {
  success: boolean;
  error?: string;
}

/**
 * 打开排行榜 UI。
 * 调用 TapTap SDK 内置的排行榜界面，包含全局榜、好友榜、点赞、分享等功能。
 * @param leaderboardId 排行榜 ID（在 TapTap 开发者中心创建排行榜后获得）
 */
export async function openLeaderboard(leaderboardId: string): Promise<LeaderboardResult> {
  if (!isNativePlatform()) {
    console.warn('[TapLeaderboard] 非原生环境，排行榜不可用');
    return { success: false, error: '仅支持 Android 原生环境' };
  }
  try {
    const Capacitor = (window as any).Capacitor;
    const result = await Capacitor.Plugins.TapLeaderboard.open({ leaderboardId });
    return result as LeaderboardResult;
  } catch (e: any) {
    console.error('[TapLeaderboard] open 异常:', e);
    return { success: false, error: e?.message || '打开排行榜异常' };
  }
}

/**
 * 提交成绩到排行榜。
 * @param leaderboardId 排行榜 ID
 * @param score 成绩数值（根据排行榜配置的排序方式，数值越大/越小排名越靠前）
 */
export async function putScore(leaderboardId: string, score: number): Promise<LeaderboardResult> {
  if (!isNativePlatform()) {
    console.warn('[TapLeaderboard] 非原生环境，提交成绩不可用');
    return { success: false, error: '仅支持 Android 原生环境' };
  }
  try {
    const Capacitor = (window as any).Capacitor;
    const result = await Capacitor.Plugins.TapLeaderboard.putScore({ leaderboardId, score });
    return result as LeaderboardResult;
  } catch (e: any) {
    console.error('[TapLeaderboard] putScore 异常:', e);
    return { success: false, error: e?.message || '提交成绩异常' };
  }
}

/**
 * 获取排行榜数据。
 * @param leaderboardId 排行榜 ID
 */
export async function getRankings(leaderboardId: string): Promise<LeaderboardResult> {
  if (!isNativePlatform()) {
    return { success: false, error: '仅支持 Android 原生环境' };
  }
  try {
    const Capacitor = (window as any).Capacitor;
    const result = await Capacitor.Plugins.TapLeaderboard.getRankings({ leaderboardId });
    return result as LeaderboardResult;
  } catch (e: any) {
    console.error('[TapLeaderboard] getRankings 异常:', e);
    return { success: false, error: e?.message || '获取排行榜异常' };
  }
}

/**
 * 同步当前灵石和战力到排行榜。
 * 带防抖：同一榜单 30 秒内不重复提交。
 * 调用方可以 fire-and-forget，不阻塞业务逻辑。
 */
export function syncLeaderboardScores(spiritStones: number, combatPower: number): void {
  if (!isNativePlatform()) return;

  const now = Date.now();

  // 灵石榜
  if (now - (lastSubmitTime[LEADERBOARD_IDS.SPIRIT_STONES] || 0) > MIN_SUBMIT_INTERVAL) {
    lastSubmitTime[LEADERBOARD_IDS.SPIRIT_STONES] = now;
    putScore(LEADERBOARD_IDS.SPIRIT_STONES, spiritStones).then(r => {
      if (!r.success) console.warn('[TapLeaderboard] 灵石榜同步失败:', r.error);
    });
  }

  // 战力榜
  if (now - (lastSubmitTime[LEADERBOARD_IDS.COMBAT_POWER] || 0) > MIN_SUBMIT_INTERVAL) {
    lastSubmitTime[LEADERBOARD_IDS.COMBAT_POWER] = now;
    putScore(LEADERBOARD_IDS.COMBAT_POWER, combatPower).then(r => {
      if (!r.success) console.warn('[TapLeaderboard] 战力榜同步失败:', r.error);
    });
  }
}
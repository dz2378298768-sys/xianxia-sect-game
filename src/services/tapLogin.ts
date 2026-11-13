/**
 * TapTap 登录服务
 *
 * 封装 Capacitor 原生插件 TapLogin 的调用接口。
 * 在非 Android 环境（如浏览器开发模式）下自动降级为模拟/空实现，不阻塞游戏流程。
 */

// 在 Capacitor 环境中，插件通过 window.Capacitor 或 @capacitor/core 访问
// 但由于项目未安装 @capacitor/core 的 type 声明，使用运行时判断
const isCapacitorEnv = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
};

const isNativePlatform = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
};

export interface TapAccount {
  openid: string;
  unionid?: string;
  name?: string;
  avatar?: string;
  accessToken?: {
    kid: string;
    mac_key: string;
    mac_algorithm: string;
    token_type: string;
  };
}

export interface LoginResult {
  success: boolean;
  account?: TapAccount;
  error?: string;
}

export interface AccountStatus {
  hasAccount: boolean;
  account?: TapAccount;
}

/**
 * TapTap 登录
 */
export async function login(): Promise<LoginResult> {
  if (!isNativePlatform()) {
    console.warn('[TapLogin] 非原生环境，登录不可用');
    return { success: false, error: '仅支持 Android 原生环境' };
  }
  try {
    const Capacitor = (window as any).Capacitor;
    const result = await Capacitor.Plugins.TapLogin.login();
    return result as LoginResult;
  } catch (e: any) {
    console.error('[TapLogin] login 异常:', e);
    return { success: false, error: e?.message || '登录异常' };
  }
}

/**
 * 获取当前登录账号
 */
export async function getCurrentAccount(): Promise<AccountStatus> {
  if (!isNativePlatform()) {
    return { hasAccount: false };
  }
  try {
    const Capacitor = (window as any).Capacitor;
    const result = await Capacitor.Plugins.TapLogin.getCurrentAccount();
    return result as AccountStatus;
  } catch (e: any) {
    console.error('[TapLogin] getCurrentAccount 异常:', e);
    return { hasAccount: false };
  }
}

/**
 * 登出
 */
export async function logout(): Promise<{ success: boolean; error?: string }> {
  if (!isNativePlatform()) {
    return { success: false, error: '仅支持 Android 原生环境' };
  }
  try {
    const Capacitor = (window as any).Capacitor;
    const result = await Capacitor.Plugins.TapLogin.logout();
    return result as { success: boolean; error?: string };
  } catch (e: any) {
    console.error('[TapLogin] logout 异常:', e);
    return { success: false, error: e?.message || '登出异常' };
  }
}

// ===== 合规认证（实名 / 防沉迷 / 年龄段） =====================================

export interface ComplianceResult {
  code: number;
  name: string;
  allowed: boolean;
  ageRange: number;
}

const COMPLIANCE_MESSAGE: Record<number, string> = {
  1030: '当前时段不可游玩（未成年人保护）',
  1050: '今日可玩时长已用完',
  1100: '未达到本游戏的可玩年龄要求',
  1200: '实名认证服务不可用，请检查网络后重试',
};

/** 合规回调的中文提示（不需要提示时返回空串） */
export function complianceMessage(code: number): string {
  return COMPLIANCE_MESSAGE[code] || '';
}

/** 获取年龄段下限：-1 未知 / 0 / 8 / 16 / 18 */
export async function getAgeRange(): Promise<{ ageRange: number; ready: boolean; lastCode: number }> {
  if (!isNativePlatform()) {
    return { ageRange: -1, ready: false, lastCode: 0 };
  }
  try {
    const Capacitor = (window as any).Capacitor;
    return await Capacitor.Plugins.TapLogin.getAgeRange();
  } catch (e: any) {
    console.error('[TapLogin] getAgeRange 异常:', e);
    return { ageRange: -1, ready: false, lastCode: 0 };
  }
}

/** 重新发起合规认证（玩家关闭实名窗口后重试） */
export async function startupCompliance(openId: string): Promise<{ success: boolean; error?: string }> {
  if (!isNativePlatform() || !openId) {
    return { success: false, error: '仅支持 Android 原生环境' };
  }
  try {
    const Capacitor = (window as any).Capacitor;
    return await Capacitor.Plugins.TapLogin.startupCompliance({ openId });
  } catch (e: any) {
    console.error('[TapLogin] startupCompliance 异常:', e);
    return { success: false, error: e?.message || '发起认证失败' };
  }
}

/** 退出合规认证（重置防沉迷状态） */
export async function exitCompliance(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const Capacitor = (window as any).Capacitor;
    await Capacitor.Plugins.TapLogin.exitCompliance();
  } catch (e: any) {
    console.error('[TapLogin] exitCompliance 异常:', e);
  }
}

/** 订阅合规认证结果，返回取消订阅函数 */
export async function onComplianceResult(
  cb: (result: ComplianceResult) => void,
): Promise<() => void> {
  if (!isNativePlatform()) return () => {};
  try {
    const Capacitor = (window as any).Capacitor;
    const handle = await Capacitor.Plugins.TapLogin.addListener('complianceResult', cb);
    return () => handle?.remove?.();
  } catch (e: any) {
    console.error('[TapLogin] addListener 异常:', e);
    return () => {};
  }
}

/** 取原生关键步骤日志（登录 / 合规认证），用于准入页排查 */
export async function getDiag(): Promise<string[]> {
  if (!isNativePlatform()) return [];
  try {
    const Capacitor = (window as any).Capacitor;
    const r = await Capacitor.Plugins.TapLogin.getDiag();
    return (r?.lines || []) as string[];
  } catch (e: any) {
    return [];
  }
}

/** 触发原生诊断探针（拉取实名配置 + 输出合规内部状态） */
export async function probeCompliance(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const Capacitor = (window as any).Capacitor;
    await Capacitor.Plugins.TapLogin.probeCompliance();
  } catch (e: any) {
    console.error('[TapLogin] probeCompliance 异常:', e);
  }
}
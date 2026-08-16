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
package com.xianxia.sectgame;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;

/**
 * TapTap 登录 SDK v4 的 Capacitor 插件封装。
 *
 * 设计策略（同广告/更新插件）：
 *   1. 优先通过反射调用真实 TapSDK v4 登录模块（tap-login Maven 依赖）；
 *   2. SDK 不可用时，resolve 错误信息，不影响游戏流程。
 *
 * 真实 SDK Java 调用等价于：
 * <pre>
 *   // 登录
 *   TapLogin.Login(activity, new LoginCallback<TapAccount>() {
 *       public void onSuccess(TapAccount account) {
 *           String openId = account.getOpenId();
 *           String name = account.getName();
 *           String avatar = account.getAvatar();
 *           AccessToken token = account.getAccessToken();
 *       }
 *       public void onError(TapError error) { }
 *       public void onCancel() { }
 *   });
 *
 *   // 获取当前账号
 *   TapAccount account = TapLogin.GetCurrentTapAccount();
 *
 *   // 登出
 *   TapLogin.Logout();
 * </pre>
 *
 * 文档参考：
 *   - 功能介绍：https://developer.taptap.cn/docs/sdk/taptap-login/features/
 *   - 开发指南：https://developer.taptap.cn/docs/sdk/taptap-login/guide/
 *   - 获取用户信息：https://developer.taptap.cn/docs/sdk/taptap-login/taptap-oauth/
 */
@CapacitorPlugin(name = "TapLogin")
public class TapLoginPlugin extends Plugin {

    private static final String TAG = "TapLoginPlugin";
    private static final String TAP_PKG = "com.taptap.sdk";

    // 登录模块主类
    private static final String LOGIN_CLASS = TAP_PKG + ".login.TapLogin";

    // 登录回调接口
    private static final String CALLBACK_CLASS = LOGIN_CLASS + "$LoginCallback";
    // TapAccount 类
    private static final String ACCOUNT_CLASS = TAP_PKG + ".login.TapAccount";
    // AccessToken 类
    private static final String TOKEN_CLASS = ACCOUNT_CLASS + "$AccessToken";
    // TapError 类
    private static final String ERROR_CLASS = TAP_PKG + ".login.TapError";

    private boolean resolved = false;
    private Class<?> loginCls;       // TapLogin 类
    private Class<?> accountCls;     // TapAccount 类
    private Class<?> tokenCls;       // AccessToken 类
    private Method loginMethod;      // Login(Activity, LoginCallback)
    private Method getCurrentAccountMethod; // GetCurrentTapAccount()
    private Method logoutMethod;     // Logout()

    /**
     * 尝试反射解析 TapLogin SDK API。
     */
    private synchronized void resolve() {
        if (resolved) return;
        resolved = true;
        try {
            loginCls = Class.forName(LOGIN_CLASS);
            accountCls = Class.forName(ACCOUNT_CLASS);
            tokenCls = Class.forName(TOKEN_CLASS);

            // 解析 Login 方法
            // 签名：public static void Login(Activity activity, LoginCallback<TapAccount> callback)
            // 由于泛型擦除，第三个参数是 android.app.Activity 或 android.content.Context + LoginCallback
            // 尝试多种签名（v4 不同小版本有差异）
            Class<?> callbackCls = Class.forName(CALLBACK_CLASS);
            // 尝试 Login(Activity, LoginCallback)
            try {
                loginMethod = loginCls.getMethod("Login", Activity.class, callbackCls);
            } catch (NoSuchMethodException e) {
                // 尝试 Login(Activity, TapLoginSdkOptions, LoginCallback)
                Class<?> optionsCls = Class.forName(TAP_PKG + ".login.TapLoginSdkOptions");
                try {
                    loginMethod = loginCls.getMethod("Login", Activity.class, optionsCls, callbackCls);
                } catch (NoSuchMethodException e2) {
                    Log.w(TAG, "未找到 TapLogin.Login 方法签名");
                }
            }

            // 解析 GetCurrentTapAccount 方法
            // 签名：public static TapAccount GetCurrentTapAccount()
            try {
                getCurrentAccountMethod = loginCls.getMethod("GetCurrentTapAccount");
            } catch (NoSuchMethodException e) {
                try {
                    getCurrentAccountMethod = loginCls.getMethod("getCurrentTapAccount");
                } catch (NoSuchMethodException e2) {
                    Log.w(TAG, "未找到 GetCurrentTapAccount 方法");
                }
            }

            // 解析 Logout 方法
            try {
                logoutMethod = loginCls.getMethod("Logout");
            } catch (NoSuchMethodException e) {
                try {
                    logoutMethod = loginCls.getMethod("logout");
                } catch (NoSuchMethodException e2) {
                    Log.w(TAG, "未找到 Logout 方法");
                }
            }

            Log.i(TAG, "resolve 成功: login=" + (loginMethod != null)
                + " getCurrent=" + (getCurrentAccountMethod != null)
                + " logout=" + (logoutMethod != null));
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "TapLogin SDK 类未找到（未引入 tap-login 依赖？）: " + e.getMessage());
        } catch (Throwable t) {
            Log.w(TAG, "resolve 异常: " + t.getMessage());
        }
    }

    // ===== 工具方法：从 TapAccount 反射提取字段 =========================================

    private JSObject accountToJS(Object account) {
        JSObject obj = new JSObject();
        if (account == null) return obj;
        try {
            // 基础字段
            putIfExists(obj, account, "getOpenId", "openid");
            putIfExists(obj, account, "getUnionId", "unionid");
            putIfExists(obj, account, "getName", "name");
            putIfExists(obj, account, "getAvatar", "avatar");

            // AccessToken 子对象
            try {
                Method getToken = account.getClass().getMethod("getAccessToken");
                Object token = getToken.invoke(account);
                if (token != null) {
                    JSObject tokenObj = new JSObject();
                    putIfExists(tokenObj, token, "getKid", "kid");
                    putIfExists(tokenObj, token, "getMacKey", "mac_key");
                    putIfExists(tokenObj, token, "getMacAlgorithm", "mac_algorithm");
                    putIfExists(tokenObj, token, "getTokenType", "token_type");
                    obj.put("accessToken", tokenObj);
                }
            } catch (NoSuchMethodException ignored) { }
        } catch (Throwable t) {
            Log.w(TAG, "accountToJS 异常: " + t.getMessage());
        }
        return obj;
    }

    private static void putIfExists(JSObject target, Object obj, String getterName, String key) {
        try {
            Method m = obj.getClass().getMethod(getterName);
            Object val = m.invoke(obj);
            if (val != null) {
                target.put(key, val.toString());
            }
        } catch (NoSuchMethodException ignored) {
        } catch (Throwable t) {
            Log.w(TAG, "putIfExists(" + getterName + ") 异常: " + t.getMessage());
        }
    }

    // ===== Capacitor 暴露方法 ===========================================================

    /**
     * 登录。
     * 前端调用：TapLogin.login() → Promise<{ success: boolean, account?: {...}, error?: string }>
     */
    @PluginMethod
    public void login(final PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve(makeResult(false, null, "activity is null"));
            return;
        }
        resolve();

        if (loginCls == null || loginMethod == null) {
            call.resolve(makeResult(false, null, "TapLogin SDK 未就绪（未引入 tap-login 依赖？）"));
            return;
        }

        try {
            // 反射创建 LoginCallback 动态代理
            Class<?> callbackCls = Class.forName(CALLBACK_CLASS);
            final boolean[] settled = {false};

            Object callback = java.lang.reflect.Proxy.newProxyInstance(
                TapLoginPlugin.class.getClassLoader(),
                new Class<?>[]{callbackCls},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (settled[0]) return null;
                    try {
                        if ("onSuccess".equals(name) && args != null && args.length > 0) {
                            settled[0] = true;
                            JSObject account = accountToJS(args[0]);
                            Log.i(TAG, "login onSuccess: openid=" + account.optString("openid", ""));
                            if (getActivity() != null) {
                                getActivity().runOnUiThread(() ->
                                    call.resolve(makeResult(true, account, null)));
                            }
                        } else if ("onError".equals(name) && args != null && args.length > 0) {
                            settled[0] = true;
                            String errMsg = extractErrorMessage(args[0]);
                            Log.w(TAG, "login onError: " + errMsg);
                            if (getActivity() != null) {
                                getActivity().runOnUiThread(() ->
                                    call.resolve(makeResult(false, null, errMsg)));
                            }
                        } else if ("onCancel".equals(name)) {
                            settled[0] = true;
                            Log.i(TAG, "login onCancel");
                            if (getActivity() != null) {
                                getActivity().runOnUiThread(() ->
                                    call.resolve(makeResult(false, null, "用户取消登录")));
                            }
                        }
                    } catch (Throwable inner) {
                        Log.e(TAG, "login callback 异常: " + inner.getMessage());
                    }
                    return null;
                }
            );

            // 调用 Login 方法
            Class<?>[] paramTypes = loginMethod.getParameterTypes();
            if (paramTypes.length == 2) {
                // Login(Activity, LoginCallback)
                loginMethod.invoke(null, activity, callback);
            } else if (paramTypes.length == 3) {
                // Login(Activity, TapLoginSdkOptions, LoginCallback)
                // 使用默认 options
                Class<?> optionsCls = paramTypes[1];
                Object options = optionsCls.getConstructor().newInstance();
                loginMethod.invoke(null, activity, options, callback);
            } else {
                call.resolve(makeResult(false, null, "不支持的 Login 方法签名"));
            }
        } catch (Throwable t) {
            Log.e(TAG, "login 异常: " + t.getMessage(), t);
            call.resolve(makeResult(false, null, "登录异常: " + t.getMessage()));
        }
    }

    /**
     * 获取当前登录账号信息。
     * 前端调用：TapLogin.getCurrentAccount() → Promise<{ hasAccount: boolean, account?: {...} }>
     */
    @PluginMethod
    public void getCurrentAccount(final PluginCall call) {
        resolve();
        if (loginCls == null || getCurrentAccountMethod == null) {
            call.resolve(makeResult(false, null, "TapLogin SDK 未就绪"));
            return;
        }
        try {
            Object account = getCurrentAccountMethod.invoke(null);
            if (account == null) {
                JSObject ret = new JSObject();
                ret.put("hasAccount", false);
                call.resolve(ret);
            } else {
                JSObject accountJS = accountToJS(account);
                JSObject ret = new JSObject();
                ret.put("hasAccount", true);
                ret.put("account", accountJS);
                call.resolve(ret);
            }
        } catch (Throwable t) {
            Log.e(TAG, "getCurrentAccount 异常: " + t.getMessage());
            call.resolve(makeResult(false, null, t.getMessage()));
        }
    }

    /**
     * 登出。
     * 前端调用：TapLogin.logout() → Promise<{ success: boolean }>
     */
    @PluginMethod
    public void logout(final PluginCall call) {
        resolve();
        if (loginCls == null || logoutMethod == null) {
            call.resolve(makeResult(false, null, "TapLogin SDK 未就绪"));
            return;
        }
        try {
            logoutMethod.invoke(null);
            Log.i(TAG, "logout 成功");
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            Log.e(TAG, "logout 异常: " + t.getMessage());
            call.resolve(makeResult(false, null, t.getMessage()));
        }
    }

    // ===== 工具方法 =====================================================================

    private static String extractErrorMessage(Object errorObj) {
        try {
            // 尝试 getErrorMsg() / getMessage() / toString()
            for (String m : new String[]{"getErrorMsg", "getMessage", "toString"}) {
                try {
                    Method method = errorObj.getClass().getMethod(m);
                    Object val = method.invoke(errorObj);
                    if (val != null) return val.toString();
                } catch (NoSuchMethodException ignored) { }
            }
        } catch (Throwable ignored) { }
        return "未知错误";
    }

    private static JSObject makeResult(boolean success, JSObject account, String error) {
        JSObject ret = new JSObject();
        ret.put("success", success);
        if (account != null) ret.put("account", account);
        if (error != null) ret.put("error", error);
        return ret;
    }
}
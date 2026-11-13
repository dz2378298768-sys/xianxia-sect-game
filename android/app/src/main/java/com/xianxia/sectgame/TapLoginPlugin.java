package com.xianxia.sectgame;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

/**
 * TapTap 登录 SDK v4 的 Capacitor 插件封装。
 *
 * 设计策略（同广告/更新插件）：
 *   1. 优先通过反射调用真实 TapTap SDK v4 登录模块（tap-login Maven 依赖）；
 *   2. SDK 不可用时，返回错误信息，不影响游戏流程。
 *
 * 真实 SDK Kotlin 调用等价于：
 * <pre>
 *   // 登录（需传入 scope 数组）
 *   TapTapLogin.loginWithScopes(activity, arrayOf("public_profile"), object : TapTapCallback<TapTapAccount> {
 *       override fun onSuccess(account: TapTapAccount) { }
 *       override fun onCancel() { }
 *       override fun onFail(exception: TapTapException) { }
 *   })
 *
 *   // 获取当前账号
 *   val account = TapTapLogin.getCurrentTapAccount()
 *
 *   // 登出
 *   TapTapLogin.logout()
 * </pre>
 *
 * TapTapAccount 字段：
 *   - openId, unionId, name, avatar, email, accessToken
 * AccessToken 字段：
 *   - kid, tokenType, macKey, macAlgorithm, scopes
 *
 * 文档参考：
 *   - 功能介绍：https://developer.taptap.cn/docs/sdk/taptap-login/features/
 *   - 开发指南：https://developer.taptap.cn/docs/sdk/taptap-login/guide/
 *   - 获取用户信息：https://developer.taptap.cn/docs/sdk/taptap-login/taptap-oauth/
 */
@CapacitorPlugin(name = "TapLogin")
public class TapLoginPlugin extends Plugin {

    private static final String TAG = "TapLoginPlugin";

    // TapTapLogin 主类（v4.10.8 中为 TapTapLogin，不是 TapLogin）
    private static final String LOGIN_CLASS = "com.taptap.sdk.login.TapTapLogin";
    // TapTapAccount 类
    private static final String ACCOUNT_CLASS = "com.taptap.sdk.login.TapTapAccount";
    // AccessToken 类
    private static final String TOKEN_CLASS = "com.taptap.sdk.login.AccessToken";
    // TapTapCallback 接口
    private static final String CALLBACK_CLASS = "com.taptap.sdk.kit.internal.callback.TapTapCallback";
    // TapTapException 异常类
    private static final String EXCEPTION_CLASS = "com.taptap.sdk.kit.internal.exception.TapTapException";

    private boolean resolved = false;
    private Class<?> loginCls;       // TapTapLogin
    private Class<?> accountCls;     // TapTapAccount
    private Class<?> tokenCls;       // AccessToken
    private Class<?> callbackCls;    // TapTapCallback
    private Class<?> exceptionCls;   // TapTapException
    private Method loginMethod;      // loginWithScopes(Activity, String[], TapTapCallback)
    private Method getCurrentMethod; // getCurrentTapAccount()
    private Method logoutMethod;     // logout()

    /**
     * 尝试反射解析 TapTap Login SDK API。
     */
    private synchronized void resolve() {
        if (resolved) return;
        resolved = true;
        try {
            loginCls = Class.forName(LOGIN_CLASS);
            accountCls = Class.forName(ACCOUNT_CLASS);
            tokenCls = Class.forName(TOKEN_CLASS);
            callbackCls = Class.forName(CALLBACK_CLASS);
            exceptionCls = Class.forName(EXCEPTION_CLASS);

            // loginWithScopes(Activity, String[], TapTapCallback)
            loginMethod = loginCls.getMethod("loginWithScopes",
                Activity.class, String[].class, callbackCls);

            // getCurrentTapAccount()
            getCurrentMethod = loginCls.getMethod("getCurrentTapAccount");

            // logout()
            logoutMethod = loginCls.getMethod("logout");

            Log.i(TAG, "resolve 成功: login=" + (loginMethod != null)
                + " getCurrent=" + (getCurrentMethod != null)
                + " logout=" + (logoutMethod != null));

            // 把合规认证结果转成前端事件：TapLogin.addListener('complianceResult', ...)
            TapComplianceBridge.setListener((code, name) -> {
                JSObject payload = new JSObject();
                payload.put("code", code);
                payload.put("name", name);
                payload.put("allowed", TapComplianceBridge.isAllowed(code));
                payload.put("ageRange", TapComplianceBridge.getAgeRange());
                // 合规回调可能来自子线程，统一切到主线程再通知 JS
                final Activity act = getActivity();
                Runnable push = () -> notifyListeners("complianceResult", payload);
                if (act != null) act.runOnUiThread(push);
                else push.run();
            });
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "TapTap SDK 类未找到（未引入 tap-login 依赖？）: " + e.getMessage());
        } catch (Throwable t) {
            Log.w(TAG, "resolve 异常: " + t.getMessage());
        }
    }

    // ===== 工具方法：从 TapTapAccount 反射提取字段 =========================================

    private JSObject accountToJS(Object account) {
        JSObject obj = new JSObject();
        if (account == null) return obj;
        try {
            putStr(obj, account, "getOpenId", "openid");
            putStr(obj, account, "getUnionId", "unionid");
            putStr(obj, account, "getName", "name");
            putStr(obj, account, "getAvatar", "avatar");
            putStr(obj, account, "getEmail", "email");

            // AccessToken 子对象
            try {
                Method getToken = account.getClass().getMethod("getAccessToken");
                Object token = getToken.invoke(account);
                if (token != null) {
                    JSObject tokenObj = new JSObject();
                    putStr(tokenObj, token, "getKid", "kid");
                    putStr(tokenObj, token, "getTokenType", "token_type");
                    putStr(tokenObj, token, "getMacKey", "mac_key");
                    putStr(tokenObj, token, "getMacAlgorithm", "mac_algorithm");
                    obj.put("accessToken", tokenObj);
                }
            } catch (NoSuchMethodException ignored) { }
        } catch (Throwable t) {
            Log.w(TAG, "accountToJS 异常: " + t.getMessage());
        }
        return obj;
    }

    private static void putStr(JSObject target, Object obj, String getterName, String key) {
        try {
            Method m = obj.getClass().getMethod(getterName);
            Object val = m.invoke(obj);
            if (val != null) target.put(key, val.toString());
        } catch (NoSuchMethodException ignored) {
        } catch (Throwable t) {
            Log.w(TAG, "putStr(" + getterName + ") 异常: " + t.getMessage());
        }
    }

    // ===== Capacitor 暴露方法 ===========================================================

    /**
     * 登录。
     * 前端调用：TapLogin.login() → Promise<LoginResult>
     * LoginResult: { success: boolean, account?: TapTapAccount, error?: string }
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
            call.resolve(makeResult(false, null, "TapTap SDK 未就绪（未引入 tap-login 依赖？）"));
            return;
        }

        try {
            // 默认 scope：public_profile 获取基本用户信息
            final String[] scopes = new String[]{"public_profile"};

            // 创建 TapTapCallback 动态代理
            final boolean[] settled = {false};

            Object callback = Proxy.newProxyInstance(
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
                            TapDiag.log("登录成功");
                            // 登录成功后立刻进入合规认证（实名 / 防沉迷 / 年龄段授权）
                            final String openId = account.optString("openid", "");
                            final Activity act = getActivity();
                            if (act != null && !openId.isEmpty()) {
                                act.runOnUiThread(() -> TapComplianceBridge.startup(act, openId));
                            }
                            if (getActivity() != null) {
                                getActivity().runOnUiThread(() ->
                                    call.resolve(makeResult(true, account, null)));
                            }
                        } else if ("onFail".equals(name) && args != null && args.length > 0) {
                            settled[0] = true;
                            String errMsg = extractExceptionMessage(args[0]);
                            Log.w(TAG, "login onFail: " + errMsg);
                            TapDiag.log("登录失败：" + errMsg);
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

            // 调用 loginWithScopes(Activity, String[], TapTapCallback)
            loginMethod.invoke(null, activity, scopes, callback);
        } catch (Throwable t) {
            Log.e(TAG, "login 异常: " + t.getMessage(), t);
            call.resolve(makeResult(false, null, "登录异常: " + t.getMessage()));
        }
    }

    /**
     * 获取当前登录账号信息。
     * 前端调用：TapLogin.getCurrentAccount() → Promise<AccountStatus>
     * AccountStatus: { hasAccount: boolean, account?: TapTapAccount }
     */
    @PluginMethod
    public void getCurrentAccount(final PluginCall call) {
        resolve();
        if (loginCls == null || getCurrentMethod == null) {
            call.resolve(makeResult(false, null, "TapTap SDK 未就绪"));
            return;
        }
        try {
            Object account = getCurrentMethod.invoke(null);
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
            call.resolve(makeResult(false, null, "TapTap SDK 未就绪"));
            return;
        }
        try {
            logoutMethod.invoke(null);
            // 退出账号时同步重置合规认证状态
            TapComplianceBridge.exit();
            Log.i(TAG, "logout 成功");
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            Log.e(TAG, "logout 异常: " + t.getMessage());
            call.resolve(makeResult(false, null, t.getMessage()));
        }
    }

    // ===== 合规认证（实名 / 防沉迷 / 年龄段） =============================================

    /**
     * 获取玩家年龄段下限：-1 未知 / 0 / 8 / 16 / 18
     * 前端调用：TapLogin.getAgeRange()
     */
    @PluginMethod
    public void getAgeRange(final PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ageRange", TapComplianceBridge.getAgeRange());
        ret.put("ready", TapComplianceBridge.isReady());
        ret.put("lastCode", TapComplianceBridge.getLastResultCode());
        call.resolve(ret);
    }

    /**
     * 手动重新发起合规认证（例如玩家关闭实名窗口后重试）。
     * 前端调用：TapLogin.startupCompliance({ openId })
     */
    @PluginMethod
    public void startupCompliance(final PluginCall call) {
        resolve();
        String openId = call.getString("openId", "");
        Activity activity = getActivity();
        boolean ok = TapComplianceBridge.startup(activity, openId);
        JSObject ret = new JSObject();
        ret.put("success", ok);
        if (!ok) ret.put("error", "合规模块未就绪或 openId 为空");
        call.resolve(ret);
    }

    /**
     * 退出合规认证（重置防沉迷状态）。
     * 前端调用：TapLogin.exitCompliance()
     */
    @PluginMethod
    public void exitCompliance(final PluginCall call) {
        TapComplianceBridge.exit();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    /**
     * 诊断日志：返回最近几条原生关键步骤（登录 / 合规认证），用于真机排查。
     * 前端调用：TapLogin.getDiag() → Promise<{ lines: string[] }>
     */
    @PluginMethod
    public void getDiag(final PluginCall call) {
        JSArray lines = new JSArray();
        for (String line : TapDiag.tail(14)) lines.put(line);
        JSObject ret = new JSObject();
        ret.put("lines", lines);
        call.resolve(ret);
    }

    /**
     * 诊断探针：主动拉一次实名配置并输出合规内部状态，结果写入诊断日志。
     * 前端调用：TapLogin.probeCompliance()
     */
    @PluginMethod
    public void probeCompliance(final PluginCall call) {
        TapComplianceBridge.probe();
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    // ===== 工具方法 =====================================================================
    private static String extractExceptionMessage(Object exObj) {
        try {
            // TapTapException 可能有 getMessage() / getErrorMsg() 等方法
            for (String m : new String[]{"getMessage", "getErrorMsg", "toString"}) {
                try {
                    Method method = exObj.getClass().getMethod(m);
                    Object val = method.invoke(exObj);
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
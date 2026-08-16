#!/usr/bin/env node
/**
 * 构建后补丁：解决「浏览器直接双击 file:// 打开 dist/index.html 黑屏」问题。
 *
 * 根因（Vite legacy 插件默认行为）：
 *   1. <script type="module"> 含入口，但第 10 行检测写死 if(location.protocol!="file:")
 *      才将 window.__vite_is_modern_browser=true；于是 file:// 下 modern 路径被禁用。
 *   2. 真正的 legacy 脚本是 <script nomodule>，但支持 module 的「现代浏览器」会完全跳过 nomodule。
 *   3. 结果：任何启动脚本都不执行 → 黑屏。
 *
 * 补丁：在 </body> 前插入一段「普通 script」（现代/旧浏览器都必执行），
 *   等待最多 1500ms，若 React 未挂载（#root 无子节点），则手动动态加载
 *   legacy polyfill 与 legacy entry，绕过 nomodule 限制。
 *
 * 用法：
 *   node scripts/patch-h5-index.cjs                # 默认 patch dist/index.html
 *   node scripts/patch-h5-index.cjs path/to/html   # patch 指定文件
 */
const fs = require('fs');
const path = require('path');

const TARGET = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(TARGET)) {
  console.error('[patch-h5-index] 文件不存在:', TARGET);
  process.exit(1);
}

let html = fs.readFileSync(TARGET, 'utf8');

// 幂等：如果已经打过补丁就退出
if (html.includes('__XIANXIA_H5_BOOT_PATCH__')) {
  console.log('[patch-h5-index] 已打过补丁，跳过:', TARGET);
  process.exit(0);
}

// 从现有 nomodule 脚本中解析 legacy 文件名，避免硬编码
//   <script nomodule crossorigin id="vite-legacy-polyfill" src="./assets/polyfills-legacy-XXXX.js"></script>
//   <script nomodule crossorigin id="vite-legacy-entry" data-src="./assets/index-legacy-XXXX.js">...</script>
const polyfillMatch = html.match(/id="vite-legacy-polyfill"\s+src="([^"]+)"/);
const entryMatch    = html.match(/id="vite-legacy-entry"\s+data-src="([^"]+)"/);
if (!polyfillMatch || !entryMatch) {
  console.error('[patch-h5-index] 未能在 index.html 里解析到 vite legacy polyfill / entry。请确认已使用 @vitejs/plugin-legacy 构建。');
  process.exit(2);
}
const POLYFILL_SRC = polyfillMatch[1];
const ENTRY_DATA_SRC = entryMatch[1];

const PATCH = `
<!-- __XIANXIA_H5_BOOT_PATCH__：兜底启动，修复 file:// 直开黑屏 -->
<script>
(function () {
  var IS_FILE = location.protocol === 'file:';
  function isBooted() {
    var root = document.getElementById('root');
    return !!(root && root.children.length > 0);
  }
  function makeScript(src) {
    var s = document.createElement('script');
    s.src = src;
    // ⚠️ 关键：file:// 下绝对不要设置 crossOrigin！
    // crossorigin="anonymous" 会强制 CORS 模式，file:// 的 Origin=null 无法通过 CORS，
    // 脚本会被直接拦截为 ERR_FAILED / cross-origin read blocking，onload 永不触发。
    if (!IS_FILE) s.crossOrigin = 'anonymous';
    return s;
  }
  function loadLegacy() {
    if (window.__xianxia_legacy_loaded__) return;
    window.__xianxia_legacy_loaded__ = true;
    console.warn('[xianxia-h5] module 入口未启动，fallback 到 legacy 版本（兼容 file:// 直开）');
    var poly = makeScript('${POLYFILL_SRC}');
    poly.onerror = function (e) { console.error('[xianxia-h5] legacy polyfill 加载失败:', e); };
    poly.onload = function () {
      if (typeof System !== 'undefined' && System.import) {
        try {
          System.import('${ENTRY_DATA_SRC}').catch(function (err) {
            console.error('[xianxia-h5] System.import 失败，降级为普通 script 加载:', err && err.message);
            document.body.appendChild(makeScript('${ENTRY_DATA_SRC}'));
          });
        } catch (err) {
          console.error('[xianxia-h5] System.import 异常:', err && err.message);
          document.body.appendChild(makeScript('${ENTRY_DATA_SRC}'));
        }
      } else {
        var entry = makeScript('${ENTRY_DATA_SRC}');
        entry.onerror = function (e) { console.error('[xianxia-h5] legacy entry 加载失败:', e); };
        document.body.appendChild(entry);
      }
    };
    document.body.appendChild(poly);
  }
  var done = false;
  function checkOnce(reason) {
    if (done) return;
    if (isBooted()) { done = true; return; }
    if (window.__vite_is_modern_browser && reason === 'timer') {
      // HTTP 协议下 modern 已被设置但 root 仍空 = 脚本还在加载或报错，再等等，不强制 fallback
      return;
    }
    done = true;
    loadLegacy();
  }
  if (IS_FILE) {
    // file:// 下 modern 路径必被 CORS 阻止，不再等待，稍作让步让极个别宽松浏览器有机会走 modern
    setTimeout(function () { checkOnce('file'); }, 200);
  }
  setTimeout(function () { checkOnce('timer'); }, 1500);
  // 极端兜底：3 秒仍未启动就强制 legacy
  setTimeout(function () { if (!done && !isBooted()) loadLegacy(); }, 3000);
})();
</script>
`;

// 插入到 </body> 前
const before = html;
html = html.replace('</body>', PATCH + '\n  </body>');

if (html === before) {
  console.error('[patch-h5-index] 未找到 </body> 标签，无法插入补丁。');
  process.exit(3);
}

fs.writeFileSync(TARGET, html, 'utf8');
console.log('[patch-h5-index] 已打补丁:', TARGET);
console.log('  polyfill =', POLYFILL_SRC);
console.log('  entry    =', ENTRY_DATA_SRC);

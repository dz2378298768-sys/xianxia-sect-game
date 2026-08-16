#!/usr/bin/env node
/**
 * 将 dist/ 打包成符合 TapTap H5 规范的 zip：
 *   - 解压后只有 1 个顶层文件夹 xianxia-h5-v${VERSION}/
 *   - 该文件夹下包含 index.html
 *   - 单文件 ≤ 300MB
 *
 * 用法：
 *   node scripts/pack-h5-zip.cjs              # 取 package.json version
 *   VERSION=1.9.0 node scripts/pack-h5-zip.cjs # 或覆盖指定
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PKG  = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = process.env.VERSION || PKG.version || '0.0.0';
const DIRNAME = `xianxia-h5-v${VERSION}`;
const OUT_DIR = path.join(ROOT, 'release-h5');
const ZIP_FILE = path.join(OUT_DIR, `${DIRNAME}.zip`);

if (!fs.existsSync(DIST) || !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[pack-h5-zip] dist/index.html 不存在，请先 npm run build');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
if (fs.existsSync(ZIP_FILE)) fs.rmSync(ZIP_FILE, { force: true });

const TMPROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'xianxia-h5-'));
const LINK = path.join(TMPROOT, DIRNAME);
// symlink 在某些 zip 实现里会被存为链接而不是目录，改用拷贝或硬拷贝目录；这里用 node 18 的 fs.cpSync
try {
  fs.cpSync(DIST, LINK, { recursive: true, dereference: true });
} catch (e) {
  console.error('[pack-h5-zip] 拷贝 dist 到临时目录失败:', e.message);
  process.exit(2);
}

try {
  // -q 静默；排除 .map 减少体积
  const cmd = `cd "${TMPROOT}" && zip -r -q "${ZIP_FILE}" "./${DIRNAME}" -x '*.map'`;
  console.log('[pack-h5-zip] 执行:', cmd);
  execSync(cmd, { stdio: 'inherit' });
} catch (e) {
  console.error('[pack-h5-zip] zip 失败:', e.message);
  process.exit(3);
} finally {
  fs.rmSync(TMPROOT, { recursive: true, force: true });
}

// 大小校验
const stat = fs.statSync(ZIP_FILE);
const MB = (stat.size / 1048576).toFixed(1);
console.log(`\n[pack-h5-zip] 完成 -> ${path.relative(ROOT, ZIP_FILE)}  (${MB}MB, 上限 300MB)`);
if (stat.size > 314572800) {
  console.warn('[pack-h5-zip] ⚠️  zip 超过 300MB，可能不符合 TapTap 上传要求');
  process.exit(4);
}

// 结构校验
console.log('[pack-h5-zip] 结构校验：');
const list = execSync(`unzip -Z1 "${ZIP_FILE}" | cut -d/ -f1 | sort -u`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
console.log('  顶层目录数:', list.length, list);
console.log('  index.html:', !!execSync(`unzip -Z1 "${ZIP_FILE}" | grep -q "${DIRNAME}/index.html" && echo YES || echo NO`, { encoding: 'utf8' }).includes('YES'));

// 检查更新模块：读取远程 version.json，与当前版本比较
// version.json 格式：
// {
//   "version": "0.2.0",
//   "note": "本次更新内容…",
//   "downloadUrl": "https://……/写作助手 Setup 0.2.0.exe"
// }
const config = require('./config');

const TIMEOUT_MS = 12000;

// 返回 -1/0/1：a<b / a==b / a>b（只比较数字段）
function compareVersions(a, b) {
  const pa = String(a)
    .split(/[.\-]/)
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));
  const pb = String(b)
    .split(/[.\-]/)
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

async function checkUpdate(currentVersion) {
  const base = { currentVersion: String(currentVersion || '0.0.0') };
  const url = (config.UPDATE_MANIFEST_URL || '').trim();
  if (!url) {
    return { ...base, ok: false, configured: false, detail: '尚未配置更新地址' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json, text/plain' },
    });
    if (!res.ok) {
      return { ...base, ok: false, configured: true, detail: '更新服务器返回 ' + res.status };
    }
    const data = await res.json();
    const latest = String(data.version || '').trim();
    if (!latest) {
      return { ...base, ok: false, configured: true, detail: '更新信息格式不正确（缺少版本号）' };
    }
    return {
      ...base,
      ok: true,
      configured: true,
      newer: compareVersions(base.currentVersion, latest) < 0,
      latestVersion: latest,
      note: String(data.note || ''),
      downloadUrl: String(data.downloadUrl || ''),
    };
  } catch (e) {
    return {
      ...base,
      ok: false,
      configured: true,
      detail: e && e.name === 'AbortError' ? '连接更新服务器超时' : '无法连接更新服务器（请检查网络）',
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { checkUpdate, compareVersions };

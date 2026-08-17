// DeepSeek 网页版自动化模块
// 原理：用本机已安装的 Edge（playwright 的 channel: msedge）打开 DeepSeek 网页版，
//       复用软件自己维护的浏览器档案（登录一次后长期有效）。
// 隐私：本模块只接收用户主动粘贴的文字；绝不读取大纲/作品数据文件。
// 注意：DeepSeek 网页版改版后，只需更新下面的 SELECTORS 即可适配。
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');

const CHAT_URL = 'https://chat.deepseek.com/';

// 网页元素选择器（若 DeepSeek 改版导致找不到元素，请更新此处）
const SELECTORS = {
  newChatButton: ['button:has-text("新对话")', 'button:has-text("新聊天")'],
  chatInput: ['textarea', '[contenteditable="true"]'],
  sendButton: [
    'button[aria-label="发送"]',
    'button:has-text("发送")',
    '.ds-icon-button',
    'button[type="submit"]',
  ],
  stopButton: ['button:has-text("停止")', '[role="button"]:has-text("停止")'],
  assistantMessage: ['.ds-chat-message-assistant .ds-markdown', '.ds-markdown'],
  userMessage: ['.ds-chat-message-user .ds-markdown', '.ds-user-message'],
  limitText: [':text-is("使用限制")', ':text-is("达到每日上限")', ':text-is("服务繁忙")'],
};

const STATUS = {
  IDLE: 'idle',
  OPENING: 'opening', // 正在打开浏览器
  NEED_LOGIN: 'need_login', // 需要登录
  READY: 'ready', // 已就绪，可润色
  WORKING: 'working', // 正在发送/等待回复
  DONE: 'done',
  ERROR: 'error',
};

let browser = null;
let context = null;
let page = null;
let statusCb = null;
let queue = Promise.resolve();

function setStatusCallback(cb) {
  statusCb = cb;
}

function emit(status, detail) {
  try {
    if (statusCb) statusCb({ status, detail: detail || '', at: Date.now() });
  } catch (e) {
    console.error('[deepseek] emit 失败:', e.message);
  }
}

function profileDir() {
  return path.join(app.getPath('userData'), 'deepseek-profile');
}

// 检测本机可用的浏览器（当前以 Edge 为主，Chrome 为备选）
function detectBrowsers() {
  const found = [];
  const candidates = [
    {
      name: 'Edge',
      channel: 'msedge',
      paths: [
        process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
        process.env.ProgramFiles + '\\Microsoft\\Edge\\Application\\msedge.exe',
      ],
    },
    {
      name: 'Chrome',
      channel: 'chrome',
      paths: [
        process.env.ProgramFiles + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
      ],
    },
  ];
  for (const c of candidates) {
    const exists = c.paths.some((p) => p && fs.existsSync(p));
    if (exists) found.push({ name: c.name, channel: c.channel, available: true });
  }
  return found;
}

async function ensureBrowser() {
  if (context && (!browser || browser.isConnected())) return;
  const browsers = detectBrowsers();
  if (browsers.length === 0) {
    throw new Error('未检测到 Edge 或 Chrome 浏览器，无法使用 AI 润色');
  }
  const channel = browsers[0].channel; // Edge 优先
  emit(STATUS.OPENING, `正在打开 ${browsers[0].name}（首次使用需在弹出的窗口中登录一次 DeepSeek）`);
  context = await chromium.launchPersistentContext(profileDir(), {
    channel,
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });
  browser = context.browser();
  const pages = context.pages();
  page = pages[0] || (await context.newPage());
  page.on('close', () => {
    // 用户手动关掉了窗口
    page = null;
  });
}

function isBrowserAlive() {
  return !!context;
}

function getStatus() {
  return {
    launched: isBrowserAlive(),
    channel: detectBrowsers()[0] ? detectBrowsers()[0].name : null,
  };
}

// 抓取最后一条 AI 回复的完整文本：
// 优先取最后一条「助手消息容器」里的全部内容块拼接（修复长回复被截断的问题）
async function lastAssistantText() {
  try {
    // 方式一：最后一条助手消息容器
    const containers = page.locator('.ds-chat-message-assistant');
    const n = await containers.count();
    if (n > 0) {
      const last = containers.nth(n - 1);
      const blocks = last.locator('.ds-markdown');
      const count = await blocks.count();
      if (count > 0) {
        const texts = await blocks.allTextContents();
        const joined = texts
          .map((t) => String(t).trim())
          .filter(Boolean)
          .join('\n');
        if (joined) return joined;
      }
      return ''; // 容器存在但内容为空（生成中/空回复）
    }
    // 方式二（兜底）：全局 .ds-markdown 拼接
    for (const sel of SELECTORS.assistantMessage) {
      const loc = page.locator(sel);
      const count = await loc.count();
      if (count === 0) continue;
      const texts = await loc.allTextContents();
      const joined = texts
        .map((t) => String(t).trim())
        .filter(Boolean)
        .join('\n');
      if (joined) return joined;
    }
    return '';
  } catch (e) {
    return '';
  }
}

async function isStopVisible() {
  try {
    for (const s of SELECTORS.stopButton) {
      const loc = page.locator(s).first();
      if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// 是否已登录：能看见聊天输入框即视为已登录
async function checkLogin() {
  if (!page) return { loggedIn: false, needLogin: true, detail: '浏览器未打开' };
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500); // 等待页面动态渲染
    const url = page.url() || '';
    if (/(login|sign_in|sign-in|auth)/i.test(url)) {
      return { loggedIn: false, needLogin: true, detail: '跳转到了登录页' };
    }
    for (const s of SELECTORS.chatInput) {
      const loc = page.locator(s).first();
      if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
        return { loggedIn: true, needLogin: false, detail: '已登录' };
      }
    }
    // 可能是验证码/手机验证等中间页
    const loginUi = page
      .locator('input[placeholder*="手机号"], input[placeholder*="邮箱"], input[type="password"]')
      .first();
    if ((await loginUi.count()) > 0 && (await loginUi.isVisible().catch(() => false))) {
      return { loggedIn: false, needLogin: true, detail: '检测到登录表单，请在窗口中登录' };
    }
    return { loggedIn: false, needLogin: true, detail: '未检测到聊天输入框，请确认已在窗口中登录' };
  } catch (e) {
    return { loggedIn: false, needLogin: true, detail: '检查登录状态失败: ' + e.message };
  }
}

// 打开浏览器并导航到 DeepSeek 聊天页
async function prepare() {
  await ensureBrowser();
  if (!page || page.isClosed()) {
    const pages = context.pages();
    page = pages[0] || (await context.newPage());
  }
  try {
    await page.goto(CHAT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    // 页面加载失败时保留窗口，让用户手动处理
  }
  const st = await checkLogin();
  emit(st.loggedIn ? STATUS.READY : STATUS.NEED_LOGIN, st.detail);
  return st;
}

// 润色主流程（在队列中串行执行，避免并发操作浏览器）
function polish(payload) {
  const run = async () => {
    const text = String(payload.text || '').trim();
    const instruction = String(payload.instruction || '').trim();
    if (!text) throw new Error('没有要润色的文字');
    if (!instruction) throw new Error('缺少润色要求');

    emit(STATUS.WORKING, '准备浏览器…');
    await ensureBrowser();
    if (!page || page.isClosed()) {
      const pages = context.pages();
      page = pages[0] || (await context.newPage());
    }
    await page.goto(CHAT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const login = await checkLogin();
    if (!login.loggedIn) {
      emit(STATUS.NEED_LOGIN, login.detail);
      return { ok: false, needLogin: true, detail: login.detail };
    }

    // 优先开一个新对话，避免把回复混进旧对话
    try {
      for (const s of SELECTORS.newChatButton) {
        const btn = page.locator(s).first();
        if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
          await btn.click();
          await page.waitForTimeout(1500);
          break;
        }
      }
    } catch (e) {
      /* 找不到新对话按钮就继续用当前对话 */
    }

    const before = await lastAssistantText();

    // 找到输入框并输入
    let input = null;
    for (const s of SELECTORS.chatInput) {
      const loc = page.locator(s).first();
      if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
        input = loc;
        break;
      }
    }
    if (!input) {
      return { ok: false, needLogin: true, detail: '找不到聊天输入框（可能已退出登录或页面改版）' };
    }

    const prompt = `请帮我润色以下文字，要求：${instruction}\n\n原文：\n"""\n${text}\n"""\n\n请直接输出润色后的结果，不要额外解释。`;
    emit(STATUS.WORKING, '正在输入并发送…');
    await input.click();
    await input.fill(prompt);

    // 点击发送
    let sent = false;
    for (const s of SELECTORS.sendButton) {
      const btn = page.locator(s).first();
      if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
        try {
          await btn.click();
          sent = true;
          break;
        } catch (e) {
          /* 尝试下一个 */
        }
      }
    }
    if (!sent) {
      await input.press('Enter');
    }

    // 等待回复：先等生成开始，再等生成结束，最多 3 分钟
    emit(STATUS.WORKING, 'AI 正在生成，请稍候…');
    let reply = '';
    let limitHit = '';

    const isLimitHit = async () => {
      for (const s of SELECTORS.limitText) {
        const loc = page.locator(s).first();
        if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
          limitHit = 'DeepSeek 网页版提示' + (await loc.innerText().catch(() => '使用限制')).slice(0, 60);
          return true;
        }
      }
      return false;
    };

    // 阶段一：等待生成开始（出现“停止”按钮或最后一条回复开始变化）
    let started = false;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(1000);
      if (await isLimitHit()) break;
      if (await isStopVisible()) {
        started = true;
        break;
      }
      const now = await lastAssistantText();
      if (now && now !== before) {
        started = true;
        break;
      }
    }

    if (limitHit) {
      emit(STATUS.ERROR, limitHit);
      return { ok: false, detail: limitHit };
    }
    if (!started) {
      emit(STATUS.ERROR, 'AI 似乎没有开始回复，请检查浏览器窗口（是否已登录）');
      return { ok: false, detail: 'AI 似乎没有开始回复，请检查浏览器窗口（是否已登录）' };
    }

    // 阶段二：等待生成结束（“停止”按钮消失，且文字连续两次采样一致才算完整）
    // 等待时长按输入长度自适应：基础 120 秒，每多 500 字增加 30 秒，上限 600 秒
    const maxWaitSec = Math.min(600, 120 + Math.floor(text.length / 500) * 30);
    emit(STATUS.WORKING, 'AI 正在生成，请稍候…（最长约 ' + maxWaitSec + ' 秒）');
    for (let i = 0; i < maxWaitSec; i++) {
      await page.waitForTimeout(1000);
      if (await isLimitHit()) break;
      const stop = await isStopVisible();
      const now = await lastAssistantText();
      if (!stop && now && now !== before) {
        await page.waitForTimeout(2000);
        const a = await lastAssistantText();
        if (await isStopVisible()) continue; // 又开始生成（罕见），继续等待
        await page.waitForTimeout(2000);
        const b = await lastAssistantText();
        if (a && b && a === b) {
          reply = b;
          break;
        }
      }
    }

    if (!reply) {
      if (limitHit) {
        emit(STATUS.ERROR, limitHit);
        return { ok: false, detail: limitHit };
      }
      const tail = await lastAssistantText();
      if (tail && tail !== before) {
        reply = tail;
      } else {
        emit(STATUS.ERROR, '未能在 3 分钟内等到完整回复，请检查浏览器窗口');
        return { ok: false, detail: '未能在 3 分钟内等到完整回复，请检查浏览器窗口' };
      }
    }
    emit(STATUS.DONE, '完成');
    return { ok: true, reply };
  };
  const res = queue.then(run, run);
  queue = res.then(() => {}, () => {});
  return res;
}

async function closeBrowser() {
  try {
    if (context) await context.close();
  } catch (e) {
    /* 忽略 */
  }
  browser = null;
  context = null;
  page = null;
  emit(STATUS.IDLE, '浏览器已关闭');
}

module.exports = {
  STATUS,
  setStatusCallback,
  detectBrowsers,
  getStatus,
  prepare,
  checkLogin,
  polish,
  closeBrowser,
};

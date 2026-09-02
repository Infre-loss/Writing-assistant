// 彩蛋/鼓励系统：文案、阈值、去重读写（全部本地，不联网）

// 写作台角落浮现的随机鼓励句
export const SIDELINES = [
  '写得慢没关系，海是慢慢涨起来的。',
  '今天的字，是明天的路。',
  '卡住了就写「不知道」，写着写着就知道了。',
  '你的第一稿，允许很烂。',
  '没人催你，慢慢来。',
  '累的时候去喝口水，回来又是一章。',
  '完稿的作者，也都曾在半夜怀疑过自己。',
  '那句话憋不出来？先写别的，它自己会回来。',
  '你已经比昨天多写了一点了。',
  '好故事住在细节里，细节住在你眼皮底下。',
  '别急着删，先写完。删是之后的事。',
  '雨停了再走，词到了再写。',
  '写作是潜入水底，再浮上来呼吸。',
  '这一章再难，也有写完的那一天。',
  '你的读者，会在未来遇见此刻的你。',
  '灵感像猫——你假装不在意，它就来了。',
  '把一章写短不难，难的是舍得。但你舍得。',
];

// 全书总字数里程碑（递增，单位：字）
export const WORD_MILESTONES = [
  { at: 10000, text: '总字数突破 1 万字——你的故事已经有了厚度，继续呀 🌱' },
  { at: 50000, text: '5 万字了！你正在亲手搭建一座属于你的城 🏘️' },
  { at: 100000, text: '十万字——你写下的世界，开始有回声了 📖' },
  { at: 200000, text: '二十万字。了不起的坚持，真的 🌟' },
  { at: 500000, text: '五十万字。写作的朝圣者，为你骄傲 🏔️' },
];

const LS_MILESTONES = 'wa-milestones'; // { [projectId]: number[] }
const LS_BOOK = 'wa-book-done'; // { [projectId]: true }

export function readLs(objKey, fallback) {
  try {
    const raw = localStorage.getItem(objKey);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function writeLs(objKey, data) {
  try {
    localStorage.setItem(objKey, JSON.stringify(data));
  } catch (e) {
    /* 忽略 */
  }
}

// 字数里程碑去重：返回当前应庆祝的最高里程碑（已跨过且未记录过），并把标记写入本地
export function nextMilestone(projectId, totalWords, currentList) {
  const list = currentList || readLs(LS_MILESTONES, {})[projectId] || [];
  const found = WORD_MILESTONES.filter((m) => totalWords >= m.at && !list.includes(m.at));
  if (!found.length) return null;
  found.sort((a, b) => b.at - a.at);
  const pick = found[0];
  const map = readLs(LS_MILESTONES, {});
  map[projectId] = list.concat(found.map((f) => f.at));
  writeLs(LS_MILESTONES, map);
  return pick;
}

// 全书完成去重
export function markBookDone(projectId) {
  const map = readLs(LS_BOOK, {});
  if (map[projectId]) return false;
  map[projectId] = true;
  writeLs(LS_BOOK, map);
  return true;
}

export function hasBookDone(projectId) {
  return !!(readLs(LS_BOOK, {})[projectId]);
}

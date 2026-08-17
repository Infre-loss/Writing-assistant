// 本地存储模块：所有作品数据只保存在本机硬盘
// 目录结构（位于系统用户数据目录下）：
//   <userData>/data/projects.json          -> 作品列表 [{id,name,createdAt,updatedAt}]
//   <userData>/data/project-<id>.json      -> 单个作品完整数据（大纲树/进度/备注）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let dataDir = '';
const INDEX_FILE = 'projects.json';

function initStorage(userDataDir) {
  dataDir = path.join(userDataDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
}

function projectFilePath(id) {
  return path.join(dataDir, `project-${id}.json`);
}

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error('[storage] 读取失败:', file, e.message);
  }
  return fallback;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// 从磁盘上的项目文件重建索引（保持列表一致、无脏数据）
function rebuildIndex() {
  let files = [];
  try {
    files = fs.readdirSync(dataDir).filter((f) => f.startsWith('project-') && f.endsWith('.json'));
  } catch (e) {
    return [];
  }
  const list = files
    .map((f) => {
      const p = readJson(path.join(dataDir, f), null);
      return p ? { id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt } : null;
    })
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  writeJson(path.join(dataDir, INDEX_FILE), list);
  return list;
}

function listProjects() {
  return readJson(path.join(dataDir, INDEX_FILE), []).map((p) => ({ ...p }));
}

function createProject(name) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const project = {
    id,
    name: (name || '').trim() || '未命名作品',
    createdAt: now,
    updatedAt: now,
    tree: [],
  };
  writeJson(projectFilePath(id), project);
  rebuildIndex();
  return loadProject(id);
}

function renameProject(id, name) {
  const p = loadProject(id);
  if (!p) return null;
  p.name = (name || '').trim() || p.name;
  p.updatedAt = new Date().toISOString();
  writeJson(projectFilePath(id), p);
  rebuildIndex();
  return loadProject(id);
}

function deleteProject(id) {
  try {
    fs.rmSync(projectFilePath(id), { force: true });
  } catch (e) {
    console.error('[storage] 删除失败:', e.message);
  }
  rebuildIndex();
}

function loadProject(id) {
  const p = readJson(projectFilePath(id), null);
  if (p && !Array.isArray(p.tree)) p.tree = [];
  return p;
}

// 保存大纲树（renderer 每次改动后调用）
function saveTree(id, tree) {
  const p = loadProject(id);
  if (!p) return null;
  p.tree = Array.isArray(tree) ? tree : [];
  p.updatedAt = new Date().toISOString();
  writeJson(projectFilePath(id), p);
  rebuildIndex();
  return { id: p.id, name: p.name, updatedAt: p.updatedAt };
}

// 更新某个章节节点的正文内容与字数（Word 导入时使用）
function updateNodeContent(id, nodeId, content, currentWords) {
  const p = loadProject(id);
  if (!p) return null;
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.id === nodeId) {
        n.content = content;
        n.currentWords = currentWords;
        return n;
      }
      const r = walk(n.children || []);
      if (r) return r;
    }
    return null;
  };
  const found = walk(p.tree);
  if (!found) return null;
  p.updatedAt = new Date().toISOString();
  writeJson(projectFilePath(id), p);
  rebuildIndex();
  return found;
}

module.exports = {
  initStorage,
  listProjects,
  createProject,
  renameProject,
  deleteProject,
  loadProject,
  saveTree,
  updateNodeContent,
};

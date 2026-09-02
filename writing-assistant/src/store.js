// 纯函数工具集：大纲树的增删改查、统计
export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function makeNode(title = '') {
  return {
    id: uid(),
    title,
    status: 'not_started', // not_started | writing | done
    targetWords: 0,
    currentWords: 0,
    notes: '',
    milestone: '',
    storyOrder: 0, // 时间轴排序号（0 = 自动按大纲顺序）
    children: [],
  };
}

export function cloneTree(nodes) {
  return (nodes || []).map((n) => ({
    ...n,
    children: cloneTree(n.children || []),
  }));
}

// 查找节点，返回 { node, parent, index }；找不到返回 null
export function findWithParent(nodes, id, parent = null) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.id === id) return { node: n, parent, index: i };
    const r = findWithParent(n.children || [], id, n);
    if (r) return r;
  }
  return null;
}

export function findNode(tree, id) {
  const r = findWithParent(tree || [], id);
  return r ? r.node : null;
}

export function addChild(tree, parentId, node) {
  const t = cloneTree(tree);
  const found = findWithParent(t, parentId);
  if (found) {
    found.node.children = found.node.children || [];
    found.node.children.push(node);
  } else {
    t.push(node);
  }
  return t;
}

export function addSibling(tree, id, node) {
  const t = cloneTree(tree);
  const found = findWithParent(t, id);
  if (!found) {
    t.push(node);
    return t;
  }
  const arr = found.parent ? found.parent.children : t;
  arr.splice(found.index + 1, 0, node);
  return t;
}

export function updateNode(tree, id, patch) {
  const t = cloneTree(tree);
  const found = findWithParent(t, id);
  if (found) Object.assign(found.node, patch);
  return t;
}

export function removeNode(tree, id) {
  const t = cloneTree(tree);
  const found = findWithParent(t, id);
  if (!found) return t;
  const arr = found.parent ? found.parent.children : t;
  arr.splice(found.index, 1);
  return t;
}

// position: 'before' | 'after' | 'inside'
export function moveNode(tree, dragId, targetId, position) {
  if (dragId === targetId) return tree;
  const t = cloneTree(tree);
  const drag = findWithParent(t, dragId);
  const target = findWithParent(t, targetId);
  if (!drag || !target) return tree;
  if (position === 'inside') {
    // 不允许移进自己的子孙节点
    let anc = target.parent;
    while (anc) {
      if (anc.id === dragId) return tree;
      anc = anc.parent;
    }
  }
  const srcArr = drag.parent ? drag.parent.children : t;
  srcArr.splice(drag.index, 1);
  const node = drag.node;
  if (position === 'inside') {
    target.node.children = target.node.children || [];
    target.node.children.push(node);
  } else {
    const dstArr = target.parent ? target.parent.children : t;
    const idx = dstArr.indexOf(target.node);
    dstArr.splice(position === 'before' ? idx : idx + 1, 0, node);
  }
  return t;
}

export function isDescendant(tree, ancestorId, id) {
  const anc = findNode(tree, ancestorId);
  if (!anc) return false;
  return !!findWithParent(anc.children || [], id);
}

// 统计：完成进度按"叶子节点"（真正的章节/小节）计算，字数按全部节点汇总
export function calcStats(tree) {
  let total = 0,
    done = 0,
    writing = 0,
    words = 0,
    target = 0;
  const walk = (nodes) => {
    for (const n of nodes) {
      const isLeaf = !n.children || n.children.length === 0;
      if (isLeaf) {
        total++;
        if (n.status === 'done') done++;
        if (n.status === 'writing') writing++;
      }
      words += Number(n.currentWords) || 0;
      target += Number(n.targetWords) || 0;
      if (n.children && n.children.length) walk(n.children);
    }
  };
  walk(tree || []);
  return {
    total,
    done,
    writing,
    words,
    target,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

// 拍平为列表（带深度与大纲序号），供时间轴使用
export function flatten(tree) {
  const out = [];
  const walk = (nodes, depth) => {
    (nodes || []).forEach((n) => {
      out.push({ ...n, depth, preIndex: out.length });
      if (n.children && n.children.length) walk(n.children, depth + 1);
    });
  };
  walk(tree || [], 0);
  return out;
}

export const STATUS_META = {
  not_started: { label: '未开始', color: 'var(--not-started)' },
  writing: { label: '写作中', color: 'var(--writing)' },
  done: { label: '已完成', color: 'var(--done)' },
};

export const STATUS_LIGHT = {
  not_started: 'var(--not-started-light)',
  writing: 'var(--writing-light)',
  done: 'var(--done-light)',
};

export function nextStatus(s) {
  if (s === 'not_started') return 'writing';
  if (s === 'writing') return 'done';
  return 'not_started';
}

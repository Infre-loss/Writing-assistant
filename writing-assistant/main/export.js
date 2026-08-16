// 导出模块：把大纲树导出为 Markdown / TXT（纯文本，本地生成）
const STATUS_LABEL = {
  not_started: '未开始',
  writing: '写作中',
  done: '已完成',
};

function walkNodes(nodes, depth, lines, mode) {
  for (const n of nodes || []) {
    const indent = '  '.repeat(depth);
    const title = (n.title || '').trim() || '（未命名）';
    if (mode === 'md') {
      if (depth === 0) {
        lines.push(`# ${title}`);
      } else if (depth === 1) {
        lines.push(`## ${title}`);
      } else if (depth === 2) {
        lines.push(`### ${title}`);
      } else {
        lines.push(`${indent}- ${title}`);
      }
    } else {
      lines.push(`${indent}${title}`);
    }

    const meta = [];
    if (n.status) meta.push(`状态：${STATUS_LABEL[n.status] || n.status}`);
    if (n.targetWords) meta.push(`字数：${n.currentWords || 0} / ${n.targetWords}`);
    if (n.milestone) meta.push(`里程碑：${n.milestone}`);
    if (meta.length) {
      lines.push(`${indent}  · ${meta.join('　｜　')}`);
    }
    if (n.notes && String(n.notes).trim()) {
      const noteLines = String(n.notes).split('\n');
      lines.push(`${indent}  备注：${noteLines[0]}`);
      for (let i = 1; i < noteLines.length; i++) {
        lines.push(`${indent}        ${noteLines[i]}`);
      }
    }

    if (n.children && n.children.length) {
      walkNodes(n.children, depth + 1, lines, mode);
    }
  }
}

function exportProject(project, format) {
  const lines = [];
  if (format === 'md') {
    lines.push(`# ${project.name}`);
    lines.push('');
    lines.push('> 由「写作助手」导出');
    lines.push('');
  } else {
    lines.push(`【${project.name}】`);
    lines.push('');
  }
  walkNodes(project.tree || [], 0, lines, format === 'md' ? 'md' : 'txt');
  return lines.join('\n');
}

module.exports = { exportProject };

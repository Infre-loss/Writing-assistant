// 导出模块：Markdown / TXT / Word（docx）
const { Document, Packer, Paragraph, TextRun } = require('docx');

const STATUS_LABEL = {
  not_started: '未开始',
  writing: '写作中',
  done: '已完成',
};

// ---------- Markdown / TXT ----------
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

// ---------- Word (docx) ----------
function countChars(text) {
  return String(text || '').replace(/\s/g, '').length;
}

function contentParagraphs(text) {
  const lines = String(text || '').split(/\r?\n/);
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line || '', size: 24 })],
        spacing: { after: 120, line: 360 },
      })
  );
}

// 导出单个章节为 docx（Buffer）
async function exportChapterDocx(node) {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: (node.title || '').trim() || '未命名', bold: true, size: 36 })],
      spacing: { after: 260 },
    }),
    ...contentParagraphs(node.content),
  ];
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}

// 导出全书为 docx：按大纲顺序，章节名作为标题，正文跟进
async function exportBookDocx(project) {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: project.name || '未命名作品', bold: true, size: 44 })],
      spacing: { after: 320 },
    }),
  ];
  const walk = (nodes, depth) => {
    for (const n of nodes || []) {
      const title = (n.title || '').trim() || '（未命名）';
      const size = depth === 0 ? 36 : depth === 1 ? 32 : 28;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: title, bold: true, size })],
          spacing: { before: 240, after: 140 },
        })
      );
      if (n.content && String(n.content).trim()) {
        children.push(...contentParagraphs(n.content));
      }
      if (n.children && n.children.length) walk(n.children, depth + 1);
    }
  };
  walk(project.tree || [], 0);
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}

module.exports = {
  exportProject,
  exportChapterDocx,
  exportBookDocx,
  countChars,
};

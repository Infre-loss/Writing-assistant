// Word 文档导入模块：解析 .docx 为纯文本，并统计字数
const mammoth = require('mammoth');

async function importDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = String(result.value || '').trim();
  const charCount = text.replace(/\s/g, '').length;
  return { text, charCount };
}

module.exports = { importDocx };

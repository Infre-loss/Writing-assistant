// 测试用本地更新服务器（测完删除）
const http = require('http');
http
  .createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      version: '9.9.9',
      note: '测试更新内容：\n1. 新增写作台\n2. 新增检查更新',
      downloadUrl: 'https://example.com/writing-assistant-setup-9.9.9.exe',
    }));
  })
  .listen(8899, () => console.log('test update server on 8899'));

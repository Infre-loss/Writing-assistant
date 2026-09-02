// 应用配置
// UPDATE_MANIFEST_URL：更新清单地址。发布时在 Gitee（或任何公开空间）放一个 version.json，
// 格式见项目根目录《发布更新说明.md》。留空 = 未启用检查更新。
// 测试时可临时用环境变量 DS_UPDATE_URL 覆盖，例如指向本地 http 服务器。
module.exports = {
  UPDATE_MANIFEST_URL: process.env.DS_UPDATE_URL || '',
  AUTO_CHECK_UPDATE: true,
};

# 写作助手（Writing Assistant）

一款运行在 Windows 上的辅助写作桌面软件，面向作家群体：

- **大纲管理**：多作品、多层级大纲（卷→章→节），树状图 + 时间轴双视图，纯本地手动搭建
- **进度追踪**：每章标记「未开始 / 写作中 / 已完成」，目标字数与已写字数统计，总进度一目了然
- **AI 润色**：独立「AI 助手」页签，自动操作本机 Edge 浏览器连接 DeepSeek 网页版润色文字
- **隐私优先**：大纲与作品数据只保存在本机，**只有主动粘贴到 AI 输入框的文字**才会发送给 DeepSeek

---

## 给普通用户：如何运行

### 方式一：打包好的安装包（推荐）
执行打包后，运行 `release/` 目录下生成的 `写作助手 Setup *.exe` 安装即可（见下方「打包发布」）。

### 方式二：从源码运行（开发/预览）
前提：电脑已安装 [Node.js](https://nodejs.org/)（本机已验证 v24）。

```bash
cd writing-assistant
npm install
npm start
```

`npm start` 会先构建界面再启动软件窗口。

---

## 给开发者：技术结构

```
writing-assistant/
├── main/                 # Electron 主进程（Node.js）
│   ├── main.js           # 应用入口
│   ├── preload.js        # 安全桥（contextBridge）
│   ├── ipc.js            # IPC 通道注册
│   ├── storage.js        # 本地存储（作品 JSON 文件）
│   ├── deepseek.js       # DeepSeek 网页版自动化（playwright-core + 本机 Edge）
│   └── export.js         # 导出 Markdown / TXT
├── src/                  # 渲染进程（React + Vite）
│   ├── App.jsx           # 主状态与布局
│   ├── store.js          # 大纲树的纯函数操作（增删改查/统计）
│   ├── styles.css        # 白色 + 淡蓝色设计系统
│   └── components/       # TopBar / TreeView / DetailPanel / TimelineView / AIView / Modal
├── index.html
├── vite.config.mjs
└── package.json
```

### 数据存放位置
所有作品数据保存在系统用户数据目录下（Electron `userData`）：

```
C:\Users\<你的用户名>\AppData\Roaming\writing-assistant\data\
├── projects.json              # 作品列表
└── project-<id>.json          # 每个作品的大纲树/进度/备注
```

AI 浏览器的登录档案保存在同一目录的 `deepseek-profile\` 下（登录一次长期有效）。

### 隐私设计
- 大纲数据只在「大纲 / 时间轴」界面使用，通过 IPC 存入本地文件
- `main/deepseek.js` 只接收用户粘贴的文字，**不读取任何作品文件**
- AI 发送前界面有明确提示，发送内容仅到 DeepSeek 官方网页版

### DeepSeek 网页版适配
DeepSeek 网页版若改版导致自动化失效，只需更新 `main/deepseek.js` 顶部的 `SELECTORS` 配置（输入框 / 发送按钮 / 消息区选择器），无需改动其他代码。

---

## 打包发布（生成 Windows 安装包）

```bash
npm run pack            # 生成单文件绿色版（portable exe）
npm run pack:installer  # 生成安装程序（NSIS）
```

产物在 `release/` 目录。打包需要联网下载打包工具组件（首次较慢）。

---

## 已知限制
- AI 润色依赖 DeepSeek 网页版的登录状态与页面结构，网页改版或登录过期时需重新登录/更新适配
- 自动操作网页版理论上存在账号风险，建议使用常用账号并避免发送敏感内容
- 字数统计为手动填写（写作时自行更新「已写字数」）

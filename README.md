# 魔方公式练习 🧊

一个前后端分离的网页应用,帮你**认魔方符号、看公式怎么转、跟着练**。

- **后端**:Node.js + Express —— 提供公式库、符号库、随机打乱、练习进度等 API
- **前端**:Vue 3 + Vite + Three.js —— 三维魔方动画 + 四种练习模式

## 四种模式

| 模式 | 作用 |
| --- | --- |
| **观看演示** | 选一个公式,魔方逐步演示每一步,可单步 / 播放 / 调速。开「先做逆操作铺场」后,正向播放会把魔方复原。 |
| **符号教学** | 点 `R` / `U'` / `M` 等符号,魔方当场演示这一步,悬停高亮对应的层。先认符号再练公式。 |
| **跟练打分** | 看着目标公式,用按钮或键盘按出每一步,系统判对错、计时、算正确率,并记录到后端。支持「盲练」。 |
| **公式库** | 内置 基础/触发、OLL(全 57 个)、PLL(全 21 个)、F2L 分类,每条带起始状态识别图,可搜索;一键「演示」或「跟练」。 |

## 快速开始

需要 Node.js 18+。

**最省事(Windows 双击启动):** 双击根目录的 **`start.bat`**。它会自动检测 Node、首次运行时装好前后端依赖、分别在两个新窗口启动前后端,并自动打开浏览器到 http://localhost:5173。关服务就关掉那两个新窗口。

也可以用命令行:

```bash
# 在项目根目录,一次性安装前后端依赖
npm run install:all          # 或分别进 backend / frontend 执行 npm install

# 同时启动前后端(需要根目录已装 concurrently)
npm install                  # 安装根目录的 concurrently
npm run dev
```

或分两个终端手动启动:

```bash
# 终端 1 —— 后端 (http://localhost:3001)
cd backend
npm install
npm run dev

# 终端 2 —— 前端 (http://localhost:5173)
cd frontend
npm install
npm run dev
```

打开浏览器访问 **http://localhost:5173**。
前端开发服务器已把 `/api` 代理到后端 `3001`,无需额外配置。

## 目录结构

```
magic_cube/
├── backend/                    # Express API
│   ├── src/server.js           # 服务入口、路由、打乱生成
│   └── src/data/
│       ├── algorithms.js       # 公式库(想增改公式改这里)
│       └── notation.js         # 符号说明库
├── frontend/                   # Vue3 + Three.js
│   └── src/
│       ├── cube/
│       │   ├── moves.js        # 转动记号解析(符号→哪一层/转多少度)
│       │   ├── RubiksCube.js   # Three.js 建模 + 转层动画
│       │   └── store.js        # 播放状态(播放/单步/调速/铺场)
│       └── components/         # 各模式界面
└── package.json                # 根:一键安装 / 启动
```

## 公式库与校验

内置公式(均经脚本校验):

| 分类 | 数量 | 说明 |
| --- | --- | --- |
| 基础 / 触发 | 6 | Sexy、锤子、小鱼等积木连招 |
| OLL | 57 | 完整 57 式:标准解 15 + 生成 3 + 2-look 拆解 39,均经校验且 57/57 识别图各不相同 |
| PLL | 21 | 完整 21 式 |
| F2L | 4 | 直觉插入示意 |

**校验脚本**:`node scripts/verify-algs.mjs`。它用魔方坐标模型逐条验证:
- OLL/PLL 必须「只动最后一层、不破坏前两层」;
- F2L 必须保留底十字、最多只动一个角槽;
- 并对朝向/情形查重。

> 注:OLL 已补全为 57 式,由 `scripts/gen-oll.mjs` 生成、`scripts/check-oll.mjs` 校验(57/57 识别情形各不相同、均只动顶层)。其中 39 式为 2-look 风格的较长解(因网上现成单式数据抓取不稳定),正确但比标准单式长;可在 `backend/src/data/algorithms.js` 里随时替换成你顺手的标准式。F2L 仍为示意 4 式。

## 常见自定义

- **加 / 改公式**:编辑 `backend/src/data/algorithms.js`,按现有格式加一条,再跑一遍 `node scripts/verify-algs.mjs` 确认无误,前端自动出现。
- **改配色**:`frontend/src/cube/RubiksCube.js` 顶部的 `COLORS`。
- **改主题色**:`frontend/src/style.css` 里的 CSS 变量。

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/categories` | 公式分类 |
| GET | `/api/algorithms?category=&q=` | 公式列表(可筛选/搜索) |
| GET | `/api/algorithms/:id` | 单条公式 |
| GET | `/api/notation` | 符号说明 |
| GET | `/api/scramble?length=20` | 随机打乱 |
| GET | `/api/progress?user=local` | 读取练习记录 |
| POST | `/api/progress` | 提交一条跟练记录 |

# 迭代路线图(基于深度调研)

> 来源:一轮多源深度调研(5 个检索角度 · 25 个来源 · 120 条论断 → 经 3 票对抗校验存活 24/25)。
> 定位:**自用 + 公开产品 + 作品集** 三者兼顾。约束:**纯前端轻量优先**(尽量可 GitHub Pages 静态托管)。
> 证据分级:〔实证〕有研究支持 · 〔传统〕社区经验 · 〔争议〕学界/社区有分歧 · 〔待补研〕本轮抓到来源但未经对抗校验。

## 一、竞品功能对比

✓=有 · ◑=部分 · ✗=无 · ?=未核实

| 维度 | cstimer | jperm.net | CubeDesk | SpeedCubeDB | CubeSkills | Cubedex | **本项目** |
|---|---|---|---|---|---|---|---|
| 算法训练器(按 case 筛选刷) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◑ 有库+识别,无 case 刷 |
| 识别训练(两面/受限视角) | ✗ | ◑ | ? | ✓ | ✓(付费) | ◑ | ◑ 有识别图+SRS,无两面 |
| 智能蓝牙魔方(Web Bluetooth) | ✓ | ✗ | ? | ? | ✗ | ✓ 纯前端 PWA | ✗ |
| 分段计时 / 毫秒复盘 | ✓ | ✗ | ? | ? | ✗ | ◑ | ✗ |
| 3D 交互 / 可视化 | 弱 | ✓ | ✓ | ? | ✗ | ✓ | **✓✓** |
| 教学引导 / 新手路径 | ✗ | ✓ | ? | ◑ | ✓ | ✗ | **✓✓** |
| 内置求解器 | ✓ | ✗ | ? | ? | ✗ | ✗ | **✓✓** |
| 社区 / 分享 / 导出 | ✓ | ✗ | ✓ | ◑ | ◑ | ✗ | ✗ |

**我们的位置**
- **强项(继续押)**:纯前端整方 CFOP 求解器 + 十字 PDB 最优解、教学链(符号/读谱/十字训练)、可玩 3D + 面标 + 面对视角记号。
- **空白点(纯前端可补、且是行业基线)**:按 case 筛选刷 + 频率模式 + 触发提示;两面/受限视角识别;智能蓝牙魔方;WCA 公平随机态打乱。

## 二、学习法证据小结

| 论点 | 分级 | 对产品的启示 |
|---|---|---|
| **提取练习/测试效应**:先盲回想再看答案,比重复看更利长期记忆(159 项元分析 g=0.50) | 〔实证〕 | 识别训练「先回想公式再揭晓」的方向正确,要保证先想再看 |
| **FSRS > SM-2**:同等保持率下复习量更少(常见省 20–30%) | 〔实证〕 | 把 SRS 引擎升级到 FSRS(**已完成**) |
| **刻意练习被下修**:练习量仅解释 ~26%(非 48%)的水平差异,顶尖选手间练习量分不出高下 | 〔实证·争议〕 | 别把「累计时长/打卡」当核心激励,投资精准弱项定位(哪些 case 最慢) |
| lookahead 预判 / 色彩中立 / cross 盲规划 / 指法·TPS / 盲拧 / interleaving·chunking | 〔待补研〕 | 来源已存(见引用),需二轮补研定级后再纳入 |

## 三、迭代清单(按 价值÷工作量)

| # | 事项 | 可行性 | 工作量 | 状态 | 备注 / 轻量替代 |
|---|---|---|---|---|---|
| 1 | SRS 升级 SM-2 → FSRS-4.5 | 纯前端 | 小 | ✅ 已完成 | `frontend/src/cube/srs.js` |
| 2 | 识别训练加「两面/受限视角」+「最慢 case」榜 | 纯前端 | 小-中 | TODO | 复用识别图 + 按 case 计时统计 |
| 3 | 算法训练器范式:按 case 筛选刷 + 频率模式 + 触发提示 | 纯前端 | 中 | TODO | 复用现有 125 条库 + 未学/在学/已学状态机 |
| 4 | 接入 cubing.js 的 `cubing/scramble`(WCA 公平随机态打乱) | 纯前端 | 小 | TODO | `twisty-player` 可选(评估 vs 自研 Three.js) |
| 5 | Web Bluetooth 智能魔方接入 | 纯前端 ✓ **需硬件** | 中 | TODO | 用 `gan-web-bluetooth`/`cubing.js`,别自写协议;限 Chromium、iOS 需 Bluefy |
| 6 | 成绩导出/链接分享 + PWA 离线 | 纯前端 | 小-中 | TODO | localStorage→JSON 导出 / URL 编码分享 |
| 7 | 分段计时复盘(每段耗时) | **需智能魔方** | 中 | 待定 | 无魔方时:手动打点/键盘记录,精度有限 |

> **关键技术发现**:智能蓝牙魔方接入**完全可纯前端、可静态托管**——`cubing.js` 自带 `cubing/bluetooth`,Cubedex 已用它做成纯前端离线 PWA。硬约束:仅 Chromium 系、需 HTTPS、iOS 要 Bluefy、用户需真有 GAN/Giiker/GoCube 魔方。

## 四、三重定位 Top 3

- **自用(练得快)**:① FSRS(✅)→ ② 识别训练强化(两面 + 最慢 case)→ ③ 智能魔方接入(若你有 GAN 等;否则换读谱/十字盲规划训练)
- **公开产品**:① 补齐算法训练器范式(行业刚需)→ ② FSRS(✅)→ ③ 本地优先 + PWA 离线 + 免登录分享。*智能魔方对公开产品触达有限,定位为进阶可选*
- **作品集/技术展示**:① Web Bluetooth 智能魔方接入(最强亮点)→ ② 把已有纯前端整方 CFOP 求解器 + 十字 PDB 做成可展示的技术页 → ③ 集成 cubing.js + PWA

## 五、关键引用

- 竞品:[cstimer](https://cstimer.net/) · [jperm.net](https://jperm.net/) · [CubeDesk](https://www.cubedesk.io/home) · [SpeedCubeDB 训练器](https://speedcubedb.com/t) · [SpeedCubeDB 两面 PLL 识别](https://speedcubedb.com/t/pllrecog) · [CubeSkills PLL 识别训练器](https://www.cubeskills.com/tools/pll-recognition-trainer) · [Cubedex(开源)](https://github.com/poliva/cubedex)
- 技术栈:[cubing.js](https://github.com/cubing/cubing.js/) · [gan-web-bluetooth](https://github.com/afedotov/gan-web-bluetooth) · [scramble-display](https://github.com/cubing/scramble-display) · [csTimer 智能魔方 wiki](https://github.com/cs0x7f/cstimer/wiki/Use-csTimer-to-connect-to-smart-cubes---%E4%BD%BF%E7%94%A8csTimer%E8%BF%9E%E6%8E%A5%E6%99%BA%E8%83%BD%E9%AD%94%E6%96%B9)
- 学习法:[提取练习(PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3983480/) · [Anki FSRS 说明](https://faqs.ankiweb.net/what-spaced-repetition-algorithm) · [刻意练习复制研究(Royal Society)](https://royalsocietypublishing.org/rsos/article/6/8/190327/68523/) · [色彩中立 wiki](https://www.speedsolving.com/wiki/index.php/Color_neutrality) · [CubeSkills lookahead 框架](https://www.cubeskills.com/blog/lookahead-progression-framework)

## 六、局限 / 待补研

- 部分竞品的蓝牙/分段能力(CubeDesk、SpeedCubeDB)与第二节〔待补研〕的学习法议题本轮未对抗校验,需二轮补研才能写死。
- 部分功能数字来自厂商自述(如 CubeDesk「750+ trainers」)。
- 刻意练习一条存在 Ericsson 阵营与 Macnamara/Hambrick 阵营的持续学术争议。

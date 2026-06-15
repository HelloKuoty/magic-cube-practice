// 常用「手法 / 触发」(fingertricks / triggers):把公式拧快的积木连招。
// 纯前端数据,不依赖后端。手法因握法而异,这里给常见的一种,以线下/视频为准。
export const TRIGGERS = [
  // —— 基础触发 ——
  { id: "sexy", name: "Sexy(右手小连招)", moves: "R U R' U'", group: "基础触发",
    fingers: "出现频率最高的连招,F2L/OLL/PLL 处处是它。目标四步一气呵成成一个节奏:右手食指上推 R、收回 R',左右食指交替拨 U / U'。" },
  { id: "sexy-l", name: "Sexy 左手版", moves: "L' U' L U", group: "基础触发",
    fingers: "左槽对称版,练左右手平衡。镜像于右手 Sexy。" },
  { id: "insert-r", name: "右槽插入", moves: "R U R'", group: "基础触发",
    fingers: "F2L 最基本的插入触发,右手推 R、拨 U、收 R'。" },
  { id: "insert-rev", name: "反向插入", moves: "R U' R'", group: "基础触发",
    fingers: "另一方向的插入,F2L 常用;U' 用右手食指拨。" },
  { id: "sledge", name: "Sledgehammer(锤子)", moves: "R' F R F'", group: "基础触发",
    fingers: "翻色/插入常用的两拍连招:右手收 R'、左右配合 F、推 R、收 F'。" },
  { id: "hedge", name: "Hedgeslammer(反锤)", moves: "F R' F' R", group: "基础触发",
    fingers: "锤子的反向,和锤子互为镜像节奏,常成对出现。" },

  // —— 常用连招 ——
  { id: "sune", name: "Sune(小鱼)", moves: "R U R' U R U2 R'", group: "常用连招",
    fingers: "翻角招牌(OLL 27)。U2 处可同手双拨,整组练成一气呵成。" },
  { id: "antisune", name: "Antisune(反小鱼)", moves: "R U2 R' U' R U' R'", group: "常用连招",
    fingers: "Sune 的伴(OLL 26),方向相反。" },
  { id: "triple-sexy", name: "三连 Sexy", moves: "R U R' U' R U R' U' R U R' U'", group: "常用连招",
    fingers: "Sexy 做三遍正好回到原状——专门练连贯与耐力,追求稳定不卡顿。" },
  { id: "sexy-sledge", name: "Sexy + 锤子", moves: "R U R' U' R' F R F'", group: "常用连招",
    fingers: "两个触发拼接,OLL/PLL 常见片段(如 T 系)。练触发之间的衔接。" },

  // —— 单步拨动 ——
  { id: "r-push", name: "R / R' 推收", moves: "R R'", group: "单步拨动",
    fingers: "右手食指上推 R、下收 R',保持小幅,别用手腕大转。" },
  { id: "u-flick", name: "U / U' 拨顶", moves: "U U'", group: "单步拨动",
    fingers: "顶层用食指拨:U 左手食指、U' 右手食指,练左右交替——这是提 TPS 的关键。" },
  { id: "m-slice", name: "M 中层拨", moves: "M' M", group: "单步拨动",
    fingers: "右手无名指/中指拨中层(Roux、部分 OLL 用),手指找准中层。" },
];

export const TRIGGER_GROUPS = ["基础触发", "常用连招", "单步拨动"];

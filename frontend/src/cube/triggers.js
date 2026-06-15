// 常用「手法 / 触发」(fingertricks / triggers):把公式拧快的积木连招 + 基础手法教学。
// 纯前端数据,不依赖后端。手法因握法而异,这里给常见的一种,以线下/视频为准。

// —— 手法概念(先懂这些)——
export const CONCEPTS = [
  { t: "推 / 拨,不用手腕", d: "快手法靠手指推、拨(flick),手腕基本不动。大幅转手腕又慢又累。" },
  { t: "双拨(U2)", d: "顶层连转两下:同一手食指连拨,或一只手推、另一只拨。提速的关键手法。" },
  { t: "换握(regrip)", d: "做不顺时才调整握法。好公式/好手法尽量少换握,连招才流畅。" },
  { t: "中立握 + 预判", d: "手指停在随时能发力的位置;拧当前步时眼睛已在看下一步(lookahead)。" },
];

// —— 基础手法字典(先学这个:每个动作该用哪根手指)——
export const BASE_MOVES = [
  { move: "R", hand: "右手", finger: "食指", motion: "把 R 面右侧往上推", tip: "小幅、靠手指,别用手腕大转" },
  { move: "R'", hand: "右手", finger: "拇指 / 食指", motion: "把 R 面往下收回", tip: "和 R 互为来回,练顺这一对" },
  { move: "U", hand: "左手", finger: "食指", motion: "拨顶层(前排向右)", tip: "顶层最常拨,练到不看也准" },
  { move: "U'", hand: "右手", finger: "食指", motion: "拨顶层(前排向左)", tip: "和 U 左右手交替" },
  { move: "U2", hand: "双手", finger: "食指", motion: "顶层连拨两下", tip: "同手双拨或一推一拨,TPS 关键" },
  { move: "F", hand: "右手+左手", finger: "食指", motion: "前面顺时针", tip: "常和 R'/F' 组成锤子" },
  { move: "F'", hand: "左手", finger: "食指", motion: "前面逆时针", tip: "" },
  { move: "L", hand: "左手", finger: "食指 / 无名指", motion: "L 面左侧往上推(R 的镜像)", tip: "练左手平衡,别全靠右手" },
  { move: "L'", hand: "左手", finger: "拇指 / 食指", motion: "L 面往下收", tip: "" },
  { move: "M", hand: "右手", finger: "无名指 / 中指", motion: "中层往下拨(同 L 方向)", tip: "Roux、部分 OLL 用" },
  { move: "M'", hand: "右手", finger: "食指", motion: "中层往上拨", tip: "" },
  { move: "D", hand: "左 / 右手", finger: "拇指", motion: "底层拨", tip: "少用,多用整方转向 y 代替" },
  { move: "y", hand: "双手", finger: "—", motion: "整方左转(不是转层)", tip: "调整朝向,让下一步更顺手" },
];

// —— 触发连招(再练这些)——
export const TRIGGERS = [
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
  { id: "sune", name: "Sune(小鱼)", moves: "R U R' U R U2 R'", group: "常用连招",
    fingers: "翻角招牌(OLL 27)。U2 处可同手双拨,整组练成一气呵成。" },
  { id: "antisune", name: "Antisune(反小鱼)", moves: "R U2 R' U' R U' R'", group: "常用连招",
    fingers: "Sune 的伴(OLL 26),方向相反。" },
  { id: "triple-sexy", name: "三连 Sexy", moves: "R U R' U' R U R' U' R U R' U'", group: "常用连招",
    fingers: "Sexy 做三遍正好回到原状——专门练连贯与耐力,追求稳定不卡顿。" },
  { id: "sexy-sledge", name: "Sexy + 锤子", moves: "R U R' U' R' F R F'", group: "常用连招",
    fingers: "两个触发拼接,OLL/PLL 常见片段(如 T 系)。练触发之间的衔接。" },
];

export const TRIGGER_GROUPS = ["基础触发", "常用连招"];

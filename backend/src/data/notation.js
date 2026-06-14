// 魔方符号(转动记号)说明库 —— 用于「符号教学」模式
// face: 前端用于高亮/演示的基础动作记号(不带修饰符)
// 每个条目包含:基础符号、中文名、方向说明、所属分类
export const notation = [
  // ---- 六个面 ----
  { symbol: "R", face: "R", name: "右面", group: "面",
    desc: "Right。转动右边那一面,顺时针 90°(面对右面看)。" },
  { symbol: "L", face: "L", name: "左面", group: "面",
    desc: "Left。转动左边那一面,顺时针 90°(面对左面看)。" },
  { symbol: "U", face: "U", name: "顶面", group: "面",
    desc: "Up。转动顶面,顺时针 90°(从上往下看)。最常用。" },
  { symbol: "D", face: "D", name: "底面", group: "面",
    desc: "Down。转动底面,顺时针 90°(从下往上看)。" },
  { symbol: "F", face: "F", name: "前面", group: "面",
    desc: "Front。转动正对你的前面,顺时针 90°。" },
  { symbol: "B", face: "B", name: "后面", group: "面",
    desc: "Back。转动背面,顺时针 90°(从背后看)。" },

  // ---- 修饰符 ----
  { symbol: "'", face: null, name: "逆时针", group: "修饰符",
    desc: "撇号(prime)。表示逆时针转 90°,例如 R' 是右面逆时针。" },
  { symbol: "2", face: null, name: "转两下", group: "修饰符",
    desc: "数字 2。表示该面转 180°(转两下),例如 R2。方向无所谓。" },

  // ---- 中层 / 切片 ----
  { symbol: "M", face: "M", name: "中层", group: "切片",
    desc: "Middle。左右之间的中间竖层,转动方向跟随 L(左面)。" },
  { symbol: "E", face: "E", name: "赤道层", group: "切片",
    desc: "Equator。上下之间的中间横层,转动方向跟随 D(底面)。" },
  { symbol: "S", face: "S", name: "站立层", group: "切片",
    desc: "Standing。前后之间的中间竖层,转动方向跟随 F(前面)。" },

  // ---- 双层(宽层)----
  { symbol: "r", face: "r", name: "右双层", group: "双层",
    desc: "小写 r(也写作 Rw)。右面连带相邻中层一起转,方向跟随 R。" },
  { symbol: "l", face: "l", name: "左双层", group: "双层",
    desc: "小写 l(Lw)。左面连带相邻中层一起转,方向跟随 L。" },
  { symbol: "u", face: "u", name: "顶双层", group: "双层",
    desc: "小写 u(Uw)。顶面连带相邻中层一起转,方向跟随 U。" },
  { symbol: "d", face: "d", name: "底双层", group: "双层",
    desc: "小写 d(Dw)。底面连带相邻中层一起转,方向跟随 D。" },
  { symbol: "f", face: "f", name: "前双层", group: "双层",
    desc: "小写 f(Fw)。前面连带相邻中层一起转,方向跟随 F。" },
  { symbol: "b", face: "b", name: "后双层", group: "双层",
    desc: "小写 b(Bw)。后面连带相邻中层一起转,方向跟随 B。" },

  // ---- 整体旋转 ----
  { symbol: "x", face: "x", name: "整体翻转(绕R)", group: "整体旋转",
    desc: "整个魔方绕左右轴转动,方向跟随 R。常用于调整观察角度。" },
  { symbol: "y", face: "y", name: "整体旋转(绕U)", group: "整体旋转",
    desc: "整个魔方绕上下轴转动,方向跟随 U。" },
  { symbol: "z", face: "z", name: "整体翻转(绕F)", group: "整体旋转",
    desc: "整个魔方绕前后轴转动,方向跟随 F。" },
];

// 转动记号解析:把 "R U R' U'" 这样的字符串解析成可执行的转动对象。
//
// 坐标系(右手系,与 Three.js 默认一致):
//   +X = 右(R 面), +Y = 上(U 面), +Z = 前(F 面,朝向观察者)
// 顺时针(从该面外侧看)对应的旋转角度,依据右手定则:
//   位于正轴方向的面(R/U/F)顺时针 = -90°
//   位于负轴方向的面(L/D/B)顺时针 = +90°
// 切片/双层/整体旋转的方向跟随对应的面。
const Q = Math.PI / 2;

// 每个基础符号 -> { axis, sign, layers(选中哪些层坐标 -1/0/1) }
// sign 为「顺时针一格」的角度符号
const BASE = {
  R: { axis: "x", sign: -1, layers: [1] },
  L: { axis: "x", sign: +1, layers: [-1] },
  U: { axis: "y", sign: -1, layers: [1] },
  D: { axis: "y", sign: +1, layers: [-1] },
  F: { axis: "z", sign: -1, layers: [1] },
  B: { axis: "z", sign: +1, layers: [-1] },
  // 切片
  M: { axis: "x", sign: +1, layers: [0] }, // 跟随 L
  E: { axis: "y", sign: +1, layers: [0] }, // 跟随 D
  S: { axis: "z", sign: -1, layers: [0] }, // 跟随 F
  // 双层(宽层)
  r: { axis: "x", sign: -1, layers: [0, 1] },
  l: { axis: "x", sign: +1, layers: [-1, 0] },
  u: { axis: "y", sign: -1, layers: [0, 1] },
  d: { axis: "y", sign: +1, layers: [-1, 0] },
  f: { axis: "z", sign: -1, layers: [0, 1] },
  b: { axis: "z", sign: +1, layers: [-1, 0] },
  // 整体旋转
  x: { axis: "x", sign: -1, layers: [-1, 0, 1] },
  y: { axis: "y", sign: -1, layers: [-1, 0, 1] },
  z: { axis: "z", sign: -1, layers: [-1, 0, 1] },
};

// 解析单个 token,如 "R" "R'" "R2" "Rw" "Rw'" "M'" "x2" "R2'"(2 与 ' 任意组合都能容错)
export function parseToken(raw) {
  let t = raw.trim();
  if (!t) return null;
  const m = t.match(/^([RLUDFBMESxyzrludfb])(w)?([2']*)$/);
  if (!m) return null;
  let face = m[1];
  const isW = !!m[2];
  const suffix = m[3]; // 只可能由 2 和 ' 组成

  // Rw -> r 等(把宽层大写写法标准化为小写)
  if (isW && /[RLUDFB]/.test(face)) face = face.toLowerCase();
  const base = BASE[face];
  if (!base) return null;

  // 含 2 即视为转两下(180°,此时 ' 无意义);否则有 ' 即逆时针
  const isDouble = suffix.includes("2");
  const prime = !isDouble && suffix.includes("'");
  const times = isDouble ? 2 : 1;
  const dir = prime ? -base.sign : base.sign; // 实际旋转方向(+/-1)
  const angle = dir * Q * times;

  // 规范化字符串(用于跟练比对 / 显示)
  const canonical = face + (isDouble ? "2" : prime ? "'" : "");

  return {
    raw,
    canonical,
    face,
    axis: base.axis,
    layers: base.layers,
    angle, // 弧度,带符号,double 即 ±180°
    times,
    isDouble,
    prime,
  };
}

// 解析整串
export function parseSequence(str) {
  if (!str) return [];
  return str
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(parseToken)
    .filter(Boolean);
}

// 求一个 token 的逆操作(用于单步回退、逆操作打乱)
export function invertToken(tok) {
  if (tok.isDouble) return tok; // 双转的逆就是自己
  // 把规范字符串里的撇号翻转后重新解析
  const flipped = tok.prime ? tok.face : tok.face + "'";
  return parseToken(flipped);
}

// 求整串的逆序列(逆序 + 每步取逆)
export function invertSequence(tokens) {
  return [...tokens].reverse().map(invertToken);
}

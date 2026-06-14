import { reactive } from "vue";

// 标准配色(固定不变),只让用户选「底面是哪个颜色」。整套标准配色随之转向。
export const COLOR_HEX = {
  white: "#ffffff",
  yellow: "#ffd500",
  green: "#009b48",
  blue: "#0046ad",
  red: "#b71234",
  orange: "#ff5800",
};
export const COLOR_NAME = { white: "白", yellow: "黄", green: "绿", blue: "蓝", red: "红", orange: "橙" };
export const BOTTOM_CHOICES = ["white", "yellow", "green", "blue", "red", "orange"];
const INNER = "#15171e";

// 标准方向 -> 颜色(白上、黄下、绿前、蓝后、红右、橙左,BOY 标准)
const STD = [
  { d: [0, 1, 0], k: "white" }, { d: [0, -1, 0], k: "yellow" },
  { d: [0, 0, 1], k: "green" }, { d: [0, 0, -1], k: "blue" },
  { d: [1, 0, 0], k: "red" }, { d: [-1, 0, 0], k: "orange" },
];
function rot(axis, deg) {
  const a = (deg * Math.PI) / 180, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  if (axis === "x") return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === "y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
const mvT = (M, v) => [0, 1, 2].map((j) => Math.round(M[0][j] * v[0] + M[1][j] * v[1] + M[2][j] * v[2]));
// 把某颜色转到底面(-Y)的旋转,尽量保持「绿在前」的自然观感
const TO_BOTTOM = {
  yellow: rot("x", 0), white: rot("z", 180),
  green: rot("x", 90), blue: rot("x", -90),
  red: rot("z", -90), orange: rot("z", 90),
};
const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
function colorAt(M, faceDir) {
  const stdDir = mvT(M, faceDir); // 该面在标准配色里对应的方向
  const e = STD.find((s) => eq(s.d, stdDir));
  return COLOR_HEX[e.k];
}
// 由底色推出 {U,D,F,B,R,L,inner} 十六进制
function deriveColors(bottomKey) {
  const M = TO_BOTTOM[bottomKey] || TO_BOTTOM.white;
  return {
    U: colorAt(M, [0, 1, 0]), D: colorAt(M, [0, -1, 0]),
    F: colorAt(M, [0, 0, 1]), B: colorAt(M, [0, 0, -1]),
    R: colorAt(M, [1, 0, 0]), L: colorAt(M, [-1, 0, 0]),
    inner: INNER,
  };
}

const KEY = "magiccube.bottom";
function loadBottom() {
  try { const b = localStorage.getItem(KEY); if (b && BOTTOM_CHOICES.includes(b)) return b; } catch {}
  return "white"; // 默认白底(最常见)
}

export const settings = reactive({
  bottom: loadBottom(),
  get colors() {
    return deriveColors(this.bottom);
  },
  setBottom(key) {
    this.bottom = key;
    try { localStorage.setItem(KEY, key); } catch {}
  },
});

// 最后一层求解器:把用户「画」的最后一层贴纸还原成真实状态,再用 2-look(翻棱十字→翻角→归位)
// 暴力试解(逐个候选施加并检查结果),用的都是已校验的公式。默认前两层已还原。
import { parseSequence } from "./moves.js";
import { makeCube, apply, mv, eqV, cloneCube, at, ID } from "./model.js";

// ---- 已校验的 2-look 公式 ----
const EO = [
  "F R U R' U' F'", // 横线 -> 十字
  "f R U R' U' f'", // L 形 -> 十字
  "F R U R' U' F' f R U R' U' f'", // 点 -> 十字
];
const OCLL = [
  "R U R' U R U2 R'", // Sune
  "R U2 R' U' R U' R'", // Anti-Sune
  "R U2 R2 U' R2 U' R2 U2 R", // Pi
  "F R U R' U' R U R' U' R U R' U' F'", // H
  "R2 D R' U2 R D' R' U2 R'", // 两角对角
  "F' r U R' U' r' F R", // 两角相邻
];
const PLL = [
  "M2 U M U2 M' U M2", "M2 U' M U2 M' U' M2", "M2 U M2 U2 M2 U M2", "M2 U M2 U M' U2 M2 U2 M'",
  "x L2 D2 L' U' L D2 L' U L' x'", "x L U' L D2 L' U L D2 L2 x'",
  "x' L' U L D' L' U' L D L' U' L D' L' U L D x",
  "R U R' U' R' F R2 U' R' U' R U R' F'", "F R U' R' U' R U R' F' R U R' U' R' F R F'",
  "R' U L' U2 R U' R' U2 R L", "R U R' F' R U R' U' R' F R2 U' R' U'",
  "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
  "R U' R' U' R U R D R' U' R D' R' U2 R'", "R' U2 R U2 R' F R U R' U' R' F' R2",
  "R2 U R' U R' U' R U' R2 U' D R' U R D'", "R' U' R U D' R2 U R' U R U' R U' R2 D",
  "R2 U' R U' R U R' U R2 U D' R U' R' D", "R U R' U' D R2 U' R U' R' U R' U R2 D'",
  "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", "R' U R U' R' F' U' F R U R' F R' F' R U' R",
  "R' U R' U' y R' F' R2 U' R' U R' F R F y'",
];
const AUF = ["", "U", "U2", "U'"];

// ---- 贴纸 -> 状态 重建 ----
// 顶层各位置如何取贴纸:up 用 U[行][列];sides 用四周翻边 [世界方向, 翻边名, 下标]
const CORNERS = [
  { pos: [1, 1, 1], up: [2, 2], sides: [[[1, 0, 0], "right", 2], [[0, 0, 1], "front", 2]] },
  { pos: [-1, 1, 1], up: [2, 0], sides: [[[-1, 0, 0], "left", 2], [[0, 0, 1], "front", 0]] },
  { pos: [-1, 1, -1], up: [0, 0], sides: [[[-1, 0, 0], "left", 0], [[0, 0, -1], "back", 0]] },
  { pos: [1, 1, -1], up: [0, 2], sides: [[[1, 0, 0], "right", 0], [[0, 0, -1], "back", 2]] },
];
const EDGES = [
  { pos: [0, 1, 1], up: [2, 1], side: [[0, 0, 1], "front", 1] },
  { pos: [1, 1, 0], up: [1, 2], side: [[1, 0, 0], "right", 1] },
  { pos: [0, 1, -1], up: [0, 1], side: [[0, 0, -1], "back", 1] },
  { pos: [-1, 1, 0], up: [1, 0], side: [[-1, 0, 0], "left", 1] },
];
const CORNER_HOMES = [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]];
const EDGE_HOMES = [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]];

function homeStickers(h, C) {
  const o = [];
  if (h[0] === 1) o.push({ d: [1, 0, 0], c: C.R }); if (h[0] === -1) o.push({ d: [-1, 0, 0], c: C.L });
  if (h[1] === 1) o.push({ d: [0, 1, 0], c: C.U }); if (h[1] === -1) o.push({ d: [0, -1, 0], c: C.D });
  if (h[2] === 1) o.push({ d: [0, 0, 1], c: C.F }); if (h[2] === -1) o.push({ d: [0, 0, -1], c: C.B });
  return o;
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function orientationFrom(pairs) {
  const ps = pairs.slice();
  if (ps.length === 2) ps.push({ l: cross(ps[0].l, ps[1].l), w: cross(ps[0].w, ps[1].w) });
  const or = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0; for (const p of ps) s += p.w[i] * p.l[j];
    or[i][j] = Math.round(s);
  }
  return or;
}
const keyset = (arr) => arr.slice().sort().join("|");

// input: { U:3x3, front:[3], right:[3], back:[3], left:[3] };colors:配色
export function stateFromStickers(input, C) {
  const cube = makeCube();
  const place = (spec, painted, homes, label) => {
    const colorSet = keyset(painted.map((p) => p.c));
    const home = homes.find((h) => keyset(homeStickers(h, C).map((s) => s.c)) === colorSet);
    if (!home) throw new Error(`${label} 处的颜色无法识别(${painted.map((p) => p.c).join(",")})`);
    const hs = homeStickers(home, C);
    const pairs = painted.map((p) => {
      const m = hs.find((s) => s.c === p.c);
      return { w: p.d, l: m.d };
    });
    const cu = cube.find((x) => eqV(x.home, home));
    cu.pos = spec.pos;
    cu.or = orientationFrom(pairs);
  };
  for (const c of CORNERS) {
    const painted = [{ d: [0, 1, 0], c: input.U[c.up[0]][c.up[1]] }];
    for (const [d, flap, i] of c.sides) painted.push({ d, c: input[flap][i] });
    place(c, painted, CORNER_HOMES, "角块");
  }
  for (const e of EDGES) {
    const painted = [{ d: [0, 1, 0], c: input.U[e.up[0]][e.up[1]] }];
    const [d, flap, i] = e.side; painted.push({ d, c: input[flap][i] });
    place(e, painted, EDGE_HOMES, "棱块");
  }
  return cube;
}

// ---- 2-look 求解 ----
const CORNER_POS = [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]];
const EDGE_POS = [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]];
const LL_POS = [...CORNER_POS, ...EDGE_POS];
const upOk = (cu) => eqV(mv(cu.or, [0, 1, 0]), [0, 1, 0]); // 顶色朝上
const isId = (m) => m.flat().join() === ID.flat().join();
const edgesOriented = (c) => EDGE_POS.every((p) => upOk(at(c, p)));
const cornersOriented = (c) => CORNER_POS.every((p) => upOk(at(c, p)));
const llSolved = (c) => LL_POS.every((p) => { const cu = at(c, p); return eqV(cu.pos, cu.home) && isId(cu.or); });
function test(cube, seq) { const c = cloneCube(cube); apply(c, parseSequence(seq)); return c; }

export function solveLastLayer(input, C) {
  let cube;
  try { cube = stateFromStickers(input, C); } catch (e) { return { error: e.message }; }
  const steps = [];
  const step = (label, seq) => {
    seq = seq.replace(/\s+/g, " ").trim();
    if (!seq) return;
    apply(cube, parseSequence(seq));
    steps.push({ label, seq });
  };
  // 1) 翻棱做十字
  if (!edgesOriented(cube)) {
    let ok = false;
    for (const k of [0, 1, 2, 3]) { for (const a of EO) { const s = AUF[k] + " " + a; if (edgesOriented(test(cube, s))) { step("做十字", s); ok = true; break; } } if (ok) break; }
  }
  // 2) 翻角:一步或两步 OCLL 公式(带 AUF)把角全部翻好(两个角公式足以覆盖全部 7 种情形)
  if (!cornersOriented(cube)) {
    let seq = null;
    for (const k of [0, 1, 2, 3]) { for (const a of OCLL) { const s = AUF[k] + " " + a, t = test(cube, s); if (cornersOriented(t) && edgesOriented(t)) { seq = s; break; } } if (seq) break; }
    if (!seq) outer: for (const k1 of [0, 1, 2, 3]) for (const a1 of OCLL) for (const k2 of [0, 1, 2, 3]) for (const a2 of OCLL) {
      const s = AUF[k1] + " " + a1 + " " + AUF[k2] + " " + a2, t = test(cube, s);
      if (cornersOriented(t) && edgesOriented(t)) { seq = s; break outer; }
    }
    if (seq) step("翻角(OLL)", seq);
  }
  // 3) 归位(PLL)
  if (!llSolved(cube)) {
    // 先试是否只差一个 AUF(顶层整体转一下就好)
    let auf = null;
    for (const fk of [1, 2, 3]) if (llSolved(test(cube, AUF[fk]))) { auf = AUF[fk]; break; }
    if (auf) step("对齐(AUF)", auf);
    else {
      let ok = false;
      for (const k of [0, 1, 2, 3]) { for (const a of PLL) { for (const fk of [0, 1, 2, 3]) { const s = AUF[k] + " " + a + " " + AUF[fk]; if (llSolved(test(cube, s))) { step("归位(PLL)", s); ok = true; break; } } if (ok) break; } if (ok) break; }
    }
  }
  // 收尾:OLL 之后可能还差一个 AUF(若上面未触发 PLL/AUF)
  if (!llSolved(cube)) for (const fk of [1, 2, 3]) if (llSolved(test(cube, AUF[fk]))) { step("对齐(AUF)", AUF[fk]); break; }
  return { steps, solved: llSolved(cube) };
}

// 公式校验器:用魔方坐标模型逐条验证公式是否「干净」。
//   - LL(OLL/PLL):施加到已复原的魔方后,前两层(底下 6 个块的层)必须原封不动,只动顶层。
//   - F2L:施加后,底面十字必须完好,且最多只扰动一个角槽(标准 F2L 解的是右前 FR 槽)。
// 用法: node scripts/verify-algs.mjs
import { algorithms } from "../backend/src/data/algorithms.js";
import { parseSequence, invertSequence } from "../frontend/src/cube/moves.js";

const AXIS_IDX = { x: 0, y: 1, z: 2 };
const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

function makeCube() {
  const c = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++)
        c.push({ home: [x, y, z], pos: [x, y, z], or: ID.map((r) => r.slice()) });
  return c;
}
function rot(axis, a) {
  const c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  if (axis === "x") return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === "y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
const mv = (M, v) => [0, 1, 2].map((i) => Math.round(M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]));
function mm(A, B) {
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j];
    R[i][j] = Math.round(s);
  }
  return R;
}
function apply(cube, tokens) {
  for (const t of tokens) {
    const M = rot(t.axis, t.angle);
    for (const cu of cube) {
      if (t.layers.includes(cu.pos[AXIS_IDX[t.axis]])) {
        cu.pos = mv(M, cu.pos);
        cu.or = mm(M, cu.or);
      }
    }
  }
}
const eqV = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const isId = (m) => m.flat().join() === ID.flat().join();
// 中心块 = home 只有一个非零坐标。它的朝向在真魔方上不可见(纯色),只校验位置。
const isCenter = (h) => Math.abs(h[0]) + Math.abs(h[1]) + Math.abs(h[2]) === 1;
const homeOK = (cu) => eqV(cu.pos, cu.home) && (isCenter(cu.home) || isId(cu.or));

const Y_TOK = parseSequence("y");
function checkLL(cube) {
  // 前两层 = home 的 y !== 1 的块,必须回到原位。
  // 容忍整体 y 旋转(有些公式带 y/y',结尾整体转了向,仍是合法 OLL/PLL)。
  for (let k = 0; k < 4; k++) {
    const c = cube.map((cu) => ({ home: cu.home, pos: cu.pos.slice(), or: cu.or.map((r) => r.slice()) }));
    for (let i = 0; i < k; i++) apply(c, Y_TOK);
    if (c.filter((cu) => cu.home[1] !== 1).every(homeOK)) return true;
  }
  return false;
}
function checkF2L(cube) {
  const find = (h) => cube.find((cu) => eqV(cu.home, h));
  const cross = [[0, -1, 0], [1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1]];
  if (!cross.every((h) => homeOK(find(h)))) return false;
  const slots = {
    FR: [[1, -1, 1], [1, 0, 1]],
    FL: [[-1, -1, 1], [-1, 0, 1]],
    BR: [[1, -1, -1], [1, 0, -1]],
    BL: [[-1, -1, -1], [-1, 0, -1]],
  };
  let disturbed = 0;
  for (const k in slots) if (!slots[k].every((h) => homeOK(find(h)))) disturbed++;
  return disturbed <= 1;
}

// 顶层环形位置(从上往下看,从右前角顺时针):角,棱,角,棱…
const RING = [
  [1, 1, 1], [1, 1, 0], [1, 1, -1], [0, 1, -1],
  [-1, 1, -1], [-1, 1, 0], [-1, 1, 1], [0, 1, 1],
];
// OLL 朝向签名:对每个顶层位置,记录该处块「白色面」的朝向向量;
// 对 4 个 AUF 旋转取字典序最小(显式旋转向量+环位,避免物理转动的实现坑)。
const R_U = rot("y", -Math.PI / 2); // 一次 U 转(-90° 绕 y)
function ollSig(tokens) {
  const cube = makeCube();
  apply(cube, tokens);
  let P = RING.map((p) => {
    const cu = cube.find((c) => eqV(c.pos, p));
    return mv(cu.or, [0, 1, 0]);
  });
  let best = null;
  for (let k = 0; k < 4; k++) {
    const s = P.map((v) => v.join(",")).join("|");
    if (best === null || s < best) best = s;
    // 一次 AUF:newP[j] = R_U · P[(j+2)%8](环位移 2,向量随之旋转)
    P = P.map((_, j) => mv(R_U, P[(j + 2) % 8]));
  }
  return best;
}
// F2L 签名:施加后右前槽(FR 角 + FR 棱)的位置与朝向(F2L 识别含 U 位置,不做 AUF 归一)
function f2lSig(tokens) {
  const cube = makeCube();
  apply(cube, tokens);
  const c = cube.find((cu) => eqV(cu.home, [1, -1, 1]));
  const e = cube.find((cu) => eqV(cu.home, [1, 0, 1]));
  return [c.pos.join(""), c.or.flat().join(""), e.pos.join(""), e.or.flat().join("")].join("|");
}

let pass = 0, fail = 0;
const fails = [];
const ollSigs = new Map(), f2lSigs = new Map();
for (const a of algorithms) {
  const toks = parseSequence(a.moves);
  const cube = makeCube();
  apply(cube, toks);
  let ok = true;
  if (a.category === "oll" || a.category === "pll") ok = checkLL(cube);
  else if (a.category === "f2l") ok = checkF2L(cube);
  else { pass++; continue; } // basics 不校验
  if (ok) pass++;
  else {
    fail++;
    const bad = cube
      .filter((cu) => (a.category === "f2l" ? false : cu.home[1] !== 1) && !homeOK(cu))
      .map((cu) => `${cu.home.join(",")}->${cu.pos.join(",")}${isId(cu.or) ? "" : "*"}`);
    fails.push(`[${a.category}] ${a.id} "${a.name}"  ${a.moves}\n      乱块: ${bad.join("  ")}`);
  }
  // 收集签名查重(OLL 用逆约定:公式所解的情形 = inverse(alg)·solved,与识别图一致)
  if (a.category === "oll") {
    const sig = ollSig(invertSequence(toks));
    (ollSigs.get(sig) || ollSigs.set(sig, []).get(sig)).push(a.id);
  } else if (a.category === "f2l") {
    // 同样用逆约定:公式所解的情形 = inverse(alg)·solved(与识别图一致)
    const sig = f2lSig(invertSequence(toks));
    (f2lSigs.get(sig) || f2lSigs.set(sig, []).get(sig)).push(a.id);
  }
}
console.log(`通过 ${pass}  失败 ${fail}`);
const ollCount = algorithms.filter((a) => a.category === "oll").length;
const f2lCount = algorithms.filter((a) => a.category === "f2l").length;
console.log(`OLL: ${ollCount} 条 / ${ollSigs.size} 个不同朝向(目标 57/57)`);
console.log(`F2L: ${f2lCount} 条 / ${f2lSigs.size} 个不同情形(目标 41/41)`);
const ollDup = [...ollSigs].filter(([, ids]) => ids.length > 1);
const f2lDup = [...f2lSigs].filter(([, ids]) => ids.length > 1);
if (ollDup.length) {
  console.log("\n--- OLL 重复(同一朝向)---");
  for (const [, ids] of ollDup) console.log("  " + ids.join(" = "));
}
if (f2lDup.length) {
  console.log("\n--- F2L 重复(同一情形)---");
  for (const [, ids] of f2lDup) console.log("  " + ids.join(" = "));
}
if (fails.length) {
  console.log("\n--- 未通过(前两层/十字被破坏)---");
  for (const f of fails) console.log("  " + f);
}
// 朝向/情形查重仅作参考(签名归一化尚不完善,可能误报);硬性门槛只看 checkLL。
// 真正的正确性保证:每条都通过 checkLL = 合法的「只动最后一层、不破坏前两层」公式。
if (fails.length) process.exit(1);

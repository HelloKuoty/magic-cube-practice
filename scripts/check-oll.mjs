// OLL 覆盖校验器:读取 algorithms.js 里的 OLL,逐条校验「只动顶层、不破坏前两层」(checkLL),
// 并把每条映射到 57 种标准 OLL 情形之一,报告 覆盖/缺失/重复。用法: node scripts/check-oll.mjs
import { algorithms } from "../backend/src/data/algorithms.js";
import { parseSequence, invertSequence } from "../frontend/src/cube/moves.js";

const AX = { x: 0, y: 1, z: 2 };
const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function makeCube() {
  const c = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++)
    c.push({ home: [x, y, z], pos: [x, y, z], or: ID.map((r) => r.slice()) });
  return c;
}
function rot(a, t) {
  const c = Math.round(Math.cos(t)), s = Math.round(Math.sin(t));
  if (a === "x") return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (a === "y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
const mv = (M, v) => [0, 1, 2].map((i) => Math.round(M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]));
function mm(A, B) {
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j]; R[i][j] = Math.round(s); }
  return R;
}
function rotAxisAngle(axis, ang) {
  const n = Math.hypot(axis[0], axis[1], axis[2]); const [x, y, z] = axis.map((v) => v / n);
  const c = Math.cos(ang), s = Math.sin(ang), C = 1 - c;
  return [
    [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
    [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
    [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
  ].map((r) => r.map((v) => Math.round(v)));
}
const eqV = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
function apply(cube, toks) {
  for (const t of toks) { const M = rot(t.axis, t.angle); for (const cu of cube) if (t.layers.includes(cu.pos[AX[t.axis]])) { cu.pos = mv(M, cu.pos); cu.or = mm(M, cu.or); } }
}

const TOPC = [[1, 1, 1], [1, 1, -1], [-1, 1, -1], [-1, 1, 1]];
const TOPE = [[1, 1, 0], [0, 1, -1], [-1, 1, 0], [0, 1, 1]];
const RING = [[1, 1, 1], [1, 1, 0], [1, 1, -1], [0, 1, -1], [-1, 1, -1], [-1, 1, 0], [-1, 1, 1], [0, 1, 1]];
const R_U = rot("y", -Math.PI / 2);
const cTwist = TOPC.map((p) => rotAxisAngle(p, (2 * Math.PI) / 3));
const eFlip = TOPE.map((p) => rotAxisAngle(p, Math.PI));
const matPow = (M, n) => { let r = ID.map((x) => x.slice()); for (let i = 0; i < n; i++) r = mm(M, r); return r; };
function buildTarget(c, e) {
  const cube = makeCube();
  TOPC.forEach((p, i) => { cube.find((cu) => eqV(cu.home, p)).or = matPow(cTwist[i], c[i]); });
  TOPE.forEach((p, i) => { cube.find((cu) => eqV(cu.home, p)).or = e[i] ? eFlip[i] : ID.map((x) => x.slice()); });
  return cube;
}
function ollSigCube(cube) {
  let P = RING.map((p) => { const cu = cube.find((c) => eqV(c.pos, p)); return mv(cu.or, [0, 1, 0]); });
  let best = null;
  for (let k = 0; k < 4; k++) {
    const s = P.map((v) => v.join(",")).join("|");
    if (best === null || s < best) best = s;
    P = P.map((_, j) => mv(R_U, P[(j + 2) % 8]));
  }
  return best;
}
const ollSig = (toks) => { const c = makeCube(); apply(c, toks); return ollSigCube(c); };

// 枚举 57 种参考情形:sig -> { c, e, oc, oe }
const REF = new Map();
for (let cc = 0; cc < 81; cc++) {
  const c = [cc % 3, (cc / 3 | 0) % 3, (cc / 9 | 0) % 3, (cc / 27 | 0) % 3];
  if ((c[0] + c[1] + c[2] + c[3]) % 3 !== 0) continue;
  for (let ee = 0; ee < 16; ee++) {
    const e = [ee & 1, (ee >> 1) & 1, (ee >> 2) & 1, (ee >> 3) & 1];
    if ((e[0] + e[1] + e[2] + e[3]) % 2 !== 0) continue;
    if (c.every((v) => v === 0) && e.every((v) => v === 0)) continue;
    const sig = ollSigCube(buildTarget(c, e));
    if (!REF.has(sig)) REF.set(sig, { c, e, oc: c.filter((v) => v === 0).length, oe: e.filter((v) => v === 0).length });
  }
}

// checkLL:容忍整体 y 旋转,中心块朝向忽略
const isCenter = (h) => Math.abs(h[0]) + Math.abs(h[1]) + Math.abs(h[2]) === 1;
const isId = (m) => m.flat().join() === ID.flat().join();
const homeOK = (cu) => eqV(cu.pos, cu.home) && (isCenter(cu.home) || isId(cu.or));
const Y = parseSequence("y");
function checkLL(cube) {
  for (let k = 0; k < 4; k++) {
    const c = cube.map((cu) => ({ home: cu.home, pos: cu.pos.slice(), or: cu.or.map((r) => r.slice()) }));
    for (let i = 0; i < k; i++) apply(c, Y);
    if (c.filter((cu) => cu.home[1] !== 1).every(homeOK)) return true;
  }
  return false;
}

const oll = algorithms.filter((a) => a.category === "oll");
const covered = new Map(); // refSig -> [ids]
const llFail = [];
for (const a of oll) {
  const toks = parseSequence(a.moves);
  const cube = makeCube();
  apply(cube, toks);
  if (!checkLL(cube)) { llFail.push(a.id); continue; }
  // 公式所解的情形 = inverse(alg)·solved(与 app 识别图一致),用它的签名归类到 57 标准情形
  const sig = ollSig(invertSequence(toks));
  (covered.get(sig) || covered.set(sig, []).get(sig)).push(a.id);
}
console.log(`OLL 条数: ${oll.length} | checkLL 失败: ${llFail.length} | 覆盖情形: ${[...covered].filter(([s]) => REF.has(s)).length}/57`);
if (llFail.length) console.log("checkLL 失败(破坏前两层):", llFail.join(", "));
const dup = [...covered].filter(([, ids]) => ids.length > 1);
if (dup.length) { console.log("\n重复(多条解同一情形):"); for (const [, ids] of dup) console.log("  " + ids.join(" = ")); }
const unknown = [...covered].filter(([s]) => !REF.has(s)).flatMap(([, ids]) => ids);
if (unknown.length) console.log("\n签名不在 57 标准情形内(可能写错):", unknown.join(", "));
const missing = [...REF].filter(([s]) => !covered.has(s));
if (missing.length) {
  console.log(`\n缺失 ${missing.length} 种情形(角朝向数/棱朝向数 + 角朝向模式):`);
  for (const [, r] of missing) console.log(`  角${r.oc}棱${r.oe}  c=[${r.c}] e=[${r.e}]`);
}
if (!llFail.length && !dup.length && !unknown.length && !missing.length) console.log("\n✅ 57/57 全部正确且互不重复!");

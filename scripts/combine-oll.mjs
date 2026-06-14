// 合并两个来源的 OLL 公式,为 57 种情形各挑一条「校验通过(只动顶层)」的公式。
// 来源 A = 当前 algorithms.js;来源 B = rubiksplace。用法: node scripts/combine-oll.mjs
import { algorithms } from "../backend/src/data/algorithms.js";
import { parseSequence } from "../frontend/src/cube/moves.js";

const AX = { x: 0, y: 1, z: 2 }, ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mk = () => { const c = []; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) c.push({ home: [x, y, z], pos: [x, y, z], or: ID.map((r) => r.slice()) }); return c; };
function rot(a, t) { const c = Math.round(Math.cos(t)), s = Math.round(Math.sin(t)); if (a === "x") return [[1, 0, 0], [0, c, -s], [0, s, c]]; if (a === "y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }
const mv = (M, v) => [0, 1, 2].map((i) => Math.round(M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]));
function mm(A, B) { const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j]; R[i][j] = Math.round(s); } return R; }
function rotAA(axis, ang) { const n = Math.hypot(...axis), [x, y, z] = axis.map((v) => v / n), c = Math.cos(ang), s = Math.sin(ang), C = 1 - c; return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]].map((r) => r.map((v) => Math.round(v))); }
const eqV = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const apply = (cube, toks) => { for (const t of toks) { const M = rot(t.axis, t.angle); for (const cu of cube) if (t.layers.includes(cu.pos[AX[t.axis]])) { cu.pos = mv(M, cu.pos); cu.or = mm(M, cu.or); } } };

const TOPC = [[1, 1, 1], [1, 1, -1], [-1, 1, -1], [-1, 1, 1]], TOPE = [[1, 1, 0], [0, 1, -1], [-1, 1, 0], [0, 1, 1]];
const RING = [[1, 1, 1], [1, 1, 0], [1, 1, -1], [0, 1, -1], [-1, 1, -1], [-1, 1, 0], [-1, 1, 1], [0, 1, 1]];
const R_U = rot("y", -Math.PI / 2);
const cTw = TOPC.map((p) => rotAA(p, 2 * Math.PI / 3)), eFl = TOPE.map((p) => rotAA(p, Math.PI));
const matPow = (M, n) => { let r = ID.map((x) => x.slice()); for (let i = 0; i < n; i++) r = mm(M, r); return r; };
function buildTarget(c, e) { const cube = mk(); TOPC.forEach((p, i) => cube.find((cu) => eqV(cu.home, p)).or = matPow(cTw[i], c[i])); TOPE.forEach((p, i) => cube.find((cu) => eqV(cu.home, p)).or = e[i] ? eFl[i] : ID.map((x) => x.slice())); return cube; }
function ollSigCube(cube) { let P = RING.map((p) => mv(cube.find((c) => eqV(c.pos, p)).or, [0, 1, 0])); let best = null; for (let k = 0; k < 4; k++) { const s = P.map((v) => v.join(",")).join("|"); if (best === null || s < best) best = s; P = P.map((_, j) => mv(R_U, P[(j + 2) % 8])); } return best; }
const sigOf = (moves) => { const c = mk(); apply(c, parseSequence(moves)); return ollSigCube(c); };

// 57 参考情形:sig -> {c,e,oc,oe}
const REF = new Map();
for (let cc = 0; cc < 81; cc++) { const c = [cc % 3, (cc / 3 | 0) % 3, (cc / 9 | 0) % 3, (cc / 27 | 0) % 3]; if ((c[0] + c[1] + c[2] + c[3]) % 3) continue; for (let ee = 0; ee < 16; ee++) { const e = [ee & 1, ee >> 1 & 1, ee >> 2 & 1, ee >> 3 & 1]; if ((e[0] + e[1] + e[2] + e[3]) % 2) continue; if (c.every((v) => !v) && e.every((v) => !v)) continue; const sig = ollSigCube(buildTarget(c, e)); if (!REF.has(sig)) REF.set(sig, { c, e, oc: c.filter((v) => !v).length, oe: e.filter((v) => !v).length }); } }

// checkLL(容忍整体 y,中心忽略朝向)
const isCenter = (h) => Math.abs(h[0]) + Math.abs(h[1]) + Math.abs(h[2]) === 1;
const isId = (m) => m.flat().join() === ID.flat().join();
const homeOK = (cu) => eqV(cu.pos, cu.home) && (isCenter(cu.home) || isId(cu.or));
const Y = parseSequence("y");
function checkLL(moves) { const cube = mk(); apply(cube, parseSequence(moves)); for (let k = 0; k < 4; k++) { const c = cube.map((cu) => ({ home: cu.home, pos: cu.pos.slice(), or: cu.or.map((r) => r.slice()) })); for (let i = 0; i < k; i++) apply(c, Y); if (c.filter((cu) => cu.home[1] !== 1).every(homeOK)) return true; } return false; }

// 来源 B:rubiksplace(已清理括号、2'→2)
const B = ["R U2 R2 F R F' U2 R' F R F'", "F R U R' U' F' f R U R' U' f'", "f R U R' U' f' U' F R U R' U' F'", "f R U R' U' f' U F R U R' U' F'", "r U2 R' U' R U' r'", "r U2 R' U' R U' r'", "R U2 R' U2 R' F R F'", "R U2 R' U2 R' F R F'", "R U R' U R' F R F' R U2 R'", "R U R' U R' F R F' R U2 R'", "F' L' U' L U F y F R U R' U' F'", "F R U R' U' F' U F R U R' U' F'", "r U' r' U' r U r' y' R' U R", "R' F R U R' F' R y' R U' R'", "r U r' R U R' U' r U' r'", "r U r' R U R' U' r U' r'", "R U R' U R' F R F' U2 R' F R F'", "F R U R' U y' R' U2 R' F R F'", "r' R U R U R' U' r R2 F R F'", "M U R U R' U' M2 U R U' r'", "R U2 R' U' R U R' U' R U' R'", "R U2 R2 U' R2 U' R2 U2 R", "R2 D R' U2 R D' R' U2 R'", "l' U' L U R U' r' F", "R' F R B' R' F' R B", "R' U' R U' R' U2 R", "L U L' U L U2 L'", "M' U M U2 M' U M", "R2 U R' B' R U' R2 U R B R'", "R2 U R' B' R U' R2 U R B R'", "R' U' F U R U' R' F' R", "R U B' U' R' U R B R'", "R U R' U' R' F R F'", "R U R2 U' R' F R U R U' F'", "R U2 R2 F R F' R U2 R'", "L' U' L U' L' U L U L F' L' F", "F R U' R' U' R U R' F'", "R U R' U R U' R' U' R' F R F'", "L F' L' U' L U F U' L'", "R' F R U R' U' F' U R", "R U' R' U2 R U y R U' R' U' F'", "R' U2 R U R' U R y F R U R' U' F'", "f' L' U' L U f", "f R U R' U' f'", "F R U R' U' F'", "R' U' R' F R F' U R", "R' U' R' F R F' R' F R F' U R", "F R U R' U' R U R' U' F'", "R' F R' F' R2 U2 y R' F R F'", "R' F R2 B' R2 F' R2 B R'", "f R U R' U' R U R' U' f'", "R U R' U R d' R U' R' F'", "r U R' U R U' R' U R U2 r'", "r U R' U R U' R' U R U2 r'", "R U2 R2 U' R U' R' U2 F R F'", "F R U R' U' R F' r U R' U' r'", "R U R' U' M' U R U' r'"];

const A = algorithms.filter((x) => x.category === "oll").map((x) => x.moves);
// 每来源:sig -> moves(仅收 checkLL 通过的)
function indexSource(list) { const m = new Map(); for (const mv of list) { if (!checkLL(mv)) continue; const s = sigOf(mv); if (REF.has(s) && !m.has(s)) m.set(s, mv); } return m; }
const mapA = indexSource(A), mapB = indexSource(B);

const final = [];
let missing = 0;
for (const [sig, r] of REF) {
  const moves = mapA.get(sig) || mapB.get(sig);
  if (!moves) { missing++; console.log(`缺: 角${r.oc}棱${r.oe} c=[${r.c}] e=[${r.e}]`); continue; }
  final.push({ sig, c: r.c, e: r.e, oc: r.oc, oe: r.oe, moves, src: mapA.get(sig) ? "A" : "B" });
}
console.log(`A 覆盖 ${mapA.size} | B 覆盖 ${mapB.size} | 合并 ${final.length}/57 | 缺 ${missing}`);
if (!missing) { (await import("fs")).writeFileSync(new URL("./oll-final.json", import.meta.url), JSON.stringify(final, null, 2)); console.log("✅ 57/57 已写出 scripts/oll-final.json"); }

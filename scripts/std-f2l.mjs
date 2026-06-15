// 写入 41 个标准 F2L(来源 solvethecube.com,按 6 大分组),逐条用坐标模型校验:
//   - checkF2L:施加后底十字完好、最多只扰动右前(FR)一个槽;
//   - 41 条所解情形(inverse(alg)·solved)互不相同。
import { readFileSync, writeFileSync } from "fs";
import { parseSequence, invertSequence } from "../frontend/src/cube/moves.js";

// [组号, 公式](含括号,写入时去掉)
const RAW = [
  [1, "R U R'"], [1, "F' U' F"], [1, "U R U' R'"], [1, "U' F' U F"],
  [2, "(U' R U') (R' U R) U R'"], [2, "(U F' U) (F U' F') U' F"], [2, "(U' R U) (R' U R) U R'"], [2, "(U F' U') (F U' F') U' F"],
  [2, "d (R' U2 R) d' (R U R')"], [2, "U' (R U2 R') d (R' U' R)"], [2, "(R U' R' U) d (R' U' R)"], [2, "(F' U F U') d' (F U F')"],
  [2, "(U F' U2 F) (U F' U2 F)"], [2, "(U' R U2 R') (U' R U2 R')"], [2, "(U F' U' F) (U F' U2 F)"], [2, "(U' R U R') (U' R U2 R')"],
  [3, "(R U2 R' U') (R U R')"], [3, "(F' U2 F U) (F' U' F)"], [3, "(U R U2 R') (U R U' R')"], [3, "(U' F' U2 F) (U' F' U F)"],
  [3, "U2 (R U R' U) (R U' R')"], [3, "U2 (F' U' F U') (F' U F)"], [3, "(R U R' U') U' (R U R' U') (R U R')"], [3, "y' (R' U' R U) U (R' U' R U) (R' U' R)"],
  [4, "(U F' U F) (U F' U2 F)"], [4, "(U' R U' R') (U' R U2 R')"], [4, "(U F' U' F) (d' F U F')"], [4, "(U' R U R') (d R' U' R)"],
  [4, "(R U' R') (d R' U R)"], [4, "(R U R' U') (R U R' U') (R U R')"],
  [5, "(U R U' R') (U' F' U F)"], [5, "(U' F' U F) (U R U' R')"], [5, "(F' U F) (U' F' U F)"], [5, "(R U' R') (U R U' R')"],
  [5, "(R U R') (U' R U R')"], [5, "(F' U' F) (U F' U' F)"],
  [6, "(R U' R' U) R U2 R' (U R U' R')"], [6, "(R U' R' U') (R U R' U') (R U2 R')"], [6, "(R U R' U') (R U' R') U d (R' U' R)"],
  [6, "(R U' R') d (R' U' R U') (R' U' R)"], [6, "(R U' R' d R' U2 R) (U R' U2 R)"],
];
const GROUP = { 1: "基础插入", 2: "角棱都在顶层", 3: "角朝上·棱在顶", 4: "角在顶·棱在中层", 5: "角在槽·棱在顶", 6: "角棱都在槽内" };
const GDESC = {
  1: "棱角已配好,直接插入右前槽。", 2: "角块和棱块都在顶层,先配对再插入。",
  3: "角块朝上、棱块在顶层。", 4: "角块在顶层、棱块卡在中层(错位)。",
  5: "角块已在槽里(朝向不对)、棱块在顶层。", 6: "角棱都在槽里但需要取出重插。",
};

// ---- 坐标模型(校验用)----
const AX = { x: 0, y: 1, z: 2 };
const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const makeCube = () => { const c = []; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) c.push({ home: [x, y, z], pos: [x, y, z], or: ID.map((r) => r.slice()) }); return c; };
const rot = (a, t) => { const c = Math.round(Math.cos(t)), s = Math.round(Math.sin(t)); if (a === "x") return [[1, 0, 0], [0, c, -s], [0, s, c]]; if (a === "y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const mv = (M, v) => [0, 1, 2].map((i) => Math.round(M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]));
const mm = (A, B) => { const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j]; R[i][j] = Math.round(s); } return R; };
const eqV = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const apply = (cube, toks) => { for (const t of toks) { const M = rot(t.axis, t.angle); for (const cu of cube) if (t.layers.includes(cu.pos[AX[t.axis]])) { cu.pos = mv(M, cu.pos); cu.or = mm(M, cu.or); } } };
const isCenter = (h) => Math.abs(h[0]) + Math.abs(h[1]) + Math.abs(h[2]) === 1;
const isId = (m) => m.flat().join() === ID.flat().join();
const homeOK = (cu) => eqV(cu.pos, cu.home) && (isCenter(cu.home) || isId(cu.or));
function checkF2L(cube) {
  const find = (h) => cube.find((cu) => eqV(cu.home, h));
  const cross = [[0, -1, 0], [1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1]];
  if (!cross.every((h) => homeOK(find(h)))) return false;
  const slots = { FR: [[1, -1, 1], [1, 0, 1]], FL: [[-1, -1, 1], [-1, 0, 1]], BR: [[1, -1, -1], [1, 0, -1]], BL: [[-1, -1, -1], [-1, 0, -1]] };
  let disturbed = 0;
  for (const k in slots) if (!slots[k].every((h) => homeOK(find(h)))) disturbed++;
  return disturbed <= 1;
}
function f2lCaseSig(moves) {
  const cube = makeCube();
  apply(cube, invertSequence(parseSequence(moves))); // 所解情形
  const c = cube.find((cu) => eqV(cu.home, [1, -1, 1]));
  const e = cube.find((cu) => eqV(cu.home, [1, 0, 1]));
  return [c.pos.join(""), c.or.flat().join(""), e.pos.join(""), e.or.flat().join("")].join("|");
}

const passesF2L = (moves) => { const c = makeCube(); apply(c, parseSequence(moves)); return checkF2L(c); };
// 有些 F2L 用 d/d' 宽转换手,做完整方下两层被转了 90°(真还原里正常)。
// 在末尾补一个 d 系还原帧,让公式做完后整方完全复原(已插入的对子随底层一起转回)。
function fixFrame(moves) {
  for (const comp of ["", " d", " d2", " d'"]) {
    const m = (moves + comp).trim();
    if (passesF2L(m)) return m;
  }
  return null;
}

// 校验 + 组装
const seen = new Map();
let fail = 0;
const lines = [];
RAW.forEach(([g, raw], idx) => {
  const n = idx + 1;
  const cleaned = raw.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const moves = fixFrame(cleaned);
  if (!moves) { fail++; console.log(`✗ F2L ${n} [组${g}] checkF2L 失败(补帧后仍不行): ${cleaned}`); return; }
  const sig = f2lCaseSig(moves);
  (seen.get(sig) || seen.set(sig, []).get(sig)).push(n);
  lines.push(`  { id: "f2l-${n}", category: "f2l", name: "F2L ${n} · ${GROUP[g]}", alg: "F2L ${n}", moves: "${moves}", desc: "${GDESC[g]}标准插入,只动右前槽。" },`);
});
const dups = [...seen].filter(([, ids]) => ids.length > 1);
console.log(`F2L 条数 ${RAW.length} | checkF2L 失败 ${fail} | 所解情形不同 ${seen.size}/${RAW.length}`);
if (dups.length) { console.log("重复:"); dups.forEach(([, ids]) => console.log("  " + ids.join(" = "))); }

if (fail || dups.length) { console.log("\n⚠ 有问题,未写入。"); process.exit(1); }

const block = "  // ===================== F2L(全 41 个标准插入,6 大分组,scripts/std-f2l.mjs 写入 + verify-algs.mjs 校验)=====================\n" + lines.join("\n") + "\n];\n";
const path = new URL("../backend/src/data/algorithms.js", import.meta.url);
let src = readFileSync(path, "utf8");
const start = src.indexOf("  // ===================== F2L");
if (start < 0) { console.error("找不到 F2L 区块标记"); process.exit(1); }
src = src.slice(0, start) + block;
src = src.replace(/{ key: "f2l",[^}]*}/, '{ key: "f2l",    name: "F2L 前两层", desc: "棱角配对后插入完成前两层,共 41 个(完整,按 6 大分组)。" }');
writeFileSync(path, src);
console.log("✅ 已写入 41 个标准 F2L");

// 用标准单式公式写入 57 个 OLL(来源:solvethecube.com,逐条经 check-oll.mjs 校验)。
// 名称里的「角已朝上 oc/棱已朝上 oe」由该公式所解的情形(inverse(alg)·solved)直接算出。
import { readFileSync, writeFileSync } from "fs";
import { parseSequence, invertSequence } from "../frontend/src/cube/moves.js";

// 标准 57 OLL(含分组用的括号,写入时去掉)
const STD = {
  1: "(R U2 R') (R' F R F') U2 (R' F R F')",
  2: "F (R U R' U') F' f (R U R' U') f'",
  3: "f (R U R' U') f' U' F (R U R' U') F'",
  4: "f (R U R' U') f' U F (R U R' U') F'",
  5: "r' U2 (R U R' U) r",
  6: "r U2 R' U' R U' r'",
  7: "(r U R' U) R U2 r'",
  8: "r' U' R U' R' U2 r",
  9: "(R U R' U') R' F R2 U R' U' F'",
  10: "(R U R' U) (R' F R F') R U2 R'",
  11: "F' (L' U' L U) F y F (R U R' U') F'",
  12: "F (R U R' U') F' U F (R U R' U') F'",
  13: "F (U R U' R2) F' (R U R U' R')",
  14: "(R' F R) U (R' F' R) y' (R U' R')",
  15: "l' U' l (L' U' L U) l' U l",
  16: "r U r' (R U R' U') r U' r'",
  17: "(R U R' U) (R' F R F') U2 (R' F R F')",
  18: "F (R U R' U) y' R' U2 (R' F R F')",
  19: "M U (R U R' U') M' (R' F R F')",
  20: "M U (R U R' U') M2 (U R U' r')",
  21: "(R U R') U (R U' R') U (R U2 R')",
  22: "R U2 (R2' U' R2 U') (R2' U2 R)",
  23: "R2 D (R' U2 R) D' (R' U2 R')",
  24: "(r U R' U') (r' F R F')",
  25: "F' (r U R' U') (r' F R)",
  26: "(R U2 R') U' (R U' R')",
  27: "(R' U2 R) U (R' U R)",
  28: "M' U' M U2' M' U' M",
  29: "(R U R' U') R U' R' F' U' (F R U R')",
  30: "(L F' L' F) L' U2 L d (R U R')",
  31: "R' U' F U R U' R' F' R",
  32: "F U R U' F' r U R' U' r'",
  33: "(R U R' U') (R' F R F')",
  34: "(R U R' U') x D' R' U R U' D x'",
  35: "(R U2 R') (R' F R F') (R U2 R')",
  36: "(L' U' L U') (L' U L U) (L F' L' F)",
  37: "F R' F' R U R U' R'",
  38: "(R U R' U) (R U' R' U') (R' F R F')",
  39: "L F' (L' U' L U) F U' L'",
  40: "R' F (R U R' U') F' U R",
  41: "(R U R' U) R U2 R' F (R U R' U') F'",
  42: "(R' F R F') (R' F R F') (R U R' U') (R U R')",
  43: "f' (L' U' L U) f",
  44: "f (R U R' U') f'",
  45: "F (R U R' U') F'",
  46: "R' U' (R' F R F') U R",
  47: "F' (L' U' L U) (L' U' L U) F",
  48: "F (R U R' U') (R U R' U') F'",
  49: "(R' F R' F') R2 U2 y (R' F R F')",
  50: "R' F R2 B' R2' F' R2 B R'",
  51: "f (R U R' U') (R U R' U') f'",
  52: "(R U R' U) R d' R U' R' F'",
  53: "(l' U' L U') (L' U L U') L' U2 l",
  54: "(r U R' U) (R U' R' U) R U2' r'",
  55: "R U2 R2 (U' R U' R') U2 (F R F')",
  56: "F (R U R' U') R F' (r U R' U') r'",
  57: "(R U R' U') M' (U R U' r')",
};

// ---- 小型坐标模型,用于算每条公式所解情形的「角/棱已朝上」数 ----
const AX = { x: 0, y: 1, z: 2 };
const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const makeCube = () => {
  const c = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++)
    c.push({ home: [x, y, z], pos: [x, y, z], or: ID.map((r) => r.slice()) });
  return c;
};
const rot = (a, t) => {
  const c = Math.round(Math.cos(t)), s = Math.round(Math.sin(t));
  if (a === "x") return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (a === "y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
};
const mv = (M, v) => [0, 1, 2].map((i) => Math.round(M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]));
const mm = (A, B) => { const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j]; R[i][j] = Math.round(s); } return R; };
const eqV = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const apply = (cube, toks) => { for (const t of toks) { const M = rot(t.axis, t.angle); for (const cu of cube) if (t.layers.includes(cu.pos[AX[t.axis]])) { cu.pos = mv(M, cu.pos); cu.or = mm(M, cu.or); } } };
const TOPC = [[1, 1, 1], [1, 1, -1], [-1, 1, -1], [-1, 1, 1]];
const TOPE = [[1, 1, 0], [0, 1, -1], [-1, 1, 0], [0, 1, 1]];
const orientedUp = (cube, pos) => { const cu = cube.find((c) => eqV(c.pos, pos)); return eqV(mv(cu.or, [0, 1, 0]), [0, 1, 0]); };

function counts(moves) {
  // 该公式所解的情形 = inverse(alg) 作用于已还原态
  const cube = makeCube();
  apply(cube, invertSequence(parseSequence(moves)));
  const oc = TOPC.filter((p) => orientedUp(cube, p)).length;
  const oe = TOPE.filter((p) => orientedUp(cube, p)).length;
  return { oc, oe };
}

const shape = (oe) => (oe === 4 ? "十字" : oe === 2 ? "线/L" : "点");
const lines = [];
for (let n = 1; n <= 57; n++) {
  const moves = STD[n].replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const { oc, oe } = counts(moves);
  const name = `OLL ${n} · ${shape(oe)}`;
  const desc = `顶层翻向:角已朝上 ${oc}/4、棱已朝上 ${oe}/4(标准单式)。`;
  lines.push(`  { id: "oll-${n}", category: "oll", name: "${name}", alg: "OLL ${n}", moves: "${moves}", desc: "${desc}" },`);
}
const block = "  // ===================== OLL(全 57 个标准单式,来源 solvethecube.com,scripts/check-oll.mjs 校验)=====================\n" + lines.join("\n") + "\n\n";

const path = new URL("../backend/src/data/algorithms.js", import.meta.url);
let src = readFileSync(path, "utf8");
const start = src.indexOf("  // ===================== OLL");
const end = src.indexOf("  // ===================== PLL");
if (start < 0 || end < 0) { console.error("找不到 OLL/PLL 区块标记"); process.exit(1); }
src = src.slice(0, start) + block + src.slice(end);
writeFileSync(path, src);
console.log("已写入 57 个标准 OLL");

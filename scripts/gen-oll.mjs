// 生成全部 57 个 OLL 公式:枚举 57 个朝向情形 -> 用「中间相遇」搜索为每个找一条解法。
// 每条公式都是搜索出来的真解(按构造正确),再用同一套引擎复核。
// 用法: node --max-old-space-size=4096 scripts/gen-oll.mjs
const AX = { x: 0, y: 1, z: 2 };
const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

function mk() {
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
// Rodrigues 旋转矩阵(绕任意轴),四舍五入到整数(本场景下都是 0/±1)
function rotAxisAngle(axis, ang) {
  const n = Math.hypot(axis[0], axis[1], axis[2]);
  const [x, y, z] = axis.map((v) => v / n);
  const c = Math.cos(ang), s = Math.sin(ang), C = 1 - c;
  const m = [
    [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
    [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
    [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
  ];
  return m.map((r) => r.map((v) => Math.round(v)));
}
const eqV = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// ---- 顶层位置 ----
const TOPC = [[1, 1, 1], [1, 1, -1], [-1, 1, -1], [-1, 1, 1]];
const TOPE = [[1, 1, 0], [0, 1, -1], [-1, 1, 0], [0, 1, 1]];
const RING = [[1, 1, 1], [1, 1, 0], [1, 1, -1], [0, 1, -1], [-1, 1, -1], [-1, 1, 0], [-1, 1, 1], [0, 1, 1]];
const R_U = rot("y", -Math.PI / 2);

// 每个顶角/顶棱的「拧一格」矩阵
const cTwist = TOPC.map((p) => rotAxisAngle(p, (2 * Math.PI) / 3)); // 120°
const eFlip = TOPE.map((p) => rotAxisAngle(p, Math.PI)); // 180°
function matPow(M, n) { let r = ID.map((x) => x.slice()); for (let i = 0; i < n; i++) r = mm(M, r); return r; }

// 由 (角朝向 c[4], 棱朝向 e[4]) 构造目标状态(顶层在原位、只改朝向)
function buildTarget(c, e) {
  const cube = mk();
  TOPC.forEach((p, i) => { cube.find((cu) => eqV(cu.home, p)).or = matPow(cTwist[i], c[i]); });
  TOPE.forEach((p, i) => { cube.find((cu) => eqV(cu.home, p)).or = e[i] ? eFlip[i] : ID.map((x) => x.slice()); });
  return cube;
}
function ollSig(cube) {
  let P = RING.map((p) => { const cu = cube.find((c) => eqV(c.pos, p)); return mv(cu.or, [0, 1, 0]); });
  let best = null;
  for (let k = 0; k < 4; k++) {
    const s = P.map((v) => v.join(",")).join("|");
    if (best === null || s < best) best = s;
    P = P.map((_, j) => mv(R_U, P[(j + 2) % 8]));
  }
  return best;
}

// ---- 枚举 57 个情形 ----
function enumerate() {
  const map = new Map(); // sig -> {c,e}
  for (let cc = 0; cc < 81; cc++) {
    const c = [cc % 3, (cc / 3 | 0) % 3, (cc / 9 | 0) % 3, (cc / 27 | 0) % 3];
    if ((c[0] + c[1] + c[2] + c[3]) % 3 !== 0) continue;
    for (let ee = 0; ee < 16; ee++) {
      const e = [ee & 1, (ee >> 1) & 1, (ee >> 2) & 1, (ee >> 3) & 1];
      if ((e[0] + e[1] + e[2] + e[3]) % 2 !== 0) continue;
      if (c.every((v) => v === 0) && e.every((v) => v === 0)) continue; // 跳过已还原(OLL skip)
      const sig = ollSig(buildTarget(c, e));
      if (!map.has(sig)) map.set(sig, { c, e });
    }
  }
  return map;
}

const cases = enumerate();
console.log("枚举到的不同 OLL 情形数:", cases.size, "(应为 57)");
if (cases.size !== 57) process.exit(1);

// ---------- 中间相遇求解 ----------
import { writeFileSync } from "fs";
import { parseSequence, invertSequence } from "../frontend/src/cube/moves.js";
import { algorithms } from "../backend/src/data/algorithms.js";

// 施加 token 序列(支持 y/d 等任意招式),用于读已知标准公式的情形签名与复核
function applyToks(cube, toks) {
  for (const t of toks) { const M = rot(t.axis, t.angle); for (const cu of cube) if (t.layers.includes(cu.pos[AX[t.axis]])) { cu.pos = mv(M, cu.pos); cu.or = mm(M, cu.or); } }
}

// 24 个朝向矩阵 -> 索引(压缩 key)
function buildRot24() {
  const gens = [rot("x", Math.PI / 2), rot("y", Math.PI / 2), rot("z", Math.PI / 2)];
  const seen = new Map(), list = [];
  const k = (m) => m.flat().join(",");
  const q = [ID];
  seen.set(k(ID), 0); list.push(ID);
  while (q.length) {
    const m = q.shift();
    for (const g of gens) { const n = mm(g, m); if (!seen.has(k(n))) { seen.set(k(n), list.length); list.push(n); q.push(n); } }
  }
  return { idx: (m) => seen.get(k(m)) };
}
const ROT = buildRot24();
const posIdx = (p) => (p[0] + 1) + 3 * (p[1] + 1) + 9 * (p[2] + 1);
function key(cube) {
  let s = "";
  for (const cu of cube) {
    const m = Math.abs(cu.home[0]) + Math.abs(cu.home[1]) + Math.abs(cu.home[2]);
    if (m >= 2) s += String.fromCharCode(posIdx(cu.pos) * 24 + ROT.idx(cu.or)); // 1 字符/块,更紧凑
  }
  return s;
}
const RANK = { R: 0, L: 1, U: 0, D: 1, F: 0, B: 1 };
const MOVES = "U U' U2 D D' D2 L L' L2 R R' R2 F F' F2 B B' B2".split(" ").map((n) => {
  const t = parseSequence(n)[0];
  return { n, face: n[0], axis: t.axis, layers: t.layers, M: rot(t.axis, t.angle), rank: RANK[n[0]] };
});
// 扩展招式集(含双层 r l u d f b 与中层 M E S),用于难解情形(公式更短)
const EXT = "U U' U2 D D' D2 L L' L2 R R' R2 F F' F2 B B' B2 r r' r2 l l' l2 u u' u2 d d' d2 f f' f2 b b' b2 M M' M2 E E' E2 S S' S2"
  .split(" ").map((n) => {
    const t = parseSequence(n)[0];
    return { n, face: n[0], axis: t.axis, layers: t.layers, M: rot(t.axis, t.angle) };
  });
const ALL = [...new Map([...MOVES, ...EXT].map((m) => [m.n, m])).values()];
const MV = Object.fromEntries(ALL.map((m) => [m.n, m]));
const invName = (n) => (n.endsWith("2") ? n : n.endsWith("'") ? n[0] + n.slice(1, -1) : n + "'");
// 给「面集」「扩展集」每个对象都挂上逆招(ALL 去重后可能只保留了其中一份)
for (const m of [...MOVES, ...EXT]) m.inv = MV[invName(m.n)];
// 面集剪枝(同面/同轴去重);最小剪枝(只禁连续同字母面)
const allowFace = (m, lf, la) => !(m.face === lf || (m.axis === la && RANK[m.face] < RANK[lf]));
const allowMin = (m, lf, la) => m.face !== lf;
// 精选难解集:面 + 中层 M + 双层 r(OLL 最常用的非面招式),分支适中、覆盖够
const EXT2 = ALL.filter((m) => "RLUDFBMr".includes(m.face));
function applyMove(cube, m) {
  for (const cu of cube) if (m.layers.includes(cu.pos[AX[m.axis]])) { cu.pos = mv(m.M, cu.pos); cu.or = mm(m.M, cu.or); }
}
function clone(cube) { return cube.map((cu) => ({ home: cu.home, pos: cu.pos.slice(), or: cu.or.map((r) => r.slice()) })); }
function fromMoves(start, names) { const c = clone(start); for (const n of names) applyMove(c, MV[n]); return c; }

// 前向 BFS(面集;只存 key->招式串;frontier 只存路径;热循环「施加->读->撤销」零 clone)
function forward(df) {
  const map = new Map(); map.set(key(mk()), "");
  let frontier = [{ path: "", lf: null, la: null }];
  for (let d = 0; d < df; d++) {
    const next = [], last = d === df - 1;
    for (const node of frontier) {
      const cube = node.path ? fromMoves(mk(), node.path.split(" ")) : mk();
      for (const m of EXT2) {
        if (!allowMin(m, node.lf, node.la)) continue;
        applyMove(cube, m);
        const k = key(cube);
        applyMove(cube, m.inv);
        if (map.has(k)) continue;
        const np = node.path ? node.path + " " + m.n : m.n;
        map.set(k, np);
        if (!last) next.push({ path: np, lf: m.face, la: m.axis });
      }
    }
    frontier = next;
  }
  return map;
}

console.log("前向 BFS 构表中…");
const FMAP = forward(5);
console.log("前向状态数:", FMAP.size);

const invStr = (s) => (s ? invertSequence(parseSequence(s)).map((t) => t.canonical).join(" ") : "");

// 后向 BFS:从目标出发(可换招式集/剪枝),碰到前向表即拼解
function solveWith(target, db, moves, allow) {
  if (FMAP.has(key(target))) return invStr(FMAP.get(key(target))).split(" ").filter(Boolean);
  let frontier = [{ path: "", lf: null, la: null }];
  const seen = new Set([key(target)]);
  for (let d = 0; d < db; d++) {
    const next = [];
    for (const node of frontier) {
      const cube = node.path ? fromMoves(target, node.path.split(" ")) : clone(target);
      for (const m of moves) {
        if (!allow(m, node.lf, node.la)) continue;
        applyMove(cube, m);
        const k = key(cube);
        applyMove(cube, m.inv);
        if (seen.has(k)) continue;
        const np = node.path ? node.path + " " + m.n : m.n;
        if (FMAP.has(k)) return (np + " " + invStr(FMAP.get(k))).trim().split(/\s+/);
        seen.add(k); next.push({ path: np, lf: m.face, la: m.axis });
      }
    }
    frontier = next;
  }
  return null;
}

// IDDFS 后向(DFS,O(深度) 内存,绝不 OOM):扩展集深搜直到碰上前向表
function solveIDDFS(target, moves, allow, maxd) {
  if (FMAP.has(key(target))) return invStr(FMAP.get(key(target))).split(" ").filter(Boolean);
  const cube = clone(target);
  let found = null;
  function dfs(depth, lf, la, path) {
    if (found) return;
    if (depth === 0) {
      const k = key(cube);
      if (FMAP.has(k)) found = (path + " " + invStr(FMAP.get(k))).trim();
      return;
    }
    for (const m of moves) {
      if (found) return;
      if (!allow(m, lf, la)) continue;
      applyMove(cube, m);
      dfs(depth - 1, m.face, m.axis, path ? path + " " + m.n : m.n);
      applyMove(cube, m.inv);
    }
  }
  for (let d = 1; d <= maxd && !found; d++) dfs(d, null, null, "");
  return found ? found.split(/\s+/) : null;
}

// 按 (棱朝向数, 角朝向数) 给个可读名
function shapeName(c, e) {
  const oe = e.filter((v) => v === 0).length, oc = c.filter((v) => v === 0).length;
  const edge = oe === 4 ? "十字" : oe === 2 ? "线/L" : "点";
  return `${edge}·角${oc}棱${oe}`;
}

// 校验:公式是否把最后一层「全部翻向朝上」(OLL 只需翻向,允许打乱位置)
const TOPE2 = [[1, 1, 0], [0, 1, -1], [-1, 1, 0], [0, 1, 1]];
const isOriented = (cube) => [...TOPC, ...TOPE2].every((p) => { const cu = cube.find((c) => eqV(c.pos, p)); return mv(cu.or, [0, 1, 0]).join() === "0,1,0"; });

// 来源 B:rubiksplace(已清理)
const SRC_B = ["R U2 R2 F R F' U2 R' F R F'", "F R U R' U' F' f R U R' U' f'", "f R U R' U' f' U' F R U R' U' F'", "f R U R' U' f' U F R U R' U' F'", "r U2 R' U' R U' r'", "r U2 R' U' R U' r'", "R U2 R' U2 R' F R F'", "R U2 R' U2 R' F R F'", "R U R' U R' F R F' R U2 R'", "R U R' U R' F R F' R U2 R'", "F' L' U' L U F y F R U R' U' F'", "F R U R' U' F' U F R U R' U' F'", "r U' r' U' r U r' y' R' U R", "R' F R U R' F' R y' R U' R'", "r U r' R U R' U' r U' r'", "r U r' R U R' U' r U' r'", "R U R' U R' F R F' U2 R' F R F'", "F R U R' U y' R' U2 R' F R F'", "r' R U R U R' U' r R2 F R F'", "M U R U R' U' M2 U R U' r'", "R U2 R' U' R U R' U' R U' R'", "R U2 R2 U' R2 U' R2 U2 R", "R2 D R' U2 R D' R' U2 R'", "l' U' L U R U' r' F", "R' F R B' R' F' R B", "R' U' R U' R' U2 R", "L U L' U L U2 L'", "M' U M U2 M' U M", "R2 U R' B' R U' R2 U R B R'", "R2 U R' B' R U' R2 U R B R'", "R' U' F U R U' R' F' R", "R U B' U' R' U R B R'", "R U R' U' R' F R F'", "R U R2 U' R' F R U R U' F'", "R U2 R2 F R F' R U2 R'", "L' U' L U' L' U L U L F' L' F", "F R U' R' U' R U R' F'", "R U R' U R U' R' U' R' F R F'", "L F' L' U' L U F U' L'", "R' F R U R' U' F' U R", "R U' R' U2 R U y R U' R' U' F'", "R' U2 R U R' U R y F R U R' U' F'", "f' L' U' L U f", "f R U R' U' f'", "F R U R' U' F'", "R' U' R' F R F' U R", "R' U' R' F R F' R' F R F' U R", "F R U R' U' R U R' U' F'", "R' F R' F' R2 U2 y R' F R F'", "R' F R2 B' R2 F' R2 B R'", "f R U R' U' R U R' U' f'", "R U R' U R d' R U' R' F'", "r U R' U R U' R' U R U2 r'", "r U R' U R U' R' U R U2 r'", "R U2 R2 U' R U' R' U2 F R F'", "F R U R' U' R F' r U R' U' r'", "R U R' U' M' U R U' r'"];

// 候选标准公式池(A=algorithms.js + B=rubiksplace);用「施加到情形后是否翻好」来判定是否适用
import { solveLastLayer } from "../frontend/src/cube/llsolver.js";
const mvT2 = (M, v) => [0, 1, 2].map((j) => Math.round(M[0][j] * v[0] + M[1][j] * v[1] + M[2][j] * v[2]));
const SC = { U: "U", D: "D", F: "F", B: "B", R: "R", L: "L", inner: "X" };
function stickerColor(cu, d) { const ld = mvT2(cu.or, d), h = cu.home; if (ld[0] === 1) return h[0] === 1 ? SC.R : SC.inner; if (ld[0] === -1) return h[0] === -1 ? SC.L : SC.inner; if (ld[1] === 1) return h[1] === 1 ? SC.U : SC.inner; if (ld[1] === -1) return h[1] === -1 ? SC.D : SC.inner; if (ld[2] === 1) return h[2] === 1 ? SC.F : SC.inner; return h[2] === -1 ? SC.B : SC.inner; }
function readStickers(cube) { const a = (p) => cube.find((c) => eqV(c.pos, p)); const U = []; for (let z = -1; z <= 1; z++) { const r = []; for (let x = -1; x <= 1; x++) r.push(stickerColor(a([x, 1, z]), [0, 1, 0])); U.push(r); } return { U, back: [-1, 0, 1].map((x) => stickerColor(a([x, 1, -1]), [0, 0, -1])), front: [-1, 0, 1].map((x) => stickerColor(a([x, 1, 1]), [0, 0, 1])), left: [-1, 0, 1].map((z) => stickerColor(a([-1, 1, z]), [-1, 0, 0])), right: [-1, 0, 1].map((z) => stickerColor(a([1, 1, z]), [1, 0, 0])) }; }

const stdPool = [...algorithms.filter((x) => x.category === "oll").map((x) => x.moves), ...SRC_B];
const tryOrient = (c, e, moves) => { const chk = buildTarget(c, e); applyToks(chk, parseSequence(moves)); return isOriented(chk); };

const results = [];
let i = 0;
for (const [sig, { c, e }] of cases) {
  let movesStr = null, src;
  for (const s of stdPool) if (tryOrient(c, e, s)) { movesStr = s; src = "std"; break; } // 标准公式优先
  if (!movesStr) { const a = solveWith(buildTarget(c, e), 5, EXT2, allowMin); if (a) { movesStr = a.join(" "); src = "gen"; } }
  if (!movesStr) { // 兜底:用已校验的 2-look 求解器,只取「翻向」部分(做十字 + 翻角),不要 PLL
    const res = solveLastLayer(readStickers(buildTarget(c, e)), SC);
    if (!res.error) {
      const ori = res.steps.filter((st) => st.label.includes("十字") || st.label.includes("翻角"));
      movesStr = ori.map((st) => st.seq).join(" ");
      src = "2look";
    }
  }
  if (!movesStr) { console.log("⚠ 未解出:", sig.slice(0, 30)); continue; }
  const solved = tryOrient(c, e, movesStr);
  results.push({ i: ++i, sig, c, e, name: shapeName(c, e), moves: movesStr, len: movesStr.split(/\s+/).filter(Boolean).length, solved, src });
}
const bad = results.filter((r) => !r.solved);
const bySrc = results.reduce((m, r) => { m[r.src] = (m[r.src] || 0) + 1; return m; }, {});
console.log(`求解完成:${results.length}/57,复核失败 ${bad.length},来源 ${JSON.stringify(bySrc)}`);
console.log("平均长度:", (results.reduce((s, r) => s + r.len, 0) / results.length).toFixed(1));
writeFileSync(new URL("./oll-out.json", import.meta.url), JSON.stringify(results, null, 2));
console.log("已写出 scripts/oll-out.json");

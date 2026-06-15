// 底面十字求解器。底面 = D(y=-1)的 4 条棱。
// 做法:把单棱的 24 个(位置,朝向)状态编号,预计算 18 种转动的整数转移表,
// 再 BFS 出「4 条十字棱联合状态 -> 最短步数」的完整模式库(PDB),求解即沿 PDB 梯度下降。
// 一次性建库约 1-2s(惰性、缓存),之后每次求解都是瞬时、且最优。也用作整方求解的第一步。
import { parseSequence } from "./moves.js";
import { makeCube, apply, eqV, AX, rot, mv, mm, ID } from "./model.js";

const CROSS = [[0, -1, 1], [1, -1, 0], [0, -1, -1], [-1, -1, 0]]; // DF DR DB DL 的 home
const FACES = ["U", "D", "L", "R", "F", "B"];
const MOVES = [];
for (const f of FACES) for (const s of ["", "'", "2"]) MOVES.push(f + s);
const TOK = Object.fromEntries(MOVES.map((m) => [m, parseSequence(m)[0]]));
const sig = (s) => s.pos.join(",") + "|" + s.or.flat().join("");
const stepEdge = (s, tok) => {
  if (!tok.layers.includes(s.pos[AX[tok.axis]])) return s;
  const M = rot(tok.axis, tok.angle);
  return { pos: mv(M, s.pos), or: mm(M, s.or) };
};

// 为某条棱(home h)建轨道:可达 (pos,or) 状态 -> id,id 0 = 该棱已还原态
function buildOrbit(h) {
  const start = { pos: h.slice(), or: ID.map((r) => r.slice()) };
  const id = new Map([[sig(start), 0]]);
  const states = [start];
  const queue = [start];
  while (queue.length) {
    const s = queue.shift();
    for (const m of MOVES) {
      const ns = stepEdge(s, TOK[m]);
      const k = sig(ns);
      if (!id.has(k)) { id.set(k, states.length); states.push(ns); queue.push(ns); }
    }
  }
  const T = {};
  for (const m of MOVES) T[m] = states.map((s) => id.get(sig(stepEdge(s, TOK[m]))));
  return { id, T };
}

let ENGINE = null;
function build() {
  if (ENGINE) return ENGINE;
  // 每条十字棱各建轨道与转移表(各自 id 0 = 自己的还原态)
  const orbits = CROSS.map(buildOrbit);
  const T = MOVES.reduce((acc, m) => { acc[m] = orbits.map((o) => o.T[m]); return acc; }, {}); // T[m][pieceIdx][stateId]
  const solvedIds = [0, 0, 0, 0];
  // PDB:4 棱联合状态 -> 最短步数,从 solved BFS(转动可逆)
  const PDB = new Map([[solvedIds.join(","), 0]]);
  let frontier = [solvedIds];
  let d = 0;
  while (frontier.length) {
    d++;
    const next = [];
    for (const st of frontier) {
      for (const m of MOVES) {
        const tm = T[m];
        const ns = [tm[0][st[0]], tm[1][st[1]], tm[2][st[2]], tm[3][st[3]]];
        const k = ns.join(",");
        if (!PDB.has(k)) { PDB.set(k, d); next.push(ns); }
      }
    }
    frontier = next;
  }
  ENGINE = { orbits, T, PDB };
  return ENGINE;
}

function crossIdsOf(scrambleStr) {
  const { orbits } = build();
  const cube = makeCube();
  apply(cube, parseSequence(scrambleStr));
  return CROSS.map((h, i) => { const cu = cube.find((c) => eqV(c.home, h)); return orbits[i].id.get(sig({ pos: cu.pos, or: cu.or })); });
}

// 入口:给定打乱串,返回 { moves, count } —— 还原底十字的最短解
export function solveCross(scrambleStr) {
  const { T, PDB } = build();
  let cur = crossIdsOf(scrambleStr);
  let d = PDB.get(cur.join(","));
  if (d === undefined) return { moves: "", count: 0, error: "未找到十字解" };
  const path = [];
  let guard = 0;
  while (d > 0 && guard++ < 40) {
    for (const m of MOVES) {
      const tm = T[m];
      const ns = [tm[0][cur[0]], tm[1][cur[1]], tm[2][cur[2]], tm[3][cur[3]]];
      const nd = PDB.get(ns.join(","));
      if (nd === d - 1) { path.push(m); cur = ns; d = nd; break; }
    }
  }
  return { moves: path.join(" "), count: path.length };
}

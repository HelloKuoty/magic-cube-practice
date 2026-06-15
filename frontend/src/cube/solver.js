// 整方还原器(CFOP 分阶段):十字(PDB)→ F2L 四槽(IDA*)→ 最后一层(2-look)。
// 给出可分步播放的全程解法。十字复用 cross.js,最后一层复用 llsolver.js。
import { solveCross } from "./cross.js";
import { solveLastLayer } from "./llsolver.js";
import { makeCube, apply, eqV, AX, rot, mv, mm, ID, stickerColor } from "./model.js";
import { parseSequence } from "./moves.js";

const CROSS = [[0, -1, 1], [1, -1, 0], [0, -1, -1], [-1, -1, 0]];
const SLOTS = [
  [[1, -1, 1], [1, 0, 1]],    // FR
  [[-1, -1, 1], [-1, 0, 1]],  // FL
  [[1, -1, -1], [1, 0, -1]],  // BR
  [[-1, -1, -1], [-1, 0, -1]],// BL
];
const FACES = ["U", "D", "L", "R", "F", "B"];
const MOVES = [];
for (const f of FACES) for (const s of ["", "'", "2"]) MOVES.push(f + s);
const TOK = Object.fromEntries(MOVES.map((m) => [m, parseSequence(m)[0]]));
const sig = (s) => s.pos.join(",") + "|" + s.or.flat().join("");
const isId = (m) => m.flat().join() === ID.flat().join();

// 极简二叉最小堆(按 key 排序),给 A* 用
class MinHeap {
  constructor() { this.a = []; }
  size() { return this.a.length; }
  push(k, v) { const a = this.a; a.push({ k, v }); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].k <= a[i].k) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = 2 * i + 2; let s = i; if (l < a.length && a[l].k < a[s].k) s = l; if (r < a.length && a[r].k < a[s].k) s = r; if (s === i) break; [a[s], a[i]] = [a[i], a[s]]; i = s; } } return top.v; }
}
const isCenter = (h) => Math.abs(h[0]) + Math.abs(h[1]) + Math.abs(h[2]) === 1;
const stepPiece = (s, tok) => {
  if (!tok.layers.includes(s.pos[AX[tok.axis]])) return s;
  const M = rot(tok.axis, tok.angle);
  return { pos: mv(M, s.pos), or: mm(M, s.or) };
};

// 单块到 home 的最短步数表(admissible 启发式),按 home 记忆
const distCache = new Map();
function distTable(home) {
  const key = home.join(",");
  if (distCache.has(key)) return distCache.get(key);
  const start = { pos: home.slice(), or: ID.map((r) => r.slice()) };
  const dist = new Map([[sig(start), 0]]);
  let fr = [start];
  let d = 0;
  while (fr.length) {
    d++;
    const nx = [];
    for (const s of fr) for (const m of MOVES) {
      const ns = stepPiece(s, TOK[m]);
      const k = sig(ns);
      if (!dist.has(k)) { dist.set(k, d); nx.push(ns); }
    }
    fr = nx;
  }
  distCache.set(key, dist);
  return dist;
}

// 一对(角+棱)联合还原的最短步数表(忽略其它块),抓住角棱的相互作用,启发式比各自独立强很多
const pairCache = new Map();
function pairTable(cHome, eHome) {
  const key = cHome.join(",") + "/" + eHome.join(",");
  if (pairCache.has(key)) return pairCache.get(key);
  const cs = { pos: cHome.slice(), or: ID.map((r) => r.slice()) };
  const es = { pos: eHome.slice(), or: ID.map((r) => r.slice()) };
  const k = (c, e) => sig(c) + "#" + sig(e);
  const dist = new Map([[k(cs, es), 0]]);
  let fr = [[cs, es]];
  let d = 0;
  while (fr.length) {
    d++;
    const nx = [];
    for (const [c, e] of fr) for (const m of MOVES) {
      const nc = stepPiece(c, TOK[m]), ne = stepPiece(e, TOK[m]);
      const kk = k(nc, ne);
      if (!dist.has(kk)) { dist.set(kk, d); nx.push([nc, ne]); }
    }
    fr = nx;
  }
  pairCache.set(key, dist);
  return dist;
}

// IDA*:在保持 keepHomes 这些块不动的前提下,把 pair(角 + 棱)还原到位。返回招式数组。
function solvePhase(cube, keepHomes, pair) {
  const keepTables = keepHomes.map(distTable);
  const pt = pairTable(pair[0], pair[1]);
  const homes = [...keepHomes, pair[0], pair[1]];
  const kn = keepHomes.length;
  const startP = homes.map((h) => { const p = cube.find((c) => eqV(c.home, h)); return { pos: p.pos.slice(), or: p.or.map((r) => r.slice()) }; });
  // 引导式启发(非严格可采纳):对子距离 + 已还原块被打乱的总距离。
  // 用「和」而非「最大」:插入对子时临时打乱十字/前槽不会把启发顶死,搜索能朝
  // 「既插好对子、又把其它块都放回去」前进,聚焦、内存有界。h=0 ⟺ 该阶段全好。
  const hOf = (P) => {
    let pd = pt.get(sig(P[kn]) + "#" + sig(P[kn + 1]));
    if (pd === undefined) return 999;
    let s = pd;
    for (let i = 0; i < kn; i++) { const d = keepTables[i].get(sig(P[i])); if (d === undefined) return 999; s += d; }
    return s;
  };
  if (hOf(startP) === 0) return [];
  const keyOf = (P) => { let s = ""; for (const p of P) s += p.pos.join("") + "|" + p.or.flat().join(""); return s; };
  const stepAll = (P, tok) => { const M = rot(tok.axis, tok.angle); return P.map((p) => tok.layers.includes(p.pos[AX[tok.axis]]) ? { pos: mv(M, p.pos), or: mm(M, p.or) } : p); };
  // 加权 A*:f = g + W·h。W 越大越贪心、占用越小、解可能略长。
  // 先用接近最优的 W,撞到内存上限就调大 W 重试,保证有界且必出解(最后一槽 keyhole 用得上)。
  const CAP = 400000;
  function astar(W) {
    const heap = new MinHeap();
    const sh = hOf(startP);
    heap.push(W * sh, { P: startP, g: 0, path: [], lastFace: null, h: sh });
    const best = new Map([[keyOf(startP), 0]]);
    while (heap.size()) {
      if (best.size > CAP) return null;
      const node = heap.pop();
      if (node.h === 0) return node.path;
      if (best.get(keyOf(node.P)) < node.g) continue;
      for (const m of MOVES) {
        const tok = TOK[m];
        if (node.lastFace && tok.face === node.lastFace) continue;
        const np = stepAll(node.P, tok);
        const ng = node.g + 1;
        const nk = keyOf(np);
        const prev = best.get(nk);
        if (prev !== undefined && prev <= ng) continue;
        best.set(nk, ng);
        const nh = hOf(np);
        heap.push(ng + W * nh, { P: np, g: ng, path: [...node.path, m], lastFace: tok.face, h: nh });
      }
    }
    return null;
  }
  for (const W of [1, 1.6, 2.6, 4]) {
    const sol = astar(W);
    if (sol) return sol;
  }
  return null;
}

// 1-look OLL:顶层 8 个环块的「白面」朝向是否都朝上
const TOPRING = [[1, 1, 1], [1, 1, 0], [1, 1, -1], [0, 1, -1], [-1, 1, -1], [-1, 1, 0], [-1, 1, 1], [0, 1, 1]];
const upOriented = (cube) => TOPRING.every((p) => { const cu = cube.find((c) => eqV(c.pos, p)); return eqV(mv(cu.or, [0, 1, 0]), [0, 1, 0]); });
const AUF = ["", "U", "U2", "U'"];
// 前两层是否原样在位(home y!==1 的块都归位);有些 OLL 带 y/y' 会把整方转向,需补一个整方旋转
const ftlHome = (cube) => cube.every((cu) => cu.home[1] === 1 || (eqV(cu.pos, cu.home) && (isCenter(cu.home) || isId(cu.or))));
// 从 ollAlgs(57 个 OLL 招式串)里挑一个(配 AUF + 必要时整方旋转)把顶面一次翻好且不破坏前两层
function orientOLL(cube, ollAlgs) {
  if (upOriented(cube) && ftlHome(cube)) return "";
  for (const a of AUF) for (const alg of ollAlgs) {
    const base = (a + " " + alg).trim();
    for (const yc of ["", "y", "y2", "y'"]) {
      const seq = (base + " " + yc).replace(/\s+/g, " ").trim();
      const test = cube.map((c) => ({ home: c.home, pos: c.pos.slice(), or: c.or.map((r) => r.slice()) }));
      apply(test, parseSequence(seq));
      if (upOriented(test) && ftlHome(test)) return seq;
    }
  }
  return null;
}

// 从 cube 读出最后一层贴纸(供 llsolver 用),布局与 recognition() 一致
function readLL(cube, C) {
  const at = (p) => cube.find((c) => eqV(c.pos, p));
  const U = [-1, 0, 1].map((z) => [-1, 0, 1].map((x) => stickerColor(at([x, 1, z]), [0, 1, 0], C)));
  const front = [-1, 0, 1].map((x) => stickerColor(at([x, 1, 1]), [0, 0, 1], C));
  const right = [-1, 0, 1].map((z) => stickerColor(at([1, 1, z]), [1, 0, 0], C));
  const back = [-1, 0, 1].map((x) => stickerColor(at([x, 1, -1]), [0, 0, -1], C));
  const left = [-1, 0, 1].map((z) => stickerColor(at([-1, 1, z]), [-1, 0, 0], C));
  return { U, front, right, back, left };
}

// 入口:给定打乱串 + 配色(+ 可选 57 OLL 招式串数组用于 1-look 翻面)。
// 返回 { steps:[{label,seq}], moves, count, solved } 或 { error }
export function solveCube(scrambleStr, colors, ollAlgs = []) {
  const cube = makeCube();
  apply(cube, parseSequence(scrambleStr));
  const steps = [];
  const pushStep = (label, seq) => {
    seq = (seq || "").replace(/\s+/g, " ").trim();
    if (!seq) return;
    apply(cube, parseSequence(seq));
    steps.push({ label, seq });
  };

  // 1) 十字
  const cr = solveCross(scrambleStr);
  if (cr.error) return { error: "十字: " + cr.error };
  pushStep("十字", cr.moves);

  // 2) F2L 四槽(逐槽 IDA*,保持已还原部分)
  const homesSoFar = [...CROSS];
  for (let k = 0; k < 4; k++) {
    const [c, e] = SLOTS[k];
    const sol = solvePhase(cube, homesSoFar, [c, e]);
    if (sol === null) return { error: `F2L 第 ${k + 1} 槽求解失败` };
    pushStep(`F2L ${k + 1}`, sol.join(" "));
    homesSoFar.push(c, e);
  }

  // 3) 翻面:有 57 OLL 招式则 1-look 一次翻好(否则交给 llsolver 走 2-look)
  if (ollAlgs && ollAlgs.length) {
    const oseq = orientOLL(cube, ollAlgs);
    if (oseq === null) return { error: "OLL(翻面)匹配失败" };
    pushStep("OLL(翻面)", oseq);
  }
  // 4) 最后一层归位:顶面已翻好时 llsolver 只剩 PLL(否则 2-look 全做)
  const ll = solveLastLayer(readLL(cube, colors), colors);
  if (ll.error) return { error: "最后一层: " + ll.error };
  for (const s of ll.steps) pushStep(s.label, s.seq);

  const solved = cube.every((cu) => eqV(cu.pos, cu.home) && (isCenter(cu.home) || isId(cu.or)));
  const moves = steps.map((s) => s.seq).join(" ").replace(/\s+/g, " ").trim();
  return { steps, moves, count: moves.split(/\s+/).filter(Boolean).length, solved };
}

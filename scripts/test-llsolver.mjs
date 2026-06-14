// 测试最后一层求解器:随机生成 F2L 已还原的最后一层状态 -> 读贴纸 -> 求解 -> 验证能复原
import { solveLastLayer, stateFromStickers } from "../frontend/src/cube/llsolver.js";
import { makeCube, apply, mvT, eqV } from "../frontend/src/cube/model.js";
import { parseSequence } from "../frontend/src/cube/moves.js";

const C = { U: "U", D: "D", F: "F", B: "B", R: "R", L: "L", inner: "X" }; // 用单字母当颜色,便于区分

function stickerColor(cu, d) {
  const ld = mvT(cu.or, d), h = cu.home;
  if (ld[0] === 1) return h[0] === 1 ? C.R : C.inner;
  if (ld[0] === -1) return h[0] === -1 ? C.L : C.inner;
  if (ld[1] === 1) return h[1] === 1 ? C.U : C.inner;
  if (ld[1] === -1) return h[1] === -1 ? C.D : C.inner;
  if (ld[2] === 1) return h[2] === 1 ? C.F : C.inner;
  return h[2] === -1 ? C.B : C.inner;
}
function readStickers(cube) {
  const a = (p) => cube.find((c) => eqV(c.pos, p));
  const U = [];
  for (let z = -1; z <= 1; z++) { const r = []; for (let x = -1; x <= 1; x++) r.push(stickerColor(a([x, 1, z]), [0, 1, 0])); U.push(r); }
  return {
    U,
    back: [-1, 0, 1].map((x) => stickerColor(a([x, 1, -1]), [0, 0, -1])),
    front: [-1, 0, 1].map((x) => stickerColor(a([x, 1, 1]), [0, 0, 1])),
    left: [-1, 0, 1].map((z) => stickerColor(a([-1, 1, z]), [-1, 0, 0])),
    right: [-1, 0, 1].map((z) => stickerColor(a([1, 1, z]), [1, 0, 0])),
  };
}
const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].flat().join();
const LL = [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1], [0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]];
const llSolved = (c) => LL.every((p) => { const cu = c.find((x) => eqV(x.pos, p)); return eqV(cu.pos, cu.home) && cu.or.flat().join() === ID; });

const SCR = [
  "F R U R' U' F'", "f R U R' U' f'", "R U R' U R U2 R'", "R U2 R' U' R U' R'",
  "R2 D R' U2 R D' R' U2 R'", "F' r U R' U' r' F R", "R U2 R2 U' R2 U' R2 U2 R",
  "M2 U M U2 M' U M2", "R U R' U' R' F R2 U' R' U' R U R' F'",
  "F R U' R' U' R U R' F' R U R' U' R' F R F'", "R U R' F' R U R' U' R' F R2 U' R' U'",
  "U", "U2", "U'",
];
let pass = 0, fail = 0; const fails = [];
for (let t = 0; t < 400; t++) {
  const cube = makeCube();
  const n = 3 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) apply(cube, parseSequence(SCR[Math.floor(Math.random() * SCR.length)]));
  const input = readStickers(cube);
  const res = solveLastLayer(input, C);
  let ok = false;
  if (!res.error) {
    const c2 = stateFromStickers(input, C);
    for (const s of res.steps) apply(c2, parseSequence(s.seq));
    ok = res.solved && llSolved(c2);
  }
  if (ok) pass++;
  else { fail++; if (fails.length < 6) fails.push({ err: res.error, solved: res.solved, steps: res.steps?.map((s) => s.seq) }); }
}
console.log(`通过 ${pass} / 失败 ${fail}`);
for (const f of fails) console.log("  失败:", JSON.stringify(f));

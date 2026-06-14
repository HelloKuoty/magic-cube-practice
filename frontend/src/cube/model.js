// 无渲染的魔方状态模型:把公式逆操作施加到「已复原」上,得到该公式的「起始情形」,
// 再读出最后一层(顶层 U + 四周顶排)的真实贴纸颜色,用于公式库的特征图。
import { parseSequence, invertSequence } from "./moves.js";

export const AX = { x: 0, y: 1, z: 2 };

export function makeCube() {
  const c = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++)
        c.push({ home: [x, y, z], pos: [x, y, z], or: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] });
  return c;
}
export function rot(axis, a) {
  const c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  if (axis === "x") return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === "y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
export const mv = (M, v) => [0, 1, 2].map((i) => Math.round(M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]));
// 转置乘(世界方向 -> 该块的本地方向):localDir = orᵀ · worldDir
export const mvT = (M, v) => [0, 1, 2].map((j) => Math.round(M[0][j] * v[0] + M[1][j] * v[1] + M[2][j] * v[2]));
export function mm(A, B) {
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j];
    R[i][j] = Math.round(s);
  }
  return R;
}
export function apply(cube, tokens) {
  for (const t of tokens) {
    const M = rot(t.axis, t.angle);
    for (const cu of cube) {
      if (t.layers.includes(cu.pos[AX[t.axis]])) {
        cu.pos = mv(M, cu.pos);
        cu.or = mm(M, cu.or);
      }
    }
  }
}
export const eqV = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
export const cloneCube = (cube) => cube.map((c) => ({ home: c.home, pos: c.pos.slice(), or: c.or.map((r) => r.slice()) }));
export const at = (cube, p) => cube.find((c) => eqV(c.pos, p));
export const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// 某块在 worldDir 方向露出的贴纸颜色
function stickerColor(cu, worldDir, colors) {
  const ld = mvT(cu.or, worldDir); // 该块的本地方向
  const h = cu.home;
  if (ld[0] === 1) return h[0] === 1 ? colors.R : colors.inner;
  if (ld[0] === -1) return h[0] === -1 ? colors.L : colors.inner;
  if (ld[1] === 1) return h[1] === 1 ? colors.U : colors.inner;
  if (ld[1] === -1) return h[1] === -1 ? colors.D : colors.inner;
  if (ld[2] === 1) return h[2] === 1 ? colors.F : colors.inner;
  if (ld[2] === -1) return h[2] === -1 ? colors.B : colors.inner;
  return colors.inner;
}

// 计算公式「起始情形」最后一层的识别贴纸。
// 返回:U 为 3×3(行=后→前, 列=左→右),四周 back/front/left/right 各 3 片顶排贴纸。
export function recognition(movesStr, colors) {
  const cube = makeCube();
  apply(cube, invertSequence(parseSequence(movesStr))); // 逆操作得到起始情形
  const at = (p) => cube.find((c) => eqV(c.pos, p));
  const U = [];
  for (let z = -1; z <= 1; z++) {
    const row = [];
    for (let x = -1; x <= 1; x++) row.push(stickerColor(at([x, 1, z]), [0, 1, 0], colors));
    U.push(row); // z=-1 是后排(图最上),z=1 是前排(图最下)
  }
  const back = [-1, 0, 1].map((x) => stickerColor(at([x, 1, -1]), [0, 0, -1], colors));
  const front = [-1, 0, 1].map((x) => stickerColor(at([x, 1, 1]), [0, 0, 1], colors));
  const left = [-1, 0, 1].map((z) => stickerColor(at([-1, 1, z]), [-1, 0, 0], colors));
  const right = [-1, 0, 1].map((z) => stickerColor(at([1, 1, z]), [1, 0, 0], colors));
  return { U, back, front, left, right };
}

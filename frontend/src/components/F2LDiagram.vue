<script setup>
import { computed } from "vue";
import { f2lRecognition } from "../cube/model.js";
import { settings } from "../cube/settings.js";

// F2L 起始情形的立体识别图:U(顶)+ F(前)+ R(右)三个可见面。
const props = defineProps({
  moves: { type: String, required: true },
  size: { type: Number, default: 64 },
});

const SC = 12; // 每格屏幕边长
const COS = 0.866, SIN = 0.5;
const proj = (x, y, z) => [(x - z) * COS * SC, (x + z) * SIN * SC - y * SC];

// 把三个面的 9 个格子各拆成一个四边形多边形
const polys = computed(() => {
  const rec = f2lRecognition(props.moves, settings.colors);
  const out = [];
  const quad = (p0, p1, p2, p3, fill) =>
    out.push({ pts: [p0, p1, p2, p3].map((p) => p.join(",")).join(" "), fill });

  // U 顶面 (y=3):格 (r=z 行后→前, c=x 列左→右)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    quad(proj(c, 3, r), proj(c + 1, 3, r), proj(c + 1, 3, r + 1), proj(c, 3, r + 1), rec.U[r][c]);
  // F 前面 (z=3):行 r 上→下(y=3-r..2-r),列 c 左→右(x=c..c+1)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    quad(proj(c, 3 - r, 3), proj(c + 1, 3 - r, 3), proj(c + 1, 2 - r, 3), proj(c, 2 - r, 3), rec.F[r][c]);
  // R 右面 (x=3):行 r 上→下,列 c 左→右(c=0 为前 z=3 一侧 → z=3-c..2-c)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    quad(proj(3, 3 - r, 3 - c), proj(3, 3 - r, 2 - c), proj(3, 2 - r, 2 - c), proj(3, 2 - r, 3 - c), rec.R[r][c]);
  return out;
});

// 计算视图边界
const VB = computed(() => {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (let X = 0; X <= 3; X++) for (let Y = 0; Y <= 3; Y++) for (let Z = 0; Z <= 3; Z++) {
    const [px, py] = proj(X, Y, Z);
    minx = Math.min(minx, px); maxx = Math.max(maxx, px);
    miny = Math.min(miny, py); maxy = Math.max(maxy, py);
  }
  const pad = 2;
  return `${minx - pad} ${miny - pad} ${maxx - minx + 2 * pad} ${maxy - miny + 2 * pad}`;
});
</script>

<template>
  <svg class="f2l" :width="size" :height="size" :viewBox="VB" :title="moves">
    <polygon
      v-for="(p, i) in polys"
      :key="i"
      :points="p.pts"
      :fill="p.fill"
      stroke="#0c0e14"
      stroke-width="0.7"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.f2l { display: block; flex-shrink: 0; overflow: visible; }
</style>

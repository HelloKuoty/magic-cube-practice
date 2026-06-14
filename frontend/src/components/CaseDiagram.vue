<script setup>
import { computed } from "vue";
import { recognition } from "../cube/model.js";
import { settings } from "../cube/settings.js";

const props = defineProps({
  moves: { type: String, required: true },
  size: { type: Number, default: 56 },
});

const S = 14, T = 6, G = 1; // 格子边长 / 翻边厚度 / 缝隙
const VB = 2 * T + 3 * S;

const cells = computed(() => {
  const rec = recognition(props.moves, settings.colors);
  const out = [];
  const push = (x, y, w, h, fill, rx) => out.push({ x: x + G / 2, y: y + G / 2, w: w - G, h: h - G, fill, rx });
  rec.U.forEach((row, r) => row.forEach((fill, c) => push(T + c * S, T + r * S, S, S, fill, 2)));
  rec.back.forEach((fill, i) => push(T + i * S, 0, S, T, fill, 1));
  rec.front.forEach((fill, i) => push(T + i * S, T + 3 * S, S, T, fill, 1));
  rec.left.forEach((fill, i) => push(0, T + i * S, T, S, fill, 1));
  rec.right.forEach((fill, i) => push(T + 3 * S, T + i * S, T, S, fill, 1));
  return out;
});
</script>

<template>
  <svg
    class="diagram"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${VB} ${VB}`"
    :title="moves"
  >
    <rect :width="VB" :height="VB" rx="3" fill="#0c0e14" />
    <rect
      v-for="(c, i) in cells"
      :key="i"
      :x="c.x"
      :y="c.y"
      :width="c.w"
      :height="c.h"
      :rx="c.rx"
      :fill="c.fill"
      stroke="#0c0e14"
      stroke-width="0.6"
    />
  </svg>
</template>

<style scoped>
.diagram {
  display: block;
  border-radius: 4px;
  flex-shrink: 0;
}
</style>

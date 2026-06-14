<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { RubiksCube } from "../cube/RubiksCube.js";
import { cubeStore } from "../cube/store.js";
import { settings } from "../cube/settings.js";

const canvasRef = ref(null);
const wrapRef = ref(null);
let cube = null;
let ro = null;

onMounted(() => {
  cube = new RubiksCube(canvasRef.value);
  cubeStore.setInstance(cube);
  ro = new ResizeObserver(() => cube && cube.resize());
  ro.observe(wrapRef.value);
});

// 配色变化时实时刷新 3D 魔方
watch(
  () => ({ ...settings.colors }),
  (c) => cube && cube.setColors(c),
  { deep: true }
);

onBeforeUnmount(() => {
  if (ro) ro.disconnect();
  if (cube) cube.dispose();
});
</script>

<template>
  <div class="viewer" ref="wrapRef">
    <canvas ref="canvasRef"></canvas>
    <div class="hint muted">拖动可旋转视角 · 滚轮缩放</div>
  </div>
</template>

<style scoped>
.viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  background: radial-gradient(ellipse at 50% 35%, #1c2030 0%, #0f1117 70%);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.hint {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  pointer-events: none;
}
</style>

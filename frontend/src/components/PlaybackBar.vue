<script setup>
import { cubeStore } from "../cube/store.js";

const speeds = [
  { label: "慢", ms: 700 },
  { label: "中", ms: 450 },
  { label: "快", ms: 250 },
];

function toggleInverse(e) {
  cubeStore.setInverseSetup(e.target.checked);
}
</script>

<template>
  <div class="playback">
    <div class="row">
      <button @click="cubeStore.reset()" :disabled="cubeStore.busy" title="复位">⟲ 复位</button>
      <button @click="cubeStore.prev()" :disabled="cubeStore.busy || cubeStore.cursor === 0">◀ 上一步</button>
      <button
        v-if="!cubeStore.playing"
        class="primary"
        @click="cubeStore.play()"
        :disabled="cubeStore.busy || !cubeStore.parsed.length"
      >
        ▶ 播放
      </button>
      <button v-else class="primary" @click="cubeStore.pause()">⏸ 暂停</button>
      <button
        @click="cubeStore.next()"
        :disabled="cubeStore.busy || cubeStore.cursor >= cubeStore.parsed.length"
      >
        下一步 ▶
      </button>
    </div>

    <div class="row">
      <span class="muted small">速度</span>
      <button
        v-for="s in speeds"
        :key="s.ms"
        class="chip"
        :class="{ active: cubeStore.speed === s.ms }"
        @click="cubeStore.setSpeed(s.ms)"
      >
        {{ s.label }}
      </button>

      <label class="inv">
        <input type="checkbox" :checked="cubeStore.inverseSetup" @change="toggleInverse" />
        先做逆操作铺场(正向播放会复原)
      </label>
    </div>
  </div>
</template>

<style scoped>
.playback {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.small {
  font-size: 13px;
}
.chip {
  padding: 5px 12px;
}
.chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.inv {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
  margin-left: auto;
  cursor: pointer;
}
.inv input {
  accent-color: var(--accent);
}
</style>

<script setup>
import { cubeStore } from "../cube/store.js";

// highlightIndex: 当前「即将/正在」执行的步;done 之前的为已完成
</script>

<template>
  <div class="movebar" v-if="cubeStore.parsed.length">
    <span
      v-for="(m, i) in cubeStore.canonicalMoves"
      :key="i"
      class="move"
      :class="{
        done: i < cubeStore.cursor,
        current: i === cubeStore.cursor,
      }"
      >{{ m }}</span
    >
  </div>
  <div class="movebar empty muted" v-else>暂无公式,去「公式库」选一个吧</div>
</template>

<style scoped>
.movebar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  min-height: 44px;
  align-items: center;
}
.movebar.empty {
  justify-content: center;
  font-size: 13px;
}
.move {
  font-family: "Consolas", "Courier New", monospace;
  font-size: 15px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 7px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  color: var(--text);
}
.move.done {
  opacity: 0.4;
}
.move.current {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.25);
}
</style>

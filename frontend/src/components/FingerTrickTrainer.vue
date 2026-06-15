<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { cubeStore } from "../cube/store.js";
import { TRIGGERS, TRIGGER_GROUPS } from "../cube/triggers.js";
import MoveBar from "./MoveBar.vue";

// 手法练习:常用触发的 3D 演示 + 循环跟练(跟着节奏在真魔方上反复练)+ 手指说明。
const rootRef = ref(null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const group = ref("基础触发");
const current = ref(null);
const looping = ref(false);
const loopCount = ref(0);

const list = computed(() => TRIGGERS.filter((t) => t.group === group.value));
const visible = () => rootRef.value && rootRef.value.offsetParent !== null;

function load(t) {
  current.value = t;
  cubeStore.loadSequence(t.moves, { inverseSetup: true }); // 正向播放即把该手法做一遍并复原
}
async function demo(t) {
  stopLoop();
  load(t);
  await sleep(40);
  cubeStore.play();
}
async function loop(t) {
  if (looping.value && current.value?.id === t.id) { stopLoop(); return; }
  stopLoop();
  load(t);
  looping.value = true;
  loopCount.value = 0;
  await sleep(40);
  while (looping.value) {
    if (!visible()) { looping.value = false; break; } // 切走标签就停
    await cubeStore.play();
    if (!looping.value) break;
    loopCount.value++;
    await sleep(450);
  }
}
function stopLoop() { looping.value = false; cubeStore.pause(); }

const speeds = [{ label: "慢", ms: 700 }, { label: "中", ms: 450 }, { label: "快", ms: 250 }];
onBeforeUnmount(stopLoop);
</script>

<template>
  <div class="ft" ref="rootRef">
    <p class="muted intro">
      <b>手法(触发)</b>是把公式拧快的积木。挑一个看 3D 演示,或点<b>循环跟练</b>跟着节奏在你真魔方上反复练。手法因握法而异,这里给常见的一种。
    </p>

    <div class="groups">
      <button v-for="g in TRIGGER_GROUPS" :key="g" class="chip" :class="{ active: group === g }" @click="group = g">{{ g }}</button>
    </div>

    <!-- 当前手法的播放控制 -->
    <div v-if="current" class="now">
      <div class="now-head">
        <span class="nm">{{ current.name }}</span>
        <span class="mv">{{ current.moves }}</span>
      </div>
      <div class="ctrl">
        <button v-if="!looping" class="primary" @click="loop(current)">🔁 循环跟练</button>
        <button v-else class="primary stop" @click="stopLoop">⏹ 停止（已循环 {{ loopCount }} 次）</button>
        <span class="muted small">速度</span>
        <button v-for="s in speeds" :key="s.ms" class="chip sp" :class="{ active: cubeStore.speed === s.ms }" @click="cubeStore.setSpeed(s.ms)">{{ s.label }}</button>
      </div>
      <MoveBar />
    </div>

    <!-- 手法列表 -->
    <div class="list">
      <div v-for="t in list" :key="t.id" class="item" :class="{ on: current?.id === t.id }">
        <div class="info">
          <div class="line1">
            <span class="aname">{{ t.name }}</span>
            <span class="moves">{{ t.moves }}</span>
          </div>
          <div class="desc muted">{{ t.fingers }}</div>
        </div>
        <div class="actions">
          <button @click="demo(t)">▶ 演示</button>
          <button :class="{ on: looping && current?.id === t.id }" @click="loop(t)">🔁 循环</button>
        </div>
      </div>
    </div>

    <p class="muted small tip">练法建议:先慢速看清手指怎么动 → 跟着循环匀速做 → 逐渐加速,追求<b>不卡顿</b>而非一味快。</p>
  </div>
</template>

<style scoped>
.ft { display: flex; flex-direction: column; gap: 12px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0; }
.small { font-size: 12px; }
.groups { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 5px 12px; font-size: 13px; }
.chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.now { background: var(--panel); border: 1px solid var(--accent); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.now-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.now-head .nm { font-size: 16px; font-weight: 700; }
.now-head .mv { font-family: "Consolas", monospace; font-size: 15px; color: var(--accent); }
.ctrl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sp { padding: 4px 10px; }
.stop { background: var(--bad); border-color: var(--bad); }
.list { display: flex; flex-direction: column; gap: 8px; }
.item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; }
.item.on { border-color: var(--accent); }
.info { flex: 1; min-width: 0; }
.line1 { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
.aname { font-weight: 600; font-size: 15px; }
.moves { font-family: "Consolas", monospace; font-size: 14px; color: var(--accent); }
.desc { font-size: 12px; line-height: 1.55; }
.actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.actions button { white-space: nowrap; font-size: 13px; padding: 6px 10px; }
.actions button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.tip { line-height: 1.6; margin: 2px 0 0; }
</style>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { cubeStore } from "../cube/store.js";
import { TRIGGERS, TRIGGER_GROUPS, BASE_MOVES, CONCEPTS } from "../cube/triggers.js";
import MoveBar from "./MoveBar.vue";

// 手法 = 教学(基础手法字典 + 概念)+ 练习(触发循环跟练 + 逐步分解)。
const rootRef = ref(null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const view = ref("base"); // base = 基础手法教学;drill = 触发练习
const group = ref("基础触发");
const current = ref(null);
const looping = ref(false);
const loopCount = ref(0);
const activeMove = ref(null);
const moveNote = ref(null);

const list = computed(() => TRIGGERS.filter((t) => t.group === group.value));
const triggerMoves = computed(() => (current.value ? current.value.moves.split(/\s+/).filter(Boolean) : []));
const visible = () => rootRef.value && rootRef.value.offsetParent !== null;
const baseOf = (m) => BASE_MOVES.find((b) => b.move === m) || null;

function demoMove(m) {
  stopLoop();
  activeMove.value = m;
  moveNote.value = baseOf(m);
  cubeStore.loadSequence(m, { inverseSetup: false }); // 从还原态做这一步,看清它怎么转
  setTimeout(() => cubeStore.play(), 40);
}
function load(t) { current.value = t; activeMove.value = null; moveNote.value = null; cubeStore.loadSequence(t.moves, { inverseSetup: true }); }
async function demo(t) { stopLoop(); load(t); await sleep(40); cubeStore.play(); }
async function loop(t) {
  if (looping.value && current.value?.id === t.id) { stopLoop(); return; }
  stopLoop();
  load(t);
  looping.value = true; loopCount.value = 0;
  await sleep(40);
  while (looping.value) {
    if (!visible()) { looping.value = false; break; }
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
    <div class="viewsw">
      <button class="seg" :class="{ on: view === 'base' }" @click="view = 'base'">📖 基础手法(教学)</button>
      <button class="seg" :class="{ on: view === 'drill' }" @click="view = 'drill'">🔁 触发练习</button>
    </div>

    <!-- ========== 教学:基础手法 ========== -->
    <div v-show="view === 'base'">
      <p class="muted intro">先学每个动作<b>该用哪根手指、怎么推/拨</b>。点 <b>▶</b> 在 3D 上看它怎么转。手法因握法而异,这里给常见的一种。</p>

      <div class="concepts">
        <div v-for="c in CONCEPTS" :key="c.t" class="con">
          <div class="ct">{{ c.t }}</div>
          <div class="cd muted">{{ c.d }}</div>
        </div>
      </div>

      <div class="bgrid">
        <div v-for="b in BASE_MOVES" :key="b.move" class="bcard" :class="{ on: activeMove === b.move }">
          <div class="bhead">
            <span class="bmv">{{ b.move }}</span>
            <button class="mini" @click="demoMove(b.move)">▶</button>
          </div>
          <div class="bhand">{{ b.hand }} · {{ b.finger }}</div>
          <div class="bmotion">{{ b.motion }}</div>
          <div v-if="b.tip" class="btip muted">{{ b.tip }}</div>
        </div>
      </div>
    </div>

    <!-- ========== 练习:触发 ========== -->
    <div v-show="view === 'drill'">
      <p class="muted intro">挑一个触发看演示,或点<b>循环跟练</b>跟着节奏在真魔方上反复练。点下面的「分解」可逐步看每一步用哪根手指。</p>

      <div class="groups">
        <button v-for="g in TRIGGER_GROUPS" :key="g" class="chip" :class="{ active: group === g }" @click="group = g">{{ g }}</button>
      </div>

      <!-- 当前触发的播放 + 逐步分解 -->
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
        <!-- 逐步分解:点每一步看它的手指 -->
        <div class="breakdown">
          <span class="muted small">分解(点一步看手法):</span>
          <button v-for="(m, i) in triggerMoves" :key="i" class="step" :class="{ on: activeMove === m }" @click="demoMove(m)">{{ m }}</button>
        </div>
        <div v-if="moveNote" class="mnote">
          <b>{{ moveNote.move }}</b> — {{ moveNote.hand }} · {{ moveNote.finger }} · {{ moveNote.motion }}<span v-if="moveNote.tip" class="muted">({{ moveNote.tip }})</span>
        </div>
      </div>

      <div class="list">
        <div v-for="t in list" :key="t.id" class="item" :class="{ on: current?.id === t.id }">
          <div class="info">
            <div class="line1"><span class="aname">{{ t.name }}</span><span class="moves">{{ t.moves }}</span></div>
            <div class="desc muted">{{ t.fingers }}</div>
          </div>
          <div class="actions">
            <button @click="demo(t)">▶ 演示</button>
            <button :class="{ on: looping && current?.id === t.id }" @click="loop(t)">🔁 循环</button>
          </div>
        </div>
      </div>

      <p class="muted small tip">练法:慢速看清手指 → 匀速循环 → 逐渐加速,追求<b>不卡顿</b>而非一味快。</p>
    </div>
  </div>
</template>

<style scoped>
.ft { display: flex; flex-direction: column; gap: 12px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0 0 4px; }
.small { font-size: 12px; }
.viewsw { display: flex; gap: 6px; }
.seg { flex: 1; padding: 9px; font-size: 14px; }
.seg.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.concepts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.con { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 9px 11px; }
.con .ct { font-weight: 700; font-size: 13px; margin-bottom: 3px; }
.con .cd { font-size: 12px; line-height: 1.5; }
.bgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.bcard { background: var(--panel); border: 1px solid var(--border); border-radius: 9px; padding: 9px 11px; }
.bcard.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.bhead { display: flex; align-items: center; justify-content: space-between; }
.bmv { font-family: "Consolas", monospace; font-size: 20px; font-weight: 800; color: var(--accent); }
.mini { padding: 3px 9px; font-size: 12px; }
.bhand { font-size: 13px; font-weight: 600; margin-top: 4px; }
.bmotion { font-size: 12px; margin-top: 2px; }
.btip { font-size: 11px; line-height: 1.5; margin-top: 3px; }
.groups { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 5px 12px; font-size: 13px; }
.chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.now { background: var(--panel); border: 1px solid var(--accent); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; margin: 10px 0; }
.now-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.now-head .nm { font-size: 16px; font-weight: 700; }
.now-head .mv { font-family: "Consolas", monospace; font-size: 15px; color: var(--accent); }
.ctrl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sp { padding: 4px 10px; }
.stop { background: var(--bad); border-color: var(--bad); }
.breakdown { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.step { font-family: "Consolas", monospace; font-weight: 700; font-size: 13px; padding: 4px 9px; }
.step.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.mnote { font-size: 13px; line-height: 1.5; background: var(--panel-2); border-radius: 8px; padding: 8px 10px; }
.mnote b { color: var(--accent); font-family: "Consolas", monospace; }
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
.tip { line-height: 1.6; margin: 6px 0 0; }
</style>

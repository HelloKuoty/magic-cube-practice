<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { api } from "../api.js";
import { cubeStore } from "../cube/store.js";

// 计时器:按住空格预备(变绿)→ 松开开始 → 按空格停止。统计 best / ao5 / ao12 / 历史。
const rootRef = ref(null);
const scramble = ref("");
const state = ref("idle"); // idle | holding | armed | running
const startAt = ref(0);
const display = ref(0); // 当前显示毫秒
const times = ref(loadTimes()); // [{ms, scramble, at, plus2, dnf}]

const KEY = "magiccube.times";
function loadTimes() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function saveTimes() { try { localStorage.setItem(KEY, JSON.stringify(times.value.slice(-500))); } catch {} }

async function newScramble() {
  const s = await api.scramble(20);
  scramble.value = s.moves;
  cubeStore.loadSequence("", { setupMoves: s.moves }); // 左侧 3D 摆成打乱(虚拟练习用)
}

// ---- 计时状态机 ----
let raf = null, holdTimer = null;
function tick() {
  display.value = performance.now() - startAt.value;
  raf = requestAnimationFrame(tick);
}
function startRun() {
  state.value = "running";
  startAt.value = performance.now();
  raf = requestAnimationFrame(tick);
}
function stopRun() {
  cancelAnimationFrame(raf);
  const ms = performance.now() - startAt.value;
  display.value = ms;
  times.value.push({ ms, scramble: scramble.value, at: Date.now(), plus2: false, dnf: false });
  saveTimes();
  state.value = "idle";
  newScramble();
}
function pressDown() {
  if (state.value === "running") { stopRun(); return; }
  if (state.value === "idle") {
    state.value = "holding";
    holdTimer = setTimeout(() => { if (state.value === "holding") state.value = "armed"; }, 300);
  }
}
function pressUp() {
  clearTimeout(holdTimer);
  if (state.value === "armed") startRun();
  else if (state.value === "holding") state.value = "idle"; // 松手太早,取消
}

const visible = () => rootRef.value && rootRef.value.offsetParent !== null;
function onKeyDown(e) {
  if (!visible() || e.repeat) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.code === "Space") { e.preventDefault(); pressDown(); }
}
function onKeyUp(e) {
  if (!visible()) return;
  if (e.code === "Space") { e.preventDefault(); pressUp(); }
}
onMounted(() => {
  newScramble();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf); clearTimeout(holdTimer);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
});

// ---- 显示与统计 ----
function fmt(ms) {
  if (ms == null) return "—";
  if (ms === Infinity) return "DNF";
  const s = ms / 1000;
  if (s < 60) return s.toFixed(2);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(2).padStart(5, "0")}`;
}
const eff = (t) => (t.dnf ? Infinity : t.ms + (t.plus2 ? 2000 : 0));
const padStyle = computed(() => {
  if (state.value === "holding") return { background: "#3a1414", borderColor: "var(--bad)" };
  if (state.value === "armed") return { background: "#123a1e", borderColor: "var(--good)" };
  if (state.value === "running") return { background: "var(--panel-2)" };
  return {};
});
const bigStyle = computed(() => {
  if (state.value === "holding") return { color: "var(--bad)" };
  if (state.value === "armed") return { color: "var(--good)" };
  return {};
});
const liveText = computed(() => (state.value === "running" ? fmt(display.value) : state.value === "idle" && times.value.length ? fmt(eff(times.value[times.value.length - 1])) : fmt(state.value === "idle" ? 0 : display.value)));

function avgN(n) {
  if (times.value.length < n) return null;
  const recent = times.value.slice(-n).map(eff);
  const sorted = [...recent].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, n - 1); // 去掉最快最慢
  if (trimmed.some((v) => v === Infinity)) return Infinity;
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}
const best = computed(() => {
  const v = times.value.map(eff).filter((x) => x !== Infinity);
  return v.length ? Math.min(...v) : null;
});
const mean = computed(() => {
  const v = times.value.map(eff).filter((x) => x !== Infinity);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
});
const ao5 = computed(() => avgN(5));
const ao12 = computed(() => avgN(12));
const recent = computed(() => times.value.slice(-12).reverse());

function cyclePenalty(t) {
  if (!t.plus2 && !t.dnf) t.plus2 = true;
  else if (t.plus2) { t.plus2 = false; t.dnf = true; }
  else t.dnf = false;
  saveTimes();
}
function del(t) { const i = times.value.indexOf(t); if (i >= 0) { times.value.splice(i, 1); saveTimes(); } }
function clearAll() { if (confirm("清空本次所有成绩?")) { times.value = []; saveTimes(); } }
</script>

<template>
  <div class="tm" ref="rootRef">
    <p class="muted intro">按住<b>空格</b>预备(变绿)→ 松开开始 → 拧完按<b>空格</b>停。手机可按住下方计时区。</p>

    <div class="scr">{{ scramble }}</div>

    <!-- 计时区 -->
    <div
      class="pad" :style="padStyle"
      @pointerdown.prevent="pressDown" @pointerup.prevent="pressUp" @pointerleave="state==='holding' && pressUp()"
    >
      <div class="big" :style="bigStyle">{{ liveText }}</div>
      <div class="hint muted">
        <span v-if="state==='idle'">按住空格 / 长按此处</span>
        <span v-else-if="state==='holding'">继续按住…</span>
        <span v-else-if="state==='armed'">松开开始!</span>
        <span v-else>计时中 · 按空格停</span>
      </div>
    </div>

    <!-- 统计 -->
    <div class="stats">
      <div class="st"><span class="lab">最好</span><span class="val">{{ fmt(best) }}</span></div>
      <div class="st"><span class="lab">ao5</span><span class="val">{{ fmt(ao5) }}</span></div>
      <div class="st"><span class="lab">ao12</span><span class="val">{{ fmt(ao12) }}</span></div>
      <div class="st"><span class="lab">平均</span><span class="val">{{ fmt(mean) }}</span></div>
      <div class="st"><span class="lab">次数</span><span class="val">{{ times.length }}</span></div>
    </div>

    <!-- 历史 -->
    <div class="hist" v-if="recent.length">
      <div class="hh">
        <span class="muted small">最近成绩(点一下加 +2 / DNF)</span>
        <button class="mini" @click="clearAll">清空</button>
      </div>
      <div class="rows">
        <div v-for="(t, i) in recent" :key="t.at" class="row">
          <span class="idx muted">{{ times.length - i }}.</span>
          <button class="t" :class="{ p2: t.plus2, dnf: t.dnf }" @click="cyclePenalty(t)">
            {{ t.dnf ? "DNF" : fmt(t.ms + (t.plus2 ? 2000 : 0)) }}{{ t.plus2 ? "" : "" }}
          </button>
          <button class="x muted" @click="del(t)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tm { display: flex; flex-direction: column; gap: 14px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0; }
.small { font-size: 12px; }
.scr {
  font-family: "Consolas", monospace; font-size: 16px; font-weight: 700; letter-spacing: 1px; word-spacing: 4px;
  background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px; line-height: 1.7;
}
.pad {
  user-select: none; touch-action: none; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  min-height: 150px; border-radius: 14px; border: 1px solid var(--border); background: var(--panel);
}
.big { font-family: "Consolas", monospace; font-size: 56px; font-weight: 800; line-height: 1; }
.hint { font-size: 13px; }
.stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.st { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 8px; text-align: center; }
.st .lab { display: block; font-size: 11px; color: var(--muted); margin-bottom: 3px; }
.st .val { font-family: "Consolas", monospace; font-size: 16px; font-weight: 700; }
.hist { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
.hh { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.mini { padding: 4px 9px; font-size: 12px; }
.rows { display: flex; flex-wrap: wrap; gap: 6px; }
.row { display: flex; align-items: center; gap: 2px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 7px; padding: 2px 4px 2px 6px; }
.idx { font-size: 11px; }
.t { font-family: "Consolas", monospace; font-weight: 700; font-size: 13px; padding: 3px 5px; background: none; border: none; color: var(--text); }
.t.p2 { color: var(--warn); }
.t.dnf { color: var(--bad); }
.x { font-size: 10px; padding: 2px 4px; background: none; border: none; }
</style>

<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { settings } from "../cube/settings.js";
import { solveLastLayer } from "../cube/llsolver.js";
import { cubeStore } from "../cube/store.js";
import MoveBar from "./MoveBar.vue";

// 默认前两层已还原。用户把最后一层(顶面 + 四周顶排)按实体魔方涂好,点求解出公式。
const rootRef = ref(null);
const result = ref(null);
const demoed = ref(false);
const state = reactive({ U: [[], [], []], front: [], right: [], back: [], left: [] });
function reset() {
  const c = settings.colors;
  state.U = [[c.U, c.U, c.U], [c.U, c.U, c.U], [c.U, c.U, c.U]];
  state.front = [c.F, c.F, c.F];
  state.right = [c.R, c.R, c.R];
  state.back = [c.B, c.B, c.B];
  state.left = [c.L, c.L, c.L];
  result.value = null;
  demoed.value = false;
}
const paletteKeys = ["U", "D", "F", "B", "R", "L"];
const palette = computed(() => paletteKeys.map((k) => settings.colors[k]));
const paint = ref("#ffffff");
watch(() => settings.colors, (c) => { paint.value = c.U; reset(); }, { immediate: true });
onMounted(reset);

// ---- 快捷键:默认 1 2 3 q w e 对应 6 色,可自定义,存 localStorage ----
const DEFAULT_KEYS = ["1", "2", "3", "q", "w", "e"];
function loadKeys() {
  try { const s = localStorage.getItem("magiccube.llkeys"); if (s) { const a = JSON.parse(s); if (Array.isArray(a) && a.length === 6) return a; } } catch {}
  return [...DEFAULT_KEYS];
}
const keybinds = ref(loadKeys());
const rebindMode = ref(false);
const rebindIdx = ref(-1);
function saveKeys() { try { localStorage.setItem("magiccube.llkeys", JSON.stringify(keybinds.value)); } catch {} }
function clickSwatch(i) { if (rebindMode.value) rebindIdx.value = i; else paint.value = palette.value[i]; }
const visible = () => rootRef.value && rootRef.value.offsetParent !== null;
function onKey(e) {
  if (!visible()) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  const k = e.key.toLowerCase();
  if (rebindMode.value && rebindIdx.value >= 0) {
    if (k !== "escape") {
      const dup = keybinds.value.indexOf(k);
      if (dup >= 0 && dup !== rebindIdx.value) keybinds.value[dup] = "";
      keybinds.value[rebindIdx.value] = k;
      saveKeys();
    }
    rebindIdx.value = -1; e.preventDefault(); return;
  }
  if (rebindMode.value) return;
  const idx = keybinds.value.indexOf(k);
  if (idx >= 0) { paint.value = palette.value[idx]; e.preventDefault(); }
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
function resetKeys() { keybinds.value = [...DEFAULT_KEYS]; saveKeys(); rebindMode.value = false; rebindIdx.value = -1; }

const S = 24, T = 11, G = 1.6;
const VB = 2 * T + 3 * S;
const cells = computed(() => {
  const out = [];
  const push = (x, y, w, h, fill, set, fixed) => out.push({ x: x + G / 2, y: y + G / 2, w: w - G, h: h - G, fill, set, fixed });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    push(T + c * S, T + r * S, S, S, state.U[r][c], (col) => (state.U[r][c] = col), r === 1 && c === 1);
  state.back.forEach((f, i) => push(T + i * S, 0, S, T, f, (col) => (state.back[i] = col)));
  state.front.forEach((f, i) => push(T + i * S, T + 3 * S, S, T, f, (col) => (state.front[i] = col)));
  state.left.forEach((f, i) => push(0, T + i * S, T, S, f, (col) => (state.left[i] = col)));
  state.right.forEach((f, i) => push(T + 3 * S, T + i * S, T, S, f, (col) => (state.right[i] = col)));
  return out;
});
function clickCell(c) { if (!c.fixed) { c.set(paint.value); result.value = null; demoed.value = false; } }

function solve() {
  result.value = solveLastLayer({ U: state.U, front: state.front, right: state.right, back: state.back, left: state.left }, settings.colors);
  demoed.value = false;
}
const total = computed(() =>
  result.value && !result.value.error
    ? result.value.steps.reduce((n, s) => n + s.seq.split(/\s+/).filter(Boolean).length, 0)
    : 0
);
function loadDemo() {
  if (!result.value || result.value.error) return;
  const seq = result.value.steps.map((s) => s.seq).join(" ");
  cubeStore.loadSequence(seq, { inverseSetup: true }); // 把魔方摆成该情形,正向播放/单步即还原
  demoed.value = true;
}
</script>

<template>
  <div class="lls" ref="rootRef">
    <p class="muted intro">
      默认<b>前两层已还原</b>。把魔方某面朝你当「前」,照实体魔方把最后一层涂好,点「求解」给出公式。
    </p>

    <!-- 调色盘(带快捷键)-->
    <div class="palette">
      <span class="muted small">颜色:</span>
      <button
        v-for="(col, i) in palette"
        :key="i"
        class="sw"
        :class="{ on: paint === col, rebinding: rebindIdx === i }"
        :style="{ background: col }"
        @click="clickSwatch(i)"
      >
        <span class="kk">{{ rebindIdx === i ? "按键…" : (keybinds[i] || "—") }}</span>
      </button>
      <button class="mini" :class="{ on: rebindMode }" @click="rebindMode = !rebindMode; rebindIdx = -1" title="改快捷键">
        {{ rebindMode ? "改键中" : "⌨ 改键" }}
      </button>
      <button v-if="rebindMode" class="mini" @click="resetKeys">默认键</button>
      <button class="mini" @click="reset">重置涂色</button>
    </div>
    <div v-if="rebindMode" class="muted small">点一个颜色,再按你想用的键(Esc 取消)。默认 1 2 3 q w e。</div>

    <!-- 可涂色的最后一层 -->
    <div class="board">
      <svg :viewBox="`0 0 ${VB} ${VB}`" class="grid">
        <rect :width="VB" :height="VB" rx="4" fill="#0c0e14" />
        <rect
          v-for="(c, i) in cells"
          :key="i"
          :x="c.x" :y="c.y" :width="c.w" :height="c.h" rx="2"
          :fill="c.fill"
          stroke="#0c0e14" stroke-width="0.8"
          :class="{ cell: !c.fixed }"
          @click="clickCell(c)"
        />
      </svg>
    </div>

    <button class="primary solve" @click="solve">求解最后一层</button>

    <!-- 结果 -->
    <div v-if="result" class="result">
      <div v-if="result.error" class="err">⚠ {{ result.error }}<br /><span class="muted small">检查涂色:每块的三/两个颜色要能对上一个真实块。</span></div>
      <div v-else-if="result.steps.length === 0" class="ok">这一层已经是还原状态啦 ✅</div>
      <template v-else>
        <div class="rhead">
          <span class="ok">解法(共 {{ total }} 步)</span>
          <button class="mini" @click="loadDemo">{{ demoed ? "↻ 重新载入" : "▶ 载入到 3D" }}</button>
        </div>
        <div v-for="(s, i) in result.steps" :key="i" class="stp">
          <span class="lab">{{ s.label }}</span>
          <span class="mv">{{ s.seq }}</span>
        </div>

        <!-- 步进演示 -->
        <div v-if="demoed" class="demo">
          <div class="stepper">
            <button @click="cubeStore.reset()" :disabled="cubeStore.busy" title="回到该情形">⟲</button>
            <button @click="cubeStore.prev()" :disabled="cubeStore.busy || cubeStore.cursor === 0">◀ 上一步</button>
            <button v-if="!cubeStore.playing" class="primary" @click="cubeStore.play()" :disabled="cubeStore.busy || cubeStore.cursor >= cubeStore.parsed.length">▶ 播放</button>
            <button v-else class="primary" @click="cubeStore.pause()">⏸</button>
            <button @click="cubeStore.next()" :disabled="cubeStore.busy || cubeStore.cursor >= cubeStore.parsed.length">下一步 ▶</button>
          </div>
          <MoveBar />
          <p class="muted small tip">左侧 3D 已摆成你输入的情形。一步步「下一步」跟着拧实体魔方,拧完就还原。</p>
        </div>
        <p v-else class="muted small tip">点「载入到 3D」可单步/播放核对。照公式拧实体魔方时,保持和涂色时一样的朝向。</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lls { display: flex; flex-direction: column; gap: 14px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0; }
.small { font-size: 12px; }
.palette { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sw {
  position: relative; width: 30px; height: 30px; border-radius: 6px; border: 2px solid var(--border); padding: 0;
}
.sw.on { border-color: var(--text); box-shadow: 0 0 0 2px var(--accent); }
.sw.rebinding { box-shadow: 0 0 0 2px var(--warn); }
.sw .kk {
  position: absolute; bottom: -1px; right: -1px; font-size: 9px; line-height: 1;
  background: rgba(0,0,0,0.65); color: #fff; padding: 1px 3px; border-radius: 4px;
}
.mini { padding: 5px 10px; font-size: 12px; }
.mini.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.board { display: flex; justify-content: center; }
.grid { width: 220px; height: 220px; }
.cell { cursor: pointer; }
.cell:hover { stroke: var(--accent); stroke-width: 1.5; }
.solve { align-self: stretch; padding: 11px; font-size: 15px; }
.result { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.err { color: var(--bad); font-size: 14px; line-height: 1.6; }
.ok { color: var(--good); font-weight: 700; }
.rhead { display: flex; justify-content: space-between; align-items: center; }
.stp { display: flex; align-items: baseline; gap: 10px; }
.lab { font-size: 12px; color: var(--muted); min-width: 76px; flex-shrink: 0; }
.mv { font-family: "Consolas", monospace; font-weight: 700; font-size: 15px; color: var(--accent); word-break: break-word; }
.demo { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; border-top: 1px solid var(--border); padding-top: 10px; }
.stepper { display: flex; gap: 6px; flex-wrap: wrap; }
.stepper button { padding: 7px 10px; font-size: 13px; }
.tip { line-height: 1.6; margin: 2px 0 0; }
</style>

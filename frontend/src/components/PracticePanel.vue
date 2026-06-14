<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { cubeStore } from "../cube/store.js";
import { parseSequence, parseToken, invertToken } from "../cube/moves.js";
import { api } from "../api.js";

const props = defineProps({ alg: { type: Object, default: null } });

const rootRef = ref(null);
const expected = ref([]);
const userIndex = ref(0);
const mistakes = ref(0);
const startTime = ref(null);
const elapsed = ref(0);
const finished = ref(false);
const hideTarget = ref(false);
const flashState = ref(""); // good | bad
const history = ref([]);
let timer = null;

const total = computed(() => expected.value.length);
const accuracy = computed(() => {
  const c = total.value;
  return c + mistakes.value === 0 ? 1 : c / (c + mistakes.value);
});
const elapsedSec = computed(() => (elapsed.value / 1000).toFixed(1));

// 输入按钮:取公式里用到的面,每个给 正/逆/180 三个键
const pad = computed(() => {
  const seen = [];
  for (const t of expected.value) if (!seen.includes(t.face)) seen.push(t.face);
  return seen.map((face) => ({
    face,
    keys: [face, face + "'", face + "2"],
  }));
});

function setup() {
  if (!props.alg) return;
  expected.value = parseSequence(props.alg.moves);
  userIndex.value = 0;
  mistakes.value = 0;
  startTime.value = null;
  elapsed.value = 0;
  finished.value = false;
  cubeStore.loadSequence(props.alg.moves, { inverseSetup: true });
  cubeStore.cursor = 0;
  loadHistory();
}

watch(() => props.alg, setup, { immediate: true });

function startTimerIfNeeded() {
  if (startTime.value === null) {
    startTime.value = performance.now();
    timer = setInterval(() => {
      if (!finished.value && startTime.value !== null)
        elapsed.value = performance.now() - startTime.value;
    }, 100);
  }
}

function flash(kind) {
  flashState.value = kind;
  setTimeout(() => (flashState.value = ""), 250);
}

async function input(tokStr) {
  if (finished.value || cubeStore.busy || !expected.value.length) return;
  const tok = parseToken(tokStr);
  if (!tok) return;
  startTimerIfNeeded();
  const want = expected.value[userIndex.value];
  await cubeStore.exec(tok, 320);
  if (tok.canonical === want.canonical) {
    userIndex.value++;
    cubeStore.cursor = userIndex.value;
    flash("good");
    if (userIndex.value >= expected.value.length) finish();
  } else {
    mistakes.value++;
    flash("bad");
    await cubeStore.exec(invertToken(tok), 220); // 撤销错误的一步
  }
}

async function finish() {
  finished.value = true;
  if (timer) clearInterval(timer);
  const timeMs = Math.round(elapsed.value);
  try {
    await api.saveProgress({
      algId: props.alg.id,
      algName: props.alg.name,
      timeMs,
      mistakes: mistakes.value,
      accuracy: accuracy.value,
    });
    await loadHistory();
  } catch (e) {
    /* 后端不可用时忽略,不影响练习 */
  }
}

async function loadHistory() {
  try {
    const data = await api.getProgress();
    history.value = (data.records || []).filter((r) => r.algId === props.alg?.id);
  } catch {
    history.value = [];
  }
}

const bestTime = computed(() => {
  const times = history.value.filter((r) => r.mistakes === 0).map((r) => r.timeMs);
  return times.length ? Math.min(...times) : null;
});

function onKey(e) {
  if (finished.value) return;
  if (!rootRef.value || rootRef.value.offsetParent === null) return; // 仅在本面板可见时响应
  if (document.activeElement && document.activeElement.tagName === "INPUT") return;
  const ch = e.key.toLowerCase();
  let face = null;
  if ("rlufdbmes".includes(ch)) face = ch.toUpperCase();
  else if ("xyz".includes(ch)) face = ch;
  if (!face) return;
  e.preventDefault();
  input(face + (e.shiftKey ? "'" : ""));
}

onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="practice" v-if="alg" ref="rootRef" :class="flashState">
    <div class="head">
      <div>
        <div class="title">{{ alg.name }}</div>
        <div class="muted small">看着公式,用按钮或键盘按出每一步</div>
      </div>
      <button @click="setup">↻ 重新开始</button>
    </div>

    <!-- 目标公式 -->
    <div class="target">
      <div class="t-row">
        <span class="muted small">目标:</span>
        <label class="hide"><input type="checkbox" v-model="hideTarget" />盲练(隐藏)</label>
      </div>
      <div class="seq" v-if="!hideTarget">
        <span
          v-for="(m, i) in expected"
          :key="i"
          class="m"
          :class="{ done: i < userIndex, cur: i === userIndex }"
          >{{ m.canonical }}</span
        >
      </div>
      <div class="seq hidden muted" v-else>已隐藏 · 共 {{ total }} 步</div>
    </div>

    <!-- 状态 -->
    <div class="stats">
      <div class="stat"><div class="v">{{ userIndex }}/{{ total }}</div><div class="k muted">进度</div></div>
      <div class="stat"><div class="v">{{ elapsedSec }}s</div><div class="k muted">用时</div></div>
      <div class="stat"><div class="v" :class="{ bad: mistakes }">{{ mistakes }}</div><div class="k muted">错误</div></div>
      <div class="stat"><div class="v">{{ (accuracy * 100).toFixed(0) }}%</div><div class="k muted">正确率</div></div>
    </div>

    <!-- 完成结果 -->
    <div class="result card" v-if="finished">
      <div class="r-title">🎉 完成!</div>
      <div class="r-line">
        用时 <b>{{ elapsedSec }}s</b> · 错误 <b>{{ mistakes }}</b> 次 · 正确率
        <b>{{ (accuracy * 100).toFixed(0) }}%</b>
      </div>
      <div class="r-line muted small" v-if="bestTime !== null">
        你这条公式的最佳零失误用时:{{ (bestTime / 1000).toFixed(1) }}s
      </div>
      <button class="primary" @click="setup">再来一次</button>
    </div>

    <!-- 输入键盘 -->
    <div class="pad" v-if="!finished">
      <div class="pad-row" v-for="row in pad" :key="row.face">
        <button v-for="k in row.keys" :key="k" class="key" @click="input(k)" :disabled="cubeStore.busy">
          {{ k }}
        </button>
      </div>
      <p class="muted small kbd-tip">
        键盘:字母键对应面(如 <code>R U F</code>),按住 <code>Shift</code> 为逆时针;<code>2</code>(转两下)请点按钮。
      </p>
    </div>

    <div class="hist" v-if="history.length">
      <div class="muted small">最近练习</div>
      <div class="hist-row" v-for="(r, i) in history.slice(0, 5)" :key="i">
        <span>{{ (r.timeMs / 1000).toFixed(1) }}s</span>
        <span class="muted">错误 {{ r.mistakes }} · {{ (r.accuracy * 100).toFixed(0) }}%</span>
      </div>
    </div>
  </div>

  <div class="empty muted" v-else>请先从「公式库」选一个公式来跟练。</div>
</template>

<style scoped>
.practice { display: flex; flex-direction: column; gap: 14px; border-radius: 12px; transition: box-shadow 0.2s; }
.practice.good { box-shadow: 0 0 0 2px var(--good) inset; }
.practice.bad { box-shadow: 0 0 0 2px var(--bad) inset; }
.head { display: flex; justify-content: space-between; align-items: flex-start; }
.title { font-size: 18px; font-weight: 700; }
.small { font-size: 12px; }
.target { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
.t-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.hide { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--muted); cursor: pointer; }
.hide input { accent-color: var(--accent); }
.seq { display: flex; flex-wrap: wrap; gap: 6px; }
.seq.hidden { font-style: italic; }
.m {
  font-family: "Consolas", monospace; font-weight: 600; font-size: 15px;
  padding: 4px 9px; border-radius: 7px; background: var(--panel-2); border: 1px solid var(--border);
}
.m.done { opacity: 0.35; }
.m.cur { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.25); }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px; text-align: center; }
.stat .v { font-size: 20px; font-weight: 700; }
.stat .v.bad { color: var(--bad); }
.stat .k { font-size: 11px; margin-top: 2px; }
.result { text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.r-title { font-size: 20px; font-weight: 700; }
.r-line { font-size: 14px; }
.pad { display: flex; flex-direction: column; gap: 8px; }
.pad-row { display: flex; gap: 8px; }
.key {
  flex: 1; font-family: "Consolas", monospace; font-weight: 700; font-size: 16px; padding: 12px 0;
}
.kbd-tip { line-height: 1.6; margin: 4px 0 0; }
code { background: var(--panel-2); padding: 1px 5px; border-radius: 4px; font-family: "Consolas", monospace; }
.hist { display: flex; flex-direction: column; gap: 4px; }
.hist-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px solid var(--border); }
.empty { padding: 40px 0; text-align: center; }
</style>

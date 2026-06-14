<script setup>
import { ref, computed, onMounted } from "vue";
import { api } from "../api.js";
import { cubeStore } from "../cube/store.js";
import { parseSequence, invertSequence } from "../cube/moves.js";
import MoveBar from "./MoveBar.vue";

// 读谱执行:看一串「打乱谱」照着拧实体魔方,再看「还原谱」拧回去。练看谱执行,像看谱弹琴。
const length = ref(18);
const scramble = ref([]); // 打乱谱(token 字符串数组)
const showSolve = ref(false);
const loading = ref(false);
const loaded = ref(null); // 当前载入 3D 单步的是哪段:'scramble' | 'solve' | null

const solve = computed(() =>
  invertSequence(parseSequence(scramble.value.join(" "))).map((t) => t.canonical)
);

// 每 5 个一「小节」,便于看谱
function measures(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 5) out.push(list.slice(i, i + 5));
  return out;
}
const scrambleM = computed(() => measures(scramble.value));
const solveM = computed(() => measures(solve.value));

async function gen() {
  loading.value = true;
  showSolve.value = false;
  loaded.value = null;
  try {
    const s = await api.scramble(length.value);
    scramble.value = s.moves.split(/\s+/).filter(Boolean);
  } catch {
    scramble.value = [];
  }
  loading.value = false;
}

// 把某段载入左侧 3D,准备单步/播放(不自动播)
function loadSheet(which) {
  if (which === "scramble") {
    // 从还原态开始,正向一步步把它拧乱 —— 和你手上从还原态打乱一致
    cubeStore.loadSequence(scramble.value.join(" "), { inverseSetup: false });
  } else {
    showSolve.value = true;
    // 先铺成「打乱后」的状态(setup = 打乱谱),正向一步步把它还原 —— 和你手上对照
    cubeStore.loadSequence(solve.value.join(" "), { inverseSetup: true });
  }
  loaded.value = which;
}

onMounted(gen);
</script>

<template>
  <div class="sr">
    <p class="muted intro">
      像看谱弹琴一样练:先照着<b>打乱谱</b>把手里的魔方拧乱,再照着<b>还原谱</b>拧回去。想核对就点「3D 单步」,一步步跟着拧。
    </p>

    <div class="ctrl">
      <button class="primary" @click="gen" :disabled="loading">🎲 换一段</button>
      <span class="muted small">长度</span>
      <button v-for="n in [12, 18, 25]" :key="n" class="chip" :class="{ active: length === n }" @click="length = n; gen()">
        {{ n }}
      </button>
    </div>

    <!-- 打乱谱 -->
    <div class="sheet" :class="{ live: loaded === 'scramble' }">
      <div class="sheet-head">
        <span class="label scramble">打乱谱</span>
        <button class="mini" :class="{ on: loaded === 'scramble' }" @click="loadSheet('scramble')">▶ 3D 单步</button>
      </div>
      <div class="staff">
        <div v-for="(m, mi) in scrambleM" :key="mi" class="measure">
          <span v-for="(mv, i) in m" :key="i" class="mv">{{ mv }}</span>
        </div>
      </div>
    </div>

    <!-- 还原谱 -->
    <div class="sheet" :class="{ live: loaded === 'solve' }">
      <div class="sheet-head">
        <span class="label solve">还原谱</span>
        <div class="head-btns">
          <button class="mini" v-if="!showSolve" @click="showSolve = true">👁 看还原谱</button>
          <button class="mini" :class="{ on: loaded === 'solve' }" @click="loadSheet('solve')">▶ 3D 单步</button>
        </div>
      </div>
      <div class="staff" v-if="showSolve">
        <div v-for="(m, mi) in solveM" :key="mi" class="measure">
          <span v-for="(mv, i) in m" :key="i" class="mv solve">{{ mv }}</span>
        </div>
      </div>
      <div class="staff hidden muted" v-else>先自己照打乱谱拧乱,想不出还原就点上面「看还原谱」</div>
    </div>

    <!-- 步进控制(单步演示当前载入的那一段,左侧 3D 同步)-->
    <div v-if="loaded" class="demo">
      <div class="demo-head muted small">
        正在单步:<b :class="loaded">{{ loaded === 'scramble' ? '打乱谱' : '还原谱' }}</b>
        · 第 {{ cubeStore.cursor }}/{{ cubeStore.parsed.length }} 步 · 左侧 3D 同步
      </div>
      <div class="stepper">
        <button @click="cubeStore.reset()" :disabled="cubeStore.busy" title="回到起点">⟲ 复位</button>
        <button @click="cubeStore.prev()" :disabled="cubeStore.busy || cubeStore.cursor === 0">◀ 上一步</button>
        <button v-if="!cubeStore.playing" class="primary" @click="cubeStore.play()" :disabled="cubeStore.busy || cubeStore.cursor >= cubeStore.parsed.length">▶ 播放</button>
        <button v-else class="primary" @click="cubeStore.pause()">⏸ 暂停</button>
        <button @click="cubeStore.next()" :disabled="cubeStore.busy || cubeStore.cursor >= cubeStore.parsed.length">下一步 ▶</button>
      </div>
      <MoveBar />
      <p class="muted small tip">每点一下「下一步」就跟着拧一下手里的魔方,对照左侧 3D 核对方向。</p>
    </div>

    <p class="muted small tip">
      还原谱 = 打乱谱的逆序逆操作,照着拧完魔方必定复原。提示:拧的时候让魔方朝向固定(白上绿前),符号才对得上。
    </p>
  </div>
</template>

<style scoped>
.sr { display: flex; flex-direction: column; gap: 14px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0; }
.ctrl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chip { padding: 5px 12px; }
.chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.small { font-size: 12px; }
.sheet {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  transition: border-color 0.15s;
}
.sheet.live { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.head-btns { display: flex; gap: 6px; }
.label { font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
.label.scramble { background: #3a2a12; color: var(--warn); border: 1px solid #5a401a; }
.label.solve { background: #123a1e; color: var(--good); border: 1px solid #1a5a2e; }
.mini { padding: 5px 10px; font-size: 12px; }
.mini.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.staff { display: flex; flex-wrap: wrap; gap: 10px; }
.staff.hidden { font-size: 13px; padding: 6px 0; font-style: italic; }
.measure {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--panel-2);
  border: 1px solid var(--border);
}
.mv {
  font-family: "Consolas", monospace;
  font-weight: 700;
  font-size: 19px;
  min-width: 26px;
  text-align: center;
}
.mv.solve { color: var(--good); }
.demo {
  display: flex; flex-direction: column; gap: 8px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
}
.demo-head b.scramble { color: var(--warn); }
.demo-head b.solve { color: var(--good); }
.stepper { display: flex; gap: 6px; flex-wrap: wrap; }
.stepper button { padding: 7px 11px; font-size: 13px; }
.tip { line-height: 1.6; margin: 2px 0 0; }
</style>

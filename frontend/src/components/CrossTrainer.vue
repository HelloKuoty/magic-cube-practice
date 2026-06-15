<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api.js";
import { cubeStore } from "../cube/store.js";
import { solveCross } from "../cube/cross.js";
import MoveBar from "./MoveBar.vue";

// 十字训练:给一个打乱,自己先想/拧出底面十字,再看最优解对照。底面默认白(D)。
const scramble = ref("");
const sol = ref(null); // { moves, count }
const computing = ref(false);
const loaded = ref(false);

async function gen() {
  sol.value = null;
  loaded.value = false;
  const s = await api.scramble(20);
  scramble.value = s.moves;
  cubeStore.loadSequence("", { setupMoves: s.moves }); // 3D 直接摆成打乱态供观察
}

function reveal() {
  if (sol.value || computing.value) return;
  computing.value = true;
  // 让「求解中」先渲染,再做同步搜索
  setTimeout(() => {
    sol.value = solveCross(scramble.value);
    computing.value = false;
  }, 20);
}

function demo() {
  if (!sol.value || sol.value.error) return;
  // 从打乱态开始,正向单步播放十字解
  cubeStore.loadSequence(sol.value.moves, { setupMoves: scramble.value });
  loaded.value = true;
}

onMounted(gen);
</script>

<template>
  <div class="cross">
    <p class="muted intro">
      练「看打乱 → 解底面十字」。先自己在手里/3D 上拧出<b>白色底十字</b>,再点「看参考解」对照最优步数。
    </p>

    <div class="ctrl">
      <button class="primary" @click="gen">🎲 换一个打乱</button>
    </div>

    <div class="sheet">
      <div class="sheet-head"><span class="label">打乱</span></div>
      <div class="scr">{{ scramble }}</div>
      <p class="muted small">左侧 3D 已摆成这个打乱状态。底面(白)十字的 4 条棱要归位、颜色对齐侧面中心。</p>
    </div>

    <div class="actions">
      <button v-if="!sol" @click="reveal" :disabled="computing">{{ computing ? "求解中…" : "💡 看参考解" }}</button>
      <template v-else>
        <span class="ok" v-if="!sol.error">最优十字解:<b>{{ sol.count }}</b> 步</span>
        <span class="err" v-else>{{ sol.error }}</span>
        <button v-if="!sol.error" @click="demo">{{ loaded ? "↻ 重新载入" : "▶ 3D 单步演示" }}</button>
      </template>
    </div>

    <div v-if="sol && !sol.error" class="sol">
      <div class="mv">{{ sol.moves || "(已经是十字)" }}</div>
    </div>

    <div v-if="loaded" class="demo">
      <div class="stepper">
        <button @click="cubeStore.reset()" :disabled="cubeStore.busy" title="回到打乱态">⟲ 复位</button>
        <button @click="cubeStore.prev()" :disabled="cubeStore.busy || cubeStore.cursor === 0">◀ 上一步</button>
        <button v-if="!cubeStore.playing" class="primary" @click="cubeStore.play()" :disabled="cubeStore.busy || cubeStore.cursor >= cubeStore.parsed.length">▶ 播放</button>
        <button v-else class="primary" @click="cubeStore.pause()">⏸ 暂停</button>
        <button @click="cubeStore.next()" :disabled="cubeStore.busy || cubeStore.cursor >= cubeStore.parsed.length">下一步 ▶</button>
      </div>
      <MoveBar />
      <p class="muted small tip">从打乱态开始,一步步把白色底十字拧出来。</p>
    </div>

    <p class="muted small tip">
      提示:十字一般 8 步内能解完;能盲拧(不看就规划好)是进阶目标。参考解未必和你的解法一样,长度一致即可。
    </p>
  </div>
</template>

<style scoped>
.cross { display: flex; flex-direction: column; gap: 14px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0; }
.small { font-size: 12px; }
.ctrl { display: flex; gap: 8px; }
.sheet { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
.sheet-head { margin-bottom: 8px; }
.label { font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: #3a2a12; color: var(--warn); border: 1px solid #5a401a; }
.scr { font-family: "Consolas", monospace; font-size: 17px; font-weight: 700; letter-spacing: 1px; word-spacing: 4px; margin-bottom: 8px; }
.actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ok { color: var(--good); }
.err { color: var(--bad); }
.sol { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
.sol .mv { font-family: "Consolas", monospace; font-size: 16px; font-weight: 700; color: var(--accent); }
.demo { display: flex; flex-direction: column; gap: 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
.stepper { display: flex; gap: 6px; flex-wrap: wrap; }
.stepper button { padding: 7px 11px; font-size: 13px; }
.tip { line-height: 1.6; margin: 2px 0 0; }
</style>

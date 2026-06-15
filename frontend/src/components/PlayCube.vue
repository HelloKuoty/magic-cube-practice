<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { cubeStore } from "../cube/store.js";
import { parseSequence, parseToken, randomScramble } from "../cube/moves.js";

// 自由玩:拖动一个面转层(拖背景转视角),或用按钮;打乱后开始计时、计步,复原即庆祝。
const moves = ref(0);
const solved = ref(false);
const scrambled = ref(false);
const startAt = ref(0);
const elapsed = ref(0);
const viewRel = ref(true); // 面对你的就是 F(记号跟随视角)
let timer = null;

function bind(inst) {
  if (!inst) return;
  inst.onUserMove = onUserMove; // interactive 开关由 App 按当前标签控制
  inst.setLabelMode(viewRel.value ? "view" : "world");
}
watch(viewRel, (v) => { const i = cubeStore.instance; if (i) i.setLabelMode(v ? "view" : "world"); });
function onUserMove() {
  if (scrambled.value && !solved.value && !startAt.value) startTimer();
  moves.value++;
  const inst = cubeStore.instance;
  if (scrambled.value && inst && inst.isSolved()) finish();
}
function startTimer() {
  startAt.value = performance.now();
  timer = setInterval(() => (elapsed.value = performance.now() - startAt.value), 100);
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
function finish() { solved.value = true; stopTimer(); elapsed.value = startAt.value ? performance.now() - startAt.value : 0; }

function scramble() {
  const inst = cubeStore.instance;
  if (!inst) return;
  reset(false);
  for (const t of parseSequence(randomScramble(25))) inst.applyInstant(t);
  scrambled.value = true;
}
function reset(toSolved = true) {
  const inst = cubeStore.instance;
  stopTimer();
  moves.value = 0; solved.value = false; startAt.value = 0; elapsed.value = 0;
  if (toSolved) { scrambled.value = false; if (inst) inst.reset(); }
}
function btn(name) {
  const inst = cubeStore.instance;
  if (!inst) return;
  if (viewRel.value && /^[FBUDLR]/.test(name)) { inst.viewMove(name); return; } // 面对视角的记号
  const tok = parseToken(name);
  if (tok) inst.userMove(tok);
}

const fmt = (ms) => (ms / 1000).toFixed(1) + "s";
const FACES = ["R", "L", "U", "D", "F", "B"];
const ROT = ["x", "y", "z"];

onMounted(() => {
  bind(cubeStore.instance);
  // 实例可能晚于本组件就绪
  watch(() => cubeStore.instance, (i) => bind(i));
});
onBeforeUnmount(() => {
  stopTimer();
  const inst = cubeStore.instance;
  if (inst) { inst.interactive = false; inst.onUserMove = null; }
});
</script>

<template>
  <div class="play">
    <p class="muted intro">
      <b>拖动魔方的一个面</b>就能转那一层(拖背景/空白处转视角、滚轮缩放),也可以用下面的按钮。
      魔方上浮着 <b>F/U/R…</b> 面标帮你认面;勾上「面对我的就是 F面」后,不管怎么转,正对你的那面永远算 F。
    </p>

    <div class="hud">
      <div class="stat"><span class="lab">步数</span><span class="val">{{ moves }}</span></div>
      <div class="stat"><span class="lab">用时</span><span class="val">{{ fmt(elapsed) }}</span></div>
      <div class="stat done" v-if="solved">🎉 还原啦!{{ moves }} 步 · {{ fmt(elapsed) }}</div>
      <div class="stat hint" v-else-if="!scrambled">点「打乱」开始</div>
    </div>

    <div class="ctrl">
      <button class="primary" @click="scramble">🎲 打乱</button>
      <button @click="reset(true)">⟲ 复位</button>
      <label class="vr"><input type="checkbox" v-model="viewRel" /> 🧭 面对我的就是 F面</label>
    </div>

    <!-- 按钮转法 -->
    <div class="pads">
      <div v-for="f in FACES" :key="f" class="prow">
        <button class="mv" @click="btn(f)">{{ f }}</button>
        <button class="mv" @click="btn(f + `'`)">{{ f }}'</button>
        <button class="mv" @click="btn(f + '2')">{{ f }}2</button>
      </div>
      <div class="prow rots">
        <span class="muted small">转视角</span>
        <button v-for="r in ROT" :key="r" class="mv rot" @click="btn(r)">{{ r }}</button>
        <button v-for="r in ROT" :key="r + 'p'" class="mv rot" @click="btn(r + `'`)">{{ r }}'</button>
      </div>
    </div>
    <p class="muted small tip">提示:拖动方向决定转哪一层、往哪转。想要还原帮助?去「还原助手」的「整方还原」。</p>
  </div>
</template>

<style scoped>
.play { display: flex; flex-direction: column; gap: 14px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0; }
.small { font-size: 12px; }
.hud { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; min-height: 40px; }
.stat { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 8px 14px; }
.stat .lab { font-size: 11px; color: var(--muted); margin-right: 8px; }
.stat .val { font-family: "Consolas", monospace; font-size: 18px; font-weight: 700; }
.stat.done { color: var(--good); font-weight: 700; border-color: #1a5a2e; background: #123a1e; }
.stat.hint { color: var(--muted); font-size: 13px; }
.ctrl { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.vr { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--muted); cursor: pointer; }
.vr input { accent-color: var(--accent); }
.pads { display: flex; flex-direction: column; gap: 8px; }
.prow { display: flex; gap: 8px; align-items: center; }
.prow.rots { margin-top: 4px; }
.mv {
  font-family: "Consolas", monospace; font-weight: 700; font-size: 16px;
  width: 56px; padding: 10px 0; text-align: center;
}
.mv.rot { width: 44px; font-size: 14px; opacity: 0.85; }
.tip { line-height: 1.6; margin: 2px 0 0; }
</style>

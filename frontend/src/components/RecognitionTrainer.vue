<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { api } from "../api.js";
import { cubeStore } from "../cube/store.js";
import { srsState, grade, summary, nextCard, statusOf } from "../cube/srs.js";
import CaseDiagram from "./CaseDiagram.vue";
import F2LDiagram from "./F2LDiagram.vue";

// 识别训练:闪识别图 → 回想公式 → 看答案 → 自评(间隔重复排期)。
const rootRef = ref(null);
const all = ref([]);
const deck = ref("oll"); // oll | pll | f2l | mix
const onlyDue = ref(false);
const current = ref(null);
const revealed = ref(false);
const shownAt = ref(0);
const recogMs = ref(0);
const now = ref(0);
const session = ref({ count: 0, times: [], good: 0 });

const DECKS = [
  { key: "oll", label: "OLL" },
  { key: "pll", label: "PLL" },
  { key: "f2l", label: "F2L" },
  { key: "mix", label: "OLL+PLL" },
];

const deckAlgs = computed(() => {
  const cats = deck.value === "mix" ? ["oll", "pll"] : [deck.value];
  return all.value.filter((a) => cats.includes(a.category));
});
const deckIds = computed(() => deckAlgs.value.map((a) => a.id));
const byId = computed(() => Object.fromEntries(all.value.map((a) => [a.id, a])));
const stats = computed(() => summary(deckIds.value, now.value || Date.now()));

const elapsed = computed(() => (revealed.value ? recogMs.value : Math.max(0, now.value - shownAt.value)));
const fmt = (ms) => (ms / 1000).toFixed(1) + "s";

let timer = null;
onMounted(async () => {
  all.value = await api.algorithms();
  pick();
  timer = setInterval(() => (now.value = Date.now()), 100);
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => { clearInterval(timer); window.removeEventListener("keydown", onKey); });

function pick() {
  const pool = onlyDue.value
    ? deckIds.value.filter((id) => !srsState.cards[id] || srsState.cards[id].dueAt <= Date.now())
    : deckIds.value;
  if (!pool.length) { current.value = null; return; }
  const id = nextCard(pool, current.value?.id);
  current.value = byId.value[id] || null;
  revealed.value = false;
  shownAt.value = Date.now();
}
function changeDeck(k) { deck.value = k; pick(); }
function reveal() {
  if (revealed.value || !current.value) return;
  recogMs.value = Date.now() - shownAt.value;
  revealed.value = true;
}
function doGrade(q) {
  if (!current.value) return;
  grade(current.value.id, q);
  session.value.count++;
  session.value.times.push(recogMs.value);
  if (q >= 4) session.value.good++;
  pick();
}
function demo() {
  if (!current.value) return;
  cubeStore.loadSequence(current.value.moves, { inverseSetup: true });
}

const avgTime = computed(() => {
  const t = session.value.times;
  return t.length ? fmt(t.reduce((a, b) => a + b, 0) / t.length) : "—";
});
const acc = computed(() => (session.value.count ? Math.round((session.value.good / session.value.count) * 100) : 0));

const STATUS_LABEL = { new: "新", learning: "在学", young: "巩固", mature: "熟练" };
const curStatus = computed(() => (current.value ? statusOf(current.value.id) : "new"));

// 键盘:空格 = 看答案 / 看答案后无操作;1忘了 2有点忘 3记得 4秒答
const visible = () => rootRef.value && rootRef.value.offsetParent !== null;
function onKey(e) {
  if (!visible()) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key === " " || e.key === "Enter") { if (!revealed.value) { reveal(); e.preventDefault(); } return; }
  if (revealed.value && ["1", "2", "3", "4"].includes(e.key)) {
    doGrade({ "1": 0, "2": 3, "3": 4, "4": 5 }[e.key]);
    e.preventDefault();
  }
}
</script>

<template>
  <div class="rt" ref="rootRef">
    <p class="muted intro">
      看<b>识别图</b>回想公式,记不起就点「看答案」,再如实自评。系统按<b>间隔重复</b>把你最不熟的优先推给你。
    </p>

    <!-- 牌组 + 统计 -->
    <div class="bar">
      <div class="decks">
        <button v-for="d in DECKS" :key="d.key" class="chip" :class="{ active: deck === d.key }" @click="changeDeck(d.key)">{{ d.label }}</button>
      </div>
      <label class="due"><input type="checkbox" v-model="onlyDue" @change="pick" /> 只练到期</label>
    </div>
    <div class="mastery muted">
      到期 <b class="hot">{{ stats.due }}</b> · 新 {{ stats.new }} · 在学 {{ stats.learning }} · 巩固 {{ stats.young }} · 熟练 {{ stats.mature }} / 共 {{ stats.total }}
      <span class="sess">本次已练 {{ session.count }} · 正确率 {{ acc }}% · 平均识别 {{ avgTime }}</span>
    </div>

    <!-- 卡片 -->
    <div v-if="current" class="card">
      <div class="diawrap">
        <F2LDiagram v-if="current.category === 'f2l'" :moves="current.moves" :size="150" />
        <CaseDiagram v-else :moves="current.moves" :size="150" />
      </div>
      <div class="timer">{{ fmt(elapsed) }}</div>

      <div v-if="!revealed" class="ask">
        <p class="muted small">这是哪个情形?想好用什么公式…</p>
        <button class="primary big" @click="reveal">看答案（空格）</button>
      </div>
      <div v-else class="ans">
        <div class="aname">{{ current.name }} <span class="st" :class="curStatus">{{ STATUS_LABEL[curStatus] }}</span></div>
        <div class="amoves">{{ current.moves }}</div>
        <button class="mini" @click="demo">▶ 载入 3D 演示</button>
        <div class="grades">
          <button class="g again" @click="doGrade(0)">忘了 <kbd>1</kbd></button>
          <button class="g hard" @click="doGrade(3)">有点忘 <kbd>2</kbd></button>
          <button class="g good" @click="doGrade(4)">记得 <kbd>3</kbd></button>
          <button class="g easy" @click="doGrade(5)">秒答 <kbd>4</kbd></button>
        </div>
      </div>
    </div>
    <div v-else class="done muted">
      🎉 {{ onlyDue ? "这组到期的都复习完了!" : "这一组没有公式。" }}
    </div>
  </div>
</template>

<style scoped>
.rt { display: flex; flex-direction: column; gap: 12px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0; }
.small { font-size: 12px; }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.decks { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 5px 12px; font-size: 13px; }
.chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.due { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 5px; cursor: pointer; }
.mastery { font-size: 12px; line-height: 1.7; }
.mastery .hot { color: var(--warn); }
.mastery .sess { display: block; margin-top: 2px; }
.card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px;
}
.diawrap { background: #0c0e14; border-radius: 8px; padding: 8px; }
.timer { font-family: "Consolas", monospace; font-size: 14px; color: var(--muted); }
.ask { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.big { padding: 10px 20px; font-size: 15px; }
.ans { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
.aname { font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.st { font-size: 11px; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
.st.learning { color: var(--warn); border-color: #5a401a; }
.st.young { color: var(--accent); }
.st.mature { color: var(--good); border-color: #1a5a2e; }
.amoves { font-family: "Consolas", monospace; font-size: 16px; font-weight: 700; color: var(--accent); text-align: center; word-break: break-word; }
.mini { padding: 5px 10px; font-size: 12px; }
.grades { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
.g { padding: 9px 14px; font-size: 14px; }
.g kbd { font-size: 10px; opacity: 0.7; border: 1px solid currentColor; border-radius: 3px; padding: 0 3px; margin-left: 3px; }
.g.again { color: var(--bad); border-color: #5a1a1a; }
.g.hard { color: var(--warn); border-color: #5a401a; }
.g.good { color: var(--accent); }
.g.easy { color: var(--good); border-color: #1a5a2e; }
.done { text-align: center; padding: 40px 0; font-size: 15px; }
</style>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import CubeViewer from "./components/CubeViewer.vue";
import MoveBar from "./components/MoveBar.vue";
import PlaybackBar from "./components/PlaybackBar.vue";
import NotationGuide from "./components/NotationGuide.vue";
import FingerTrickTrainer from "./components/FingerTrickTrainer.vue";
import AlgorithmLibrary from "./components/AlgorithmLibrary.vue";
import PracticePanel from "./components/PracticePanel.vue";
import SightRead from "./components/SightRead.vue";
import CrossTrainer from "./components/CrossTrainer.vue";
import RecognitionTrainer from "./components/RecognitionTrainer.vue";
import SpeedTimer from "./components/SpeedTimer.vue";
import PlayCube from "./components/PlayCube.vue";
import LastLayerSolver from "./components/LastLayerSolver.vue";
import { cubeStore } from "./cube/store.js";
import { srsState } from "./cube/srs.js";
import { settings, COLOR_HEX, COLOR_NAME, BOTTOM_CHOICES } from "./cube/settings.js";
import { api } from "./api.js";

// 复习提醒:已学过且到期的公式数(显示在「识别训练」标签上)
const tick = ref(Date.now());
let reviewTimer = null;
const reviewDue = computed(() =>
  Object.values(srsState.cards).filter((c) => c.dueAt <= tick.value).length
);

const showColors = ref(false);

const sections = [
  { key: "today", label: "今日", icon: "◎" },
  { key: "learn", label: "学习", icon: "◧" },
  { key: "train", label: "训练", icon: "◈" },
  { key: "solve", label: "实战", icon: "◉" },
  { key: "library", label: "公式库", icon: "▤" },
];
const sectionModes = {
  learn: [
    { key: "demo", label: "演示", icon: "▶" },
    { key: "notation", label: "符号", icon: "✱" },
    { key: "trick", label: "手法", icon: "✎" },
  ],
  train: [
    { key: "recog", label: "识别", icon: "❑" },
    { key: "practice", label: "跟练", icon: "✓" },
    { key: "sightread", label: "读谱", icon: "♪" },
    { key: "cross", label: "十字", icon: "✚" },
    { key: "timer", label: "计时", icon: "⏱" },
  ],
  solve: [
    { key: "play", label: "自由玩", icon: "◇" },
    { key: "solver", label: "还原助手", icon: "✜" },
  ],
};
const modeSection = Object.fromEntries(
  Object.entries(sectionModes).flatMap(([section, modes]) =>
    modes.map((mode) => [mode.key, section])
  )
);
modeSection.library = "library";

const activeSection = ref("today");
const activeMode = ref(null);
const currentModes = computed(() => sectionModes[activeSection.value] || []);
const currentAlg = ref({
  id: "sune",
  name: "小鱼(Sune)",
  category: "basics",
  alg: "Sune",
  moves: "R U R' U R U2 R'",
  desc: "翻顶层角块的招牌公式。点上方按钮播放,看每一步怎么转。",
});

// 空格 = 下一步(仅在用播放步进的标签;计时器/识别训练自己占用空格,排除)
const STEP_MODES = ["demo", "sightread", "cross", "solver"];
function onSpaceNext(e) {
  if (e.code !== "Space" || e.repeat) return;
  if (!STEP_MODES.includes(activeMode.value)) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  e.preventDefault();
  cubeStore.next();
}
onMounted(() => {
  cubeStore.loadSequence(currentAlg.value.moves, { inverseSetup: false });
  reviewTimer = setInterval(() => (tick.value = Date.now()), 30000);
  window.addEventListener("keydown", onSpaceNext);
});
onBeforeUnmount(() => {
  if (reviewTimer) clearInterval(reviewTimer);
  window.removeEventListener("keydown", onSpaceNext);
});

function selectSection(section) {
  activeSection.value = section;
  if (section === "today") {
    activeMode.value = null;
  } else if (section === "library") {
    activeMode.value = "library";
  } else {
    activeMode.value = sectionModes[section][0].key;
  }
}

function goMode(section, mode) {
  activeSection.value = section;
  activeMode.value = mode;
}

function handleSelect(alg, mode) {
  currentAlg.value = alg;
  if (mode === "practice") {
    goMode("train", "practice");
  } else {
    goMode("learn", "demo");
    cubeStore.loadSequence(alg.moves, { inverseSetup: cubeStore.inverseSetup });
  }
}

async function scramble() {
  const s = await api.scramble(20);
  currentAlg.value = {
    id: "scramble",
    name: "随机打乱",
    category: "basics",
    moves: s.moves,
    desc: "随机生成的打乱序列,可单步观察每一步。",
  };
  goMode("learn", "demo");
  cubeStore.loadSequence(s.moves, { inverseSetup: false });
}

// 切换模式时整理魔方状态
watch(activeMode, (mode) => {
  if (cubeStore.instance) {
    cubeStore.instance.interactive = mode === "play";
    cubeStore.instance.showLabels(mode === "play");
  }
  if (!mode || mode === "library") return;
  if (mode === "notation") {
    cubeStore.loadSequence("", { inverseSetup: false }); // 还原成纯净魔方
  } else if (mode === "play") {
    cubeStore.loadSequence("", { inverseSetup: false }); // 进入自由玩:先给一个干净魔方
  } else if (mode === "demo" && currentAlg.value) {
    cubeStore.loadSequence(currentAlg.value.moves, { inverseSetup: false });
  }
});
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="logo">🧊</span>
        <div>
          <div class="t1">魔方公式练习</div>
          <div class="t2 muted">认符号 · 看演示 · 跟着练</div>
        </div>
      </div>
      <nav class="tabs">
        <button
          v-for="section in sections"
          :key="section.key"
          class="tab section-tab"
          :class="{ active: activeSection === section.key }"
          @click="selectSection(section.key)"
        >
          <span class="ic">{{ section.icon }}</span>{{ section.label }}
          <span v-if="section.key === 'today' && reviewDue" class="badge">{{ reviewDue }}</span>
        </button>
        <div class="colorbox">
          <button class="tab" :class="{ active: showColors }" @click="showColors = !showColors">
            🎨 底色:{{ COLOR_NAME[settings.bottom] }}
          </button>
          <div v-if="showColors" class="colorpanel card">
            <div class="cp-title">底面是哪个颜色?</div>
            <div class="cp-grid">
              <button
                v-for="k in BOTTOM_CHOICES"
                :key="k"
                class="cp-sw"
                :class="{ on: settings.bottom === k }"
                :style="{ background: COLOR_HEX[k] }"
                :title="COLOR_NAME[k]"
                @click="settings.setBottom(k); showColors = false"
              >
                <span v-if="settings.bottom === k" class="chk">✓</span>
              </button>
            </div>
            <div class="cp-hint muted">其余面按标准配色自动转向(白↔黄、绿↔蓝、红↔橙)</div>
          </div>
        </div>
      </nav>
    </header>

    <main class="main">
      <!-- 左:3D 魔方 -->
      <section class="left">
        <div class="cube-wrap"><CubeViewer /></div>
        <MoveBar v-if="activeMode === 'demo'" />
      </section>

      <!-- 右:随场景变化的面板 -->
      <section class="right card">
        <!-- 今日 -->
        <div v-if="activeSection === 'today'" class="today">
          <div class="today-head">
            <div>
              <div class="panel-title">今日训练</div>
              <div class="panel-sub muted">复习优先 · 技术补强 · 实战保持</div>
            </div>
            <button class="primary" @click="goMode('train', 'recog')">
              开始复习
              <span v-if="reviewDue" class="btn-badge">{{ reviewDue }}</span>
            </button>
          </div>

          <div class="stats-row">
            <button class="stat-tile due" @click="goMode('train', 'recog')">
              <span class="stat-k">到期复习</span>
              <span class="stat-v">{{ reviewDue }}</span>
            </button>
            <button class="stat-tile" @click="goMode('train', 'practice')">
              <span class="stat-k">当前公式</span>
              <span class="stat-v name">{{ currentAlg.name }}</span>
            </button>
            <button class="stat-tile" @click="goMode('learn', 'demo')">
              <span class="stat-k">演示对象</span>
              <span class="stat-v moves">{{ currentAlg.moves }}</span>
            </button>
          </div>

          <div class="route-block">
            <div class="route-title">学习路径</div>
            <div class="route-steps">
              <button @click="goMode('library', 'library')">查公式</button>
              <button @click="goMode('learn', 'demo')">看演示</button>
              <button @click="goMode('train', 'practice')">跟练</button>
              <button @click="goMode('train', 'recog')">复习</button>
            </div>
          </div>

          <div class="quick-grid">
            <button class="quick-card primary-card" @click="goMode('train', 'recog')">
              <span class="quick-k">优先</span>
              <span class="quick-t">识别训练</span>
              <span class="quick-m">{{ reviewDue ? `${reviewDue} 个到期` : "维持记忆曲线" }}</span>
            </button>
            <button class="quick-card" @click="goMode('learn', 'trick')">
              <span class="quick-k">基础</span>
              <span class="quick-t">手法练习</span>
              <span class="quick-m">触发与手指节奏</span>
            </button>
            <button class="quick-card" @click="goMode('train', 'cross')">
              <span class="quick-k">规划</span>
              <span class="quick-t">十字训练</span>
              <span class="quick-m">打乱到最优十字</span>
            </button>
            <button class="quick-card" @click="goMode('solve', 'play')">
              <span class="quick-k">实战</span>
              <span class="quick-t">自由玩</span>
              <span class="quick-m">转层、计步、还原</span>
            </button>
          </div>
        </div>

        <!-- 公式库 -->
        <div v-else-if="activeSection === 'library'" class="libwrap">
          <AlgorithmLibrary @select="handleSelect" />
        </div>

        <!-- 学习 / 训练 / 实战 -->
        <div v-else class="mode-shell">
          <div class="modebar">
            <button
              v-for="mode in currentModes"
              :key="mode.key"
              class="mode-tab"
              :class="{ active: activeMode === mode.key }"
              @click="goMode(activeSection, mode.key)"
            >
              <span>{{ mode.icon }}</span>{{ mode.label }}
              <span v-if="mode.key === 'recog' && reviewDue" class="badge">{{ reviewDue }}</span>
            </button>
          </div>

          <!-- 演示 -->
          <div v-if="activeMode === 'demo'">
            <div class="alg-head">
              <div>
                <div class="alg-name">{{ currentAlg.name }}</div>
                <div class="alg-moves">{{ currentAlg.moves }}</div>
              </div>
              <button @click="scramble">🎲 随机打乱</button>
            </div>
            <p class="alg-desc muted">{{ currentAlg.desc }}</p>
            <PlaybackBar />
            <p class="muted small tip">
              想换公式?去「公式库」标签挑一个,点「演示」即可载入这里。
            </p>
          </div>

          <!-- 符号教学 -->
          <div v-if="activeMode === 'notation'">
            <NotationGuide />
          </div>

          <!-- 手法练习 -->
          <div v-if="activeMode === 'trick'">
            <FingerTrickTrainer />
          </div>

          <!-- 识别训练 -->
          <div v-if="activeMode === 'recog'">
            <RecognitionTrainer />
          </div>

          <!-- 跟练 -->
          <div v-if="activeMode === 'practice'">
            <PracticePanel :alg="currentAlg" />
          </div>

          <!-- 读谱执行 -->
          <div v-if="activeMode === 'sightread'">
            <SightRead />
          </div>

          <!-- 十字训练 -->
          <div v-if="activeMode === 'cross'">
            <CrossTrainer />
          </div>

          <!-- 计时器 -->
          <div v-if="activeMode === 'timer'">
            <SpeedTimer />
          </div>

          <!-- 玩魔方 -->
          <div v-if="activeMode === 'play'">
            <PlayCube />
          </div>

          <!-- 还原助手 -->
          <div v-if="activeMode === 'solver'">
            <LastLayerSolver />
          </div>
        </div>
      </section>
    </main>

    <footer class="foot muted">
      今日 · 学习 · 训练 · 实战 · 公式库 ·
      公式可在 <code>backend/src/data/algorithms.js</code> 中增改
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.brand { display: flex; align-items: center; gap: 12px; }
.logo { font-size: 32px; }
.t1 { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
.t2 { font-size: 12px; }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab { display: flex; align-items: center; gap: 6px; padding: 9px 14px; }
.section-tab { min-width: 72px; justify-content: center; }
.tab .ic { opacity: 0.8; }
.tab.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.badge { background: var(--warn); color: #1a1205; font-size: 11px; font-weight: 800; border-radius: 999px; padding: 0 6px; min-width: 16px; text-align: center; }
.btn-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 6px;
  border-radius: 999px;
  background: #fff;
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
}

.colorbox { position: relative; }
.colorpanel {
  position: absolute;
  right: 0;
  top: 110%;
  z-index: 20;
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
.cp-title { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.cp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cp-sw {
  height: 40px; border-radius: 8px; border: 2px solid var(--border); padding: 0;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.cp-sw.on { border-color: var(--text); box-shadow: 0 0 0 2px var(--accent); }
.cp-sw .chk { color: #000; font-weight: 900; text-shadow: 0 0 3px #fff; font-size: 16px; }
.cp-hint { font-size: 11px; line-height: 1.5; }

.main {
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: 16px;
  align-items: start;
}
.left { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 16px; }
.cube-wrap { height: 520px; }
.right { min-height: 520px; }
.libwrap { height: 560px; display: flex; }

.today { display: flex; flex-direction: column; gap: 16px; }
.today-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.panel-title { font-size: 22px; font-weight: 800; }
.panel-sub { font-size: 12px; margin-top: 4px; }
.stats-row {
  display: grid;
  grid-template-columns: 0.75fr 1.15fr 1.25fr;
  gap: 8px;
}
.stat-tile {
  min-height: 88px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  text-align: left;
  background: var(--panel-2);
}
.stat-tile.due {
  border-color: #6b5422;
  background: #2c2417;
}
.stat-k { color: var(--muted); font-size: 12px; }
.stat-v {
  width: 100%;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.15;
}
.stat-v.name {
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-v.moves {
  font-family: "Consolas", monospace;
  font-size: 13px;
  color: var(--accent);
  overflow-wrap: anywhere;
}
.route-block {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #171a24;
}
.route-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; }
.route-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.route-steps button { min-height: 42px; font-weight: 700; }
.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.quick-card {
  min-height: 104px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  text-align: left;
  background: #171a24;
}
.quick-card.primary-card {
  border-color: var(--accent);
  background: #16233a;
}
.quick-k { color: var(--muted); font-size: 11px; }
.quick-t { font-size: 17px; font-weight: 800; }
.quick-m { color: var(--muted); font-size: 12px; line-height: 1.35; }

.mode-shell { display: flex; flex-direction: column; gap: 14px; }
.modebar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.mode-tab {
  min-width: 72px;
  padding: 7px 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
}
.mode-tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.alg-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.alg-name { font-size: 19px; font-weight: 700; }
.alg-moves {
  font-family: "Consolas", monospace;
  font-size: 15px;
  color: var(--accent);
  margin-top: 4px;
  word-break: break-word;
}
.alg-desc { font-size: 13px; line-height: 1.6; margin: 12px 0 16px; }
.tip { margin-top: 14px; font-size: 12px; }
.small { font-size: 12px; }

.foot { font-size: 12px; text-align: center; padding-top: 4px; }
code {
  background: var(--panel-2);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: "Consolas", monospace;
}

@media (max-width: 900px) {
  .main { grid-template-columns: 1fr; }
  .left { position: static; }
  .right { min-height: auto; }
  .libwrap { height: auto; }
  .stats-row,
  .quick-grid,
  .route-steps {
    grid-template-columns: 1fr;
  }
  .today-head { flex-direction: column; }
}
</style>

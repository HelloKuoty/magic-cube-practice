<script setup>
import { ref, onMounted, watch, computed } from "vue";
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
setInterval(() => (tick.value = Date.now()), 30000);
const reviewDue = computed(() =>
  Object.values(srsState.cards).filter((c) => c.dueAt <= tick.value).length
);

const showColors = ref(false);

const tabs = [
  { key: "demo", label: "观看演示", icon: "▶" },
  { key: "play", label: "玩魔方", icon: "🎮" },
  { key: "notation", label: "符号教学", icon: "✱" },
  { key: "trick", label: "手法练习", icon: "🤙" },
  { key: "practice", label: "跟练打分", icon: "✎" },
  { key: "recog", label: "识别训练", icon: "❑" },
  { key: "sightread", label: "读谱执行", icon: "♪" },
  { key: "cross", label: "十字训练", icon: "✚" },
  { key: "timer", label: "计时器", icon: "⏱" },
  { key: "solver", label: "还原助手", icon: "✜" },
  { key: "library", label: "公式库", icon: "▤" },
];
const activeTab = ref("demo");
const currentAlg = ref({
  id: "sune",
  name: "小鱼(Sune)",
  category: "basics",
  alg: "Sune",
  moves: "R U R' U R U2 R'",
  desc: "翻顶层角块的招牌公式。点上方按钮播放,看每一步怎么转。",
});

onMounted(() => {
  cubeStore.loadSequence(currentAlg.value.moves, { inverseSetup: false });
});

function handleSelect(alg, mode) {
  currentAlg.value = alg;
  if (mode === "practice") {
    activeTab.value = "practice";
  } else {
    activeTab.value = "demo";
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
  activeTab.value = "demo";
  cubeStore.loadSequence(s.moves, { inverseSetup: false });
}

// 切换标签时整理魔方状态
watch(activeTab, (tab) => {
  // 只有「玩魔方」开启拖动转层 + 面标,其它模式拖动只转视角
  if (cubeStore.instance) {
    cubeStore.instance.interactive = tab === "play";
    cubeStore.instance.showLabels(tab === "play");
  }
  if (tab === "notation") {
    cubeStore.loadSequence("", { inverseSetup: false }); // 还原成纯净魔方
  } else if (tab === "play") {
    cubeStore.loadSequence("", { inverseSetup: false }); // 进入自由玩:先给一个干净魔方
  } else if (tab === "demo" && currentAlg.value) {
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
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key"
        >
          <span class="ic">{{ t.icon }}</span>{{ t.label }}
          <span v-if="t.key === 'recog' && reviewDue" class="badge">{{ reviewDue }}</span>
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
        <MoveBar v-if="activeTab === 'demo'" />
      </section>

      <!-- 右:随标签变化的面板 -->
      <section class="right card">
        <!-- 演示 -->
        <div v-show="activeTab === 'demo'">
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

        <!-- 玩魔方 -->
        <div v-show="activeTab === 'play'">
          <PlayCube />
        </div>

        <!-- 符号教学 -->
        <div v-show="activeTab === 'notation'">
          <NotationGuide />
        </div>

        <!-- 手法练习 -->
        <div v-show="activeTab === 'trick'">
          <FingerTrickTrainer />
        </div>

        <!-- 跟练 -->
        <div v-show="activeTab === 'practice'">
          <PracticePanel :alg="currentAlg" />
        </div>

        <!-- 识别训练 -->
        <div v-show="activeTab === 'recog'">
          <RecognitionTrainer />
        </div>

        <!-- 读谱执行 -->
        <div v-show="activeTab === 'sightread'">
          <SightRead />
        </div>

        <!-- 十字训练 -->
        <div v-show="activeTab === 'cross'">
          <CrossTrainer />
        </div>

        <!-- 计时器 -->
        <div v-show="activeTab === 'timer'">
          <SpeedTimer />
        </div>

        <!-- 还原助手(手动输入最后一层 -> 出公式) -->
        <div v-show="activeTab === 'solver'">
          <LastLayerSolver />
        </div>

        <!-- 公式库 -->
        <div v-show="activeTab === 'library'" class="libwrap">
          <AlgorithmLibrary @select="handleSelect" />
        </div>
      </section>
    </main>

    <footer class="foot muted">
      前后端分离 · Express + Vue3 + Three.js ·
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
.tab .ic { opacity: 0.8; }
.tab.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.badge { background: var(--warn); color: #1a1205; font-size: 11px; font-weight: 800; border-radius: 999px; padding: 0 6px; min-width: 16px; text-align: center; }

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
}
</style>

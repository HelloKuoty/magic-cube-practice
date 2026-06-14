<script setup>
import { ref, onMounted, computed } from "vue";
import { api } from "../api.js";
import { cubeStore } from "../cube/store.js";
import { parseToken } from "../cube/moves.js";

const items = ref([]);
const active = ref(null);

onMounted(async () => {
  items.value = await api.notation();
});

const groups = computed(() => {
  const map = {};
  for (const it of items.value) {
    (map[it.group] ||= []).push(it);
  }
  return Object.entries(map).map(([name, list]) => ({ name, list }));
});

function hover(it) {
  if (!it.face || !cubeStore.instance || cubeStore.busy) return;
  const tok = parseToken(it.face);
  if (tok) cubeStore.instance.highlightLayer(tok.axis, tok.layers);
}
function leave() {
  if (cubeStore.instance) cubeStore.instance.clearHighlight();
}
async function demo(it) {
  active.value = it.symbol;
  if (!it.face) return; // 修饰符无单独演示
  cubeStore.loadSequence(it.face, { inverseSetup: false });
  await cubeStore.next();
}
</script>

<template>
  <div class="guide">
    <p class="muted intro">
      点击任意符号,魔方会<b>演示这一步怎么转</b>;鼠标悬停会高亮对应的层。先把这些基础符号认熟,再去练公式。
    </p>

    <div v-for="g in groups" :key="g.name" class="group">
      <div class="group-title">{{ g.name }}</div>
      <div class="items">
        <button
          v-for="it in g.list"
          :key="it.symbol"
          class="sym"
          :class="{ active: active === it.symbol, nodemo: !it.face }"
          @mouseenter="hover(it)"
          @mouseleave="leave"
          @click="demo(it)"
        >
          <span class="code">{{ it.symbol }}</span>
          <span class="name">{{ it.name }}</span>
        </button>
      </div>
    </div>

    <div class="detail card" v-if="active">
      <template v-for="it in items" :key="it.symbol">
        <div v-if="it.symbol === active">
          <div class="d-head">
            <span class="code big">{{ it.symbol }}</span>
            <span class="d-name">{{ it.name }}</span>
            <span class="tag">{{ it.group }}</span>
          </div>
          <p class="d-desc">{{ it.desc }}</p>
          <p class="muted small" v-if="it.face">提示:加 <code>'</code> 表示逆时针,加 <code>2</code> 表示转两下。</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.guide { display: flex; flex-direction: column; gap: 14px; }
.intro { font-size: 13px; line-height: 1.6; margin: 0; }
.group-title {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
  font-weight: 600;
}
.items { display: flex; flex-wrap: wrap; gap: 8px; }
.sym {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
  padding: 8px 10px;
}
.sym.nodemo { opacity: 0.85; }
.sym.active {
  border-color: var(--accent);
  background: #243049;
}
.code {
  font-family: "Consolas", monospace;
  font-weight: 700;
  font-size: 17px;
}
.code.big { font-size: 26px; }
.name { font-size: 11px; color: var(--muted); }
.detail { margin-top: 4px; }
.d-head { display: flex; align-items: center; gap: 10px; }
.d-name { font-size: 16px; font-weight: 600; }
.d-desc { line-height: 1.7; margin: 10px 0 6px; }
.small { font-size: 12px; }
code {
  background: var(--panel-2);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: "Consolas", monospace;
}
</style>

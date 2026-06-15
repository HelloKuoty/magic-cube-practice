<script setup>
import { ref, onMounted, computed } from "vue";
import { api } from "../api.js";
import CaseDiagram from "./CaseDiagram.vue";
import F2LDiagram from "./F2LDiagram.vue";

const emit = defineEmits(["select"]);

const categories = ref([]);
const all = ref([]);
const activeCat = ref("all");
const keyword = ref("");

onMounted(async () => {
  categories.value = await api.categories();
  all.value = await api.algorithms();
});

const filtered = computed(() => {
  let list = all.value;
  if (activeCat.value !== "all") list = list.filter((a) => a.category === activeCat.value);
  const kw = keyword.value.trim().toLowerCase();
  if (kw)
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(kw) ||
        (a.alg && a.alg.toLowerCase().includes(kw)) ||
        a.moves.toLowerCase().includes(kw)
    );
  return list;
});

function catName(key) {
  return categories.value.find((c) => c.key === key)?.name || key;
}
</script>

<template>
  <div class="lib">
    <div class="filters">
      <input v-model="keyword" placeholder="搜索公式名 / 字母 / 转动…" class="search" />
      <div class="cats">
        <button class="chip" :class="{ active: activeCat === 'all' }" @click="activeCat = 'all'">
          全部
        </button>
        <button
          v-for="c in categories"
          :key="c.key"
          class="chip"
          :class="{ active: activeCat === c.key }"
          @click="activeCat = c.key"
        >
          {{ c.name }}
        </button>
      </div>
    </div>

    <div class="count muted">共 {{ filtered.length }} 个公式</div>

    <div class="list">
      <div v-for="a in filtered" :key="a.id" class="item">
        <F2LDiagram v-if="a.category === 'f2l'" :moves="a.moves" :size="62" class="thumb" title="起始情形(F2L 立体图)" />
        <CaseDiagram v-else :moves="a.moves" :size="58" class="thumb" title="起始情形(最后一层)" />
        <div class="info">
          <div class="line1">
            <span class="aname">{{ a.name }}</span>
            <span class="tag">{{ catName(a.category) }}</span>
          </div>
          <div class="moves">{{ a.moves }}</div>
          <div class="desc muted">{{ a.desc }}</div>
        </div>
        <div class="actions">
          <button class="primary" @click="emit('select', a, 'demo')">▶ 演示</button>
          <button @click="emit('select', a, 'practice')">✎ 跟练</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lib { display: flex; flex-direction: column; gap: 12px; height: 100%; }
.search { width: 100%; }
.cats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip { padding: 5px 12px; font-size: 13px; }
.chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.count { font-size: 12px; }
.list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.thumb { margin-top: 2px; }
.info { flex: 1; min-width: 0; }
.line1 { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.aname { font-weight: 600; font-size: 15px; }
.moves {
  font-family: "Consolas", monospace;
  font-size: 14px;
  color: var(--accent);
  margin-bottom: 4px;
  word-break: break-word;
}
.desc { font-size: 12px; line-height: 1.5; }
.actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.actions button { white-space: nowrap; }
</style>

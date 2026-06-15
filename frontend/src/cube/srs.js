// 极简间隔重复(SM-2 简化版),按公式 id 记忆熟练度,存 localStorage。
// 评分 q:0=忘了 / 3=有点忘 / 4=记得 / 5=秒答。
import { reactive } from "vue";

const KEY = "magiccube.srs";
const DAY = 86400000;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
// 用响应式包一层,组件能随评分实时更新统计
export const srsState = reactive({ cards: read() });
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(srsState.cards)); } catch {}
}

export function getCard(id) { return srsState.cards[id] || null; }

// 状态:new(没练过)/ learning(刚学/忘了重练)/ young(<14 天)/ mature(>=14 天)
export function statusOf(id) {
  const c = srsState.cards[id];
  if (!c) return "new";
  if (c.reps === 0) return "learning";
  return c.intervalDays >= 14 ? "mature" : "young";
}

export function isDue(id, now = Date.now()) {
  const c = srsState.cards[id];
  return !c || c.dueAt <= now;
}

export function grade(id, q, now = Date.now()) {
  const c = srsState.cards[id]
    ? { ...srsState.cards[id] }
    : { ef: 2.5, reps: 0, intervalDays: 0, lapses: 0, lastSeen: 0 };
  if (q < 3) {
    c.reps = 0;
    c.intervalDays = 0;
    c.lapses = (c.lapses || 0) + 1;
    c.dueAt = now; // 忘了:留在到期池,稍后再练
  } else {
    c.reps += 1;
    if (c.reps === 1) c.intervalDays = 1;
    else if (c.reps === 2) c.intervalDays = 3;
    else c.intervalDays = Math.max(1, Math.round(c.intervalDays * c.ef));
    c.ef = Math.max(1.3, c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    c.dueAt = now + c.intervalDays * DAY;
  }
  c.lastSeen = now;
  srsState.cards = { ...srsState.cards, [id]: c };
  persist();
  return c;
}

// 统计某一组 id 的掌握情况
export function summary(ids, now = Date.now()) {
  let neww = 0, learning = 0, young = 0, mature = 0, due = 0;
  for (const id of ids) {
    const s = statusOf(id);
    if (s === "new") neww++;
    else if (s === "learning") learning++;
    else if (s === "young") young++;
    else mature++;
    if (isDue(id, now)) due++;
  }
  return { total: ids.length, new: neww, learning, young, mature, due };
}

// 选下一张:优先到期(忘了的最久没练的先来),其次没练过的;避免紧接重复同一张
export function nextCard(ids, exclude = null, now = Date.now()) {
  const dueCards = ids
    .filter((id) => id !== exclude && isDue(id, now))
    .sort((a, b) => (srsState.cards[a]?.dueAt || 0) - (srsState.cards[b]?.dueAt || 0));
  if (dueCards.length) {
    // 没练过的混在到期里:优先没练过的(dueAt=0 视为最早)其实已排前
    return dueCards[0];
  }
  // 都不到期:挑 interval 最小(最不熟)的,排除刚看过的
  const pool = ids.filter((id) => id !== exclude);
  if (!pool.length) return exclude;
  return pool.sort((a, b) => (srsState.cards[a]?.intervalDays || 0) - (srsState.cards[b]?.intervalDays || 0))[0];
}

export function resetAll() {
  srsState.cards = {};
  persist();
}

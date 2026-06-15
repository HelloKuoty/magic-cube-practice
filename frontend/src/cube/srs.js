// 间隔重复:FSRS-4.5(同等记忆保持率下比 SM-2 复习量更少;调研结论的 1 号改进)。
// 按公式 id 记每张卡的 稳定度 S(天)、难度 D(1-10),按遗忘曲线排下次复习。
// 评分 q(沿用识别训练按钮):0=忘了 / 3=有点忘 / 4=记得 / 5=秒答
//   -> FSRS 评级 g:1=Again / 2=Hard / 3=Good / 4=Easy
import { reactive } from "vue";

const KEY = "magiccube.srs";
const DAY = 86400000;

// FSRS-4.5 默认权重(open-spaced-repetition 通用默认值)
const W = [0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567];
const DECAY = -0.5;
const FACTOR = 19 / 81; // 使 interval=S 时保持率=90%
const REQUEST_R = 0.9; // 目标记忆保持率

const clampD = (d) => Math.min(Math.max(d, 1), 10);
const initS = (g) => Math.max(W[g - 1], 0.1);
const initD = (g) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);
const nextD = (D, g) => clampD(W[7] * initD(4) + (1 - W[7]) * (D - W[6] * (g - 3))); // 向 D0(Easy) 均值回归
const retrievability = (t, S) => Math.pow(1 + FACTOR * t / S, DECAY);
function nextInterval(S) {
  const ivl = (S / FACTOR) * (Math.pow(REQUEST_R, 1 / DECAY) - 1);
  return Math.min(Math.max(Math.round(ivl), 1), 365 * 4);
}
function successS(D, S, R, g) {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return S * (1 + Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * hard * easy);
}
const lapseS = (D, S, R) => Math.min(W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R)), S);
const ratingOf = (q) => (q < 3 ? 1 : q === 3 ? 2 : q === 4 ? 3 : 4);

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
// 用响应式包一层,组件能随评分实时更新统计
export const srsState = reactive({ cards: read() });
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(srsState.cards)); } catch {}
}

export function getCard(id) { return srsState.cards[id] || null; }

// 状态:new(没练过)/ learning(刚学/忘了,稳定度<1天)/ young(<21天)/ mature(>=21天)
export function statusOf(id) {
  const c = srsState.cards[id];
  if (!c || c.S === undefined) return "new";
  if (c.S < 1) return "learning";
  return c.S >= 21 ? "mature" : "young";
}

export function isDue(id, now = Date.now()) {
  const c = srsState.cards[id];
  return !c || c.dueAt <= now;
}

export function grade(id, q, now = Date.now()) {
  const g = ratingOf(q);
  const prev = srsState.cards[id];
  let S, D, reps, lapses;
  if (!prev || prev.S === undefined) {
    // 首评(或从旧 SM-2 卡平滑迁移)
    S = initS(g);
    D = initD(g);
    reps = 1;
    lapses = g === 1 ? 1 : 0;
  } else {
    const t = Math.max(0, (now - (prev.last || now)) / DAY);
    const R = retrievability(t, prev.S);
    D = nextD(prev.D, g);
    if (g === 1) { S = lapseS(prev.D, prev.S, R); lapses = (prev.lapses || 0) + 1; }
    else { S = successS(prev.D, prev.S, R, g); lapses = prev.lapses || 0; }
    reps = (prev.reps || 0) + 1;
  }
  S = Math.max(S, 0.1);
  const intervalDays = nextInterval(S);
  const dueAt = g === 1 ? now : now + intervalDays * DAY; // 忘了:留在到期池,本次继续练
  const c = { S, D, reps, lapses, intervalDays, dueAt, last: now };
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

// 选下一张:优先到期(到期最久的先来),其次没练过的;再不行挑最不稳的;避免紧接重复同一张
export function nextCard(ids, exclude = null, now = Date.now()) {
  const dueCards = ids
    .filter((id) => id !== exclude && isDue(id, now))
    .sort((a, b) => (srsState.cards[a]?.dueAt || 0) - (srsState.cards[b]?.dueAt || 0));
  if (dueCards.length) return dueCards[0];
  const pool = ids.filter((id) => id !== exclude);
  if (!pool.length) return exclude;
  return pool.sort((a, b) => (srsState.cards[a]?.S || 0) - (srsState.cards[b]?.S || 0))[0];
}

export function resetAll() {
  srsState.cards = {};
  persist();
}

import { reactive, markRaw } from "vue";
import { parseSequence, invertToken, invertSequence } from "./moves.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 全局共享的魔方播放状态。CubeViewer 挂载后调用 setInstance 注入 Three.js 实例。
export const cubeStore = reactive({
  instance: null,
  _pending: null, // 实例就绪前暂存的加载请求

  movesStr: "",
  parsed: [], // 解析后的 token 数组
  cursor: 0, // 已经执行到第几步
  playing: false,
  busy: false,
  speed: 450, // 每步动画毫秒
  gap: 70, // 连播时每步之间的停顿
  inverseSetup: false, // 是否先做逆操作铺场(这样正向播放会复原)

  setInstance(inst) {
    // 关键:用 markRaw 阻止 Vue 把 Three.js 对象变成响应式 Proxy,
    // 否则 WebGLRenderer 渲染被代理的场景图会报 modelViewMatrix 错误。
    this.instance = markRaw(inst);
    if (this._pending) {
      const p = this._pending;
      this._pending = null;
      this.loadSequence(p.movesStr, { inverseSetup: p.inverseSetup, setupMoves: p.setupMoves });
    }
  },

  get canonicalMoves() {
    return this.parsed.map((p) => p.canonical);
  },

  setupMoves: "", // 可选:开播前先「瞬间」施加的铺场序列(如打乱),正向播放 parsed 即在此基础上进行

  loadSequence(movesStr, { inverseSetup = this.inverseSetup, setupMoves = "" } = {}) {
    if (!this.instance) {
      this._pending = { movesStr, inverseSetup, setupMoves };
      return;
    }
    this.pause();
    this.movesStr = movesStr;
    this.parsed = parseSequence(movesStr);
    this.setupMoves = setupMoves;
    this.inverseSetup = setupMoves ? false : inverseSetup; // 显式铺场优先
    this.cursor = 0;
    this.instance.reset();
    this._applySetup();
  },

  _applySetup() {
    if (this.setupMoves) {
      for (const t of parseSequence(this.setupMoves)) this.instance.applyInstant(t);
    } else if (this.inverseSetup) {
      for (const t of invertSequence(this.parsed)) this.instance.applyInstant(t);
    }
  },

  async setInverseSetup(val) {
    this.inverseSetup = val;
    await this.reset();
  },

  async next() {
    if (!this.instance || this.busy || this.cursor >= this.parsed.length) return;
    this.busy = true;
    const tok = this.parsed[this.cursor];
    await this.instance.runMove(tok, this.speed);
    this.cursor++;
    this.busy = false;
  },

  async prev() {
    if (!this.instance || this.busy || this.cursor <= 0) return;
    this.busy = true;
    this.cursor--;
    const tok = this.parsed[this.cursor];
    await this.instance.runMove(invertToken(tok), this.speed);
    this.busy = false;
  },

  async play() {
    if (!this.instance || this.playing || !this.parsed.length) return;
    if (this.cursor >= this.parsed.length) await this.reset();
    this.playing = true;
    while (this.playing && this.cursor < this.parsed.length) {
      await this.next();
      if (this.playing && this.cursor < this.parsed.length) await sleep(this.gap);
    }
    this.playing = false;
  },

  pause() {
    this.playing = false;
  },

  async reset() {
    if (!this.instance) return;
    this.pause();
    // 等待可能在途的一步结束
    while (this.busy) await sleep(20);
    this.instance.reset();
    if (this.inverseSetup) this._applySetup();
    this.cursor = 0;
  },

  setSpeed(ms) {
    this.speed = ms;
  },

  // 通用执行(供「跟练」模式调用),返回是否成功执行
  async exec(tok, duration = this.speed) {
    if (!this.instance || this.busy) return false;
    this.busy = true;
    await this.instance.runMove(tok, duration);
    this.busy = false;
    return true;
  },
});

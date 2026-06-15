import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { settings } from "./settings.js"; // 可自定义配色(含底色)

const SPACING = 1.0;
const CUBIE = 0.94;

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class RubiksCube {
  constructor(canvas) {
    this.canvas = canvas;
    this.cubies = [];
    this.homes = new Map(); // cubie -> 原始整数坐标 {x,y,z}
    this._tween = null;
    this._highlight = null;
    this._raf = null;
    // 自由玩:拖动一个面来转层
    this.raycaster = new THREE.Raycaster();
    this.interactive = false;
    this.onUserMove = null; // 用户转一步后的回调(传入 token)
    this._drag = null;
    this._grabbed = false;
    // 面标(F/U/R…)与「面对视角」记号
    this._labelsVisible = false;
    this.labelMode = "view"; // view = 面对你的当 F;world = 固定世界方向
    this._labelSprites = [];

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(5, 6, 6.8); // 略微抬高,白色顶面看得更清楚
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 16;
    this.controls.rotateSpeed = 0.8;
    this.controls.enableDamping = false; // 按需渲染,不用阻尼连续帧
    // 拖动 / 缩放时重绘一帧;面对视角的面标随视角更新
    this.controls.addEventListener("change", () => {
      if (this._labelsVisible && this.labelMode === "view") this._updateLabels();
      else this._renderOnce();
    });

    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);

    this._loop = this._loop.bind(this);
    // 标签页重新可见时,继续推进可能被节流暂停的动画
    this._onVisible = () => { if (!document.hidden && this._tween) this._kick(); };
    document.addEventListener("visibilitychange", this._onVisible);

    // 拖动转层:在捕获阶段拦截,命中小块则自己处理并阻止 OrbitControls 转视角
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    canvas.addEventListener("pointerdown", this._onDown, { capture: true });
    window.addEventListener("pointermove", this._onMove);
    window.addEventListener("pointerup", this._onUp);

    this._buildCube();
    this._buildLabels();
    this.resize();
    this._renderOnce();
  }

  // ---------- 自由玩:拖动一个面转层 ----------
  _pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.cubies, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const n = hit.face.normal.clone().applyQuaternion(hit.object.quaternion);
    const comp = [n.x, n.y, n.z];
    const ai = comp.map(Math.abs).indexOf(Math.max(...comp.map(Math.abs)));
    const normal = [0, 0, 0];
    normal[ai] = Math.sign(comp[ai]);
    const p = hit.object.position;
    const cubiePos = [Math.round(p.x / SPACING), Math.round(p.y / SPACING), Math.round(p.z / SPACING)];
    return { normal, cubiePos };
  }

  // 屏幕上某世界方向的近似像素方向(y 向下)
  _screenDir(v) {
    const a = new THREE.Vector3(0, 0, 0).project(this.camera);
    const b = new THREE.Vector3(v[0], v[1], v[2]).project(this.camera);
    return { x: b.x - a.x, y: -(b.y - a.y) };
  }

  // 把一次拖动换成转层 token
  _dragToMove(drag, dx, dy) {
    const N = drag.normal;
    const nAxis = N.findIndex((v) => v !== 0);
    const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const inPlane = axes.filter((_, i) => i !== nAxis);
    let best = null;
    for (const e of inPlane) {
      const s = this._screenDir(e);
      for (const sgn of [1, -1]) {
        const dot = dx * s.x * sgn + dy * s.y * sgn;
        if (!best || dot > best.dot) best = { dot, A: e.map((c) => c * sgn) };
      }
    }
    const A = best.A;
    // 旋转轴 = N × A
    const R = [N[1] * A[2] - N[2] * A[1], N[2] * A[0] - N[0] * A[2], N[0] * A[1] - N[1] * A[0]];
    const ri = R.findIndex((v) => v !== 0);
    const axis = ["x", "y", "z"][ri];
    const layer = drag.cubiePos[ri];
    // 绕 ω=N×A 转 +90° 让抓住的贴纸朝拖动方向走(贴纸跟手);换算到模型正轴即 sign(R[ri])·90°
    const angle = Math.sign(R[ri]) * (Math.PI / 2);
    return { axis, layers: [layer], angle, canonical: "" };
  }

  _onDown(e) {
    if (!this.interactive || this._tween || e.button !== 0) return;
    const drag = this._pick(e.clientX, e.clientY);
    if (!drag) return; // 没点到方块 -> 交给 OrbitControls 转视角
    e.stopPropagation();
    e.preventDefault();
    this.controls.enabled = false; // 抓住方块期间禁用转视角,松手才恢复
    this._grabbed = true;
    this._drag = { ...drag, x0: e.clientX, y0: e.clientY };
  }

  _onMove(e) {
    if (!this._drag) return;
    const dx = e.clientX - this._drag.x0, dy = e.clientY - this._drag.y0;
    if (Math.hypot(dx, dy) < 12) return; // 阈值,避免误触
    const tok = this._dragToMove(this._drag, dx, dy);
    this._drag = null; // 一次手势只转一步;视角保持锁定,避免转完面后又被拖着转视角
    if (tok) this.runMove(tok, 180).then(() => { if (this.onUserMove) this.onUserMove(tok); });
  }

  _onUp() {
    this._drag = null;
    if (this._grabbed) { this._grabbed = false; this.controls.enabled = true; }
  }

  // 供按钮调用:执行一个记号(如 "R" "U'"),完成后回调
  userMove(tok) {
    if (this._tween) this._finishTween();
    return this.runMove(tok, 200).then(() => { if (this.onUserMove) this.onUserMove(tok); });
  }

  // ---------- 面标(F/U/R…)+「面对视角」记号 ----------
  // 当前视角下,哪个世界面是 F/U/R(取与「朝向相机/上/右」最接近的轴),其余取反
  _viewFrame() {
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const e = this.camera.matrixWorld.elements;
    const right = [e[0], e[1], e[2]];
    const up = [e[4], e[5], e[6]];
    const cp = this.camera.position;
    const tl = Math.hypot(cp.x, cp.y, cp.z) || 1;
    const toward = [cp.x / tl, cp.y / tl, cp.z / tl];
    const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const nearest = (d) => AXES.reduce((b, a) => (dot(a, d) > dot(b, d) ? a : b));
    const F = nearest(toward), U = nearest(up), R = nearest(right);
    return { F, U, R, B: F.map((v) => -v), D: U.map((v) => -v), L: R.map((v) => -v) };
  }

  // 按「面对视角」的记号转动:面对你的是 F,不管魔方/视角怎么转
  viewMove(notation) {
    const m = /^([FBUDLR])(['2]?)$/.exec(notation);
    if (!m) return Promise.resolve();
    const a = this._viewFrame()[m[1]];
    const i = a.findIndex((v) => v !== 0);
    const comp = a[i];
    let angle = -comp * (Math.PI / 2); // 从该面外侧看顺时针
    if (m[2] === "'") angle = -angle;
    if (m[2] === "2") angle = Math.PI;
    return this.userMove({ axis: ["x", "y", "z"][i], layers: [comp], angle, canonical: notation });
  }

  _letterTexture(ch) {
    const c = document.createElement("canvas");
    c.width = c.height = 72;
    const x = c.getContext("2d");
    x.beginPath(); x.arc(36, 36, 30, 0, Math.PI * 2);
    x.fillStyle = "rgba(12,14,20,0.82)"; x.fill();
    x.lineWidth = 3; x.strokeStyle = "rgba(255,255,255,0.85)"; x.stroke();
    x.fillStyle = "#fff"; x.font = "bold 40px system-ui, sans-serif";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(ch, 36, 39);
    const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }
  _buildLabels() {
    this._letterTex = {};
    for (const ch of ["F", "B", "U", "D", "L", "R"]) this._letterTex[ch] = this._letterTexture(ch);
    const D = 1.95;
    const faces = [
      { axisVec: [1, 0, 0], pos: [D, 0, 0] }, { axisVec: [-1, 0, 0], pos: [-D, 0, 0] },
      { axisVec: [0, 1, 0], pos: [0, D, 0] }, { axisVec: [0, -1, 0], pos: [0, -D, 0] },
      { axisVec: [0, 0, 1], pos: [0, 0, D] }, { axisVec: [0, 0, -1], pos: [0, 0, -D] },
    ];
    this._labelSprites = faces.map((f) => {
      const mat = new THREE.SpriteMaterial({ transparent: true });
      const sp = new THREE.Sprite(mat);
      sp.position.set(f.pos[0], f.pos[1], f.pos[2]);
      sp.scale.set(0.62, 0.62, 0.62);
      sp.visible = false;
      this.scene.add(sp);
      return { axisVec: f.axisVec, sprite: sp };
    });
  }
  showLabels(b) {
    this._labelsVisible = b;
    if (b) this._updateLabels();
    else { this._labelSprites.forEach((l) => (l.sprite.visible = false)); this._renderOnce(); }
  }
  setLabelMode(m) { this.labelMode = m; if (this._labelsVisible) this._updateLabels(); }
  _updateLabels() {
    if (!this._labelsVisible) return;
    let letterOf;
    if (this.labelMode === "world") {
      const M = { "1,0,0": "R", "-1,0,0": "L", "0,1,0": "U", "0,-1,0": "D", "0,0,1": "F", "0,0,-1": "B" };
      letterOf = (v) => M[v.join(",")];
    } else {
      const fr = this._viewFrame();
      const inv = {};
      for (const k of ["F", "B", "U", "D", "L", "R"]) inv[fr[k].join(",")] = k;
      letterOf = (v) => inv[v.join(",")];
    }
    for (const l of this._labelSprites) {
      const ch = letterOf(l.axisVec);
      l.sprite.material.map = ch ? this._letterTex[ch] : null;
      l.sprite.material.needsUpdate = true;
      l.sprite.visible = !!ch;
    }
    this._renderOnce();
  }

  // 某块各面应有的颜色(按 home 位置 + 当前配色)
  _faceColors(h, C) {
    return [
      h.x === 1 ? C.R : C.inner,
      h.x === -1 ? C.L : C.inner,
      h.y === 1 ? C.U : C.inner,
      h.y === -1 ? C.D : C.inner,
      h.z === 1 ? C.F : C.inner,
      h.z === -1 ? C.B : C.inner,
    ];
  }

  // ---------- 建模 ----------
  _buildCube() {
    const geo = new THREE.BoxGeometry(CUBIE, CUBIE, CUBIE);
    const C = settings.colors;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // BoxGeometry 面顺序: +X, -X, +Y, -Y, +Z, -Z
          const mats = this._faceColors({ x, y, z }, C).map(
            (col) => new THREE.MeshBasicMaterial({ color: col })
          );
          const cubie = new THREE.Mesh(geo, mats);
          cubie.position.set(x * SPACING, y * SPACING, z * SPACING);

          // 黑色描边,看起来更像真魔方
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({ color: 0x0a0a0a })
          );
          cubie.add(edges);

          this.cubeGroup.add(cubie);
          this.cubies.push(cubie);
          this.homes.set(cubie, { x, y, z });
        }
      }
    }
  }

  // 实时改色:按每块 home 重新设置 6 个面材质的颜色
  setColors(C) {
    for (const cubie of this.cubies) {
      const cols = this._faceColors(this.homes.get(cubie), C);
      cubie.material.forEach((m, i) => m.color.set(cols[i]));
    }
    this._renderOnce();
  }

  reset() {
    // 把所有小块恢复到初始位置和朝向
    if (this._tween) {
      // 结束进行中的动画
      this._finishTween();
    }
    for (const cubie of this.cubies) {
      const h = this.homes.get(cubie);
      cubie.position.set(h.x * SPACING, h.y * SPACING, h.z * SPACING);
      cubie.quaternion.identity();
    }
    this.clearHighlight();
    this._renderOnce();
  }

  // ---------- 选层 ----------
  _selectLayer(axis, layers) {
    return this.cubies.filter((c) => {
      const v = Math.round(c.position[axis] / SPACING);
      return layers.includes(v);
    });
  }

  _snap(cubies) {
    for (const c of cubies) {
      c.position.x = Math.round(c.position.x / SPACING) * SPACING;
      c.position.y = Math.round(c.position.y / SPACING) * SPACING;
      c.position.z = Math.round(c.position.z / SPACING) * SPACING;
    }
  }

  // ---------- 执行一步(带动画),返回 Promise ----------
  runMove(tok, duration = 420) {
    if (this._tween) this._finishTween(); // 不允许重叠,先把上一步结清
    this.clearHighlight();
    return new Promise((resolve) => {
      const affected = this._selectLayer(tok.axis, tok.layers);
      const pivot = new THREE.Group();
      this.cubeGroup.add(pivot);
      affected.forEach((c) => pivot.attach(c));
      // 双转(R2/U2 等,180°)按转过的格数等比延长时长,让角速度和单转一致;
      // 否则两格用一格的时间转完,看起来像只转了一下、容易误解。
      const quarters = Math.max(1, Math.round(Math.abs(tok.angle) / (Math.PI / 2)));
      const tw = {
        pivot,
        affected,
        axis: tok.axis,
        to: tok.angle,
        t0: null,
        duration: Math.max(60, duration) * quarters,
        resolve,
      };
      this._tween = tw;
      // 兜底:即使 requestAnimationFrame 被浏览器节流(后台标签页/局域网设备),
      // 也必须把这一步「固化」下来——否则旋转只有动画、位置/颜色不更新。
      tw.fallback = setTimeout(() => {
        if (this._tween === tw) this._finishTween();
      }, tw.duration + 250);
      this._kick();
    });
  }

  // 立即应用(无动画),用于「逆操作打乱」铺场
  applyInstant(tok) {
    if (this._tween) this._finishTween();
    const affected = this._selectLayer(tok.axis, tok.layers);
    const pivot = new THREE.Group();
    this.cubeGroup.add(pivot);
    affected.forEach((c) => pivot.attach(c));
    pivot.rotation[tok.axis] = tok.angle;
    pivot.updateMatrixWorld(true);
    affected.forEach((c) => this.cubeGroup.attach(c));
    this.cubeGroup.remove(pivot);
    this._snap(affected);
    this._renderOnce();
  }

  _finishTween() {
    const tw = this._tween;
    if (!tw) return;
    if (tw.fallback) clearTimeout(tw.fallback);
    tw.pivot.rotation[tw.axis] = tw.to;
    tw.pivot.updateMatrixWorld(true);
    tw.affected.forEach((c) => this.cubeGroup.attach(c));
    this.cubeGroup.remove(tw.pivot);
    this._snap(tw.affected);
    this._tween = null;
    this._renderOnce();
    if (tw.resolve) tw.resolve();
  }

  // ---------- 高亮某一层(符号教学的悬停效果) ----------
  highlightLayer(axis, layers) {
    this.clearHighlight();
    const min = Math.min(...layers);
    const max = Math.max(...layers);
    const thick = (max - min + 1) * SPACING + 0.02;
    const span = 3 * SPACING + 0.02;
    const size = { x: span, y: span, z: span };
    size[axis] = thick;
    const center = { x: 0, y: 0, z: 0 };
    center[axis] = ((min + max) / 2) * SPACING;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshBasicMaterial({
        color: 0x4f8cff,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );
    mesh.position.set(center.x, center.y, center.z);
    this.cubeGroup.add(mesh);
    this._highlight = mesh;
    this._renderOnce();
  }

  clearHighlight() {
    if (this._highlight) {
      this.cubeGroup.remove(this._highlight);
      this._highlight.geometry.dispose();
      this._highlight.material.dispose();
      this._highlight = null;
      this._renderOnce();
    }
  }

  // ---------- 是否复原 ----------
  isSolved() {
    const eps = 0.05;
    for (const c of this.cubies) {
      const h = this.homes.get(c);
      if (
        Math.abs(c.position.x - h.x * SPACING) > eps ||
        Math.abs(c.position.y - h.y * SPACING) > eps ||
        Math.abs(c.position.z - h.z * SPACING) > eps
      )
        return false;
      // 朝向接近单位四元数
      const q = c.quaternion;
      if (Math.abs(Math.abs(q.w) - 1) > eps) return false;
    }
    return true;
  }

  // ---------- 按需渲染 ----------
  _renderOnce() {
    this.renderer.render(this.scene, this.camera);
  }

  // 仅在有动画在途时才持续请求帧;空闲时停止,避免空转
  _kick() {
    if (this._raf == null) this._raf = requestAnimationFrame(this._loop);
  }

  _loop(time) {
    if (this._tween) {
      const tw = this._tween;
      if (tw.t0 === null) tw.t0 = time;
      let p = (time - tw.t0) / tw.duration;
      if (p >= 1) p = 1;
      tw.pivot.rotation[tw.axis] = tw.to * easeInOut(p);
      this._renderOnce();
      if (p >= 1) {
        this._finishTween();
        this._raf = null; // 动画结束,停止循环
        return;
      }
      this._raf = requestAnimationFrame(this._loop);
    } else {
      this._raf = null;
    }
  }

  resize() {
    const w = this.canvas.clientWidth || 600;
    const h = this.canvas.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._renderOnce();
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._tween && this._tween.fallback) clearTimeout(this._tween.fallback);
    document.removeEventListener("visibilitychange", this._onVisible);
    this.canvas.removeEventListener("pointerdown", this._onDown, { capture: true });
    window.removeEventListener("pointermove", this._onMove);
    window.removeEventListener("pointerup", this._onUp);
    this.controls.dispose();
    this.renderer.dispose();
  }
}

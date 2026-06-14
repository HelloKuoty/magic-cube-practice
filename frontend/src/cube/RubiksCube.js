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
    // 拖动 / 缩放时重绘一帧
    this.controls.addEventListener("change", () => this._renderOnce());

    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);

    this._loop = this._loop.bind(this);
    // 标签页重新可见时,继续推进可能被节流暂停的动画
    this._onVisible = () => { if (!document.hidden && this._tween) this._kick(); };
    document.addEventListener("visibilitychange", this._onVisible);
    this._buildCube();
    this.resize();
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
    this.controls.dispose();
    this.renderer.dispose();
  }
}

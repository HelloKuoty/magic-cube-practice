import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile, writeFile, mkdir, rename } from "fs/promises";

import { algorithms, categories } from "./data/algorithms.js";
import { notation } from "./data/notation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const PROGRESS_FILE = join(DATA_DIR, "progress.json");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- 工具:进度持久化(简单 JSON 文件) ----------
async function readProgress() {
  try {
    const raw = await readFile(PROGRESS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === "ENOENT") return {}; // 文件不存在时返回空
    throw e;
  }
}
async function writeProgress(data) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = join(DATA_DIR, `.progress.${process.pid}.${Date.now()}.${randomUUID()}.tmp`);
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmp, PROGRESS_FILE);
}

let progressQueue = Promise.resolve();
function enqueueProgressUpdate(update) {
  const job = progressQueue.catch(() => {}).then(async () => {
    const all = await readProgress();
    const result = update(all);
    await writeProgress(all);
    return result;
  });
  progressQueue = job.then(() => {}, () => {});
  return job;
}

function sendProgressError(res, err) {
  console.error("progress storage error:", err);
  res.status(500).json({ error: "progress storage unavailable" });
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ---------- 打乱生成 ----------
const SCRAMBLE_FACES = ["U", "D", "L", "R", "F", "B"];
const SCRAMBLE_MODS = ["", "'", "2"];
// 同轴的两个面(避免相邻两步同轴,生成更规范的打乱)
const OPPOSITE = { U: "D", D: "U", L: "R", R: "L", F: "B", B: "F" };

function makeScramble(length = 20) {
  const moves = [];
  let prev = null;
  let prevPrev = null;
  while (moves.length < length) {
    const face = SCRAMBLE_FACES[Math.floor(Math.random() * 6)];
    if (face === prev) continue; // 不连续转同一面
    if (face === OPPOSITE[prev] && face === prevPrev) continue; // 避免 R L R 这种冗余
    const mod = SCRAMBLE_MODS[Math.floor(Math.random() * 3)];
    moves.push(face + mod);
    prevPrev = prev;
    prev = face;
  }
  return moves.join(" ");
}

// ---------- 路由 ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// 公式分类
app.get("/api/categories", (_req, res) => res.json(categories));

// 公式列表(?category=oll 可筛选;?q= 关键字搜索)
app.get("/api/algorithms", (req, res) => {
  const { category, q } = req.query;
  let list = algorithms;
  if (category) list = list.filter((a) => a.category === category);
  if (q) {
    const kw = String(q).toLowerCase();
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(kw) ||
        (a.alg && a.alg.toLowerCase().includes(kw)) ||
        a.moves.toLowerCase().includes(kw)
    );
  }
  res.json(list);
});

// 单条公式
app.get("/api/algorithms/:id", (req, res) => {
  const item = algorithms.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });
  res.json(item);
});

// 符号教学库
app.get("/api/notation", (_req, res) => res.json(notation));

// 打乱
app.get("/api/scramble", (req, res) => {
  const length = Math.min(Math.max(parseInt(req.query.length) || 20, 1), 40);
  res.json({ length, moves: makeScramble(length) });
});

// 进度:读取(可选 user 查询参数,默认 local)
app.get("/api/progress", async (req, res) => {
  try {
    await progressQueue.catch(() => {});
    const user = String(req.query.user || "local");
    const all = await readProgress();
    res.json(all[user] || { user, records: [] });
  } catch (e) {
    sendProgressError(res, e);
  }
});

// 进度:提交一条跟练记录
// body: { user?, algId, algName, timeMs, mistakes, accuracy }
app.post("/api/progress", async (req, res) => {
  const { user = "local", algId, algName, timeMs, mistakes, accuracy } = req.body || {};
  if (!algId) return res.status(400).json({ error: "algId required" });
  try {
    const userKey = String(user || "local").slice(0, 80);
    const record = await enqueueProgressUpdate((all) => {
      if (!all[userKey]) all[userKey] = { user: userKey, records: [] };
      const item = {
        algId: String(algId),
        algName: algName ? String(algName) : "",
        timeMs: Math.max(0, Math.round(finiteNumber(timeMs))),
        mistakes: Math.max(0, Math.round(finiteNumber(mistakes))),
        accuracy: Math.min(Math.max(finiteNumber(accuracy, 1), 0), 1),
        at: new Date().toISOString(),
      };
      all[userKey].records.unshift(item);
      all[userKey].records = all[userKey].records.slice(0, 200); // 最多保留 200 条
      return item;
    });
    res.json(record);
  } catch (e) {
    sendProgressError(res, e);
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0"; // 监听所有网卡,局域网内其它设备可访问
app.listen(PORT, HOST, () => {
  console.log(`✅ 魔方后端已启动,监听 ${HOST}:${PORT} (本机 http://localhost:${PORT})`);
});

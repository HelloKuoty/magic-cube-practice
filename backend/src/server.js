import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";

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
  } catch {
    return {}; // 文件不存在时返回空
  }
}
async function writeProgress(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PROGRESS_FILE, JSON.stringify(data, null, 2), "utf-8");
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
  const user = req.query.user || "local";
  const all = await readProgress();
  res.json(all[user] || { user, records: [] });
});

// 进度:提交一条跟练记录
// body: { user?, algId, algName, timeMs, mistakes, accuracy }
app.post("/api/progress", async (req, res) => {
  const { user = "local", algId, algName, timeMs, mistakes, accuracy } = req.body || {};
  if (!algId) return res.status(400).json({ error: "algId required" });
  const all = await readProgress();
  if (!all[user]) all[user] = { user, records: [] };
  const record = {
    algId,
    algName,
    timeMs,
    mistakes,
    accuracy,
    at: new Date().toISOString(),
  };
  all[user].records.unshift(record);
  all[user].records = all[user].records.slice(0, 200); // 最多保留 200 条
  await writeProgress(all);
  res.json(record);
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0"; // 监听所有网卡,局域网内其它设备可访问
app.listen(PORT, HOST, () => {
  console.log(`✅ 魔方后端已启动,监听 ${HOST}:${PORT} (本机 http://localhost:${PORT})`);
});

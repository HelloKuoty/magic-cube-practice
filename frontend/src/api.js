// 与后端通信的封装。开发环境下 /api 由 Vite 代理到 http://localhost:3001
const BASE = "/api";

async function get(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}
async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json();
}

export const api = {
  categories: () => get("/categories"),
  algorithms: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get("/algorithms" + (qs ? "?" + qs : ""));
  },
  algorithm: (id) => get("/algorithms/" + id),
  notation: () => get("/notation"),
  scramble: (length = 20) => get("/scramble?length=" + length),
  getProgress: (user = "local") => get("/progress?user=" + user),
  saveProgress: (record) => post("/progress", record),
};

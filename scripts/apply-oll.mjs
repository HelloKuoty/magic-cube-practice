// 把 oll-out.json 的 57 个 OLL 写入 backend/src/data/algorithms.js(替换 OLL 区块)
import { readFileSync, writeFileSync } from "fs";
const out = JSON.parse(readFileSync(new URL("./oll-out.json", import.meta.url)));
const oc = (r) => r.c.filter((v) => v === 0).length;
const oe = (r) => r.e.filter((v) => v === 0).length;
// 排序:棱朝向多的在前(接近十字),再按角朝向;让相似情形相邻
out.sort((a, b) => oe(b) - oe(a) || oc(b) - oc(a) || (a.sig < b.sig ? -1 : 1));

const shape = (r) => (oe(r) === 4 ? "十字" : oe(r) === 2 ? "线/L" : "点");
const tag = (s) => (s === "std" ? "标准" : s === "gen" ? "生成" : "2-look");
const lines = out.map((r, idx) => {
  const i = idx + 1;
  const name = `OLL ${i} · ${shape(r)}`;
  const desc = `顶层翻向:角已朝上 ${oc(r)}/4、棱已朝上 ${oe(r)}/4(${tag(r.src)}解)。`;
  return `  { id: "oll-${i}", category: "oll", name: "${name}", alg: "OLL ${i}", moves: "${r.moves}", desc: "${desc}" },`;
});
const block = "  // ===================== OLL(全 57 个,scripts/gen-oll.mjs 生成 + check-oll.mjs 校验)=====================\n" + lines.join("\n") + "\n\n";

const path = new URL("../backend/src/data/algorithms.js", import.meta.url);
let src = readFileSync(path, "utf8");
const start = src.indexOf("  // ===================== OLL");
const end = src.indexOf("  // ===================== PLL");
if (start < 0 || end < 0) { console.error("找不到 OLL/PLL 区块标记"); process.exit(1); }
src = src.slice(0, start) + block + src.slice(end);
// 顺手把分类说明改成完整 57
src = src.replace(/{ key: "oll",[^}]*}/, '{ key: "oll",    name: "OLL 顶层翻色", desc: "让顶面全部朝上同色,共 57 个(完整)。" }');
writeFileSync(path, src);
console.log("已写入", out.length, "个 OLL 到 algorithms.js");

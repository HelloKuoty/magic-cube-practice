import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 前后端分离:开发时把 /api 代理到后端 3001 端口
export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0", // 监听所有网卡
    port: 5173,
    allowedHosts: true, // 关闭 Host 白名单,允许任意域名/公网访问(开发服务器,注意安全)
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});

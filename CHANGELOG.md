# Electron 打包修复记录

## 问题

OpenReel Video 打包成 Electron 桌面应用后，视频文件无法导入 — 界面卡在"正在导入..."，开发环境正常。

---

## 排查过程

### 第一轮：怀疑 FFmpeg.wasm

检查 `packages/core/src/media/ffmpeg-fallback.ts`，FFmpeg 核心 WASM 从 `https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/` 加载。Electron 自定义协议 `openreel://` 设置了 `Cross-Origin-Embedder-Policy: require-corp`，跨域 CDN 请求被拦截。

**修复 1**：`electron/main.js` 添加 `webRequest.onBeforeRequest` 拦截器，将 unpkg 请求重定向到本地；`build.bat` 增加复制 `@ffmpeg/core` 到 `dist/ffmpeg/` 的步骤。

→ 结果：**仍然卡死。**

### 第二轮：添加诊断日志

在 `main.js` 中记录所有 FFmpeg 相关请求。日志显示只有启动记录，没有任何 FFmpeg 请求被触发。

→ 结论：**导入根本没走到 FFmpeg，卡在更早的 MediaBunny 阶段。**

### 第三轮：定位到 Secure Context

MediaBunny 依赖 WebCodecs API（`VideoDecoder`、`AudioDecoder`），这些 API 只在安全上下文（`isSecureContext = true`）下可用。

`protocol.registerSchemesAsPrivileged` 中缺少 `secure: true` 权限，导致 `openreel://` 不被浏览器视为安全上下文 → WebCodecs 不可用 → MediaBunny 内部 Promise 永不 resolve → 界面卡死。

**修复 2**：在 `registerSchemesAsPrivileged` 中添加 `secure: true`。

→ 结果：**导入成功。**

---

## 根因

**Electron 自定义协议 `openreel://` 缺少 `secure: true` 权限，WebCodecs 不可用，MediaBunny 引擎挂死。**

---

## 最终改动（仅打包工程，主仓库源码未改）

| 文件 | 改动 | 原因 |
|------|------|------|
| `electron/main.js` | `privileges` 加 `secure: true` | 启用 WebCodecs，修复视频导入 |
| `electron/main.js` | 新增 `setupRequestRedirects()` | FFmpeg CDN 请求重定向到本地 |
| `build.bat` | 新增第 5 步：复制 `@ffmpeg/core*` 到 `dist/ffmpeg/` | 本地提供 FFmpeg WASM 文件 |
| `README.md` | 新增修复说明 | 文档 |

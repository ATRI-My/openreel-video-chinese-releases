# OpenReel Video - Chinese Releases

一键构建 OpenReel Video 中文版 Electron 桌面应用。

## 用法

双击 `build.bat`，自动完成：
1. 拉取最新源代码
2. 复制 Electron 打包配置
3. 安装依赖
4. 构建 Web 应用
5. 打包为 Windows 单文件 exe

产物见 `source/release/OpenReel-Video-Setup-x.x.x.exe`

## 重置应用数据

双击 `scripts/reset-openreel.bat` 清除所有用户数据。

## 文件说明

| 文件 | 说明 |
|------|------|
| `build.bat` | 一键构建脚本 |
| `package.json` | 依赖和脚本配置 |
| `electron-builder.yml` | Electron Builder 打包配置 |
| `after-pack.js` | 打包后注入自定义图标 |
| `electron/` | Electron 主进程代码 |
| `assets/` | 图标资源 |
| `scripts/` | 工具脚本 |

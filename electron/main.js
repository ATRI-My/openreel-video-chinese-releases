import { app, BrowserWindow, protocol, session, dialog, shell, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.join(__dirname, '..', 'apps', 'web', 'dist');

const STORE_PATH = path.join(app.getPath('userData'), 'openreel-store.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

let mainWindow = null;

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveStore(data) {
  try {
    const store = { ...loadStore(), ...data };
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch {}
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function checkForUpdates(currentVersion) {
  try {
    const store = loadStore();
    const lastCheck = store.lastCheckTime || 0;
    const now = Date.now();
    if (now - lastCheck < 12 * 60 * 60 * 1000) return;

    saveStore({ lastCheckTime: now });

    const res = await fetch(
      'https://api.github.com/repos/ATRI-My/openreel-video/releases/latest',
      { headers: { 'User-Agent': 'OpenReel-Desktop' }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return;

    const release = await res.json();
    const latestVersion = release.tag_name.replace(/^v/, '');
    if (compareVersions(latestVersion, currentVersion) <= 0) return;

    const skipped = store.skippedVersion;
    if (skipped && compareVersions(latestVersion, skipped) <= 0) return;

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版 OpenReel Video v${latestVersion}`,
      detail: `当前版本：v${currentVersion}\n\n请下载最新源码，运行 update-and-build.bat 打包新版。`,
      buttons: ['前往下载页面', '稍后提醒', '跳过此版本'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      shell.openExternal(release.html_url);
    } else if (result.response === 2) {
      saveStore({ skippedVersion: latestVersion });
    }
  } catch {}
}

function createWindow() {
  const store = loadStore();
  const winBounds = {
    width: store.windowWidth || 1400,
    height: store.windowHeight || 900,
    x: store.windowX,
    y: store.windowY,
  };

  mainWindow = new BrowserWindow({
    ...winBounds,
    minWidth: 900,
    minHeight: 500,
    title: 'OpenReel Video',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      saveStore({
        windowWidth: bounds.width,
        windowHeight: bounds.height,
        windowX: bounds.x,
        windowY: bounds.y,
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('openreel://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL('openreel://app/index.html');
}

function setupProtocol() {
  protocol.handle('openreel', async (request) => {
    try {
      const url = new URL(request.url);
      const host = url.hostname;
      let filePath;

      if (host === 'app') {
        filePath = path.join(DIST_PATH, url.pathname === '/' ? '/index.html' : url.pathname);
      } else {
        filePath = path.join(DIST_PATH, host, url.pathname);
      }

      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
      } catch {
        filePath = path.join(DIST_PATH, 'index.html');
      }

      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        },
      });
    } catch (err) {
      console.error('Protocol handler error:', err);
      return new Response('Not Found', { status: 404 });
    }
  });
}

function setupMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '项目主页',
          click: () => shell.openExternal('https://github.com/Augani/openreel-video'),
        },
        {
          label: '在线使用',
          click: () => shell.openExternal('https://openreel.video'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'openreel',
    privileges: {
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      codeCache: true,
    },
  },
]);

app.whenReady().then(async () => {
  setupProtocol();
  setupMenu();
  createWindow();

  const pack = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
  const currentVersion = pack.version || '0.0.0';
  setTimeout(() => checkForUpdates(currentVersion), 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

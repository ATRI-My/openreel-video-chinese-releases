import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('openreelDesktop', {
  platform: process.platform,
  isElectron: true,
});

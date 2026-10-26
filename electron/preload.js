const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: '0.6.0.1',
  appName: 'Intent - The Chat Translator'
});

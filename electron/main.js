const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Invictus Scoreboard',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  win.loadURL('http://localhost:3001');
}

app.whenReady().then(() => {
  require('../server/index.js');

  // Give Express a moment to bind before loading the URL
  setTimeout(() => {
    createWindow();
    if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify();
  }, 500);
});

app.on('window-all-closed', () => app.quit());

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version is ready. Restart now to apply it.',
    buttons: ['Restart Now', 'Later'],
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

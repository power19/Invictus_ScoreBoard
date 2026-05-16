const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Invictus Scoreboard',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadURL('http://localhost:3001');
}

app.whenReady().then(() => {
  require('../server/index.js');

  setTimeout(() => {
    createWindow();
    if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify();
  }, 500);
});

app.on('window-all-closed', () => app.quit());

// IPC: renderer calls this when the Update button is clicked
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) return 'Cannot update in development mode.';
  try {
    await autoUpdater.checkForUpdates();
    return 'Checking for updates…';
  } catch (e) {
    throw new Error(e.message);
  }
});

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version is downloading in the background.',
    buttons: ['OK'],
  });
});

autoUpdater.on('update-not-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Up to Date',
    message: 'You already have the latest version.',
    buttons: ['OK'],
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version has downloaded. Restart now to apply it.',
    buttons: ['Restart Now', 'Later'],
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

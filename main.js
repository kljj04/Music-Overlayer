const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 2560,
    height: 1440,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,     
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'render', 'idx.html'));
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
}

ipcMain.on('open-auth-window', (event, authUrl) => {
  let authWindow = new BrowserWindow({
    width: 500,
    height: 600,
    show: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  authWindow.loadURL(authUrl);

  const checkInterval = setInterval(async () => {
    try {
      if (authWindow.isDestroyed()) {
        clearInterval(checkInterval);
        return;
      }

      const currentUrl = authWindow.webContents.getURL();
      
      if (currentUrl.includes('https://kljj04.me/callback')) {
        const rawText = await authWindow.webContents.executeJavaScript('document.body.innerText');
        const tokenData = JSON.parse(rawText);

        mainWindow.webContents.send('auth-tokens', tokenData);
        
        clearInterval(checkInterval);
        authWindow.close();
      }
    } catch (e) {
    }
  }, 500);

  authWindow.on('closed', () => {
    clearInterval(checkInterval);
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
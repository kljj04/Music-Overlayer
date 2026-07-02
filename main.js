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

// 🌐 [추가] 렌더러가 보낸 신호 받아서 진짜 안전한 "독립 팝업창" 띄우기
ipcMain.on('open-auth-window', (event, authUrl) => {
  let authWindow = new BrowserWindow({
    width: 500,
    height: 600,
    show: true,
    alwaysOnTop: true, // 로그인창이 뒤로 숨지 않게 설정
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  authWindow.loadURL(authUrl);

  // 팝업창의 주소가 네 서버 응답 페이지(JSON)로 바뀌는지 계속 감시
  const checkInterval = setInterval(async () => {
    try {
      if (authWindow.isDestroyed()) {
        clearInterval(checkInterval);
        return;
      }

      const currentUrl = authWindow.webContents.getURL();
      
      // 사용자가 로그인 완료 후 네 리눅스 서버 결과 주소에 도달했다면
      if (currentUrl.includes('https://kljj04.me/callback')) {
        // 화면에 뿌려진 JSON 텍스트 통째로 추출
        const rawText = await authWindow.webContents.executeJavaScript('document.body.innerText');
        const tokenData = JSON.parse(rawText);

        // 메인 창(idx.js)으로 훔쳐온 찐 토큰 전송!
        mainWindow.webContents.send('auth-tokens', tokenData);
        
        clearInterval(checkInterval);
        authWindow.close(); // 팝업창 닫기
      }
    } catch (e) {
      // 로딩 중 에러 패스
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
const { ipcRenderer } = require('electron'); // 👈 일렉트론 IPC 통신 추가
const axios = require('axios');

const CLIENT_ID = "acd061d98b5040cb985c8435b984ab99";
const SERVER_URL = "https://kljj04.me"; 
const REDIRECT_URI = `${SERVER_URL}/callback`;

let accessToken = null;
let currentTrackId = null;
let refreshToken = localStorage.getItem('spotify_refresh_token');

let isAuthenticating = false;

function startOAuthLogin() {
    if (isAuthenticating) return; 
    isAuthenticating = true; 

    const scopes = 'user-read-currently-playing';
    const authUrl = 'https://accounts.spotify.com/authorize?client_id=' + CLIENT_ID + 
                   '&response_type=code&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + 
                   '&scope=' + encodeURIComponent(scopes);
    
    // 🚀 메인 프로세스(main.js)한테 별도 팝업창 띄우라고 토스!
    ipcRenderer.send('open-auth-window', authUrl);
}

// 📥 [추가] 메인 프로세스가 팝업창에서 긁어온 토큰 뱉어주면 받아먹는 곳
ipcRenderer.on('auth-tokens', (event, tokenData) => {
    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token;

    localStorage.setItem('spotify_refresh_token', refreshToken);
    console.log("🚀 메인 프로세스를 통해 토큰 가로채기 및 저장 성공!");
    
    isAuthenticating = false; // 로그인 처리 끝
    checkMusic();
});

async function refreshMyToken() {
    if (!refreshToken) return;
    try {
        const response = await axios.get(`${SERVER_URL}/refresh?refresh_token=${refreshToken}`);
        accessToken = response.data.access_token;
        console.log("🔄 토큰 자동 갱신 완료!");
    } catch (e) {
        console.error("토큰 갱신 실패");
        localStorage.removeItem('spotify_refresh_token');
        refreshToken = null;
    }
}

async function checkMusic() {
    if (isAuthenticating) return;

    if (!accessToken && refreshToken) {
        await refreshMyToken();
    }

    if (!accessToken) {
        startOAuthLogin(); 
        return;
    }
    
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.status === 204 || !response.data || !response.data.is_playing) {
            return;
        }

        const track = response.data.item;
        const trackId = track.id;
        
        if (trackId !== currentTrackId) {
            currentTrackId = trackId;
            
            document.getElementById('title').innerText = track.name;
            document.getElementById('artist').innerText = track.artists.map(a => a.name).join(', ');
            document.getElementById('album-cover').src = track.album.images[0].url;
            
            const card = document.getElementById('card-container');
            card.classList.add('show');
            
            setTimeout(() => {
                card.classList.remove('show');
            }, 5000);
        }
    } catch (e) {
        if (e.response && e.response.status === 401) {
            accessToken = null; 
        }
    }
}

setInterval(checkMusic, 1000);
checkMusic();
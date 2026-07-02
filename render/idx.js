const { ipcRenderer } = require('electron');
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
    
    ipcRenderer.send('open-auth-window', authUrl);
}

ipcRenderer.on('auth-tokens', (event, tokenData) => {
    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token;

    localStorage.setItem('spotify_refresh_token', refreshToken);
    console.log("Successfully received tokens from the main process");
    
    isAuthenticating = false;
    checkMusic();
});

async function refreshMyToken() {
    if (!refreshToken) return;
    try {
        const response = await axios.get(`${SERVER_URL}/refresh?refresh_token=${refreshToken}`);
        accessToken = response.data.access_token;
        console.log("Successfully refreshed access token");
    } catch (e) {
        console.error("Failed to refresh token:", e);
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
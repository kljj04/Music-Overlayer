markdown_content_en = """# spotify-overlayer

An Electron-based desktop overlay application that retrieves currently playing track information from Spotify in real-time and displays it as a glassmorphism-style card in the bottom-right corner of the screen. It integrates with a headless backend server for OAuth 2.0 authentication and token refreshing to provide a secure and automated login structure.

## System Architecture
- **Client (Electron App)**: Renders a transparent desktop overlay window and monitors the real-time playback state at 1-second intervals via the Spotify API. During login, the main process (`main.js`) controls an independent `BrowserWindow` popup.
- **Backend Server (Node.js Express)**: Operates on port 443 (HTTPS) by directly loading Certbot (Let's Encrypt) SSL certificates. It hides the Spotify API Client Secret within the server environment and serves as a Headless JSON API for token exchange and refreshing.

## Key Features
- **Secure Authentication Structure**: The Client Secret is stored exclusively on the Linux server and is never exposed to the client code, eliminating the risk of decompilation or key theft.
- **Permanent Automated Login**: After the initial authentication, the acquired Refresh Token is securely saved in the user's local storage (`localStorage`). When it expires, the Access Token is automatically renewed through the backend server.
- **Popup Hijacking**: The Electron main process launches a dedicated `BrowserWindow` for login. When it redirects to the backend server's callback URL, the main process intercepts the raw JSON data inside the browser view and automatically closes the popup.

## Installation and Execution

### 1. Backend Server Setup (Ubuntu, Node.js, PM2 Environment)
Create a `.env` file inside the server project directory and configure it as follows:
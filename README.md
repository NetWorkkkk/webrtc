# WebRTC Room Call

A simple multi-user room + group call application using:

- **Frontend**: React + Vite (built into `public/`)
- **Backend**: Node.js + Express + WebSocket (`ws`)
- **Media**: WebRTC mesh (direct peer-to-peer on LAN, TURN relay fallback for public/NAT cases)
- **TURN/STUN**: coturn (optional for LAN, recommended for public internet access)

---

## 1) Project Structure

- `server/`: signaling backend (`server/index.js`, `server/signalingHandler.js`)
- `frontend/`: React app
- `coturn/`: coturn Docker Compose + sample `turnserver.conf`

---

## 2) Prerequisites

- Linux VPS or LAN machine
- Node.js 18+ and npm
- Nginx
- PM2 (`npm i -g pm2`)
- Docker + Docker Compose (only if running coturn/TURN)
- Open firewall ports:
  - App/Nginx: `80`, `443`
  - TURN only if using coturn: `3478` (UDP/TCP), `5349` (TLS TURN)
  - TURN relay range only if using coturn, from your `turnserver.conf` (current sample: `49152-65535`)

---

## 3) Deploy on VPS (Public IP + Domain) - Recommended

### 3.1 Install dependencies

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Install Node.js (if not installed), then clone project:

```bash
git clone https://github.com/NetWorkkkk/webrtc
cd webRTC
npm install
```

### 3.2 Issue SSL certificate with Certbot

Make sure DNS points your domain to VPS public IP.

```bash
sudo certbot --nginx -d rtc.ktranowl.id.vn
```

This will generate certs under:

- `/etc/letsencrypt/live/rtc.ktranowl.id.vn/fullchain.pem`
- `/etc/letsencrypt/live/rtc.ktranowl.id.vn/privkey.pem`

### 3.3 Configure and run coturn

Edit `coturn/turnserver.conf`:

- Set `realm` and `server-name` to your domain
- Set `cert` and `pkey` paths to your domain cert files
- Set `listening-ip` and `relay-ip` to VPS private/local IP
- Set `external-ip` to `PUBLIC_IP/PRIVATE_IP` if behind NAT

Then run coturn:

```bash
cd coturn
docker compose up -d
```

Check log with:
```bash
docker compose logs -f
```

### 3.4 Configure frontend env (build-time), build, and publish static files

Frontend reads config at **build time** via Vite env variables:

- `VITE_WS_URL`: WebSocket URL
- `VITE_ICE_SERVERS`: JSON string array of ICE servers

For this section (VPS + domain), use `frontend/.env.example`.

Back in project root:

```bash
cd /path/to/webRTC
cp frontend/.env.example frontend/.env
```

Then edit `frontend/.env` with your own domain values.

Example:

```env
VITE_WS_URL=wss://rtc.ktranowl.id.vn/ws
VITE_ICE_SERVERS=[{"urls":"stun:rtc.ktranowl.id.vn:3478"},{"urls":["turn:rtc.ktranowl.id.vn:3478","turns:rtc.ktranowl.id.vn:5349"],"username":"testuser","credential":"testpassword"}]
```

If env variables are missing/invalid, frontend falls back to defaults in:

- `frontend/src/config/network.js`
- `frontend/src/config/rtcConfig.js`

Build frontend:

```bash
npm run build:client
```

Vite outputs assets into `public/` (as configured in `frontend/vite.config.mjs`).

If Nginx serves frontend directly from `/var/www/rtc`, copy build output:

```bash
sudo mkdir -p /var/www/rtc
sudo cp -r public/* /var/www/rtc/
```

### 3.5 Run backend with PM2
If we run normal `npm start`, it will stop if our ssh session ends. We need something to run in a background as a service. The selected tool is `pm2`

```bash
cd /path/to/webRTC
pm2 start npm --name webrtc-server -- start
pm2 save
pm2 startup
```

Backend listens on `PORT` (default `3000`).

### 3.6 Configure Nginx (serve frontend + proxy WebSocket)

Use the ready template in this repo (`nginx.conf`).
Replace our domain `rtc.ktranowl.id.vn` with your domain, and copy it to Nginx:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/rtc.ktranowl.id.vn
```

Enable site + reload:

```bash
sudo ln -sf /etc/nginx/sites-available/rtc.ktranowl.id.vn /etc/nginx/sites-enabled/rtc.ktranowl.id.vn
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4) Run in LAN (Multiple Machines in Same Local Network)

### 4.1 Server machine

1. Find server LAN IP (example `10.8.0.5`)
2. In frontend env:
   - `cp frontend/.env.lan.example frontend/.env`
   - replace `10.8.0.5` with your server LAN IP
   - `frontend/.env.lan.example` uses `VITE_ICE_SERVERS=[]` because coturn/TURN is not required for machines on the same LAN
3. Build frontend and copy to nginx folder as in section 3.4 above.
4. Start backend as in section 3.5 above.
5. Create LAN HTTPS cert using mkcert:
   - install mkcert if needed (`sudo apt install -y mkcert`)
   - `mkcert -install`
   - `mkcert -cert-file lan.crt -key-file lan.key 10.8.0.5`
   - `sudo mkdir -p /etc/nginx/ssl`
   - `sudo cp lan.crt lan.key /etc/nginx/ssl/`
6. Configure Nginx using `nginx.lan.conf`, replace `10.8.0.5` with your LAN IP if needed
   - copy with:
     - `sudo cp nginx.lan.conf /etc/nginx/sites-available/rtc-lan`
     - `sudo ln -sf /etc/nginx/sites-available/rtc-lan /etc/nginx/sites-enabled/rtc-lan`
     - `sudo nginx -t && sudo systemctl reload nginx`
7. Open firewall on LAN as needed

### 4.2 Access from client machines

Open:

- `https://10.8.0.5`

### 4.3 LAN note

This LAN example uses HTTPS + WSS with mkcert and does not need coturn.
When first opening `https://10.8.0.5`, the browser may show an unsafe certificate warning if the client machine does not trust the mkcert root CA.

For quick LAN testing, accept the warning and proceed. For a fully trusted browser lock icon, install the mkcert root CA on each client machine.

If you change the server LAN IP, update `frontend/.env`, `nginx.lan.conf`, and regenerate the mkcert certificate for the new IP.

---

## 5) How to Use the App

1. Open app in browser
2. Enter **Your name** and **Room ID**
3. Click **Create Room** (first user) or **Join Room**
4. In room page:
   - Click **Start Group Call** to start call
   - Other users click **Join Group Call**
5. In call page:
   - Switch layout modes (Auto / Sidebar)
   - Pin participants
   - View connection state badges
   - Leave call with **Leave** button

---

## 6) Useful Commands

From project root:

```bash
# Install dependencies
npm install

# Frontend dev server
npm run dev:client

# Build frontend into public/
npm run build:client

# Start backend
npm start
```

PM2:

```bash
pm2 logs webrtc-server
pm2 restart webrtc-server
```

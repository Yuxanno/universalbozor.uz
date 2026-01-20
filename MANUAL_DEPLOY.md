# 📦 Manual VPS Deploy (GitHub'siz)

GitHub'siz to'g'ridan-to'g'ri VPS'ga deploy qilish yo'riqnomasi.

---

## 🎯 Usul 1: SCP/SFTP (Tavsiya etiladi)

### Windows uchun

#### A. WinSCP bilan (GUI)

1. **WinSCP yuklab oling:**
   - https://winscp.net/eng/download.php

2. **Loyihani arxivlang:**
   ```cmd
   npm run build
   ```
   
3. **Kerakli fayllarni zip qiling:**
   - Folder'ni o'ng tugma → Send to → Compressed (zipped) folder
   - Yoki PowerShell:
   ```powershell
   Compress-Archive -Path . -DestinationPath universal-uz.zip -Force
   ```

4. **WinSCP'da:**
   - Host: VPS IP manzili
   - Username: root (yoki sizning user)
   - Password: VPS paroli
   - Connect
   - `/tmp/` ga `universal-uz.zip` yuklang

5. **PuTTY bilan SSH:**
   ```bash
   ssh root@your-vps-ip
   
   # Extract
   cd /tmp
   unzip universal-uz.zip -d /var/www/universal-uz
   
   # Install
   cd /var/www/universal-uz
   npm install --production
   cd client && npm install --production && cd ..
   cd server && npm install --production && cd ..
   
   # Configure
   cp server/.env.example server/.env
   nano server/.env
   
   # Start
   npm install -g pm2
   npm run start:pm2
   ```

#### B. PowerShell bilan (CLI)

```powershell
# 1. Build
npm run build

# 2. Arxiv yaratish
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$archive = "universal-uz-$date.zip"
Compress-Archive -Path . -DestinationPath $archive -Force

# 3. Upload (pscp kerak - PuTTY bilan keladi)
pscp $archive root@your-vps-ip:/tmp/

# 4. SSH va deploy
ssh root@your-vps-ip
```

---

### Linux/Mac uchun

#### Script bilan (Avtomatik)

```bash
# 1. Script'ni executable qiling
chmod +x deploy-to-vps.sh

# 2. VPS ma'lumotlarini o'zgartiring
nano deploy-to-vps.sh
# VPS_USER, VPS_HOST, VPS_PATH

# 3. Ishga tushiring
./deploy-to-vps.sh
```

#### Manual

```bash
# 1. Build
npm run build:production

# 2. Arxiv yaratish
tar -czf universal-uz.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env' \
    .

# 3. Upload
scp universal-uz.tar.gz root@your-vps-ip:/tmp/

# 4. SSH va deploy
ssh root@your-vps-ip

# VPS'da:
mkdir -p /var/www/universal-uz
cd /tmp
tar -xzf universal-uz.tar.gz -C /var/www/universal-uz
cd /var/www/universal-uz

# Install dependencies
npm install --production
cd client && npm install --production && cd ..
cd server && npm install --production && cd ..

# Configure
cp server/.env.example server/.env
nano server/.env

# Start
npm install -g pm2
npm run start:pm2
```

---

## 🎯 Usul 2: rsync (Eng Tez)

### Linux/Mac

```bash
# 1. Build
npm run build

# 2. rsync bilan sync
rsync -avz --progress \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='server/.env' \
    ./ root@your-vps-ip:/var/www/universal-uz/

# 3. SSH va setup
ssh root@your-vps-ip
cd /var/www/universal-uz
npm run install:all
cp server/.env.example server/.env
nano server/.env
npm run start:pm2
```

### Windows (WSL kerak)

```bash
# WSL ochib yuqoridagi komandalarni ishga tushiring
```

---

## 🎯 Usul 3: FTP/SFTP Client

### FileZilla bilan

1. **FileZilla yuklab oling:**
   - https://filezilla-project.org/

2. **Ulanish:**
   - Host: sftp://your-vps-ip
   - Username: root
   - Password: VPS paroli
   - Port: 22

3. **Fayllarni yuklash:**
   - Local: Loyiha folder
   - Remote: /var/www/universal-uz
   - Drag & drop (node_modules'siz!)

4. **SSH orqali setup:**
   ```bash
   ssh root@your-vps-ip
   cd /var/www/universal-uz
   npm run install:all
   cp server/.env.example server/.env
   nano server/.env
   npm run start:pm2
   ```

---

## 🎯 Usul 4: Docker Image Export/Import

```bash
# Local'da:
npm run docker:build
docker save universal-uz:latest | gzip > universal-uz-docker.tar.gz

# Upload
scp universal-uz-docker.tar.gz root@your-vps-ip:/tmp/

# VPS'da:
ssh root@your-vps-ip
cd /tmp
docker load < universal-uz-docker.tar.gz
docker-compose up -d
```

---

## 📋 VPS'da Kerakli Dasturlar

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
npm install -g pm2

# Nginx
sudo apt install nginx

# Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Unzip
sudo apt install unzip
```

---

## ⚙️ VPS'da Sozlash

### 1. Environment Variables

```bash
cd /var/www/universal-uz
cp server/.env.example server/.env
nano server/.env
```

Quyidagilarni o'zgartiring:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your_secure_random_secret_here
CLIENT_URL=https://yourdomain.com
TELEGRAM_BOT_TOKEN=your_bot_token
NODE_ENV=production
```

### 2. PM2 Start

```bash
npm run start:pm2
pm2 startup
pm2 save
```

### 3. Nginx Setup

```bash
sudo cp nginx.conf /etc/nginx/nginx.conf

# nginx.conf'da path'larni to'g'rilang
sudo nano /etc/nginx/nginx.conf

# Test
sudo nginx -t

# Restart
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 4. SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 5. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🔄 Update Qilish

### Yangi versiyani yuklash

```bash
# Local'da
npm run build
# Arxiv yaratib yuklang (yuqoridagi usullardan biri)

# VPS'da
cd /var/www/universal-uz
pm2 stop all
# Yangi fayllar extract qiling
npm install --production
cd client && npm install --production && cd ..
cd server && npm install --production && cd ..
pm2 restart all
```

---

## 🐛 Troubleshooting

### Permission errors
```bash
sudo chown -R $USER:$USER /var/www/universal-uz
```

### Port already in use
```bash
sudo lsof -i :5050
sudo kill -9 <PID>
```

### Nginx errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### PM2 not starting
```bash
pm2 logs
pm2 delete all
npm run start:pm2
```

---

## 📊 Monitoring

```bash
# PM2
pm2 status
pm2 logs
pm2 monit

# Nginx
sudo tail -f /var/log/nginx/access.log

# System
htop
df -h
free -m
```

---

## ✅ Deploy Checklist

- [ ] VPS'ga SSH access bor
- [ ] Node.js 18+ o'rnatilgan
- [ ] Loyiha build qilingan
- [ ] Fayllar VPS'ga yuklangan
- [ ] Dependencies o'rnatilgan
- [ ] .env sozlangan
- [ ] PM2 ishga tushgan
- [ ] Nginx sozlangan
- [ ] SSL o'rnatilgan
- [ ] Firewall sozlangan
- [ ] Domain DNS sozlangan
- [ ] Backup sozlangan

---

## 🎉 Tayyor!

Loyiha endi VPS'da ishlayapti!

Test qiling: https://yourdomain.com

---

**Muammo bo'lsa:**
- PM2 logs: `pm2 logs`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Health check: `curl http://localhost/health`

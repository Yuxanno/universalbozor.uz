# 📦 VPS Deploy - Qisqacha Xulosa

## ✅ Ha, GitHub'siz to'g'ridan-to'g'ri VPS'ga yuklash mumkin!

---

## 🎯 3 Ta Oddiy Usul

### 1️⃣ **WinSCP + PuTTY (Eng Oson - Windows)**

**Kerak:**
- WinSCP: https://winscp.net/eng/download.php
- PuTTY: https://www.putty.org/

**Qadamlar:**
1. Loyihani build qiling: `npm run build`
2. Zip qiling (node_modules'siz)
3. WinSCP bilan VPS'ga yuklang
4. PuTTY bilan SSH qiling va o'rnating

📖 **Batafsil:** `WINDOWS_DEPLOY_GUIDE.md`

---

### 2️⃣ **SCP/SSH (Linux/Mac)**

**Qadamlar:**
```bash
# 1. Build
npm run build:production

# 2. Arxiv
tar -czf universal-uz.tar.gz --exclude='node_modules' .

# 3. Upload
scp universal-uz.tar.gz root@your-vps-ip:/tmp/

# 4. Deploy
ssh root@your-vps-ip
cd /tmp
tar -xzf universal-uz.tar.gz -C /var/www/universal-uz
cd /var/www/universal-uz
npm run install:all
npm run start:pm2
```

📖 **Batafsil:** `MANUAL_DEPLOY.md`

---

### 3️⃣ **Avtomatik Script (Linux/Mac)**

**Qadamlar:**
```bash
# 1. Script'ni sozlang
nano deploy-to-vps.sh
# VPS_USER, VPS_HOST, VPS_PATH

# 2. Executable qiling
chmod +x deploy-to-vps.sh

# 3. Ishga tushiring
./deploy-to-vps.sh
```

📖 **Script:** `deploy-to-vps.sh`

---

## 📁 Yaratilgan Fayllar

| Fayl | Tavsif |
|------|--------|
| `WINDOWS_DEPLOY_GUIDE.md` | Windows uchun oddiy yo'riqnoma |
| `MANUAL_DEPLOY.md` | Barcha platformalar uchun batafsil |
| `deploy-to-vps.sh` | Linux/Mac avtomatik script |
| `deploy-to-vps.bat` | Windows script (manual) |
| `DEPLOYMENT.md` | To'liq production deploy guide |
| `PRODUCTION_CHECKLIST.md` | Deploy checklist |

---

## 🚀 Tezkor Deploy (5 Qadam)

### Windows:

1. **Build:**
   ```cmd
   npm run build
   ```

2. **Zip qiling:**
   - node_modules, .git o'chiring
   - Qolganini zip qiling

3. **WinSCP:**
   - VPS'ga ulanish
   - Zip'ni `/tmp` ga yuklash

4. **PuTTY:**
   ```bash
   cd /tmp
   unzip universal-uz.zip -d /var/www/universal-uz
   cd /var/www/universal-uz
   npm run install:all
   cp server/.env.example server/.env
   nano server/.env  # Sozlang
   npm install -g pm2
   npm run start:pm2
   ```

5. **Nginx:**
   ```bash
   sudo apt install nginx
   sudo cp nginx.conf /etc/nginx/nginx.conf
   sudo systemctl restart nginx
   ```

---

### Linux/Mac:

```bash
# Avtomatik
chmod +x deploy-to-vps.sh
./deploy-to-vps.sh

# Yoki manual
npm run build:production
tar -czf app.tar.gz --exclude='node_modules' .
scp app.tar.gz root@vps:/tmp/
ssh root@vps
# VPS'da extract va setup
```

---

## ⚙️ VPS'da Sozlash

### 1. Environment Variables
```bash
cd /var/www/universal-uz
cp server/.env.example server/.env
nano server/.env
```

**O'zgartiring:**
- `MONGODB_URI` - MongoDB connection
- `JWT_SECRET` - Random secret (64+ chars)
- `CLIENT_URL` - Domain (https://yourdomain.com)
- `TELEGRAM_BOT_TOKEN` - Bot token
- `NODE_ENV=production`

### 2. Start Application
```bash
npm install -g pm2
npm run start:pm2
pm2 startup
pm2 save
```

### 3. Nginx
```bash
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 5. Firewall
```bash
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```

---

## 🔍 Tekshirish

```bash
# PM2 status
pm2 status

# Logs
pm2 logs

# Health check
curl http://localhost/health

# Browser
https://yourdomain.com
```

---

## 🔄 Yangilash

```bash
# Local'da build
npm run build

# Zip va upload (yuqoridagi usullar)

# VPS'da
cd /var/www/universal-uz
pm2 stop all
# Extract yangi fayllar
npm install --production
pm2 restart all
```

---

## 📊 Afzalliklari

### GitHub'siz Deploy:

✅ **Tezroq** - Git clone/pull kerak emas  
✅ **Oddiyroq** - Git bilish shart emas  
✅ **Xavfsizroq** - Code ochiq bo'lmaydi  
✅ **Moslashuvchan** - Istalgan usulni tanlash mumkin  

### Kamchiliklari:

❌ Version control yo'q  
❌ Manual process  
❌ Rollback qiyin  

---

## 💡 Tavsiyalar

### Development:
- Git ishlatish (local)
- GitHub'siz deploy

### Production:
- Git + CI/CD (GitHub Actions)
- Yoki manual deploy (bu guide)

### Birinchi marta:
1. Manual deploy qiling (bu guide)
2. Test qiling
3. Keyinchalik CI/CD sozlang (optional)

---

## 🆘 Yordam Kerakmi?

### Qaysi guide'ni o'qish kerak?

**Windows foydalanuvchi:**
→ `WINDOWS_DEPLOY_GUIDE.md` (Eng oddiy)

**Linux/Mac foydalanuvchi:**
→ `deploy-to-vps.sh` (Avtomatik)
→ `MANUAL_DEPLOY.md` (Manual)

**Batafsil ma'lumot:**
→ `DEPLOYMENT.md` (To'liq guide)

**Xavfsizlik:**
→ `SECURITY.md`

**Checklist:**
→ `PRODUCTION_CHECKLIST.md`

---

## 🎉 Xulosa

**Ha, GitHub'siz deploy qilish mumkin va oson!**

1. Build qiling
2. Zip/tar qiling
3. VPS'ga yuklang (WinSCP/SCP)
4. SSH qiling va o'rnating
5. Tayyor! 🚀

**Muvaffaqiyatlar!**

---

**Keyingi qadam:** `WINDOWS_DEPLOY_GUIDE.md` ni oching va boshlang! 👉

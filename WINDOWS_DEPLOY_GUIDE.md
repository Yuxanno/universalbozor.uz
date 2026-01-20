# 🪟 Windows'dan VPS'ga Deploy (Oddiy Yo'riqnoma)

GitHub'siz, Windows'dan to'g'ridan-to'g'ri VPS'ga deploy qilish.

---

## 📥 Kerakli Dasturlar

### 1. WinSCP (Fayl yuklash uchun)
- **Yuklab olish:** https://winscp.net/eng/download.php
- **O'rnatish:** Installation package (exe) yuklab, o'rnating

### 2. PuTTY (SSH uchun)
- **Yuklab olish:** https://www.putty.org/
- **O'rnatish:** putty.exe yuklab, o'rnating

---

## 🚀 Deploy Qadamlari

### Qadam 1: Loyihani Tayyorlash

1. **VS Code yoki CMD ochib, loyiha folder'ida:**
   ```cmd
   npm run build
   ```
   
2. **Kutib turing...** (1-2 daqiqa)
   - ✅ Ko'rinadi: `✓ built in 7.62s`

### Qadam 2: Fayllarni Zip Qilish

**Variant A: Windows Explorer bilan**
1. Loyiha folder'ini oching
2. Quyidagi folder/fayllarni **DELETE qiling** (vaqtinchalik):
   - `node_modules` folder
   - `client/node_modules` folder
   - `server/node_modules` folder
   - `.git` folder (agar bor bo'lsa)

3. Barcha qolgan fayllarni belgilang (Ctrl+A)
4. O'ng tugma → **Send to** → **Compressed (zipped) folder**
5. Nom bering: `universal-uz.zip`

**Variant B: PowerShell bilan**
```powershell
# PowerShell ochib:
Compress-Archive -Path client/dist,server,package.json,nginx.conf,ecosystem.config.js,.env.example -DestinationPath universal-uz.zip -Force
```

### Qadam 3: VPS'ga Yuklash (WinSCP)

1. **WinSCP ochish**

2. **Ulanish ma'lumotlari:**
   - File protocol: **SFTP**
   - Host name: **VPS IP manzili** (masalan: 192.168.1.100)
   - Port number: **22**
   - User name: **root** (yoki sizning user)
   - Password: **VPS paroli**

3. **Login tugmasini bosing**

4. **Fayllarni yuklash:**
   - Chap tomon: Windows kompyuter (universal-uz.zip ni toping)
   - O'ng tomon: VPS server
   - O'ng tomonda `/tmp` folder'iga o'ting
   - `universal-uz.zip` ni drag & drop qiling
   - Kutib turing... (5-10 daqiqa, internet tezligiga bog'liq)

### Qadam 4: VPS'da O'rnatish (PuTTY)

1. **PuTTY ochish**

2. **Ulanish:**
   - Host Name: **VPS IP manzili**
   - Port: **22**
   - Connection type: **SSH**
   - **Open** tugmasini bosing

3. **Login:**
   ```
   login as: root
   password: [VPS paroli]
   ```

4. **Komandalarni ketma-ket yozing:**

```bash
# 1. Folder yaratish
mkdir -p /var/www/universal-uz
cd /tmp

# 2. Unzip qilish
unzip universal-uz.zip -d /var/www/universal-uz

# 3. Loyiha folder'iga o'tish
cd /var/www/universal-uz

# 4. Dependencies o'rnatish (5-10 daqiqa)
npm install --production
cd client && npm install --production && cd ..
cd server && npm install --production && cd ..

# 5. Environment sozlash
cp server/.env.example server/.env
nano server/.env
```

5. **nano editor'da** (klaviatura bilan):
   - O'zgartiring:
     ```
     MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
     JWT_SECRET=your_secure_random_secret_here
     CLIENT_URL=https://yourdomain.com
     TELEGRAM_BOT_TOKEN=your_bot_token
     NODE_ENV=production
     ```
   - Saqlash: `Ctrl+O`, `Enter`, `Ctrl+X`

6. **PM2 o'rnatish va ishga tushirish:**
```bash
# PM2 o'rnatish
npm install -g pm2

# Ishga tushirish
npm run start:pm2

# Auto-start sozlash
pm2 startup
pm2 save

# Tekshirish
pm2 status
```

### Qadam 5: Nginx Sozlash

```bash
# Nginx o'rnatish
sudo apt update
sudo apt install nginx -y

# Config nusxalash
sudo cp nginx.conf /etc/nginx/nginx.conf

# Config'ni o'zgartirish
sudo nano /etc/nginx/nginx.conf
```

**nginx.conf'da o'zgartirish kerak:**
- `root /usr/share/nginx/html;` → `root /var/www/universal-uz/client/dist;`
- `alias /usr/share/nginx/html/uploads/;` → `alias /var/www/universal-uz/server/uploads/;`

**Saqlash:** `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Test qilish
sudo nginx -t

# Ishga tushirish
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Qadam 6: Firewall Sozlash

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Qadam 7: SSL Sertifikat (HTTPS)

```bash
# Certbot o'rnatish
sudo apt install certbot python3-certbot-nginx -y

# Sertifikat olish (domain'ingizni yozing)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## ✅ Tekshirish

### Browser'da:
1. **HTTP:** http://your-vps-ip
2. **HTTPS:** https://yourdomain.com
3. **Health check:** http://your-vps-ip/health

### PuTTY'da:
```bash
# PM2 status
pm2 status

# Logs
pm2 logs

# Nginx status
sudo systemctl status nginx

# Health check
curl http://localhost/health
```

---

## 🔄 Yangilash (Update)

Keyinchalik kod o'zgartirganingizda:

### 1. Windows'da:
```cmd
npm run build
```
Zip qiling (yuqoridagi kabi)

### 2. WinSCP'da:
- Yangi zip'ni `/tmp` ga yuklang

### 3. PuTTY'da:
```bash
cd /var/www/universal-uz

# PM2 to'xtatish
pm2 stop all

# Backup (xavfsizlik uchun)
cd ..
cp -r universal-uz universal-uz-backup

# Yangi fayllarni extract qilish
cd /tmp
unzip -o universal-uz.zip -d /var/www/universal-uz

# Dependencies yangilash
cd /var/www/universal-uz
npm install --production
cd client && npm install --production && cd ..
cd server && npm install --production && cd ..

# Qayta ishga tushirish
pm2 restart all

# Tekshirish
pm2 status
```

---

## 🐛 Muammolar va Yechimlar

### Muammo 1: "npm: command not found"
```bash
# Node.js o'rnatish
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Muammo 2: "Permission denied"
```bash
sudo chown -R $USER:$USER /var/www/universal-uz
```

### Muammo 3: "Port 5050 already in use"
```bash
sudo lsof -i :5050
sudo kill -9 <PID>
pm2 restart all
```

### Muammo 4: "502 Bad Gateway" (Nginx)
```bash
# PM2 ishlab turganini tekshiring
pm2 status

# Agar to'xtagan bo'lsa
pm2 restart all

# Nginx restart
sudo systemctl restart nginx
```

### Muammo 5: WinSCP ulanmayapti
- VPS IP to'g'rimi?
- Port 22 ochiqmi?
- Firewall bloklayaptimi?
- Password to'g'rimi?

---

## 📞 Yordam

### Logs ko'rish:
```bash
# PM2 logs
pm2 logs

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Restart qilish:
```bash
# PM2
pm2 restart all

# Nginx
sudo systemctl restart nginx

# Server reboot
sudo reboot
```

---

## 🎉 Tayyor!

Loyihangiz endi VPS'da ishlayapti!

**Test qiling:**
- Browser: https://yourdomain.com
- Login qiling va barcha funksiyalarni tekshiring

**Monitoring:**
- PM2: `pm2 monit`
- Logs: `pm2 logs`

---

## 📋 Eslatma

**Xavfsizlik:**
- ✅ `.env` faylini hech qachon Git'ga commit qilmang
- ✅ JWT_SECRET ni o'zgartiring
- ✅ MongoDB parolni kuchli qiling
- ✅ Firewall yoqilgan bo'lsin
- ✅ SSL sertifikat o'rnatilgan bo'lsin

**Backup:**
- Har kuni database backup oling
- `server/uploads` folder'ini backup qiling

**Monitoring:**
- Har kuni logs tekshiring
- PM2 status tekshiring
- Disk space tekshiring: `df -h`

---

**Muvaffaqiyatlar! 🚀**

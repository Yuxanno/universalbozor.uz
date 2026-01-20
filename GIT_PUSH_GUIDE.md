# 🔄 Git Push Guide

## O'zgarishlarni GitHub'ga yuklash

### Qadam 1: Git Status Tekshirish

```bash
git status
```

### Qadam 2: O'zgarishlarni Stage qilish

```bash
# Barcha o'zgarishlarni qo'shish
git add .

# Yoki alohida fayllar
git add .env.example
git add server/.env.example
git add .gitignore
git add Dockerfile
git add docker-compose.yml
git add .dockerignore
git add nginx.conf
git add ecosystem.config.js
git add package.json
git add server/src/index.js
git add client/src/types/index.ts
git add client/src/pages/admin/Warehouses.tsx
git add README.md
git add DEPLOYMENT.md
git add SECURITY.md
git add PRODUCTION_CHECKLIST.md
git add MANUAL_DEPLOY.md
git add WINDOWS_DEPLOY_GUIDE.md
git add DEPLOY_SUMMARY.md
git add deploy-to-vps.sh
git add deploy-to-vps.bat
git add GIT_PUSH_GUIDE.md
```

### Qadam 3: Commit qilish

```bash
git commit -m "Production ready: Docker, Nginx, Security, Deploy guides

- Added Docker support (Dockerfile, docker-compose.yml)
- Added Nginx configuration with SSL, gzip, rate limiting
- Added PM2 ecosystem configuration
- Fixed TypeScript build errors
- Added security improvements (.env.example, .gitignore)
- Added comprehensive deployment guides
- Added health check endpoint
- Updated server to serve static files in production
- Fixed Debt and CartItem types
- Added printer states to Warehouses
- Removed unused variables and imports
- Added deployment scripts for Windows and Linux/Mac
- Added security documentation
- Added production checklist"
```

### Qadam 4: Remote Repository Tekshirish

```bash
# Remote'ni ko'rish
git remote -v

# Agar remote yo'q bo'lsa, qo'shish
git remote add origin https://github.com/Yuxanno/universalbozor.uz.git
```

### Qadam 5: Push qilish

```bash
# Main branch'ga push
git push origin main

# Yoki master branch'ga
git push origin master

# Agar birinchi marta push qilayotgan bo'lsangiz
git push -u origin main
```

### Agar Authentication Kerak Bo'lsa:

#### Personal Access Token bilan:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Permissions: repo (full control)
4. Token'ni copy qiling

```bash
# Username: GitHub username
# Password: Personal Access Token (parol emas!)
git push origin main
```

#### SSH bilan:
```bash
# SSH key yaratish
ssh-keygen -t ed25519 -C "your_email@example.com"

# Public key'ni ko'rish
cat ~/.ssh/id_ed25519.pub

# GitHub → Settings → SSH and GPG keys → New SSH key
# Public key'ni paste qiling

# Remote'ni SSH'ga o'zgartirish
git remote set-url origin git@github.com:Yuxanno/universalbozor.uz.git

# Push
git push origin main
```

### Agar Conflict Bo'lsa:

```bash
# Pull qiling
git pull origin main --rebase

# Conflict'larni hal qiling
# Keyin:
git add .
git rebase --continue
git push origin main
```

### Agar Force Push Kerak Bo'lsa (Ehtiyot!):

```bash
# Faqat agar ishonchingiz komil bo'lsa
git push origin main --force
```

## ✅ Tekshirish

1. GitHub repository'ga boring: https://github.com/Yuxanno/universalbozor.uz
2. Yangi fayllar ko'rinishini tekshiring
3. Commit history'ni ko'ring

## 🔒 Muhim!

**.env fayllarini push qilmang!**
- `.env` ❌
- `server/.env` ❌
- `.env.example` ✅ (bu push qilish mumkin)

`.gitignore` faylida bu fayllar allaqachon qo'shilgan.

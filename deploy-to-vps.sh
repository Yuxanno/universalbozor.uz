#!/bin/bash

# VPS Deploy Script (GitHub'siz)
# Bu script loyihani to'g'ridan-to'g'ri VPS'ga yuklaydi

echo "🚀 Universal.uz - VPS Deploy Script"
echo "===================================="

# VPS ma'lumotlari (o'zgartirishingiz kerak)
VPS_USER="root"
VPS_HOST="your-vps-ip"
VPS_PATH="/var/www/universal-uz"

# Rang kodlari
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${YELLOW}⚠️  VPS ma'lumotlarini tekshiring:${NC}"
echo "User: $VPS_USER"
echo "Host: $VPS_HOST"
echo "Path: $VPS_PATH"
echo ""
read -p "Davom etamizmi? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Bekor qilindi."
    exit 1
fi

# 1. Local build
echo ""
echo -e "${GREEN}📦 Step 1: Building project...${NC}"
npm run build:production
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# 2. Keraksiz fayllarni o'chirish
echo ""
echo -e "${GREEN}🧹 Step 2: Cleaning unnecessary files...${NC}"
rm -rf node_modules/.cache
rm -rf client/node_modules/.cache
rm -rf server/node_modules/.cache

# 3. Arxiv yaratish
echo ""
echo -e "${GREEN}📦 Step 3: Creating archive...${NC}"
ARCHIVE_NAME="universal-uz-$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$ARCHIVE_NAME" \
    --exclude='node_modules' \
    --exclude='client/node_modules' \
    --exclude='server/node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='server/temp/*.pdf' \
    --exclude='server/temp/*.txt' \
    --exclude='.env' \
    --exclude='server/.env' \
    .

echo -e "${GREEN}✅ Archive created: $ARCHIVE_NAME${NC}"

# 4. VPS'ga yuklash
echo ""
echo -e "${GREEN}📤 Step 4: Uploading to VPS...${NC}"
scp "$ARCHIVE_NAME" "$VPS_USER@$VPS_HOST:/tmp/"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Upload failed!${NC}"
    exit 1
fi

# 5. VPS'da deploy qilish
echo ""
echo -e "${GREEN}🚀 Step 5: Deploying on VPS...${NC}"
ssh "$VPS_USER@$VPS_HOST" << 'ENDSSH'
    # Colors
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
    
    VPS_PATH="/var/www/universal-uz"
    ARCHIVE_NAME=$(ls -t /tmp/universal-uz-*.tar.gz | head -1)
    
    echo -e "${GREEN}📂 Creating directory...${NC}"
    mkdir -p "$VPS_PATH"
    
    echo -e "${GREEN}📦 Extracting archive...${NC}"
    tar -xzf "$ARCHIVE_NAME" -C "$VPS_PATH"
    
    cd "$VPS_PATH"
    
    echo -e "${GREEN}📥 Installing dependencies...${NC}"
    npm install --production
    cd client && npm install --production && cd ..
    cd server && npm install --production && cd ..
    
    echo -e "${YELLOW}⚠️  Don't forget to configure .env files!${NC}"
    echo -e "${YELLOW}   cp server/.env.example server/.env${NC}"
    echo -e "${YELLOW}   nano server/.env${NC}"
    
    echo -e "${GREEN}✅ Deploy completed!${NC}"
    
    # Cleanup
    rm -f "$ARCHIVE_NAME"
ENDSSH

# 6. Local cleanup
echo ""
echo -e "${GREEN}🧹 Step 6: Cleaning up...${NC}"
rm -f "$ARCHIVE_NAME"

echo ""
echo -e "${GREEN}✅ Deploy completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. SSH to VPS: ssh $VPS_USER@$VPS_HOST"
echo "2. Configure .env: cd $VPS_PATH && nano server/.env"
echo "3. Start app: npm run start:pm2"
echo "4. Setup Nginx: sudo cp nginx.conf /etc/nginx/nginx.conf"
echo ""

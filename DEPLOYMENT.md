# 🚀 Universal.uz - Production Deployment Guide

## 📋 Prerequisites

- Ubuntu 20.04+ / CentOS 8+ server
- Node.js 18+ installed
- Docker & Docker Compose (optional)
- Domain name configured
- SSL certificate (Let's Encrypt recommended)

---

## 🔐 Step 1: Security Setup

### 1.1 Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 1.2 Configure Environment Variables

**Root `.env`:**
```bash
cp .env.example .env
nano .env
```

**Server `.env`:**
```bash
cp server/.env.example server/.env
nano server/.env
```

Update:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Generated secret from step 1.1
- `CLIENT_URL` - Your domain (e.g., https://universalbozor.uz)
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `NODE_ENV=production`

### 1.3 Secure Files
```bash
chmod 600 .env server/.env
```

---

## 🐳 Option A: Docker Deployment (Recommended)

### A.1 Install Docker
```bash
# Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### A.2 Configure MongoDB Password
```bash
echo "MONGO_ROOT_PASSWORD=your_secure_password_here" > .env.docker
```

### A.3 Build and Start
```bash
# Build images
npm run docker:build

# Start services
npm run docker:up

# Check logs
npm run docker:logs
```

### A.4 SSL Setup with Let's Encrypt
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/

# Update nginx.conf (uncomment HTTPS section)
nano nginx.conf

# Restart nginx
docker-compose restart nginx
```

---

## 🔧 Option B: Manual Deployment

### B.1 Install Dependencies
```bash
npm run install:all
```

### B.2 Build Frontend
```bash
npm run build
```

### B.3 Install PM2
```bash
npm install -g pm2
```

### B.4 Start Application
```bash
npm run start:pm2
```

### B.5 Setup PM2 Startup
```bash
pm2 startup
pm2 save
```

### B.6 Install and Configure Nginx
```bash
# Install Nginx
sudo apt install nginx

# Copy configuration
sudo cp nginx.conf /etc/nginx/nginx.conf

# Copy static files
sudo mkdir -p /var/www/universal
sudo cp -r client/dist/* /var/www/universal/
sudo cp -r server/uploads /var/www/universal/

# Update nginx.conf paths
sudo nano /etc/nginx/nginx.conf
# Change: root /var/www/universal;
# Change: alias /var/www/universal/uploads/;

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### B.7 SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔍 Step 2: Verification

### Check Services
```bash
# Docker
docker-compose ps

# PM2
pm2 status

# Nginx
sudo systemctl status nginx

# Application health
curl http://localhost/health
```

### Test Application
1. Open browser: `https://yourdomain.com`
2. Login with credentials
3. Test all features

---

## 📊 Step 3: Monitoring

### PM2 Monitoring
```bash
# View logs
npm run logs:pm2

# Monitor resources
pm2 monit

# Restart if needed
npm run restart:pm2
```

### Docker Monitoring
```bash
# View logs
docker-compose logs -f

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

---

## 🔄 Step 4: Updates

### Docker Update
```bash
git pull
npm run docker:build
npm run docker:down
npm run docker:up
```

### PM2 Update
```bash
git pull
npm run install:all
npm run build
npm run restart:pm2
```

---

## 🗄️ Step 5: Backup

### Database Backup
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/backups/mongo_$DATE"
tar -czf "/backups/mongo_$DATE.tar.gz" "/backups/mongo_$DATE"
rm -rf "/backups/mongo_$DATE"
# Keep only last 7 days
find /backups -name "mongo_*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### Files Backup
```bash
# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz server/uploads/
```

---

## 🔥 Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🐛 Troubleshooting

### Application not starting
```bash
# Check logs
npm run logs:pm2
# or
docker-compose logs app

# Check environment variables
cat server/.env

# Check MongoDB connection
mongo "$MONGODB_URI"
```

### Nginx errors
```bash
# Check configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Restart
sudo systemctl restart nginx
```

### Port conflicts
```bash
# Check what's using port
sudo lsof -i :5050
sudo lsof -i :80

# Kill process if needed
sudo kill -9 <PID>
```

---

## 📈 Performance Optimization

### Enable HTTP/2
Already configured in nginx.conf

### Enable Brotli Compression
```bash
# Install brotli module
sudo apt install nginx-module-brotli

# Add to nginx.conf
brotli on;
brotli_comp_level 6;
```

### Database Indexing
Indexes are automatically created by Mongoose schemas.

---

## 🔒 Security Checklist

- [x] JWT secret changed from default
- [x] MongoDB credentials secured
- [x] .env files in .gitignore
- [x] HTTPS enabled
- [x] Security headers configured
- [x] Rate limiting enabled
- [x] CORS properly configured
- [x] File upload size limited
- [ ] Firewall configured
- [ ] Regular backups scheduled
- [ ] Monitoring setup

---

## 📞 Support

For issues or questions:
- Check logs first
- Review this guide
- Contact system administrator

---

## 📝 Maintenance

### Regular Tasks
- **Daily**: Check logs and monitoring
- **Weekly**: Review security updates
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

### Update Dependencies
```bash
# Check for updates
npm outdated

# Update (test in staging first!)
npm update
cd client && npm update
cd ../server && npm update
```

---

**Last Updated**: January 2026
**Version**: 1.0.0

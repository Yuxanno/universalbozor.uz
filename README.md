# Universal.uz - Biznes Boshqaruv Tizimi

Zamonaviy biznes boshqaruv tizimi: kassa, ombor, mijozlar, qarzlar va buyurtmalar.

## 🚀 Xususiyatlar

- 📊 **Statistika** - Sotuvlar, daromad, top mahsulotlar
- 🛒 **Kassa (POS)** - Tez va qulay savdo
- 📦 **Tovarlar** - Mahsulotlarni boshqarish
- 🏭 **Omborlar** - Ombor hisobi
- 👥 **Mijozlar** - Mijozlar bazasi
- 💳 **Qarz daftarcha** - Qarzlarni kuzatish
- 📋 **Buyurtmalar** - Marketplace buyurtmalari
- 👷 **Yordamchilar** - Xodimlarni boshqarish
- 📱 **Telegram Bot** - Avtomatik hisobotlar
- 🔄 **Offline Mode** - Internetsizsiz ishlash

## 👥 Rollar

| Rol | Huquqlar |
|-----|----------|
| Admin | Barcha funksiyalar |
| Kassir | Kassa, Qarzlar, Xodimlar chekleri |
| Yordamchi | QR skaner, Tovar qidirish, Kassaga yuborish |

## 🛠️ Texnologiyalar

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Recharts (grafik)
- Axios
- React Router
- IndexedDB (offline)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Bcrypt
- Multer (file upload)
- Node Telegram Bot API
- Puppeteer (PDF)

### DevOps
- Docker + Docker Compose
- Nginx
- PM2
- Let's Encrypt SSL

## 📦 O'rnatish

### Development

```bash
# 1. Clone repository
git clone <repository-url>
cd universal-uz

# 2. Install dependencies
npm run install:all

# 3. Configure environment
cp .env.example .env
cp server/.env.example server/.env
# Edit .env files with your settings

# 4. Start development
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5050

### Production

Batafsil ko'rsatmalar: [DEPLOYMENT.md](DEPLOYMENT.md)

#### Docker (Tavsiya etiladi)
```bash
# 1. Configure environment
cp server/.env.example server/.env
nano server/.env

# 2. Build and start
npm run docker:build
npm run docker:up

# 3. Check logs
npm run docker:logs
```

#### Manual
```bash
# 1. Build
npm run build:production

# 2. Start with PM2
npm run start:pm2

# 3. Configure Nginx
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo systemctl restart nginx
```

## 🔐 Xavfsizlik

- JWT authentication
- Bcrypt password hashing
- Rate limiting
- CORS protection
- Security headers
- HTTPS/SSL

Batafsil: [SECURITY.md](SECURITY.md)

## 📁 Loyiha tuzilishi

```
universal-uz/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI komponentlar
│   │   ├── pages/       # Sahifalar
│   │   ├── context/     # React Context
│   │   ├── hooks/       # Custom hooks
│   │   ├── utils/       # Yordamchi funksiyalar
│   │   └── types/       # TypeScript types
│   └── dist/            # Build output
├── server/              # Node.js backend
│   ├── src/
│   │   ├── models/      # MongoDB models
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Express middleware
│   │   └── telegram/    # Telegram bot
│   └── uploads/         # Yuklangan fayllar
├── nginx.conf           # Nginx configuration
├── Dockerfile           # Docker image
├── docker-compose.yml   # Docker services
├── ecosystem.config.js  # PM2 configuration
└── DEPLOYMENT.md        # Deployment guide
```

## 🔧 Asosiy Komandalar

```bash
# Development
npm run dev              # Start dev servers
npm run dev:client       # Client only
npm run dev:server       # Server only

# Production
npm run build            # Build client
npm run build:production # Full production build
npm run start            # Start server
npm run start:pm2        # Start with PM2

# Docker
npm run docker:build     # Build images
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View logs

# PM2
npm run logs:pm2         # View logs
npm run restart:pm2      # Restart app
npm run stop:pm2         # Stop app
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (admin only)

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Warehouses
- `GET /api/warehouses` - Get all warehouses
- `POST /api/warehouses` - Create warehouse
- `PUT /api/warehouses/:id` - Update warehouse

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer

### Debts
- `GET /api/debts` - Get all debts
- `POST /api/debts` - Create debt
- `PUT /api/debts/:id` - Update debt
- `POST /api/debts/:id/payment` - Add payment

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order status

### Receipts
- `GET /api/receipts` - Get all receipts
- `POST /api/receipts` - Create receipt
- `PUT /api/receipts/:id` - Update receipt status

### Stats
- `GET /api/stats` - Get dashboard statistics

## 🤖 Telegram Bot

Bot avtomatik ravishda kunlik hisobotlar yuboradi:
- Kunlik sotuvlar
- Top mahsulotlar
- Qarzlar holati
- Ombor holati

Sozlash:
```bash
# .env faylida
TELEGRAM_BOT_TOKEN=your_bot_token
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost/health
```

### Logs
```bash
# PM2
pm2 logs universal-backend

# Docker
docker-compose logs -f app

# Nginx
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Backup

```bash
# Database backup
mongodump --uri="$MONGODB_URI" --out=/backups/mongo_$(date +%Y%m%d)

# Files backup
tar -czf uploads_backup.tar.gz server/uploads/
```

## 🐛 Troubleshooting

### Port band
```bash
sudo lsof -i :5050
sudo kill -9 <PID>
```

### MongoDB connection error
- MongoDB ishlab turganini tekshiring
- MONGODB_URI to'g'riligini tekshiring
- Network access sozlamalarini tekshiring

### Build errors
```bash
# Clear cache
rm -rf node_modules client/node_modules server/node_modules
npm run install:all
npm run build
```

## 📝 License

Private - All rights reserved

## 👨‍💻 Support

Muammolar yoki savollar uchun:
- Issues: GitHub Issues
- Email: support@universalbozor.uz

---

**Version**: 1.0.0  
**Last Updated**: January 2026

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Faqat rasm fayllari ruxsat etilgan!'));
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search, warehouse, mainOnly } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Фильтрация по складу - поддержка как ID, так и названия склада
    if (warehouse) {
      // Проверяем, является ли warehouse ObjectId или названием
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(warehouse);
      if (isObjectId) {
        query.warehouse = warehouse;
      } else {
        // Ищем склад по названию
        const warehouseDoc = await Warehouse.findOne({ name: warehouse });
        if (warehouseDoc) {
          query.warehouse = warehouseDoc._id;
        } else {
          // Если склад не найден, возвращаем пустой массив
          return res.json([]);
        }
      }
    }
    
    if (mainOnly === 'true') query.isMainWarehouse = true;

    // Сортировка по количеству продаж (от большего к меньшему)
    const products = await Product.find(query)
      .populate('warehouse', 'name')
      .sort({ soldCount: -1, createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Get next auto-generated code
router.get('/next-code', auth, async (req, res) => {
  try {
    const lastProduct = await Product.findOne().sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastProduct && lastProduct.code) {
      const match = lastProduct.code.match(/(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    res.json({ code: String(nextNum) });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Check if code exists
router.get('/check-code/:code', auth, async (req, res) => {
  try {
    const { excludeId } = req.query;
    const query = { code: req.params.code };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const exists = await Product.findOne(query);
    res.json({ exists: !!exists });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Upload images for product
router.post('/upload-images', auth, authorize('admin'), upload.array('images', 8), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Rasm yuklanmadi' });
    }
    const imagePaths = req.files.map(file => `/uploads/products/${file.filename}`);
    res.json({ images: imagePaths });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Delete image
router.delete('/delete-image', auth, authorize('admin'), async (req, res) => {
  try {
    const { imagePath } = req.body;
    if (!imagePath) return res.status(400).json({ message: 'Rasm yo\'li ko\'rsatilmagan' });
    
    const fullPath = path.join(__dirname, '../..', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    res.json({ message: 'Rasm o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Check stock availability for items
router.post('/check-stock', auth, async (req, res) => {
  try {
    const { items } = req.body;
    const errors = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        errors.push({
          name: item.name,
          available: 0,
          requested: item.quantity,
          message: 'Tovar topilmadi'
        });
      } else if (product.quantity < item.quantity) {
        errors.push({
          name: product.name,
          available: product.quantity,
          requested: item.quantity
        });
      }
    }
    
    res.json({ success: errors.length === 0, errors });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('warehouse', 'name');
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { warehouse, code, packageInfo, ...rest } = req.body;
    
    // Auto-generate code if not provided
    let productCode = code;
    if (!productCode) {
      const lastProduct = await Product.findOne().sort({ createdAt: -1 });
      let nextNum = 1;
      if (lastProduct && lastProduct.code) {
        const match = lastProduct.code.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      productCode = String(nextNum);
    }
    
    // Check if code already exists
    const existingProduct = await Product.findOne({ code: productCode });
    if (existingProduct) {
      return res.status(400).json({ message: `Kod "${productCode}" allaqachon mavjud` });
    }
    
    // Check if warehouse is "Asosiy ombor"
    let isMainWarehouse = false;
    if (warehouse) {
      const warehouseDoc = await Warehouse.findById(warehouse);
      if (warehouseDoc && warehouseDoc.name === 'Asosiy ombor') {
        isMainWarehouse = true;
      }
    }
    
    // Prepare product data
    const productData = { 
      ...rest, 
      code: productCode,
      warehouse,
      isMainWarehouse,
      createdBy: req.user._id 
    };
    
    // Add package information if provided
    if (packageInfo) {
      productData.packages = [packageInfo];
    }
    
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { warehouse, code, packageInfo, ...rest } = req.body;
    
    // Check if code already exists (excluding current product)
    if (code) {
      const existingProduct = await Product.findOne({ code, _id: { $ne: req.params.id } });
      if (existingProduct) {
        return res.status(400).json({ message: `Kod "${code}" allaqachon mavjud` });
      }
    }
    
    // Check if warehouse is "Asosiy ombor"
    let isMainWarehouse = false;
    if (warehouse) {
      const warehouseDoc = await Warehouse.findById(warehouse);
      if (warehouseDoc && warehouseDoc.name === 'Asosiy ombor') {
        isMainWarehouse = true;
      }
    }
    
    // Prepare update data
    const updateData = { ...rest, code, warehouse, isMainWarehouse };
    
    // Add package information if provided
    if (packageInfo) {
      const product = await Product.findById(req.params.id);
      if (product) {
        updateData.packages = [...(product.packages || []), packageInfo];
      }
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    res.json({ message: 'Tovar o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;

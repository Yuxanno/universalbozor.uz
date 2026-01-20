const express = require('express');
const Receipt = require('../models/Receipt');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    
    const receipts = await Receipt.find(query)
      .populate('createdBy', 'name role')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Get or create draft receipt for helper
router.get('/draft', auth, authorize('helper'), async (req, res) => {
  try {
    // First check for pending receipt (already submitted, may be edited by cashier)
    let receipt = await Receipt.findOne({ 
      createdBy: req.user._id, 
      status: 'pending' 
    });
    
    // If no pending, check for draft
    if (!receipt) {
      receipt = await Receipt.findOne({ 
        createdBy: req.user._id, 
        status: 'draft' 
      });
    }
    
    // If no draft either, create new one
    if (!receipt) {
      receipt = new Receipt({
        items: [],
        total: 0,
        status: 'draft',
        createdBy: req.user._id
      });
      await receipt.save();
    }
    
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Update draft receipt (add/remove items) - only for draft status
router.put('/draft', auth, authorize('helper'), async (req, res) => {
  try {
    const { items } = req.body;
    
    let draft = await Receipt.findOne({ 
      createdBy: req.user._id, 
      status: 'draft' 
    });
    
    if (!draft) {
      draft = new Receipt({
        items: [],
        total: 0,
        status: 'draft',
        createdBy: req.user._id
      });
    }
    
    draft.items = items;
    draft.total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await draft.save();
    
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Submit draft (change status to pending)
router.put('/draft/submit', auth, authorize('helper'), async (req, res) => {
  try {
    const draft = await Receipt.findOne({ 
      createdBy: req.user._id, 
      status: 'draft' 
    });
    
    if (!draft) {
      return res.status(404).json({ message: 'Draft topilmadi' });
    }
    
    if (draft.items.length === 0) {
      return res.status(400).json({ message: 'Savat bo\'sh' });
    }
    
    draft.status = 'pending';
    await draft.save();
    
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/staff', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { status } = req.query;
    // Include draft, pending, approved statuses for real-time view
    const query = { status: { $in: ['draft', 'pending', 'approved'] } };
    if (status && status !== 'all') query.status = status;
    
    const receipts = await Receipt.find(query)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Load worker receipt to kassa (complete it)
router.put('/:id/load-to-kassa', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status !== 'pending' && receipt.status !== 'approved' && receipt.status !== 'draft') {
      return res.status(400).json({ message: 'Bu chek allaqachon yuklangan' });
    }

    // Check stock availability
    for (const item of receipt.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Tovar topilmadi: ${item.name}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Yetarli tovar yo'q: ${item.name}. Mavjud: ${product.quantity}, So'ralgan: ${item.quantity}` 
        });
      }
    }

    // Update stock and soldCount
    for (const item of receipt.items) {
      await Product.findByIdAndUpdate(item.product, { 
        $inc: { quantity: -item.quantity, soldCount: item.quantity } 
      });
    }

    receipt.status = 'completed';
    receipt.processedBy = req.user._id;
    await receipt.save();
    
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Remove item from receipt
router.put('/:id/remove-item/:itemIndex', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status === 'completed') {
      return res.status(400).json({ message: 'Yakunlangan chekni o\'zgartirish mumkin emas' });
    }

    const itemIndex = parseInt(req.params.itemIndex);
    if (itemIndex < 0 || itemIndex >= receipt.items.length) {
      return res.status(400).json({ message: 'Noto\'g\'ri tovar indeksi' });
    }

    receipt.items.splice(itemIndex, 1);
    receipt.total = receipt.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // If no items left, delete the receipt
    if (receipt.items.length === 0) {
      await Receipt.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Chek o\'chirildi', deleted: true });
    }
    
    await receipt.save();
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Update item in receipt (price or quantity)
router.put('/:id/update-item/:itemIndex', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status === 'completed') {
      return res.status(400).json({ message: 'Yakunlangan chekni o\'zgartirish mumkin emas' });
    }

    const itemIndex = parseInt(req.params.itemIndex);
    if (itemIndex < 0 || itemIndex >= receipt.items.length) {
      return res.status(400).json({ message: 'Noto\'g\'ri tovar indeksi' });
    }

    const { price, quantity } = req.body;
    
    if (price !== undefined) {
      receipt.items[itemIndex].price = price;
    }
    if (quantity !== undefined) {
      if (quantity <= 0) {
        // Remove item if quantity is 0
        receipt.items.splice(itemIndex, 1);
      } else {
        receipt.items[itemIndex].quantity = quantity;
      }
    }
    
    receipt.total = receipt.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    if (receipt.items.length === 0) {
      await Receipt.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Chek o\'chirildi', deleted: true });
    }
    
    await receipt.save();
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

/**
 * Bulk sync endpoint for offline sales
 * Receives array of sales from offline POS
 * IMPORTANT: This endpoint must be idempotent - handle duplicate offlineIds
 */
router.post('/bulk', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { sales } = req.body;
    
    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ success: false, message: 'No sales provided' });
    }

    const results = [];
    const errors = [];

    for (const sale of sales) {
      try {
        // Check if this offline sale was already synced (by offlineId in metadata)
        const existingReceipt = await Receipt.findOne({ 'metadata.offlineId': sale.offlineId });
        if (existingReceipt) {
          // Already synced, skip but mark as success
          results.push({ offlineId: sale.offlineId, status: 'already_synced' });
          continue;
        }

        // Create receipt from offline sale
        const receipt = new Receipt({
          items: sale.items,
          total: sale.total,
          paymentMethod: sale.paymentMethod || 'cash',
          customer: sale.customer,
          status: 'completed',
          isReturn: sale.isReturn || false,
          createdBy: req.user._id,
          createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
          metadata: { offlineId: sale.offlineId, syncedAt: new Date() }
        });

        // Update product quantities (skip stock check for offline sales)
        for (const item of sale.items) {
          const quantityChange = sale.isReturn ? item.quantity : -item.quantity;
          await Product.findByIdAndUpdate(item.product, { $inc: { quantity: quantityChange } });
        }

        await receipt.save();
        results.push({ offlineId: sale.offlineId, status: 'synced', receiptId: receipt._id });

      } catch (itemError) {
        errors.push({ offlineId: sale.offlineId, error: itemError.message });
      }
    }

    // Return success even if some items failed - client will retry failed ones
    res.json({
      success: true,
      synced: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, total, paymentMethod, customer, isReturn } = req.body;
    const isHelper = req.user.role === 'helper';
    
    // Check stock availability before sale (not for returns)
    if (!isReturn && !isHelper) {
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({ message: `Tovar topilmadi: ${item.name}` });
        }
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Yetarli tovar yo'q: ${item.name}. Mavjud: ${product.quantity}, So'ralgan: ${item.quantity}` 
          });
        }
      }
    }
    
    const receipt = new Receipt({
      items,
      total,
      paymentMethod,
      customer,
      status: isHelper ? 'pending' : 'completed',
      isReturn: isReturn || false,
      createdBy: req.user._id
    });
    
    if (!isHelper) {
      for (const item of items) {
        // If return mode, add to stock; otherwise subtract
        const quantityChange = isReturn ? item.quantity : -item.quantity;
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: quantityChange } });
      }
    }
    
    await receipt.save();
    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id/approve', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status !== 'pending') return res.status(400).json({ message: 'Bu chek allaqachon ko\'rib chiqilgan' });

    // Check stock availability before approving
    for (const item of receipt.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Tovar topilmadi: ${item.name}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Yetarli tovar yo'q: ${item.name}. Mavjud: ${product.quantity}, So'ralgan: ${item.quantity}` 
        });
      }
    }

    receipt.status = 'approved';
    receipt.processedBy = req.user._id;
    
    for (const item of receipt.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
    }
    
    await receipt.save();
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id/reject', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status !== 'pending') return res.status(400).json({ message: 'Bu chek allaqachon ko\'rib chiqilgan' });

    receipt.status = 'rejected';
    receipt.processedBy = req.user._id;
    await receipt.save();
    
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;

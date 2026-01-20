const express = require('express');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    
    const debts = await Debt.find(query).populate('customer', 'name phone').sort({ createdAt: -1 });
    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const typeFilter = type ? { type } : {};

    const stats = {
      total: await Debt.countDocuments(typeFilter),
      pending: await Debt.countDocuments({ ...typeFilter, status: 'pending' }),
      today: await Debt.countDocuments({ ...typeFilter, status: { $ne: 'paid' }, dueDate: { $gte: today, $lt: new Date(today.getTime() + 86400000) } }),
      overdue: await Debt.countDocuments({ ...typeFilter, status: 'overdue' }),
      paid: await Debt.countDocuments({ ...typeFilter, status: 'paid' }),
      blacklist: await Debt.countDocuments({ ...typeFilter, status: 'blacklist' }),
      totalAmount: (await Debt.aggregate([
        { $match: { ...typeFilter, status: { $ne: 'paid' } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$amount', '$paidAmount'] } } } }
      ]))[0]?.total || 0
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { type, customer, creditorName, amount, dueDate, description, collateral } = req.body;
    
    const debtData = {
      type: type || 'receivable',
      amount,
      dueDate,
      description,
      collateral,
      createdBy: req.user._id
    };
    
    if (type === 'payable') {
      // Own debt - I owe someone
      debtData.creditorName = creditorName;
    } else {
      // Customer debt - they owe me
      debtData.customer = customer;
      await Customer.findByIdAndUpdate(customer, { $inc: { debt: amount } });
    }
    
    const debt = new Debt(debtData);
    await debt.save();
    
    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/:id/payment', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { amount, method } = req.body;
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    debt.payments.push({ amount, method });
    debt.paidAmount += amount;
    
    if (debt.paidAmount >= debt.amount) {
      debt.status = 'paid';
    }
    
    await debt.save();
    
    // Only update customer debt for receivable type
    if (debt.type === 'receivable' && debt.customer) {
      await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: -amount } });
    }
    
    res.json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { type, customer, creditorName, amount, dueDate, description, collateral } = req.body;
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });
    
    // Update customer debt if amount changed (for receivable type)
    if (debt.type === 'receivable' && debt.customer) {
      const oldRemaining = debt.amount - debt.paidAmount;
      const newRemaining = amount - debt.paidAmount;
      const diff = newRemaining - oldRemaining;
      if (diff !== 0) {
        await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: diff } });
      }
    }
    
    debt.amount = amount;
    debt.dueDate = dueDate;
    debt.description = description;
    debt.collateral = collateral;
    
    if (type === 'payable') {
      debt.creditorName = creditorName;
    } else {
      debt.customer = customer;
    }
    
    await debt.save();
    res.json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const debt = await Debt.findByIdAndDelete(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });
    res.json({ message: 'Qarz o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;

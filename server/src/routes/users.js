const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ createdBy: req.user._id }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/helpers', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    // For admin - show their created helpers
    // For cashier - show all helpers in the system
    const query = req.user.role === 'admin' 
      ? { createdBy: req.user._id, role: { $in: ['cashier', 'helper'] } }
      : { role: { $in: ['cashier', 'helper'] } };
    
    const helpers = await User.find(query).select('-password');
    res.json(helpers);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    
    const existingUser = await User.findOne({ 
      $or: [{ phone }, { email: phone }] 
    });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan' });
    }

    const user = new User({ name, phone, password, role, createdBy: req.user._id });
    await user.save();
    
    res.status(201).json({ _id: user._id, name: user.name, phone: user.phone, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, role, password } = req.body;
    const updateData = { name, phone, role };
    
    const user = await User.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    
    user.name = name;
    user.phone = phone;
    user.role = role;
    if (password) {
      user.password = password;
    }
    await user.save();
    
    const result = user.toObject();
    delete result.password;
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    res.json({ message: 'Foydalanuvchi o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;

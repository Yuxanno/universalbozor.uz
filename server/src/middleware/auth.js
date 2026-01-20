const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Avtorizatsiya talab qilinadi' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token yaroqsiz' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }
    next();
  };
};

module.exports = { auth, authorize };

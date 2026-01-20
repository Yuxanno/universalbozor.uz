const express = require('express');
const Receipt = require('../models/Receipt');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalRevenue,
      todaySales,
      weekSales,
      monthSales,
      totalReceipts,
      totalProducts,
      lowStock,
      outOfStock,
      peakHourData
    ] = await Promise.all([
      Receipt.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.aggregate([{ $match: { status: 'completed', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.aggregate([{ $match: { status: 'completed', createdAt: { $gte: weekAgo } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.aggregate([{ $match: { status: 'completed', createdAt: { $gte: monthAgo } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.countDocuments({ status: 'completed' }),
      Product.countDocuments(),
      Product.countDocuments({ $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$minStock'] }] } }),
      Product.countDocuments({ quantity: 0 }),
      Receipt.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, total: { $sum: '$total' } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ])
    ]);

    let peakHour = '';
    if (peakHourData.length > 0) {
      const hour = peakHourData[0]._id;
      peakHour = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
    }

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      todaySales: todaySales[0]?.total || 0,
      weekSales: weekSales[0]?.total || 0,
      monthSales: monthSales[0]?.total || 0,
      totalReceipts,
      totalProducts,
      lowStock,
      outOfStock,
      peakHour
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/chart', auth, authorize('admin'), async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Uzbekistan timezone offset (UTC+5)
    const tzOffset = 5 * 60; // minutes
    
    if (period === 'today') {
      // Hourly data for today - single aggregation query
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const hourlyData = await Receipt.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: today, $lt: tomorrow } } },
        { 
          $group: { 
            _id: { 
              $hour: { 
                date: '$createdAt', 
                timezone: '+05:00' 
              } 
            }, 
            total: { $sum: '$total' } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Create full 24-hour array
      const hourMap = new Map(hourlyData.map(h => [h._id, h.total]));
      const data = [];
      for (let hour = 0; hour < 24; hour++) {
        data.push({
          date: `${hour.toString().padStart(2, '0')}:00`,
          sales: hourMap.get(hour) || 0
        });
      }
      
      res.json(data);
    } else {
      // Daily data for week/month - single aggregation query
      const days = period === 'month' ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);
      
      const dailyData = await Receipt.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { 
          $group: { 
            _id: { 
              $dateToString: { 
                format: '%Y-%m-%d', 
                date: '$createdAt',
                timezone: '+05:00'
              } 
            }, 
            total: { $sum: '$total' } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Create full days array
      const dayMap = new Map(dailyData.map(d => [d._id, d.total]));
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        data.push({
          date: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
          sales: dayMap.get(dateKey) || 0
        });
      }
      
      res.json(data);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/top-products', auth, authorize('admin'), async (req, res) => {
  try {
    const topProducts = await Receipt.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);
    
    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;

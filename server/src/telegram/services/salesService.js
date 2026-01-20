// Sales Service - Logic for sales analytics
const Receipt = require('../../models/Receipt');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Customer = require('../../models/Customer');

/**
 * Get sales data for a date range
 */
const getSalesInRange = async (startDate, endDate) => {
  const receipts = await Receipt.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: 'completed',
    isReturn: false
  })
    .populate('createdBy', 'name role')
    .populate('customer', 'name phone')
    .populate('items.product', 'costPrice');

  // Calculate profit for each receipt
  const receiptsWithProfit = receipts.map(receipt => {
    let profit = 0;
    let totalCost = 0;

    receipt.items.forEach(item => {
      const costPrice = item.product?.costPrice || 0;
      const itemCost = costPrice * item.quantity;
      const itemRevenue = item.price * item.quantity;
      totalCost += itemCost;
      profit += (itemRevenue - itemCost);
    });

    return {
      _id: receipt._id,
      total: receipt.total,
      profit: profit,
      totalCost: totalCost,
      paymentMethod: receipt.paymentMethod,
      cashier: receipt.createdBy,
      customer: receipt.customer,
      items: receipt.items,
      createdAt: receipt.createdAt
    };
  });

  return receiptsWithProfit;
};

/**
 * Get sales grouped by cashier
 */
const getSalesByCashier = async (startDate, endDate) => {
  const sales = await getSalesInRange(startDate, endDate);
  
  const byCashier = {};
  
  sales.forEach(sale => {
    const cashierId = sale.cashier?._id?.toString() || 'unknown';
    const cashierName = sale.cashier?.name || 'Noma\'lum';
    
    if (!byCashier[cashierId]) {
      byCashier[cashierId] = {
        name: cashierName,
        salesCount: 0,
        totalAmount: 0,
        totalProfit: 0
      };
    }
    
    byCashier[cashierId].salesCount++;
    byCashier[cashierId].totalAmount += sale.total;
    byCashier[cashierId].totalProfit += sale.profit;
  });

  return Object.values(byCashier);
};

/**
 * Get sales grouped by customer
 */
const getSalesByCustomer = async (startDate, endDate) => {
  const sales = await getSalesInRange(startDate, endDate);
  
  const byCustomer = {};
  let unknownTotal = 0;
  let unknownCount = 0;
  
  sales.forEach(sale => {
    if (!sale.customer) {
      unknownTotal += sale.total;
      unknownCount++;
      return;
    }
    
    const customerId = sale.customer._id.toString();
    const customerName = sale.customer.name;
    
    if (!byCustomer[customerId]) {
      byCustomer[customerId] = {
        name: customerName,
        phone: sale.customer.phone || '',
        purchaseCount: 0,
        totalAmount: 0
      };
    }
    
    byCustomer[customerId].purchaseCount++;
    byCustomer[customerId].totalAmount += sale.total;
  });

  return {
    customers: Object.values(byCustomer),
    unknown: {
      count: unknownCount,
      total: unknownTotal
    }
  };
};

/**
 * Get returns in date range
 */
const getReturnsInRange = async (startDate, endDate) => {
  const returns = await Receipt.find({
    createdAt: { $gte: startDate, $lte: endDate },
    isReturn: true
  });

  return {
    count: returns.length,
    total: returns.reduce((sum, r) => sum + r.total, 0)
  };
};

/**
 * Get summary statistics
 */
const getSummary = async (startDate, endDate) => {
  const sales = await getSalesInRange(startDate, endDate);
  const returns = await getReturnsInRange(startDate, endDate);
  
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const totalCost = sales.reduce((sum, s) => sum + s.totalCost, 0);
  
  return {
    salesCount: sales.length,
    totalRevenue,
    totalCost,
    totalProfit,
    netProfit: totalProfit - returns.total,
    returns
  };
};

module.exports = {
  getSalesInRange,
  getSalesByCashier,
  getSalesByCustomer,
  getReturnsInRange,
  getSummary
};

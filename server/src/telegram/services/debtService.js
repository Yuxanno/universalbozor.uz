// Debt Service - Logic for debt notifications
const Debt = require('../../models/Debt');
const Customer = require('../../models/Customer');

/**
 * Get start and end of a specific day
 */
const getDayRange = (daysFromNow = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(0, 0, 0, 0);
  const start = new Date(date);
  date.setHours(23, 59, 59, 999);
  const end = new Date(date);
  return { start, end };
};

/**
 * Get receivable debts (customers owe to owner) due on specific day
 */
const getReceivableDebtsDue = async (daysFromNow = 0) => {
  const { start, end } = getDayRange(daysFromNow);
  
  const debts = await Debt.find({
    type: 'receivable',
    status: { $in: ['pending', 'overdue'] },
    dueDate: { $gte: start, $lte: end }
  }).populate('customer');

  return debts.map(d => ({
    _id: d._id,
    customerName: d.customer?.name || 'Noma\'lum',
    customerPhone: d.customer?.phone || '',
    amount: d.amount,
    paidAmount: d.paidAmount,
    remainingAmount: d.amount - d.paidAmount,
    dueDate: d.dueDate,
    description: d.description,
    collateral: d.collateral
  })).filter(d => d.remainingAmount > 0);
};

/**
 * Get payable debts (owner owes to someone) due on specific day
 */
const getPayableDebtsDue = async (daysFromNow = 0) => {
  const { start, end } = getDayRange(daysFromNow);
  
  const debts = await Debt.find({
    type: 'payable',
    status: { $in: ['pending', 'overdue'] },
    dueDate: { $gte: start, $lte: end }
  });

  return debts.map(d => ({
    _id: d._id,
    creditorName: d.creditorName || 'Noma\'lum',
    amount: d.amount,
    paidAmount: d.paidAmount,
    remainingAmount: d.amount - d.paidAmount,
    dueDate: d.dueDate,
    description: d.description
  })).filter(d => d.remainingAmount > 0);
};

/**
 * Get all debts for analytics (date range)
 */
const getDebtsInRange = async (startDate, endDate) => {
  // Debts created in range
  const newDebts = await Debt.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('customer');

  // Payments made in range
  const allDebts = await Debt.find({
    'payments.date': { $gte: startDate, $lte: endDate }
  }).populate('customer');

  const paymentsInRange = [];
  allDebts.forEach(debt => {
    debt.payments.forEach(payment => {
      if (payment.date >= startDate && payment.date <= endDate) {
        paymentsInRange.push({
          debtId: debt._id,
          customerName: debt.customer?.name || debt.creditorName || 'Noma\'lum',
          amount: payment.amount,
          method: payment.method,
          date: payment.date,
          type: debt.type
        });
      }
    });
  });

  return {
    newDebts: newDebts.map(d => ({
      _id: d._id,
      customerName: d.customer?.name || d.creditorName || 'Noma\'lum',
      amount: d.amount,
      type: d.type,
      createdAt: d.createdAt
    })),
    payments: paymentsInRange
  };
};

module.exports = {
  getReceivableDebtsDue,
  getPayableDebtsDue,
  getDebtsInRange,
  getDayRange
};

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, enum: ['cash', 'card'], default: 'cash' },
  date: { type: Date, default: Date.now }
});

const debtSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  creditorName: { type: String }, // For own debts (who you owe to)
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'overdue', 'paid', 'blacklist'], default: 'pending' },
  type: { type: String, enum: ['receivable', 'payable'], default: 'receivable' }, // receivable = they owe me, payable = I owe them
  description: { type: String },
  collateral: { type: String }, // Garov - what was left as collateral
  payments: [paymentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Debt', debtSchema);

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  price: Number,
  quantity: Number
});

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['new', 'processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'new' 
  },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  address: String,
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

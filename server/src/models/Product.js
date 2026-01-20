const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  costPrice: { type: Number, default: 0 },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 }, // Количество проданных единиц
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  isMainWarehouse: { type: Boolean, default: false },
  category: String,
  images: [{ type: String }], // Array of image paths
  minStock: { type: Number, default: 5 },
  // Package/batch information
  packages: [{
    packageCount: { type: Number, required: true }, // Nechta qop
    unitsPerPackage: { type: Number, required: true }, // Har qopda nechta
    totalCost: { type: Number, required: true }, // Jami narxi
    costPerUnit: { type: Number, required: true }, // Bir dona narxi
    dateAdded: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

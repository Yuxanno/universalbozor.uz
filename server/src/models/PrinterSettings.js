const mongoose = require('mongoose');

const printerSettingsSchema = new mongoose.Schema({
  // Основные настройки
  labelPrinter: { type: String, default: '' },      // Принтер для ценников
  receiptPrinter: { type: String, default: '' },    // Принтер для чеков
  
  // Настройки ценника
  label: {
    width: { type: Number, default: 58 },           // Ширина в мм
    height: { type: Number, default: 40 },          // Высота в мм
    fontSize: { type: Number, default: 11 },        // Размер шрифта названия
    showPrice: { type: Boolean, default: true },    // Показывать цену
    showCode: { type: Boolean, default: true },     // Показывать код
    showQR: { type: Boolean, default: true },       // Показывать QR код
    qrSize: { type: Number, default: 20 },          // Размер QR в мм
    padding: { type: Number, default: 2 },          // Отступы в мм
  },
  
  // Настройки чека
  receipt: {
    width: { type: Number, default: 58 },           // Ширина в мм (58 или 80)
    charsPerLine: { type: Number, default: 32 },    // Символов в строке
    shopName: { type: String, default: 'UNIVERSAL' },
    shopSubtitle: { type: String, default: 'Savdo markazi' },
    footerText: { type: String, default: 'Rahmat!' },
    showLogo: { type: Boolean, default: true },
    printMethod: { type: String, enum: ['text', 'pdf'], default: 'text' },
    autoCut: { type: Boolean, default: true },      // Автоотрез бумаги
    feedLines: { type: Number, default: 5 },        // Строк подачи перед отрезом
  },
  
  // Дополнительные настройки
  autoPrint: { type: Boolean, default: true },      // Автопечать после продажи
  copies: { type: Number, default: 1 },             // Количество копий
  
}, { timestamps: true });

// Всегда только одна запись настроек
printerSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

printerSettingsSchema.statics.updateSettings = async function(data) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(data);
  } else {
    Object.assign(settings, data);
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('PrinterSettings', printerSettingsSchema);

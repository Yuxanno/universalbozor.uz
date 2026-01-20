// All messages in Uzbek (Latin)

const formatMoney = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
};

const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatPhone = (phone) => {
  if (!phone) return '';
  // Убираем все кроме цифр
  const digits = phone.replace(/\D/g, '');
  // Если номер без кода страны, добавляем 998
  if (digits.length === 9) {
    return '+998' + digits;
  }
  if (digits.startsWith('998')) {
    return '+' + digits;
  }
  return '+' + digits;
};

module.exports = {
  formatMoney,
  formatDate,

  // Debt notifications
  DEBT_TODAY: (debts) => {
    if (!debts.length) return null;
    let msg = "⚠️ *Ogohlantirish!*\n\n";
    msg += "📅 *Bugun to'lov qilishi kerak:*\n\n";
    debts.forEach((d, i) => {
      msg += `${i + 1}. *${d.customerName}*\n`;
      if (d.customerPhone) {
        msg += `   📞 ${formatPhone(d.customerPhone)}\n`;
      }
      msg += `   💰 Summa: ${formatMoney(d.remainingAmount)}\n`;
      msg += `   📆 Muddat: ${formatDate(d.dueDate)}\n\n`;
    });
    return msg;
  },

  DEBT_TOMORROW: (debts) => {
    if (!debts.length) return null;
    let msg = "🔔 *Eslatma!*\n\n";
    msg += "📅 *Ertaga to'lov qilishi kerak:*\n\n";
    debts.forEach((d, i) => {
      msg += `${i + 1}. *${d.customerName}*\n`;
      if (d.customerPhone) {
        msg += `   📞 ${formatPhone(d.customerPhone)}\n`;
      }
      msg += `   💰 Summa: ${formatMoney(d.remainingAmount)}\n`;
      msg += `   📆 Muddat: ${formatDate(d.dueDate)}\n\n`;
    });
    return msg;
  },

  // Owner's own debts (payable)
  OWN_DEBT_TODAY: (debts) => {
    if (!debts.length) return null;
    let msg = "❗ *Siz qarzdorsiz!*\n\n";
    msg += "📅 *Bugun to'lashingiz kerak:*\n\n";
    debts.forEach((d, i) => {
      msg += `${i + 1}. *Kimga:* ${d.creditorName}\n`;
      msg += `   💰 Summa: ${formatMoney(d.remainingAmount)}\n`;
      msg += `   📆 Muddat: ${formatDate(d.dueDate)}\n\n`;
    });
    return msg;
  },

  OWN_DEBT_TOMORROW: (debts) => {
    if (!debts.length) return null;
    let msg = "❗ *Eslatma: Siz qarzdorsiz!*\n\n";
    msg += "📅 *Ertaga to'lashingiz kerak:*\n\n";
    debts.forEach((d, i) => {
      msg += `${i + 1}. *Kimga:* ${d.creditorName}\n`;
      msg += `   💰 Summa: ${formatMoney(d.remainingAmount)}\n`;
      msg += `   📆 Muddat: ${formatDate(d.dueDate)}\n\n`;
    });
    return msg;
  },

  // Welcome message
  WELCOME: (chatId) => {
    return `✅ *Bot muvaffaqiyatli ulandi!*\n\n` +
      `🆔 Sizning Chat ID: \`${chatId}\`\n\n` +
      `Bot quyidagi xizmatlarni taqdim etadi:\n` +
      `• 📊 Kunlik hisobot (har kuni 23:00)\n` +
      `• 📈 Haftalik hisobot (har dushanba 10:00)\n` +
      `• ⚠️ Qarz eslatmalari (har kuni 09:00)\n\n` +
      `_Barcha xabarlar avtomatik yuboriladi._`;
  },

  // Daily report caption
  DAILY_REPORT_CAPTION: (date) => {
    return `📊 *Kunlik hisobot*\n📅 ${formatDate(date)}`;
  },

  // Weekly report caption
  WEEKLY_REPORT_CAPTION: (startDate, endDate) => {
    return `📈 *Haftalik hisobot*\n📅 ${formatDate(startDate)} - ${formatDate(endDate)}`;
  },

  // No data message
  NO_DATA: "📭 Bugun ma'lumot yo'q.",

  // Error message
  ERROR: "❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
};

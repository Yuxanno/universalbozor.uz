// Analytics Service - Excel report generation
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const salesService = require('./salesService');
const debtService = require('./debtService');
const { formatMoney, formatDate } = require('../messages');

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const applyTitleStyle = (cell) => {
  cell.font = { bold: true, size: 16, color: { argb: 'FF1F4E79' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
};

const applySectionTitle = (cell) => {
  cell.font = { bold: true, size: 11, color: { argb: 'FF1F4E79' } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
};

const applyHeaderStyleCells = (sheet, rowNum, cols, color = '4472C4') => {
  cols.forEach(col => {
    const cell = sheet.getCell(`${col}${rowNum}`);
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });
};

const applyDataStyleCells = (sheet, rowNum, cols, isAlt = false) => {
  cols.forEach((col, idx) => {
    const cell = sheet.getCell(`${col}${rowNum}`);
    cell.font = { size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FFF2F2F2' : 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };
  });
};

const applyTotalStyleCells = (sheet, rowNum, cols, color = '70AD47') => {
  cols.forEach(col => {
    const cell = sheet.getCell(`${col}${rowNum}`);
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });
};

const formatNum = (num) => new Intl.NumberFormat('ru-RU').format(Math.round(num || 0));

/**
 * Generate daily analytics Excel report - All 5 sections in one row
 */
const generateDailyReport = async (date = new Date()) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Universal UZ Bot';
  workbook.created = new Date();

  const cashierData = await salesService.getSalesByCashier(startDate, endDate);
  const customerData = await salesService.getSalesByCustomer(startDate, endDate);
  const summary = await salesService.getSummary(startDate, endDate);
  const debtData = await debtService.getDebtsInRange(startDate, endDate);
  const salesData = await salesService.getSalesInRange(startDate, endDate);

  const sheet = workbook.addWorksheet('Kunlik Hisobot', {
    properties: { tabColor: { argb: '4472C4' } },
    views: [{ showGridLines: false }]
  });

  // Columns for 5 sections side by side
  sheet.columns = [
    // Umumiy natija (A-D)
    { width: 4 },   // A - №
    { width: 16 },  // B - Ko'rsatkich
    { width: 13 },  // C - Qiymat
    { width: 13 },  // D - Izoh
    { width: 1 },   // E - space
    // Kassirlar (F-K)
    { width: 4 },   // F - №
    { width: 12 },  // G - Kassir
    { width: 7 },   // H - Sotuvlar
    { width: 11 },  // I - Summa
    { width: 11 },  // J - Foyda
    { width: 9 },   // K - O'rtacha
    { width: 1 },   // L - space
    // Mijozlar (M-P)
    { width: 4 },   // M - №
    { width: 12 },  // N - Mijoz
    { width: 7 },   // O - Xaridlar
    { width: 11 },  // P - Summa
    { width: 1 },   // Q - space
    // Qarzlar (R-U)
    { width: 4 },   // R - №
    { width: 13 },  // S - Turi
    { width: 5 },   // T - Soni
    { width: 10 },  // U - Summa
    { width: 1 },   // V - space
    // Sotuvlar (W-AA)
    { width: 4 },   // W - №
    { width: 6 },   // X - Vaqt
    { width: 10 },  // Y - Kassir
    { width: 10 },  // Z - Mijoz
    { width: 10 },  // AA - Summa
  ];

  let rowNum = 1;

  // === TITLE ===
  sheet.mergeCells(`A${rowNum}:AA${rowNum}`);
  const titleCell = sheet.getCell(`A${rowNum}`);
  titleCell.value = `📊 KUNLIK HISOBOT - ${formatDate(date)}`;
  applyTitleStyle(titleCell);
  sheet.getRow(rowNum).height = 35;
  rowNum += 2;

  // === SECTION TITLES (all 5 in one row) ===
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = '💰 UMUMIY NATIJA';
  applySectionTitle(sheet.getCell(`A${rowNum}`));

  sheet.mergeCells(`F${rowNum}:K${rowNum}`);
  sheet.getCell(`F${rowNum}`).value = '👤 KASSIRLAR BO\'YICHA';
  applySectionTitle(sheet.getCell(`F${rowNum}`));

  sheet.mergeCells(`M${rowNum}:P${rowNum}`);
  sheet.getCell(`M${rowNum}`).value = '👥 MIJOZLAR BO\'YICHA';
  applySectionTitle(sheet.getCell(`M${rowNum}`));

  sheet.mergeCells(`R${rowNum}:U${rowNum}`);
  sheet.getCell(`R${rowNum}`).value = '💳 QARZLAR';
  applySectionTitle(sheet.getCell(`R${rowNum}`));

  sheet.mergeCells(`W${rowNum}:AA${rowNum}`);
  sheet.getCell(`W${rowNum}`).value = '🧾 SOTUVLAR (oxirgi 20)';
  applySectionTitle(sheet.getCell(`W${rowNum}`));

  sheet.getRow(rowNum).height = 22;
  rowNum++;

  // === HEADERS (all 5 sections) ===
  // Umumiy natija
  ['A', 'B', 'C', 'D'].forEach((col, i) => {
    sheet.getCell(`${col}${rowNum}`).value = ['', 'Ko\'rsatkich', 'Qiymat', 'Izoh'][i];
  });
  applyHeaderStyleCells(sheet, rowNum, ['A', 'B', 'C', 'D'], '2E75B6');

  // Kassirlar
  ['F', 'G', 'H', 'I', 'J', 'K'].forEach((col, i) => {
    sheet.getCell(`${col}${rowNum}`).value = ['№', 'Kassir', 'Soni', 'Summa', 'Foyda', 'O\'rtacha'][i];
  });
  applyHeaderStyleCells(sheet, rowNum, ['F', 'G', 'H', 'I', 'J', 'K'], 'ED7D31');

  // Mijozlar
  ['M', 'N', 'O', 'P'].forEach((col, i) => {
    sheet.getCell(`${col}${rowNum}`).value = ['№', 'Mijoz', 'Soni', 'Summa'][i];
  });
  applyHeaderStyleCells(sheet, rowNum, ['M', 'N', 'O', 'P'], '70AD47');

  // Qarzlar
  ['R', 'S', 'T', 'U'].forEach((col, i) => {
    sheet.getCell(`${col}${rowNum}`).value = ['№', 'Turi', 'Soni', 'Summa'][i];
  });
  applyHeaderStyleCells(sheet, rowNum, ['R', 'S', 'T', 'U'], 'C00000');

  // Sotuvlar
  ['W', 'X', 'Y', 'Z', 'AA'].forEach((col, i) => {
    sheet.getCell(`${col}${rowNum}`).value = ['№', 'Vaqt', 'Kassir', 'Mijoz', 'Summa'][i];
  });
  applyHeaderStyleCells(sheet, rowNum, ['W', 'X', 'Y', 'Z', 'AA'], '5B9BD5');

  sheet.getRow(rowNum).height = 20;
  rowNum++;

  // === PREPARE DATA ===
  const summaryRows = [
    ['1', 'Sotuvlar soni', String(summary.salesCount), 'Jami cheklar'],
    ['2', 'Umumiy tushum', formatNum(summary.totalRevenue), 'Barcha sotuvlar'],
    ['3', 'Tannarx', formatNum(summary.totalCost), 'Mahsulot narxi'],
    ['4', 'Yalpi foyda', formatNum(summary.totalProfit), 'Tushum-Tannarx'],
    ['5', 'Qaytarishlar', formatNum(summary.returns.total), `${summary.returns.count} ta`],
    ['6', 'SOF FOYDA', formatNum(summary.netProfit), '✅ Yakuniy'],
  ];

  let totalSales = 0, totalAmount = 0, totalProfit = 0;
  cashierData.forEach(c => {
    totalSales += c.salesCount;
    totalAmount += c.totalAmount;
    totalProfit += c.totalProfit;
  });

  const allCustomers = [...customerData.customers];
  if (customerData.unknown.count > 0) {
    allCustomers.push({
      name: "Noma'lum",
      purchaseCount: customerData.unknown.count,
      totalAmount: customerData.unknown.total
    });
  }
  let custTotal = 0;
  allCustomers.forEach(c => custTotal += c.totalAmount);

  const receivableDebts = debtData.newDebts.filter(d => d.type === 'receivable');
  const receivedPayments = debtData.payments.filter(p => p.type === 'receivable');
  const newDebtTotal = receivableDebts.reduce((sum, d) => sum + d.amount, 0);
  const paymentTotal = receivedPayments.reduce((sum, p) => sum + p.amount, 0);

  const debtRows = [
    ['1', '📤 Berilgan', receivableDebts.length, formatNum(newDebtTotal)],
    ['2', '📥 Qabul', receivedPayments.length, formatNum(paymentTotal)],
  ];

  const recentSales = salesData.slice(-20).reverse();

  // Calculate max rows needed
  const maxRows = Math.max(
    summaryRows.length,
    cashierData.length + 1,
    allCustomers.length + 1,
    debtRows.length + 1,
    recentSales.length
  );

  // === DATA ROWS ===
  for (let i = 0; i < maxRows; i++) {
    // Column 1: Umumiy natija
    if (i < summaryRows.length) {
      const s = summaryRows[i];
      sheet.getCell(`A${rowNum}`).value = s[0];
      sheet.getCell(`B${rowNum}`).value = s[1];
      sheet.getCell(`C${rowNum}`).value = s[2];
      sheet.getCell(`D${rowNum}`).value = s[3];
      if (i === summaryRows.length - 1) {
        applyTotalStyleCells(sheet, rowNum, ['A', 'B', 'C', 'D'], '28A745');
      } else {
        applyDataStyleCells(sheet, rowNum, ['A', 'B', 'C', 'D'], i % 2 === 1);
      }
    }

    // Column 2: Kassirlar
    if (i < cashierData.length) {
      const c = cashierData[i];
      const avg = c.salesCount > 0 ? Math.round(c.totalAmount / c.salesCount) : 0;
      sheet.getCell(`F${rowNum}`).value = i + 1;
      sheet.getCell(`G${rowNum}`).value = c.name;
      sheet.getCell(`H${rowNum}`).value = c.salesCount;
      sheet.getCell(`I${rowNum}`).value = formatNum(c.totalAmount);
      sheet.getCell(`J${rowNum}`).value = formatNum(c.totalProfit);
      sheet.getCell(`K${rowNum}`).value = formatNum(avg);
      applyDataStyleCells(sheet, rowNum, ['F', 'G', 'H', 'I', 'J', 'K'], i % 2 === 1);
    } else if (i === cashierData.length) {
      const avgT = totalSales > 0 ? Math.round(totalAmount / totalSales) : 0;
      sheet.getCell(`F${rowNum}`).value = '';
      sheet.getCell(`G${rowNum}`).value = 'JAMI:';
      sheet.getCell(`H${rowNum}`).value = totalSales;
      sheet.getCell(`I${rowNum}`).value = formatNum(totalAmount);
      sheet.getCell(`J${rowNum}`).value = formatNum(totalProfit);
      sheet.getCell(`K${rowNum}`).value = formatNum(avgT);
      applyTotalStyleCells(sheet, rowNum, ['F', 'G', 'H', 'I', 'J', 'K'], 'ED7D31');
    }

    // Column 3: Mijozlar
    if (i < allCustomers.length) {
      const c = allCustomers[i];
      sheet.getCell(`M${rowNum}`).value = i + 1;
      sheet.getCell(`N${rowNum}`).value = c.name;
      sheet.getCell(`O${rowNum}`).value = c.purchaseCount;
      sheet.getCell(`P${rowNum}`).value = formatNum(c.totalAmount);
      applyDataStyleCells(sheet, rowNum, ['M', 'N', 'O', 'P'], i % 2 === 1);
    } else if (i === allCustomers.length) {
      sheet.getCell(`M${rowNum}`).value = '';
      sheet.getCell(`N${rowNum}`).value = 'JAMI:';
      sheet.getCell(`O${rowNum}`).value = allCustomers.length;
      sheet.getCell(`P${rowNum}`).value = formatNum(custTotal);
      applyTotalStyleCells(sheet, rowNum, ['M', 'N', 'O', 'P'], '70AD47');
    }

    // Column 4: Qarzlar
    if (i < debtRows.length) {
      const d = debtRows[i];
      sheet.getCell(`R${rowNum}`).value = d[0];
      sheet.getCell(`S${rowNum}`).value = d[1];
      sheet.getCell(`T${rowNum}`).value = d[2];
      sheet.getCell(`U${rowNum}`).value = d[3];
      applyDataStyleCells(sheet, rowNum, ['R', 'S', 'T', 'U'], i % 2 === 1);
    } else if (i === debtRows.length) {
      sheet.getCell(`R${rowNum}`).value = '';
      sheet.getCell(`S${rowNum}`).value = 'FARQ:';
      sheet.getCell(`T${rowNum}`).value = '';
      sheet.getCell(`U${rowNum}`).value = formatNum(paymentTotal - newDebtTotal);
      applyTotalStyleCells(sheet, rowNum, ['R', 'S', 'T', 'U'], paymentTotal >= newDebtTotal ? '28A745' : 'C00000');
    }

    // Column 5: Sotuvlar
    if (i < recentSales.length) {
      const sale = recentSales[i];
      const time = new Date(sale.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      sheet.getCell(`W${rowNum}`).value = i + 1;
      sheet.getCell(`X${rowNum}`).value = time;
      sheet.getCell(`Y${rowNum}`).value = sale.cashier?.name || '-';
      sheet.getCell(`Z${rowNum}`).value = sale.customer?.name || "Noma'lum";
      sheet.getCell(`AA${rowNum}`).value = formatNum(sale.total);
      applyDataStyleCells(sheet, rowNum, ['W', 'X', 'Y', 'Z', 'AA'], i % 2 === 1);
    }

    sheet.getRow(rowNum).height = 18;
    rowNum++;
  }

  const fileName = `hisobot_${date.toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(tempDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

/**
 * Generate weekly analytics Excel report
 */
const generateWeeklyReport = async (endDate = new Date()) => {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Universal UZ Bot';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Haftalik Hisobot', {
    properties: { tabColor: { argb: '4472C4' } },
    views: [{ showGridLines: false }]
  });

  sheet.columns = [
    { width: 5 }, { width: 20 }, { width: 12 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];

  let rowNum = 1;

  sheet.mergeCells(`A${rowNum}:H${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = `📈 HAFTALIK HISOBOT: ${formatDate(start)} - ${formatDate(end)}`;
  applyTitleStyle(sheet.getCell(`A${rowNum}`));
  sheet.getRow(rowNum).height = 35;
  rowNum += 2;

  sheet.mergeCells(`A${rowNum}:H${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = '📅 KUNLAR BO\'YICHA TAHLIL';
  applySectionTitle(sheet.getCell(`A${rowNum}`));
  sheet.getRow(rowNum).height = 22;
  rowNum++;

  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((col, i) => {
    sheet.getCell(`${col}${rowNum}`).value = ['№', 'Kun', 'Sotuvlar', 'Tushum', 'Tannarx', 'Foyda', 'Qarzlar', 'To\'lovlar'][i];
  });
  applyHeaderStyleCells(sheet, rowNum, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], '4472C4');
  sheet.getRow(rowNum).height = 20;
  rowNum++;

  let weekTotals = { sales: 0, revenue: 0, cost: 0, profit: 0, debts: 0, payments: 0 };
  const dayNames = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(start);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const daySummary = await salesService.getSummary(dayStart, dayEnd);
    const dayDebts = await debtService.getDebtsInRange(dayStart, dayEnd);
    const newDebtsTotal = dayDebts.newDebts.filter(d => d.type === 'receivable').reduce((sum, d) => sum + d.amount, 0);
    const paymentsTotal = dayDebts.payments.filter(p => p.type === 'receivable').reduce((sum, p) => sum + p.amount, 0);

    sheet.getCell(`A${rowNum}`).value = i + 1;
    sheet.getCell(`B${rowNum}`).value = `${dayNames[dayStart.getDay()]} (${dayStart.getDate()}/${dayStart.getMonth() + 1})`;
    sheet.getCell(`C${rowNum}`).value = daySummary.salesCount;
    sheet.getCell(`D${rowNum}`).value = formatNum(daySummary.totalRevenue);
    sheet.getCell(`E${rowNum}`).value = formatNum(daySummary.totalCost);
    sheet.getCell(`F${rowNum}`).value = formatNum(daySummary.totalProfit);
    sheet.getCell(`G${rowNum}`).value = formatNum(newDebtsTotal);
    sheet.getCell(`H${rowNum}`).value = formatNum(paymentsTotal);
    applyDataStyleCells(sheet, rowNum, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], i % 2 === 1);
    sheet.getRow(rowNum).height = 18;
    rowNum++;

    weekTotals.sales += daySummary.salesCount;
    weekTotals.revenue += daySummary.totalRevenue;
    weekTotals.cost += daySummary.totalCost;
    weekTotals.profit += daySummary.totalProfit;
    weekTotals.debts += newDebtsTotal;
    weekTotals.payments += paymentsTotal;
  }

  sheet.getCell(`A${rowNum}`).value = '';
  sheet.getCell(`B${rowNum}`).value = 'JAMI:';
  sheet.getCell(`C${rowNum}`).value = weekTotals.sales;
  sheet.getCell(`D${rowNum}`).value = formatNum(weekTotals.revenue);
  sheet.getCell(`E${rowNum}`).value = formatNum(weekTotals.cost);
  sheet.getCell(`F${rowNum}`).value = formatNum(weekTotals.profit);
  sheet.getCell(`G${rowNum}`).value = formatNum(weekTotals.debts);
  sheet.getCell(`H${rowNum}`).value = formatNum(weekTotals.payments);
  applyTotalStyleCells(sheet, rowNum, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], '4472C4');
  rowNum += 3;

  sheet.mergeCells(`A${rowNum}:H${rowNum}`);
  sheet.getCell(`A${rowNum}`).value = '👤 KASSIRLAR (hafta bo\'yicha)';
  applySectionTitle(sheet.getCell(`A${rowNum}`));
  sheet.getRow(rowNum).height = 22;
  rowNum++;

  const cashierData = await salesService.getSalesByCashier(start, end);
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, i) => {
    sheet.getCell(`${col}${rowNum}`).value = ['№', 'Kassir', 'Sotuvlar', 'Summa', 'Foyda', 'O\'rtacha'][i];
  });
  applyHeaderStyleCells(sheet, rowNum, ['A', 'B', 'C', 'D', 'E', 'F'], 'ED7D31');
  sheet.getRow(rowNum).height = 20;
  rowNum++;

  cashierData.forEach((c, idx) => {
    const avg = c.salesCount > 0 ? Math.round(c.totalAmount / c.salesCount) : 0;
    sheet.getCell(`A${rowNum}`).value = idx + 1;
    sheet.getCell(`B${rowNum}`).value = c.name;
    sheet.getCell(`C${rowNum}`).value = c.salesCount;
    sheet.getCell(`D${rowNum}`).value = formatNum(c.totalAmount);
    sheet.getCell(`E${rowNum}`).value = formatNum(c.totalProfit);
    sheet.getCell(`F${rowNum}`).value = formatNum(avg);
    applyDataStyleCells(sheet, rowNum, ['A', 'B', 'C', 'D', 'E', 'F'], idx % 2 === 1);
    sheet.getRow(rowNum).height = 18;
    rowNum++;
  });

  const fileName = `haftalik_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(tempDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

const cleanupOldReports = async (daysToKeep = 7) => {
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
  files.forEach(file => {
    if (file.endsWith('.xlsx')) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) fs.unlinkSync(filePath);
    }
  });
};

module.exports = { generateDailyReport, generateWeeklyReport, cleanupOldReports };

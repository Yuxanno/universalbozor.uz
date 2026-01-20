const express = require('express');
const router = express.Router();
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const PrinterSettings = require('../models/PrinterSettings');

// Директория для временных файлов
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Логирование печати
const printLogs = [];
const logPrint = (data) => {
  const log = { timestamp: new Date().toISOString(), ...data };
  printLogs.push(log);
  if (printLogs.length > 100) printLogs.shift();
  console.log('[PRINT]', log);
};

// ============ ESC/POS КОМАНДЫ ДЛЯ XPRINTER XP-365B ============
const ESC = '\x1B';
const GS = '\x1D';
const ESCPOS = {
  INIT: ESC + '@',                    // Инициализация принтера
  ALIGN_LEFT: ESC + 'a' + '\x00',     // Выравнивание влево
  ALIGN_CENTER: ESC + 'a' + '\x01',   // Выравнивание по центру
  ALIGN_RIGHT: ESC + 'a' + '\x02',    // Выравнивание вправо
  BOLD_ON: ESC + 'E' + '\x01',        // Жирный текст вкл
  BOLD_OFF: ESC + 'E' + '\x00',       // Жирный текст выкл
  DOUBLE_HEIGHT: ESC + '!' + '\x10',  // Двойная высота
  DOUBLE_WIDTH: ESC + '!' + '\x20',   // Двойная ширина
  DOUBLE_SIZE: ESC + '!' + '\x30',    // Двойной размер
  NORMAL_SIZE: ESC + '!' + '\x00',    // Нормальный размер
  UNDERLINE_ON: ESC + '-' + '\x01',   // Подчёркивание вкл
  UNDERLINE_OFF: ESC + '-' + '\x00',  // Подчёркивание выкл
  CUT_PAPER: GS + 'V' + '\x00',       // Полный отрез
  CUT_PARTIAL: GS + 'V' + '\x01',     // Частичный отрез
  FEED_LINES: (n) => ESC + 'd' + String.fromCharCode(n), // Подача n строк
  LINE_SPACING: (n) => ESC + '3' + String.fromCharCode(n), // Межстрочный интервал
};

// ============ ПРОВЕРКА СТАТУСА ПРИНТЕРА ============

/**
 * Проверяет статус принтера через Windows PowerShell
 * Возвращает объект с информацией о принтере
 */
async function checkPrinterStatus(printerName) {
  return new Promise((resolve) => {
    if (!printerName) {
      return resolve({ connected: false, error: 'Printer name not specified' });
    }

    // Простая проверка существования принтера
    const cmd = `powershell -Command "Get-Printer -Name '${printerName}' -ErrorAction SilentlyContinue | Select-Object Name, PrinterStatus, PortName | ConvertTo-Json"`;

    exec(cmd, { encoding: 'utf8', timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        console.log('[PRINTER STATUS] Error:', error.message);
        return resolve({ connected: false, error: 'Принтер топилмади' });
      }
      
      try {
        const trimmed = stdout.trim();
        if (!trimmed || trimmed === '' || trimmed === 'null') {
          return resolve({ connected: false, error: 'Принтер топилмади' });
        }
        
        const result = JSON.parse(trimmed);
        if (!result || !result.Name) {
          return resolve({ connected: false, error: 'Принтер топилмади' });
        }
        
        // PrinterStatus: 0 = Normal, 1 = Paused, 2 = Error, 3 = Pending Deletion
        const statusNum = typeof result.PrinterStatus === 'number' ? result.PrinterStatus : 0;
        const isReady = statusNum === 0;
        
        resolve({
          connected: true,
          ready: isReady,
          name: result.Name,
          port: result.PortName || '',
          status: statusNum,
          jobCount: 0
        });
      } catch (e) {
        console.log('[PRINTER STATUS] Parse error:', e.message);
        // Если не удалось распарсить, но stdout не пустой - принтер есть
        if (stdout.trim()) {
          resolve({ connected: true, ready: true, name: printerName, port: '', status: 0 });
        } else {
          resolve({ connected: false, error: 'Принтер статусини олиб бўлмади' });
        }
      }
    });
  });
}

/**
 * Проверяет очередь печати на ошибки
 */
async function checkPrinterQueue(printerName) {
  return new Promise((resolve) => {
    const cmd = `powershell -Command "Get-PrintJob -PrinterName '${printerName}' -ErrorAction SilentlyContinue | Select-Object JobStatus | ConvertTo-Json"`;
    
    exec(cmd, { encoding: 'utf8', timeout: 3000 }, (error, stdout) => {
      if (error) {
        return resolve({ hasErrors: false, jobs: [] });
      }
      try {
        const trimmed = stdout.trim();
        if (!trimmed || trimmed === '' || trimmed === 'null') {
          return resolve({ hasErrors: false, jobs: [] });
        }
        const jobs = JSON.parse(trimmed);
        const jobArray = Array.isArray(jobs) ? jobs : [jobs];
        const hasErrors = jobArray.some(j => 
          j && j.JobStatus && (String(j.JobStatus).includes('Error') || String(j.JobStatus).includes('Offline'))
        );
        resolve({ hasErrors, jobs: jobArray });
      } catch (e) {
        resolve({ hasErrors: false, jobs: [] });
      }
    });
  });
}

// ============ ПЕЧАТЬ ЧЕКА С ПРОВЕРКОЙ ============

/**
 * Генерирует простой текстовый чек для термопринтера 58мм
 * XPrinter XP-365B использует ~32 символа на строку
 */
function generateReceiptText(receipt, settings = {}) {
  const width = settings.charsPerLine || 32;
  const shopName = settings.shopName || 'UNIVERSAL';
  const shopSubtitle = settings.shopSubtitle || 'Savdo markazi';
  const footerText = settings.footerText || 'Rahmat!';
  const feedLines = settings.feedLines || 4;
  
  const line = '='.repeat(width);
  const thinLine = '-'.repeat(width);
  
  let text = '';
  
  // Заголовок
  text += centerText(shopName, width) + '\n';
  text += centerText(shopSubtitle, width) + '\n';
  text += line + '\n';
  
  // Дата и номер чека
  const dateParts = (receipt.date || new Date().toLocaleString('uz-UZ')).split(',');
  text += `Sana: ${(dateParts[0] || '').trim()}\n`;
  text += `Vaqt: ${(dateParts[1] || '').trim()}\n`;
  text += `Chek: #${receipt.receiptNumber || ''}\n`;
  text += thinLine + '\n';
  
  // Товары
  receipt.items.forEach((item, i) => {
    // Название товара (обрезаем если длинное)
    const name = item.name.length > width - 3 
      ? item.name.substring(0, width - 3) 
      : item.name;
    text += `${i + 1}. ${name}\n`;
    
    // Количество x цена = сумма (на одной строке)
    const qty = `${item.quantity}x${formatNumber(item.price)}`;
    const sum = formatNumber(item.price * item.quantity);
    const spaces = Math.max(1, width - qty.length - sum.length - 3);
    text += `   ${qty}${' '.repeat(spaces)}${sum}\n`;
  });
  
  text += line + '\n';
  
  // ИТОГО
  const totalValue = formatNumber(receipt.total);
  text += `JAMI:${' '.repeat(width - 5 - totalValue.length)}${totalValue}\n`;
  text += line + '\n';
  
  // Способ оплаты
  const pay = receipt.paymentMethod === 'cash' ? 'Naqd' : 'Karta';
  text += centerText(`To'lov: ${pay}`, width) + '\n';
  text += thinLine + '\n';
  
  // Футер
  text += centerText(footerText, width) + '\n';
  
  // Пустые строки для отрыва
  text += '\n'.repeat(feedLines);
  
  return text;
}

/**
 * Отправляет данные на термопринтер
 */
async function sendRawToPrinter(data, printerName) {
  console.log('[PRINT] Trying to print to:', printerName);
  
  // Метод 1: Через node-thermal-printer
  try {
    const ThermalPrinter = require('node-thermal-printer').printer;
    const PrinterTypes = require('node-thermal-printer').types;
    
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `printer:${printerName}`,
      removeSpecialCharacters: false,
      lineCharacter: '-',
      options: {
        timeout: 5000
      }
    });
    
    const isConnected = await printer.isPrinterConnected();
    console.log('[PRINT] Thermal printer connected:', isConnected);
    
    if (isConnected) {
      // Печатаем текст построчно
      const lines = data.split('\n');
      for (const line of lines) {
        printer.println(line);
      }
      printer.cut();
      
      await printer.execute();
      console.log('[PRINT] Thermal printer success');
      return { success: true, method: 'thermal' };
    }
  } catch (err) {
    console.log('[PRINT] Thermal printer error:', err.message);
  }
  
  // Метод 2: Через файл и lpr/print команду
  const tempPath = path.join(TEMP_DIR, `receipt_${Date.now()}.txt`);
  fs.writeFileSync(tempPath, data, 'utf8');
  
  try {
    await printViaWindowsCommand(tempPath, printerName);
    cleanupTempFile(tempPath);
    return { success: true, method: 'windows' };
  } catch (err) {
    console.log('[PRINT] Windows command failed:', err.message);
  }
  
  cleanupTempFile(tempPath);
  throw new Error('Принтерга уланиб бўлмади');
}

/**
 * Печать через Windows команды
 */
function printViaWindowsCommand(filePath, printerName) {
  return new Promise((resolve, reject) => {
    // Пробуем несколько методов
    
    // Метод 1: notepad /pt (silent print)
    const cmd1 = `notepad /pt "${filePath}" "${printerName}"`;
    
    exec(cmd1, { encoding: 'utf8', timeout: 10000, windowsHide: true }, (err1) => {
      if (!err1) {
        console.log('[PRINT] Notepad print success');
        resolve({ success: true });
        return;
      }
      
      console.log('[PRINT] Notepad failed, trying print command...');
      
      // Метод 2: print /d:
      const cmd2 = `print /d:"${printerName}" "${filePath}"`;
      
      exec(cmd2, { encoding: 'utf8', shell: 'cmd.exe', timeout: 10000 }, (err2) => {
        if (!err2) {
          console.log('[PRINT] Print command success');
          resolve({ success: true });
          return;
        }
        
        console.log('[PRINT] Print command failed, trying PowerShell...');
        
        // Метод 3: PowerShell Out-Printer
        const cmd3 = `powershell -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' | Out-Printer '${printerName}'"`;
        
        exec(cmd3, { encoding: 'utf8', timeout: 10000 }, (err3) => {
          if (!err3) {
            console.log('[PRINT] PowerShell print success');
            resolve({ success: true });
          } else {
            reject(new Error('Все методы печати не сработали'));
          }
        });
      });
    });
  });
}

function cleanupTempFile(filePath) {
  setTimeout(() => {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }, 5000);
}

/**
 * Проверяет результат печати через очередь заданий
 */
async function verifyPrintResult(printerName, startTime) {
  return new Promise((resolve) => {
    // Даём время на обработку задания
    setTimeout(async () => {
      try {
        const queue = await checkPrinterQueue(printerName);
        
        // Если есть ошибки в очереди - печать не удалась
        if (queue.hasErrors) {
          resolve({ success: false, error: 'Ошибка в очереди печати' });
          return;
        }
        
        // Проверяем статус принтера
        const status = await checkPrinterStatus(printerName);
        
        if (!status.connected) {
          resolve({ success: false, error: 'Принтер отключился' });
          return;
        }
        
        // Если принтер в ошибке
        if (status.status === 2 || status.status === 'Error') {
          resolve({ success: false, error: 'Принтер в состоянии ошибки' });
          return;
        }
        
        // Всё ок
        resolve({ success: true });
        
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    }, 2000); // Ждём 2 секунды для обработки
  });
}

// ============ API ROUTES ============

// GET /api/printers - Список принтеров с расширенным статусом
router.get('/', async (req, res) => {
  exec('powershell -Command "Get-Printer | Select-Object Name, Default, PrinterStatus | ConvertTo-Json"', 
    { encoding: 'utf8', timeout: 10000 }, 
    (error, stdout, stderr) => {
      if (error) {
        console.error('[PRINTERS] error:', error.message);
        return res.json([]);
      }
      try {
        const data = JSON.parse(stdout.trim());
        const printers = Array.isArray(data) ? data : [data];
        const result = printers.map(p => ({
          name: p.Name,
          isDefault: p.Default === true,
          status: p.PrinterStatus === 0 ? 'ready' : 'offline'
        }));
        console.log('[PRINTERS] Found:', result.length);
        res.json(result);
      } catch (e) {
        console.error('[PRINTERS] parse error:', e.message);
        res.json([]);
      }
    }
  );
});

// GET /api/printers/status/:name - Детальный статус принтера
router.get('/status/:name', async (req, res) => {
  try {
    const printerName = decodeURIComponent(req.params.name);
    const status = await checkPrinterStatus(printerName);
    const queue = await checkPrinterQueue(printerName);
    
    res.json({
      ...status,
      queueErrors: queue.hasErrors,
      pendingJobs: queue.jobs.length
    });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// GET /api/printers/settings - Получить настройки
router.get('/settings', async (req, res) => {
  try {
    const settings = await PrinterSettings.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/printers/settings - Обновить настройки
router.put('/settings', async (req, res) => {
  try {
    const settings = await PrinterSettings.updateSettings(req.body);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/printers/logs - Логи печати
router.get('/logs', (req, res) => {
  res.json(printLogs.slice(-50).reverse());
});

// POST /api/printers/print-receipt - ГЛАВНЫЙ ENDPOINT ПЕЧАТИ ЧЕКА
router.post('/print-receipt', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { printer, receipt } = req.body;
    
    // Валидация входных данных
    if (!receipt || !receipt.items || receipt.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        printStatus: false,
        message: 'Чек маълумотлари керак' 
      });
    }
    
    const settings = await PrinterSettings.getSettings();
    const targetPrinter = printer || settings.receiptPrinter;
    
    if (!targetPrinter) {
      return res.status(400).json({ 
        success: false, 
        printStatus: false,
        message: 'Принтер танланмаган' 
      });
    }
    
    console.log('[PRINT] Starting receipt print to:', targetPrinter);
    
    // ШАГ 1: Проверяем статус принтера ПЕРЕД печатью
    const printerStatus = await checkPrinterStatus(targetPrinter);
    
    if (!printerStatus.connected) {
      logPrint({ 
        status: 'error', 
        type: 'receipt',
        printer: targetPrinter, 
        error: printerStatus.error || 'Принтер не подключён',
        duration: Date.now() - startTime 
      });
      
      return res.status(503).json({ 
        success: false, 
        printStatus: false,
        message: printerStatus.error || 'Принтер уланмаган',
        errorCode: 'PRINTER_NOT_CONNECTED'
      });
    }
    
    // Проверяем очередь на ошибки
    const queueStatus = await checkPrinterQueue(targetPrinter);
    if (queueStatus.hasErrors) {
      logPrint({ 
        status: 'error', 
        type: 'receipt',
        printer: targetPrinter, 
        error: 'Printer queue has errors',
        duration: Date.now() - startTime 
      });
      
      return res.status(503).json({ 
        success: false, 
        printStatus: false,
        message: 'Принтерда хатолик мавжуд. Текширинг.',
        errorCode: 'PRINTER_ERROR'
      });
    }
    
    // ШАГ 2: Генерируем текстовый чек
    const receiptText = generateReceiptText(receipt, settings.receipt);
    console.log('[PRINT] Generated receipt text, length:', receiptText.length);
    
    // ШАГ 3: Отправляем на печать и ЖДЁМ результат
    try {
      await sendRawToPrinter(receiptText, targetPrinter);
      
      // ШАГ 4: Верифицируем результат печати
      const verification = await verifyPrintResult(targetPrinter, startTime);
      
      if (!verification.success) {
        logPrint({ 
          status: 'error', 
          type: 'receipt',
          printer: targetPrinter, 
          error: verification.error,
          duration: Date.now() - startTime 
        });
        
        return res.status(500).json({ 
          success: false, 
          printStatus: false,
          message: verification.error || 'Чоп этиш тасдиқланмади',
          errorCode: 'PRINT_VERIFICATION_FAILED'
        });
      }
      
      // УСПЕХ - чек напечатан
      logPrint({ 
        status: 'success', 
        type: 'receipt',
        printer: targetPrinter, 
        items: receipt.items.length, 
        total: receipt.total, 
        duration: Date.now() - startTime 
      });
      
      return res.json({ 
        success: true, 
        printStatus: true,
        message: 'Чек муваффақиятли чоп этилди',
        duration: Date.now() - startTime
      });
      
    } catch (printError) {
      console.error('[PRINT] Print error:', printError);
      
      logPrint({ 
        status: 'error', 
        type: 'receipt',
        printer: targetPrinter, 
        error: printError.message,
        duration: Date.now() - startTime 
      });
      
      return res.status(500).json({ 
        success: false, 
        printStatus: false,
        message: `Чоп этишда хатолик: ${printError.message}`,
        errorCode: 'PRINT_FAILED'
      });
    }
    
  } catch (err) {
    console.error('[PRINT] Receipt error:', err);
    
    logPrint({ 
      status: 'error', 
      type: 'receipt',
      error: err.message,
      duration: Date.now() - startTime 
    });
    
    return res.status(500).json({ 
      success: false, 
      printStatus: false,
      message: 'Сервер хатоси: ' + err.message,
      errorCode: 'SERVER_ERROR'
    });
  }
});

// POST /api/printers/test - Тестовая печать
router.post('/test', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { printer, type } = req.body;
    const settings = await PrinterSettings.getSettings();
    const targetPrinter = printer || (type === 'label' ? settings.labelPrinter : settings.receiptPrinter);
    
    if (!targetPrinter) {
      return res.status(400).json({ success: false, message: 'Принтер танланмаган' });
    }
    
    // Проверяем статус принтера
    const status = await checkPrinterStatus(targetPrinter);
    if (!status.connected) {
      return res.status(503).json({ 
        success: false, 
        message: status.error || 'Принтер уланмаган' 
      });
    }
    
    if (type === 'label') {
      const testProduct = { name: 'Тест товар', code: '12345', price: 10000 };
      const qrBase64 = await QRCode.toDataURL(JSON.stringify(testProduct), { width: 150, margin: 1 });
      const html = generateLabelHtml(testProduct, 1, qrBase64, settings.label);
      await printHtmlDirect(html, targetPrinter, settings.label);
      
      logPrint({ status: 'success', type: 'test-label', printer: targetPrinter, duration: Date.now() - startTime });
      res.json({ success: true, message: 'Тест ценник юборилди' });
    } else {
      const testReceipt = {
        items: [
          { name: 'Тест товар 1', quantity: 2, price: 15000 },
          { name: 'Тест товар 2', quantity: 1, price: 25000 }
        ],
        total: 55000,
        paymentMethod: 'cash',
        date: new Date().toLocaleString('uz-UZ'),
        receiptNumber: 'TEST-' + Date.now().toString().slice(-6)
      };
      
      const escposData = generateReceiptESCPOS(testReceipt, settings.receipt);
      await sendRawToPrinter(escposData, targetPrinter);
      
      const verification = await verifyPrintResult(targetPrinter, startTime);
      
      if (!verification.success) {
        logPrint({ status: 'error', type: 'test-receipt', printer: targetPrinter, error: verification.error, duration: Date.now() - startTime });
        return res.status(500).json({ success: false, message: verification.error || 'Тест чоп этилмади' });
      }
      
      logPrint({ status: 'success', type: 'test-receipt', printer: targetPrinter, duration: Date.now() - startTime });
      res.json({ success: true, message: 'Тест чек муваффақиятли чоп этилди' });
    }
  } catch (err) {
    console.error('[PRINT] Test error:', err);
    logPrint({ status: 'error', type: 'test', error: err.message, duration: Date.now() - startTime });
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/print-label - Печать ценника
router.post('/print-label', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { printer, quantity, product } = req.body;
    
    if (!product) {
      return res.status(400).json({ success: false, message: 'Товар маълумотлари керак' });
    }
    
    const settings = await PrinterSettings.getSettings();
    const targetPrinter = printer || settings.labelPrinter;
    const qty = Math.min(quantity || 1, 50);
    
    if (!targetPrinter) {
      return res.status(400).json({ success: false, message: 'Принтер танланмаган' });
    }
    
    // Проверяем статус принтера
    const status = await checkPrinterStatus(targetPrinter);
    if (!status.connected) {
      return res.status(503).json({ success: false, message: status.error || 'Принтер уланмаган' });
    }
    
    // Генерируем и печатаем
    const qrData = JSON.stringify({
      id: product.id,
      code: product.code,
      name: product.name,
      price: product.price
    });
    const qrBase64 = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
    const labelHtml = generateLabelHtml(product, qty, qrBase64, settings.label);
    
    await printHtmlDirect(labelHtml, targetPrinter, settings.label);
    
    logPrint({ 
      status: 'success', 
      type: 'label',
      printer: targetPrinter, 
      product: product.name, 
      quantity: qty, 
      duration: Date.now() - startTime 
    });
    
    res.json({ success: true, message: `${qty} та ценник чоп этилди` });
    
  } catch (err) {
    console.error('[PRINT] Label error:', err);
    logPrint({ status: 'error', type: 'label', error: err.message, duration: Date.now() - startTime });
    res.status(500).json({ success: false, message: 'Чоп этишда хатолик: ' + err.message });
  }
});

// ============ PRINT FUNCTIONS FOR LABELS ============

// Прямая печать HTML через puppeteer -> PDF -> принтер
async function printHtmlDirect(html, printerName, labelSettings = {}) {
  const width = labelSettings.width || 58;
  const height = labelSettings.height || 40;
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const tempPdfPath = path.join(TEMP_DIR, `print_${Date.now()}.pdf`);
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await page.pdf({
      path: tempPdfPath,
      width: `${width}mm`,
      height: `${height}mm`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    
    await browser.close();
    
    console.log('[PRINT] PDF created:', tempPdfPath);
    
    // Печатаем PDF
    await printPdfFile(tempPdfPath, printerName);
    
    // Удаляем файл
    cleanupTempFile(tempPdfPath);
    
  } catch (err) {
    try { await browser.close(); } catch (e) {}
    cleanupTempFile(tempPdfPath);
    throw err;
  }
}

// Печать PDF файла
function printPdfFile(pdfPath, printerName) {
  return new Promise((resolve, reject) => {
    const normalizedPath = pdfPath.replace(/\\/g, '\\\\');
    
    let cmd;
    if (printerName) {
      cmd = `powershell -Command "Start-Process -FilePath '${normalizedPath}' -Verb PrintTo -ArgumentList '${printerName}' -WindowStyle Hidden; Start-Sleep -Seconds 3"`;
    } else {
      cmd = `powershell -Command "Start-Process -FilePath '${normalizedPath}' -Verb Print -WindowStyle Hidden; Start-Sleep -Seconds 3"`;
    }
    
    exec(cmd, { encoding: 'utf8', windowsHide: true, timeout: 30000 }, (error) => {
      if (error) {
        console.error('[PRINT] PDF print error:', error.message);
        reject(error);
      } else {
        console.log('[PRINT] PDF sent to printer');
        resolve();
      }
    });
  });
}

// ============ HTML GENERATORS ============

// Генерация HTML для ценника
function generateLabelHtml(product, quantity, qrBase64, labelSettings = {}) {
  const width = labelSettings.width || 58;
  const height = labelSettings.height || 40;
  const fontSize = labelSettings.fontSize || 11;
  const showPrice = labelSettings.showPrice !== false;
  const showCode = labelSettings.showCode !== false;
  const showQR = labelSettings.showQR !== false;
  const qrSize = labelSettings.qrSize || 20;
  const padding = labelSettings.padding || 2;
  
  const labelTemplate = `
    <div class="label">
      <div class="info">
        <div class="name">${escapeHtml(product.name)}</div>
        ${showCode ? `<div class="code">Код: ${escapeHtml(product.code)}</div>` : ''}
        ${showPrice ? `<div class="price">${formatNumber(product.price)} so'm</div>` : ''}
      </div>
      ${showQR ? `<div class="qr"><img src="${qrBase64}" alt="QR"></div>` : ''}
    </div>
  `;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: ${width}mm ${height}mm; margin: 0; }
    body { font-family: Arial, sans-serif; }
    .label { 
      width: ${width}mm; 
      height: ${height}mm; 
      padding: ${padding}mm;
      display: flex; 
      align-items: center; 
      justify-content: space-between;
      page-break-after: always;
    }
    .label:last-child { page-break-after: auto; }
    .info { flex: 1; padding-right: ${showQR ? '2mm' : '0'}; }
    .name { 
      font-size: ${fontSize}pt; 
      font-weight: bold; 
      margin-bottom: 1mm; 
      line-height: 1.2;
      word-wrap: break-word;
    }
    .code { font-size: 9pt; color: #666; margin-bottom: 1mm; }
    .price { font-size: ${fontSize + 2}pt; font-weight: bold; color: #000; }
    .qr { width: ${qrSize}mm; height: ${qrSize}mm; flex-shrink: 0; }
    .qr img { width: 100%; height: 100%; }
  </style>
</head>
<body>${Array(quantity).fill(labelTemplate).join('')}</body>
</html>`;
}

// ============ HELPERS ============

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

function formatNumber(num) {
  return String(num || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function centerText(text, width) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

module.exports = router;

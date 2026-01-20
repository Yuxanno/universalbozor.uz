const express = require('express');
const { auth } = require('../middleware/auth');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const router = express.Router();

// ============================================
// ESC/POS COMMANDS FOR XPRINTER 58MM
// ============================================
const ESC = 0x1B;
const GS = 0x1D;

const CMD = {
  INIT: Buffer.from([ESC, 0x40]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  SIZE_NORMAL: Buffer.from([GS, 0x21, 0x00]),
  SIZE_DOUBLE: Buffer.from([GS, 0x21, 0x11]),
  FEED: (n) => Buffer.from([ESC, 0x64, n]),
  CUT: Buffer.from([GS, 0x56, 0x01]),
};

const WIDTH = 32; // 58mm = 32 characters
const LINE = '-'.repeat(WIDTH);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format number: 1000000 -> 1 000 000
 */
function formatNum(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Right-align text within width
 */
function rightAlign(text, width) {
  const s = String(text);
  if (s.length >= width) return s.slice(0, width);
  return ' '.repeat(width - s.length) + s;
}

/**
 * Left-align text within width
 */
function leftAlign(text, width) {
  const s = String(text);
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
}

/**
 * Center text within width
 */
function centerText(text, width) {
  const s = String(text);
  if (s.length >= width) return s.slice(0, width);
  const pad = Math.floor((width - s.length) / 2);
  return ' '.repeat(pad) + s + ' '.repeat(width - pad - s.length);
}

/**
 * Create line: "left text" + spaces + "right text"
 */
function makeLine(left, right) {
  const l = String(left);
  const r = String(right);
  const space = WIDTH - l.length - r.length;
  if (space < 1) {
    return l.slice(0, WIDTH - r.length - 1) + ' ' + r;
  }
  return l + ' '.repeat(space) + r;
}

/**
 * Word wrap text to fit width
 */
function wrapText(text, width) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  
  for (const word of words) {
    if (current.length + word.length + 1 <= width) {
      current += (current ? ' ' : '') + word;
    } else {
      if (current) lines.push(current);
      current = word.length > width ? word.slice(0, width) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ============================================
// BUILD RECEIPT
// ============================================

function buildReceipt(data) {
  const { items, total, paymentMethod, date, receiptNumber } = data;
  const parts = [];
  
  const addCmd = (cmd) => parts.push(cmd);
  const addLine = (text) => parts.push(Buffer.from(text + '\n', 'utf8'));
  
  // Initialize printer
  addCmd(CMD.INIT);
  
  // === HEADER ===
  addCmd(CMD.ALIGN_CENTER);
  addCmd(CMD.SIZE_DOUBLE);
  addCmd(CMD.BOLD_ON);
  addLine('UNIVERSAL');
  addCmd(CMD.SIZE_NORMAL);
  addCmd(CMD.BOLD_OFF);
  addLine('');
  addLine(LINE);
  
  // === PAYMENT METHOD ===
  addCmd(CMD.ALIGN_CENTER);
  addCmd(CMD.BOLD_ON);
  const payText = paymentMethod === 'cash' ? 'NAQD PUL' : 'PLASTIK KARTA';
  addLine("To'lov: " + payText);
  addCmd(CMD.BOLD_OFF);
  addLine('');
  addLine("Xaridingiz uchun rahmat!");
  addLine('');
  addLine(LINE);
  addLine('');
  
  // === ITEMS ===
  addCmd(CMD.ALIGN_LEFT);
  
  for (const item of items) {
    // Item name (wrap if too long)
    const nameLines = wrapText(item.name, WIDTH);
    for (const nameLine of nameLines) {
      addCmd(CMD.BOLD_ON);
      addLine(nameLine);
      addCmd(CMD.BOLD_OFF);
    }
    
    // Quantity x Price = Sum
    const qty = String(item.quantity);
    const price = formatNum(item.price);
    const sum = formatNum(item.price * item.quantity);
    
    // Format: "100 x 5 000 = 500 000"
    const calcPart = qty + ' x ' + price + ' =';
    const line = makeLine(calcPart, sum);
    addLine(line);
    addLine('');
  }
  
  // === TOTAL ===
  addLine(LINE);
  addCmd(CMD.BOLD_ON);
  addCmd(CMD.SIZE_DOUBLE);
  addCmd(CMD.ALIGN_CENTER);
  addLine('JAMI:');
  addLine(formatNum(total) + " so'm");
  addCmd(CMD.SIZE_NORMAL);
  addCmd(CMD.BOLD_OFF);
  addLine(LINE);
  addLine('');
  
  // === DATE ===
  addCmd(CMD.ALIGN_CENTER);
  addLine('Sana: ' + date);
  addLine('Chek: #' + receiptNumber);
  addLine('');
  addLine(LINE);
  
  // === FEED & CUT ===
  addCmd(CMD.FEED(4));
  addCmd(CMD.CUT);
  
  return Buffer.concat(parts);
}

// ============================================
// PRINTER COMMUNICATION
// ============================================

/**
 * Check printer status (Windows)
 */
async function checkPrinter(name) {
  return new Promise((resolve) => {
    const cmd = `powershell -Command "Get-Printer -Name '${name}'" 2>nul`;
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve({ ok: false, error: 'PRINTER_NOT_FOUND' });
      } else {
        resolve({ ok: true });
      }
    });
  });
}

/**
 * Send raw bytes to printer (Windows) - multiple methods
 */
async function sendRaw(printerName, data) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), `chek_${Date.now()}.bin`);
    
    try {
      fs.writeFileSync(tempFile, data);
    } catch (e) {
      reject({ status: 'PRINT_FAILED', error: 'TEMP_FILE_ERROR' });
      return;
    }
    
    // Method 1: Direct print via PowerShell
    const psCmd = `powershell -Command "& {$bytes = [System.IO.File]::ReadAllBytes('${tempFile}'); $printer = Get-WmiObject -Query \\"SELECT * FROM Win32_Printer WHERE Name='${printerName}'\\"; if($printer) { $printer.PrintTestPage() }}"`;
    
    // Method 2: Using print command
    const printCmd = `print /d:"${printerName}" "${tempFile}"`;
    
    // Method 3: Using COPY to shared printer
    const copyCmd = `copy /b "${tempFile}" "\\\\%COMPUTERNAME%\\${printerName}" >nul 2>&1`;
    
    // Method 4: Using lpr if available
    const lprCmd = `lpr -S localhost -P "${printerName}" "${tempFile}"`;
    
    // Try copy first (most reliable for shared printers)
    exec(copyCmd, { timeout: 10000, shell: 'cmd.exe' }, (err) => {
      if (!err) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        resolve({ status: 'PRINT_OK' });
        return;
      }
      
      // Try print command
      exec(printCmd, { timeout: 10000, shell: 'cmd.exe' }, (err2) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        
        if (!err2) {
          resolve({ status: 'PRINT_OK' });
        } else {
          reject({ status: 'PRINT_FAILED', error: 'SEND_ERROR' });
        }
      });
    });
  });
}

/**
 * Try USB printing via escpos library
 */
async function sendUSB(data) {
  return new Promise((resolve, reject) => {
    try {
      const escpos = require('escpos');
      escpos.USB = require('escpos-usb');
      
      const device = new escpos.USB();
      
      device.open((err) => {
        if (err) {
          reject({ status: 'PRINT_FAILED', error: 'USB_OPEN_ERROR' });
          return;
        }
        
        device.write(data, (writeErr) => {
          device.close();
          if (writeErr) {
            reject({ status: 'PRINT_FAILED', error: 'USB_WRITE_ERROR' });
          } else {
            resolve({ status: 'PRINT_OK' });
          }
        });
      });
    } catch (e) {
      reject({ status: 'PRINT_FAILED', error: 'USB_NOT_AVAILABLE' });
    }
  });
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /api/print/printers - List available printers
 */
router.get('/printers', auth, async (req, res) => {
  return new Promise((resolve) => {
    const cmd = `powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"`;
    
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err) {
        res.json({ printers: [] });
        return;
      }
      
      const printers = stdout.trim().split('\n').map(p => p.trim()).filter(p => p);
      res.json({ printers });
    });
  });
});

/**
 * POST /api/print/receipt
 */
router.post('/receipt', auth, async (req, res) => {
  const { items, total, paymentMethod, date, receiptNumber, printer } = req.body;
  
  // Validate
  if (!items || !items.length) {
    return res.status(400).json({
      status: 'PRINT_FAILED',
      error: 'NO_ITEMS'
    });
  }
  
  // Build receipt
  const receipt = buildReceipt({
    items,
    total: total || items.reduce((s, i) => s + i.price * i.quantity, 0),
    paymentMethod: paymentMethod || 'cash',
    date: date || new Date().toISOString().split('T')[0],
    receiptNumber: receiptNumber || Date.now().toString().slice(-8)
  });
  
  const printerName = printer || process.env.RECEIPT_PRINTER || 'XPrinter XP-365B';
  
  // Try USB first
  try {
    const result = await sendUSB(receipt);
    console.log('✅ Print OK (USB)');
    return res.json({ status: 'PRINT_OK', method: 'USB' });
  } catch (usbErr) {
    console.log('USB failed:', usbErr.error);
  }
  
  // Try Windows printer
  try {
    const check = await checkPrinter(printerName);
    if (!check.ok) {
      return res.status(503).json({
        status: 'PRINT_FAILED',
        error: 'PRINTER_NOT_FOUND',
        printer: printerName
      });
    }
    
    const result = await sendRaw(printerName, receipt);
    console.log('✅ Print OK (Windows)');
    return res.json({ status: 'PRINT_OK', method: 'WINDOWS' });
    
  } catch (winErr) {
    console.log('Windows failed:', winErr.error);
    return res.status(503).json({
      status: 'PRINT_FAILED',
      error: winErr.error || 'UNKNOWN',
      printer: printerName
    });
  }
});

/**
 * GET /api/print/status
 */
router.get('/status', auth, async (req, res) => {
  const printerName = process.env.RECEIPT_PRINTER || 'XPrinter XP-365B';
  const check = await checkPrinter(printerName);
  
  res.json({
    printer: printerName,
    ready: check.ok,
    error: check.error || null
  });
});

/**
 * GET /api/print/test (no auth for testing)
 */
router.get('/test', async (req, res) => {
  const testData = {
    items: [
      { name: "Bug'i naski", price: 5000, quantity: 100 },
      { name: "Ko'k futbolka", price: 20000, quantity: 200 },
      { name: "Hello", price: 2000, quantity: 100 }
    ],
    total: 4700000,
    paymentMethod: 'cash',
    date: new Date().toISOString().split('T')[0],
    receiptNumber: 'TEST001'
  };
  
  req.body = testData;
  
  const receipt = buildReceipt(testData);
  const printerName = process.env.RECEIPT_PRINTER || 'XPrinter XP-365B';
  
  try {
    await sendUSB(receipt);
    return res.json({ status: 'PRINT_OK', method: 'USB' });
  } catch (e) {
    try {
      await sendRaw(printerName, receipt);
      return res.json({ status: 'PRINT_OK', method: 'WINDOWS' });
    } catch (e2) {
      return res.status(503).json({ status: 'PRINT_FAILED', error: e2.error });
    }
  }
});

module.exports = router;

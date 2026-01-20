// Scheduler - Cron jobs for automated notifications
const cron = require('node-cron');
const config = require('./config');
const messages = require('./messages');
const debtService = require('./services/debtService');
const analyticsService = require('./services/analyticsService');
const fs = require('fs');

let bot = null;
let adminChatId = null;
let getAllChatIds = () => adminChatId ? [adminChatId] : [];

// Track if debt notification was sent today
let lastDebtNotificationDate = null;

/**
 * Initialize scheduler with bot instance
 */
const init = (botInstance, chatId, getChatIdsFn) => {
  bot = botInstance;
  adminChatId = chatId;
  if (getChatIdsFn) {
    getAllChatIds = getChatIdsFn;
  }
  
  if (!adminChatId && getAllChatIds().length === 0) {
    console.log('⚠️ Telegram: Admin chat ID not set. Use /start command to register.');
    return;
  }

  console.log('📅 Telegram: Scheduler initialized');
  startAllJobs();
};

/**
 * Update admin chat ID
 */
const updateAdminChatId = (chatId) => {
  adminChatId = chatId;
  console.log(`📱 Telegram: Admin chat ID updated to ${chatId}`);
};

/**
 * Start all scheduled jobs
 */
const startAllJobs = () => {
  // Debt check - every minute, but sends only once per day
  cron.schedule('* * * * *', async () => {
    const today = new Date().toDateString();
    
    // Skip if already sent today
    if (lastDebtNotificationDate === today) {
      return;
    }
    
    console.log('🔔 Running debt check...');
    const sent = await sendDebtNotifications();
    
    if (sent) {
      lastDebtNotificationDate = today;
      console.log('✅ Debt notification sent for today, will skip until tomorrow');
    }
  }, {
    timezone: 'Asia/Tashkent'
  });

  // Daily report - every day at 11:00 PM
  cron.schedule(config.SCHEDULES.DAILY_REPORT, async () => {
    console.log('📊 Generating daily report...');
    await sendDailyReport();
  }, {
    timezone: 'Asia/Tashkent'
  });

  // Weekly report - every Monday at 10:00 AM
  cron.schedule(config.SCHEDULES.WEEKLY_REPORT, async () => {
    console.log('📈 Generating weekly report...');
    await sendWeeklyReport();
  }, {
    timezone: 'Asia/Tashkent'
  });

  // Cleanup old reports - every day at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('🧹 Cleaning up old reports...');
    await analyticsService.cleanupOldReports(7);
  }, {
    timezone: 'Asia/Tashkent'
  });

  // Reset debt notification flag at midnight
  cron.schedule('0 0 * * *', () => {
    lastDebtNotificationDate = null;
    console.log('🔄 Debt notification flag reset for new day');
  }, {
    timezone: 'Asia/Tashkent'
  });

  console.log('✅ All scheduled jobs started');
};

/**
 * Send to all users
 */
const sendToAll = async (message, options = {}) => {
  const chatIds = getAllChatIds();
  if (!bot || chatIds.length === 0) return false;
  
  let success = 0;
  for (const chatId of chatIds) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...options });
      success++;
    } catch (error) {
      console.error(`Error sending to ${chatId}:`, error.message);
    }
  }
  return success > 0;
};

/**
 * Send document to all users
 */
const sendDocumentToAll = async (filePath, caption = '') => {
  const chatIds = getAllChatIds();
  if (!bot || chatIds.length === 0) return false;
  
  let success = 0;
  for (const chatId of chatIds) {
    try {
      await bot.sendDocument(chatId, filePath, { caption, parse_mode: 'Markdown' });
      success++;
    } catch (error) {
      console.error(`Error sending document to ${chatId}:`, error.message);
    }
  }
  return success > 0;
};

/**
 * Send debt notifications
 * Returns true if any notification was sent
 */
const sendDebtNotifications = async () => {
  const chatIds = getAllChatIds();
  if (!bot || chatIds.length === 0) {
    console.log('⚠️ Bot or chat IDs not available');
    return false;
  }

  try {
    // Receivable debts (customers owe to owner)
    const debtsToday = await debtService.getReceivableDebtsDue(0);
    const debtsTomorrow = await debtService.getReceivableDebtsDue(1);

    // Payable debts (owner owes to someone)
    const ownDebtsToday = await debtService.getPayableDebtsDue(0);
    const ownDebtsTomorrow = await debtService.getPayableDebtsDue(1);

    // Check if there's anything to send
    const hasDebts = debtsToday.length > 0 || debtsTomorrow.length > 0 || 
                     ownDebtsToday.length > 0 || ownDebtsTomorrow.length > 0;

    if (!hasDebts) {
      console.log('📭 No debts due today or tomorrow');
      return false;
    }

    // Send receivable debt notifications
    const todayMsg = messages.DEBT_TODAY(debtsToday);
    if (todayMsg) {
      await sendToAll(todayMsg);
    }

    const tomorrowMsg = messages.DEBT_TOMORROW(debtsTomorrow);
    if (tomorrowMsg) {
      await sendToAll(tomorrowMsg);
    }

    // Send payable debt notifications (owner's own debts)
    const ownTodayMsg = messages.OWN_DEBT_TODAY(ownDebtsToday);
    if (ownTodayMsg) {
      await sendToAll(ownTodayMsg);
    }

    const ownTomorrowMsg = messages.OWN_DEBT_TOMORROW(ownDebtsTomorrow);
    if (ownTomorrowMsg) {
      await sendToAll(ownTomorrowMsg);
    }

    console.log('✅ Debt notifications sent');
    return true;
  } catch (error) {
    console.error('❌ Error sending debt notifications:', error);
    return false;
  }
};

/**
 * Send daily analytics report
 */
const sendDailyReport = async () => {
  const chatIds = getAllChatIds();
  if (!bot || chatIds.length === 0) {
    console.log('⚠️ Bot or chat IDs not available');
    return;
  }

  try {
    const filePath = await analyticsService.generateDailyReport();
    const caption = messages.DAILY_REPORT_CAPTION(new Date());

    await sendDocumentToAll(filePath, caption);

    // Clean up file after sending
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);

    console.log('✅ Daily report sent');
  } catch (error) {
    console.error('❌ Error sending daily report:', error);
    await sendToAll(messages.ERROR);
  }
};

/**
 * Send weekly analytics report
 */
const sendWeeklyReport = async () => {
  const chatIds = getAllChatIds();
  if (!bot || chatIds.length === 0) {
    console.log('⚠️ Bot or chat IDs not available');
    return;
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);

    const filePath = await analyticsService.generateWeeklyReport(endDate);
    const caption = messages.WEEKLY_REPORT_CAPTION(startDate, endDate);

    await sendDocumentToAll(filePath, caption);

    // Clean up file after sending
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);

    console.log('✅ Weekly report sent');
  } catch (error) {
    console.error('❌ Error sending weekly report:', error);
    await sendToAll(messages.ERROR);
  }
};

/**
 * Manual trigger functions (for testing)
 */
const triggerDebtCheck = () => sendDebtNotifications();
const triggerDailyReport = () => sendDailyReport();
const triggerWeeklyReport = () => sendWeeklyReport();

module.exports = {
  init,
  updateAdminChatId,
  triggerDebtCheck,
  triggerDailyReport,
  triggerWeeklyReport
};

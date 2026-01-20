// Telegram Bot Configuration
module.exports = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8063198420:AAF7R9NipECt2a9a_JUpY9Jx1sEHm1GUyTs',
  ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID || null, // Set via /start command
  
  // Cron schedules
  SCHEDULES: {
    DEBT_CHECK: '0 9 * * *',      // Every day at 9:00 AM
    DAILY_REPORT: '0 23 * * *',   // Every day at 11:00 PM
    WEEKLY_REPORT: '0 10 * * 1'   // Every Monday at 10:00 AM
  }
};

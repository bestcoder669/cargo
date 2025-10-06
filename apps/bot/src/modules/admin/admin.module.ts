// ==================== apps/bot/src/modules/admin/admin.module.ts ====================

import { Bot } from 'grammy';
import { MyContext } from '../../core/types';
import { createConversation } from '@grammyjs/conversations';
import { adminConversation } from './admin.conversation';
import { 
  handleAdminCommand,
  handleAdminToken,
  handleAdminStats,
  handleAdminOrders,
  handleAdminUsers,
  handleAdminBroadcast,
  handleAdminScanner,
  handleAdminSupport,
  handleAdminFinance,
  handleAdminSettings
} from './admin.handlers';

export function registerAdminModule(bot: Bot<MyContext>) {
  // Admin conversation
  bot.use(createConversation(adminConversation, 'admin'));
  
  // Admin command
  bot.command('admin', handleAdminCommand);
  
  // Admin callbacks
  bot.callbackQuery('admin_token', handleAdminToken);
  bot.callbackQuery('admin_stats', handleAdminStats);
  bot.callbackQuery('admin_orders', handleAdminOrders);
  bot.callbackQuery('admin_users', handleAdminUsers);
  bot.callbackQuery('admin_broadcast', handleAdminBroadcast);
  bot.callbackQuery('admin_scanner', handleAdminScanner);
  bot.callbackQuery('admin_support', handleAdminSupport);
  bot.callbackQuery('admin_finance', handleAdminFinance);
  bot.callbackQuery('admin_settings', handleAdminSettings);
  
  // Order management
  bot.callbackQuery(/^admin_order_(\d+)$/, handleOrderDetails);
  bot.callbackQuery(/^admin_order_status_(\d+)$/, handleOrderStatusChange);
  bot.callbackQuery(/^admin_order_cancel_(\d+)$/, handleOrderCancel);
  
  // User management
  bot.callbackQuery(/^admin_user_(\d+)$/, handleUserDetails);
  bot.callbackQuery(/^admin_user_ban_(\d+)$/, handleUserBan);
  bot.callbackQuery(/^admin_user_balance_(\d+)$/, handleUserBalance);
  
  // Support management
  bot.callbackQuery(/^admin_support_chat_(\d+)$/, handleSupportChat);
  bot.callbackQuery(/^admin_support_close_(\d+)$/, handleSupportClose);
}


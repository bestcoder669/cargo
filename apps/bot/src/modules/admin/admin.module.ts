// ==================== apps/bot/src/modules/admin/admin.module.ts (ПОЛНАЯ ВЕРСИЯ) ====================

import { Bot } from 'grammy';
import { MyContext } from '../../core/types';
import { createConversation } from '@grammyjs/conversations';
import { 
  adminScannerConversation,
  adminBroadcastConversation,
  adminUserSearchConversation,
  adminUserBalanceConversation,
  adminUserBanConversation,
  adminUserBonusConversation,
  adminMessageUserConversation
} from './admin.conversation';
import { 
  handleAdminCommand,
  handleAdminToken,
  handleAdminStats,
  handleAdminOrders,
  handleOrderDetails,
  handleOrderStatusChange,
  handleOrderCancel,
  handleConfirmCancelOrder,
  handleAdminUsers,
  handleUserDetails,
  handleUserBan,
  handleUserUnban,
  handleUserBalance,
  handleUserBonus,
  handleUserOrders,
  handleMessageUser,
  handleAdminBroadcast,
  handleAdminScanner,
  handleAdminSupport,
  handleSupportChat,
  handleSupportClose,
  handleAdminFinance,
  handleAdminSettings
} from './admin.handler';

export function registerAdminModule(bot: Bot<MyContext>) {
  // Admin conversations
  bot.use(createConversation(adminScannerConversation, 'adminScanner'));
  bot.use(createConversation(adminBroadcastConversation, 'adminBroadcast'));
  bot.use(createConversation(adminUserSearchConversation, 'adminUserSearch'));
  bot.use(createConversation(adminUserBalanceConversation, 'adminUserBalance'));
  bot.use(createConversation(adminUserBanConversation, 'adminUserBan'));
  bot.use(createConversation(adminUserBonusConversation, 'adminUserBonus'));
  bot.use(createConversation(adminMessageUserConversation, 'adminMessageUser'));
  
  // Admin command
  bot.command('admin', handleAdminCommand);
  
  // Main admin menu
  bot.callbackQuery('admin', handleAdminCommand);
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
  bot.callbackQuery(/^confirm_cancel_order_(\d+)$/, handleConfirmCancelOrder);
  bot.callbackQuery(/^admin_set_status_(\d+)_(.+)$/, async (ctx) => {
    const orderId = parseInt(ctx.match![1]);
    const status = ctx.match![2];
    await ctx.answerCallbackQuery('Обновляю статус...');
    
    await apiClient.updateOrder(orderId, { status }, ctx.from!.id);
    await ctx.reply(`✅ Статус заказа #${orderId} изменен на ${ORDER_STATUS_LABELS[status]}`);
  });
  
  // User management
  bot.callbackQuery(/^admin_user_(\d+)$/, handleUserDetails);
  bot.callbackQuery(/^admin_user_ban_(\d+)$/, handleUserBan);
  bot.callbackQuery(/^admin_user_unban_(\d+)$/, handleUserUnban);
  bot.callbackQuery(/^admin_user_balance_(\d+)$/, handleUserBalance);
  bot.callbackQuery(/^admin_user_bonus_(\d+)$/, handleUserBonus);
  bot.callbackQuery(/^admin_user_orders_(\d+)$/, handleUserOrders);
  bot.callbackQuery(/^admin_message_user_(\d+)$/, handleMessageUser);
  bot.callbackQuery('admin_user_search', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('adminUserSearch');
  });
  
  // Support management
  bot.callbackQuery(/^admin_support_chat_(\d+)$/, handleSupportChat);
  bot.callbackQuery(/^admin_support_close_(\d+)$/, handleSupportClose);
  bot.callbackQuery(/^admin_support_reply_(\d+)$/, async (ctx) => {
    const chatId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('adminSupportReply', { chatId });
  });
  bot.callbackQuery(/^admin_support_priority_(\d+)_(.+)$/, async (ctx) => {
    const chatId = parseInt(ctx.match![1]);
    const priority = ctx.match![2];
    await ctx.answerCallbackQuery('Обновляю приоритет...');
    
    await apiClient.updateSupportChat(chatId, { priority });
    await ctx.reply(`✅ Приоритет чата #${chatId} изменен`);
  });
  
  // Scanner
  bot.callbackQuery('admin_scanner_start', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('adminScanner');
  });
  bot.callbackQuery('admin_scanner_bulk', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('adminScannerBulk');
  });
  
  // Broadcast
  bot.callbackQuery('admin_broadcast', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('adminBroadcast');
  });
  
  // Settings (super admin only)
  bot.callbackQuery(/^admin_settings_/, async (ctx) => {
    if (!isSuperAdmin(ctx.from?.id!)) {
      await ctx.answerCallbackQuery('Только для супер-админов', { show_alert: true });
      return;
    }
    
    const setting = ctx.callbackQuery.data.replace('admin_settings_', '');
    await ctx.answerCallbackQuery();
    
    // Здесь можно добавить управление настройками
    await ctx.reply(`Настройка: ${setting} (в разработке)`);
  });
}
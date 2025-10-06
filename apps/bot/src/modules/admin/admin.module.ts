// ==================== apps/bot/src/modules/admin/admin.module.ts (ПОЛНАЯ ВЕРСИЯ) ====================

import { Bot, InlineKeyboard } from 'grammy';
import { MyContext } from '../../core/types';
import { createConversation } from '@grammyjs/conversations';
import { apiClient } from '../../core/api/client';
import { ORDER_STATUS_LABELS } from '@cargoexpress/shared';
import {
  adminScannerConversation,
  adminBroadcastConversation,
  adminUserSearchConversation,
  adminUserBalanceConversation,
  adminUserBanConversation,
  adminUserBonusConversation,
  adminMessageUserConversation,
  adminOrderSearchConversation,
  adminSupportReplyConversation,
  adminScannerBulkConversation
} from './admin.conversation';
import { isSuperAdmin } from './admin.handler';
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
  bot.use(createConversation(adminOrderSearchConversation, 'adminOrderSearch'));
  bot.use(createConversation(adminSupportReplyConversation, 'adminSupportReply'));
  bot.use(createConversation(adminScannerBulkConversation, 'adminScannerBulk'));
  
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
    await ctx.answerCallbackQuery({ text: 'Обновляю статус...' });

    await apiClient.updateOrder(orderId, { status }, ctx.from!.id);
    await ctx.reply(`✅ Статус заказа #${orderId} изменен на ${ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS]}`);
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
  bot.callbackQuery(/^admin_user_stats_(\d+)$/, async (ctx) => {
    try {
      const userId = parseInt(ctx.match![1]);
      await ctx.answerCallbackQuery();

      const stats = await apiClient.getUserStats(userId);
      await ctx.reply(
        `📊 <b>Статистика пользователя #${userId}</b>\n\n` +
        `<b>Заказы:</b>\n` +
        `• Всего: ${stats.orders?.total || 0}\n` +
        `• Активных: ${stats.orders?.active || 0}\n` +
        `• Завершенных: ${stats.orders?.completed || 0}\n` +
        `• Отмененных: ${stats.orders?.cancelled || 0}\n\n` +
        `<b>Финансы:</b>\n` +
        `• Всего потрачено: ${stats.finance?.totalSpent || 0} ₽\n` +
        `• Средний чек: ${stats.finance?.avgOrder || 0} ₽\n` +
        `• Пополнений: ${stats.finance?.deposits || 0} ₽\n\n` +
        `<b>Активность:</b>\n` +
        `• Последний визит: ${stats.activity?.lastSeen || 'Не определено'}\n` +
        `• Дней с регистрации: ${stats.activity?.daysRegistered || 0}\n` +
        `• Приглашенных: ${stats.activity?.referrals || 0}`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки статистики пользователя');
    }
  });
  bot.callbackQuery(/^admin_user_history_(\d+)$/, async (ctx) => {
    try {
      const userId = parseInt(ctx.match![1]);
      await ctx.answerCallbackQuery();

      const history = await apiClient.getUserHistory(userId, { limit: 10 });
      let msg = `📜 <b>История пользователя #${userId}</b>\n\n`;

      if (!history || history.length === 0) {
        msg += `История действий пуста.`;
      } else {
        for (const event of history) {
          msg += `• ${event.date}: ${event.action}\n`;
        }
      }

      await ctx.reply(msg);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки истории пользователя');
    }
  });
  bot.callbackQuery(/^admin_order_photos_(\d+)$/, async (ctx) => {
    try {
      const orderId = parseInt(ctx.match![1]);
      await ctx.answerCallbackQuery();

      const photos = await apiClient.getOrderPhotos(orderId);
      if (!photos || photos.length === 0) {
        await ctx.reply('📸 У заказа нет фотографий');
        return;
      }

      await ctx.reply(`📸 Фотографий заказа #${orderId}: ${photos.length}`);
      for (const photo of photos.slice(0, 5)) {
        await ctx.replyWithPhoto(photo.url, { caption: photo.description || '' });
      }
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки фотографий');
    }
  });
  bot.callbackQuery(/^admin_order_history_(\d+)$/, async (ctx) => {
    try {
      const orderId = parseInt(ctx.match![1]);
      await ctx.answerCallbackQuery();

      const history = await apiClient.getOrderHistory(orderId);
      let msg = `📜 <b>История заказа #${orderId}</b>\n\n`;

      if (!history || history.length === 0) {
        msg += `История статусов пуста.`;
      } else {
        for (const event of history) {
          msg += `• ${event.date}: ${event.fromStatus} → ${event.toStatus}\n`;
          if (event.comment) msg += `  Комментарий: ${event.comment}\n`;
        }
      }

      await ctx.reply(msg);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки истории заказа');
    }
  });
  
  // Support management
  bot.callbackQuery(/^admin_support_chat_(\d+)$/, handleSupportChat);
  bot.callbackQuery(/^admin_support_close_(\d+)$/, handleSupportClose);
  bot.callbackQuery(/^admin_support_reply_(\d+)$/, async (ctx) => {
    const chatId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    ctx.session.tempData = { chatId };
    await ctx.conversation.enter('adminSupportReply');
  });
  bot.callbackQuery(/^admin_support_priority_(\d+)_(.+)$/, async (ctx) => {
    const chatId = parseInt(ctx.match![1]);
    const priority = ctx.match![2];
    await ctx.answerCallbackQuery({ text: 'Обновляю приоритет...' });

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

  // Stats sub-menu handlers
  bot.callbackQuery('admin_stats_detailed', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const stats = await apiClient.getAdminStats();
      await ctx.reply(
        `📊 <b>Детальная статистика</b>\n\n` +
        `<b>Заказы по статусам:</b>\n` +
        `• Новые: ${stats.orders?.new || 0}\n` +
        `• Оплачены: ${stats.orders?.paid || 0}\n` +
        `• На складе: ${stats.orders?.warehouse || 0}\n` +
        `• В пути: ${stats.orders?.inTransit || 0}\n` +
        `• Доставлено: ${stats.orders?.delivered || 0}\n` +
        `• Отменено: ${stats.orders?.cancelled || 0}\n\n` +
        `<b>Конверсия:</b>\n` +
        `• Новые → Оплачено: ${stats.conversion?.newToPaid || 0}%\n` +
        `• Оплачено → Доставлено: ${stats.conversion?.paidToDelivered || 0}%\n\n` +
        `<b>Средние значения:</b>\n` +
        `• Время доставки: ${stats.avg?.deliveryTime || 0} дней\n` +
        `• Чек: ${stats.avg?.orderValue || 0} ₽`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки статистики');
    }
  });

  bot.callbackQuery('admin_stats_charts', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📈 <b>Графики и аналитика</b>\n\n` +
      `Для просмотра графиков используйте веб-панель администратора.\n\n` +
      `Нажмите "Веб-панель" в главном меню админки.`
    );
  });

  bot.callbackQuery('admin_stats_export', async (ctx) => {
    await ctx.answerCallbackQuery({ text: 'Экспортирую данные...' });
    try {
      const exportData = await apiClient.exportStats();
      await ctx.reply(
        `📥 <b>Экспорт статистики</b>\n\n` +
        `Файл готов к скачиванию:\n` +
        `<code>${exportData.url}</code>\n\n` +
        `Формат: Excel (.xlsx)\n` +
        `Размер: ${exportData.size} KB`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка экспорта. Используйте веб-панель для скачивания отчетов.');
    }
  });

  // Finance sub-menu handlers
  bot.callbackQuery('admin_finance_payments', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const payments = await apiClient.getRecentPayments({ limit: 10 });
      let msg = `💳 <b>Последние платежи</b>\n\n`;

      if (payments.data && payments.data.length > 0) {
        for (const payment of payments.data) {
          msg += `#${payment.id} - ${payment.amount} ${payment.currency}\n`;
          msg += `  ${payment.method} | ${payment.status}\n`;
          msg += `  ${payment.createdAt}\n\n`;
        }
      } else {
        msg += `Платежей пока нет.`;
      }

      await ctx.reply(msg);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки платежей');
    }
  });

  bot.callbackQuery('admin_finance_balances', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const balances = await apiClient.getBalancesSummary();
      await ctx.reply(
        `💰 <b>Сводка по балансам</b>\n\n` +
        `<b>Пользовательские балансы:</b>\n` +
        `• Общая сумма: ${balances.users?.total || 0} ₽\n` +
        `• Пользователей с балансом: ${balances.users?.count || 0}\n\n` +
        `<b>Бонусные балансы:</b>\n` +
        `• Общая сумма: ${balances.bonuses?.total || 0} ₽\n` +
        `• Пользователей с бонусами: ${balances.bonuses?.count || 0}\n\n` +
        `<b>В ожидании:</b>\n` +
        `• Платежи: ${balances.pending?.payments || 0} ₽\n` +
        `• Возвраты: ${balances.pending?.refunds || 0} ₽`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки балансов');
    }
  });

  bot.callbackQuery('admin_finance_reports', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📊 <b>Финансовые отчеты</b>\n\n` +
      `Для создания детальных отчетов используйте веб-панель администратора.\n\n` +
      `Доступные отчеты:\n` +
      `• Отчет по выручке\n` +
      `• Отчет по расходам\n` +
      `• Налоговый отчет\n` +
      `• Отчет по платежным методам\n` +
      `• Сверка балансов`
    );
  });

  bot.callbackQuery('admin_finance_withdrawals', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const withdrawals = await apiClient.getWithdrawals({ limit: 10 });
      let msg = `💸 <b>Последние выводы</b>\n\n`;

      if (!withdrawals.data || withdrawals.data.length === 0) {
        msg += `Выводы средств отсутствуют.`;
      } else {
        for (const w of withdrawals.data) {
          msg += `#${w.id} - ${w.amount} ${w.currency}\n`;
          msg += `  Пользователь: #${w.userId}\n`;
          msg += `  Статус: ${w.status}\n\n`;
        }
      }

      await ctx.reply(msg);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки выводов');
    }
  });

  bot.callbackQuery('admin_finance_invoices', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(`Счета доступны в веб-панели администратора.`);
  });

  bot.callbackQuery('admin_finance_chart', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(`Графики доступны в веб-панели администратора.`);
  });

  // Orders filters
  bot.callbackQuery('admin_orders_pending', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const orders = await apiClient.getOrders({ status: 'NEW', limit: 10 });
      await ctx.reply(`⏳ Ожидающих заказов: ${orders.meta?.total || 0}`);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки заказов');
    }
  });

  bot.callbackQuery('admin_orders_warehouse', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const orders = await apiClient.getOrders({ status: 'WAREHOUSE', limit: 10 });
      await ctx.reply(`📦 Заказов на складе: ${orders.meta?.total || 0}`);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки заказов');
    }
  });

  bot.callbackQuery('admin_orders_transit', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const orders = await apiClient.getOrders({ status: 'IN_TRANSIT', limit: 10 });
      await ctx.reply(`✈️ Заказов в пути: ${orders.meta?.total || 0}`);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки заказов');
    }
  });

  bot.callbackQuery('admin_orders_problem', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const orders = await apiClient.getOrders({ status: 'PROBLEM', limit: 10 });
      await ctx.reply(`❌ Проблемных заказов: ${orders.meta?.total || 0}`);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки заказов');
    }
  });

  bot.callbackQuery('admin_orders_all', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(`Все заказы доступны в веб-панели администратора.`);
  });

  bot.callbackQuery('admin_order_search', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('adminOrderSearch');
  });

  // Users filters
  bot.callbackQuery('admin_users_stats', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const stats = await apiClient.getUsersStats();
      await ctx.reply(
        `👥 <b>Статистика пользователей</b>\n\n` +
        `• Всего: ${stats?.total || 0}\n` +
        `• Новых за 24ч: ${stats?.today || 0}\n` +
        `• Новых за 7 дней: ${stats?.week || 0}\n` +
        `• Активных: ${stats?.active || 0}\n` +
        `• С заказами: ${stats?.withOrders || 0}\n` +
        `• Заблокированных: ${stats?.banned || 0}`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки статистики');
    }
  });

  bot.callbackQuery('admin_users_top', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const topUsers = await apiClient.getTopUsers({ limit: 10 });

      const keyboard = new InlineKeyboard();

      if (!topUsers || topUsers.length === 0) {
        await ctx.reply('🎁 <b>Топ клиентов</b>\n\nНет данных о клиентах.');
        return;
      }

      // Добавляем кнопки для каждого топ клиента
      for (const user of topUsers) {
        keyboard.text(
          `${user.rank}. ${user.firstName} - ${user.totalSpent} ₽ (${user.ordersCount} зак.)`,
          `admin_user_${user.id}`
        ).row();
      }

      keyboard.text('⬅️ Назад', 'admin_users');

      await ctx.reply(
        `🎁 <b>Топ клиентов</b>\n\nВыберите пользователя:`,
        { reply_markup: keyboard }
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки топа клиентов');
    }
  });

  bot.callbackQuery('admin_users_banned', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const users = await apiClient.getUsers({ isBanned: true, limit: 10 });

      const keyboard = new InlineKeyboard();

      if (!users.data || users.data.length === 0) {
        await ctx.reply('⛔ <b>Заблокированные пользователи</b>\n\nНет заблокированных пользователей.');
        return;
      }

      // Добавляем кнопки для каждого заблокированного
      for (const user of users.data) {
        keyboard.text(
          `#${user.id} - ${user.firstName} (${user.banReason || 'Не указана'})`,
          `admin_user_${user.id}`
        ).row();
      }

      keyboard.text('⬅️ Назад', 'admin_users');

      await ctx.reply(
        `⛔ <b>Заблокированные пользователи</b>\n\nВыберите пользователя:`,
        { reply_markup: keyboard }
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки пользователей');
    }
  });

  bot.callbackQuery('admin_users_all', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(`Все пользователи доступны в веб-панели.`);
  });

  // Scanner stats
  bot.callbackQuery('admin_scanner_stats', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const stats = await apiClient.getScannerStats();
      await ctx.reply(
        `📊 <b>Статистика сканирования</b>\n\n` +
        `<b>За сегодня:</b>\n` +
        `• Сессий: ${stats.today?.sessions || 0}\n` +
        `• Отсканировано: ${stats.today?.scanned || 0}\n` +
        `• Успешно: ${stats.today?.success || 0}\n` +
        `• Ошибок: ${stats.today?.errors || 0}\n\n` +
        `<b>За неделю:</b>\n` +
        `• Сессий: ${stats.week?.sessions || 0}\n` +
        `• Отсканировано: ${stats.week?.scanned || 0}\n\n` +
        `<b>Всего:</b>\n` +
        `• Сессий: ${stats.total?.sessions || 0}\n` +
        `• Отсканировано: ${stats.total?.scanned || 0}`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки статистики сканирования');
    }
  });

  bot.callbackQuery(/^admin_scanner_session_(\d+)$/, async (ctx) => {
    try {
      const sessionId = parseInt(ctx.match![1]);
      await ctx.answerCallbackQuery();

      const session = await apiClient.getScannerSession(sessionId);
      await ctx.reply(
        `📋 <b>Сессия сканирования #${session.id}</b>\n\n` +
        `• Начало: ${session.startedAt}\n` +
        `• Конец: ${session.endedAt || 'В процессе'}\n` +
        `• Отсканировано: ${session.totalScanned || 0}\n` +
        `• Успешно: ${session.successCount || 0}\n` +
        `• Ошибок: ${session.errorCount || 0}\n` +
        `• Статус: ${session.targetStatus}`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки сессии');
    }
  });

  // Support filters
  bot.callbackQuery('admin_support_waiting', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const chats = await apiClient.getSupportChats({ status: 'WAITING', limit: 10 });
      await ctx.reply(`⏳ Чатов в ожидании: ${chats.meta?.waiting || 0}`);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки чатов');
    }
  });

  bot.callbackQuery('admin_support_progress', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const chats = await apiClient.getSupportChats({ status: 'IN_PROGRESS', limit: 10 });
      await ctx.reply(`💬 Чатов в работе: ${chats.meta?.inProgress || 0}`);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки чатов');
    }
  });

  bot.callbackQuery('admin_support_resolved', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const chats = await apiClient.getSupportChats({ status: 'RESOLVED', limit: 10 });
      await ctx.reply(`✅ Решенных чатов: ${chats.meta?.resolved || 0}`);
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки чатов');
    }
  });

  bot.callbackQuery('admin_support_stats', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const stats = await apiClient.getSupportStats();
      await ctx.reply(
        `📊 <b>Статистика поддержки</b>\n\n` +
        `<b>За сегодня:</b>\n` +
        `• Новых чатов: ${stats.today?.new || 0}\n` +
        `• Решено: ${stats.today?.resolved || 0}\n` +
        `• Среднее время: ${stats.today?.avgTime || 0} мин\n\n` +
        `<b>Всего:</b>\n` +
        `• Активных: ${stats.total?.active || 0}\n` +
        `• В очереди: ${stats.total?.waiting || 0}\n` +
        `• Рейтинг: ${stats.total?.rating || 0}/5.0`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки статистики поддержки');
    }
  });

  // System handlers
  bot.callbackQuery('admin_system', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const system = await apiClient.getSystemInfo();
      await ctx.reply(
        `🔧 <b>Информация о системе</b>\n\n` +
        `<b>Версия:</b> ${system.version || 'N/A'}\n` +
        `<b>Статус:</b> ${system.status || 'N/A'}\n` +
        `<b>База данных:</b> ${system.database?.status || 'N/A'}\n` +
        `<b>Redis:</b> ${system.redis?.status || 'N/A'}\n` +
        `<b>WebSocket:</b> ${system.websocket?.status || 'N/A'}\n\n` +
        `<b>Статистика:</b>\n` +
        `• Активных сессий: ${system.stats?.activeSessions || 0}\n` +
        `• Запросов/мин: ${system.stats?.requestsPerMin || 0}\n` +
        `• Память: ${system.stats?.memoryUsage || 0} MB`
      );
    } catch (error) {
      await ctx.reply('❌ Ошибка загрузки информации о системе');
    }
  });

  // Settings (super admin only)
  bot.callbackQuery(/^admin_settings/, async (ctx) => {
    if (!isSuperAdmin(ctx.from?.id!)) {
      await ctx.answerCallbackQuery({ text: 'Только для супер-админов', show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();
    await ctx.reply(
      `⚙️ <b>Настройки системы</b>\n\n` +
      `Для изменения настроек используйте веб-панель администратора.\n\n` +
      `Доступные разделы:\n` +
      `• Управление странами\n` +
      `• Управление складами\n` +
      `• Настройка тарифов\n` +
      `• Каталог товаров\n` +
      `• Администраторы\n` +
      `• Системные настройки`
    );
  });
}
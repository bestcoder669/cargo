// ==================== apps/bot/src/modules/admin/admin.handlers.ts ====================

import { MyContext } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { config } from '../../core/config';
import { InlineKeyboard, Keyboard } from 'grammy';
import { 
  EMOJI, 
  AdminRole, 
  getPermissionsByRole,
  FormatUtils,
  ORDER_STATUS_LABELS,
  OrderStatus
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';

// Проверка прав администратора
export function isAdmin(userId: number): boolean {
  return config.ADMIN_IDS.includes(userId) || config.SUPER_ADMIN_IDS.includes(userId);
}

export function isSuperAdmin(userId: number): boolean {
  return config.SUPER_ADMIN_IDS.includes(userId);
}

// ==================== ГЛАВНОЕ МЕНЮ АДМИНКИ ====================

export async function handleAdminCommand(ctx: MyContext) {
  try {
    const userId = ctx.from?.id;
    
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('❌ У вас нет доступа к админ-панели.');
      return;
    }
    
    const keyboard = new InlineKeyboard();
    
    // Основные функции
    keyboard
      .text('📊 Статистика', 'admin_stats')
      .text('📦 Заказы', 'admin_orders').row()
      .text('👥 Пользователи', 'admin_users')
      .text('💬 Поддержка', 'admin_support').row()
      .text('📡 Сканер', 'admin_scanner')
      .text('💰 Финансы', 'admin_finance').row()
      .text('📢 Рассылка', 'admin_broadcast')
      .text('🔐 Веб-панель', 'admin_token').row();
    
    if (isSuperAdmin(userId)) {
      keyboard
        .text('⚙️ Настройки', 'admin_settings')
        .text('🔧 Система', 'admin_system').row();
    }
    
    await ctx.reply(
      `${EMOJI.SETTINGS} <b>Панель администратора</b>\n\n` +
      `👤 Админ: ${ctx.from.first_name}\n` +
      `🔐 Роль: ${isSuperAdmin(userId) ? 'Супер-админ' : 'Администратор'}\n` +
      `📅 Время: ${FormatUtils.formatDate(new Date())}\n\n` +
      `Выберите раздел:`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('Admin command error:', error);
    await ctx.reply('❌ Произошла ошибка.');
  }
}

// ==================== СТАТИСТИКА ====================

export async function handleAdminStats(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;
    
    await ctx.answerCallbackQuery('Загружаю статистику...');
    
    const stats = await apiClient.getAdminStats();
    
    const keyboard = new InlineKeyboard()
      .text('📈 Детальная статистика', 'admin_stats_detailed').row()
      .text('📊 Графики', 'admin_stats_charts').row()
      .text('📥 Экспорт в Excel', 'admin_stats_export').row()
      .text('⬅️ Назад', 'admin');
    
    await ctx.editMessageText(
      `${EMOJI.CALCULATOR} <b>Статистика системы</b>\n\n` +
      
      `<b>📅 Сегодня:</b>\n` +
      `• Новых заказов: ${stats.today.orders}\n` +
      `• Новых пользователей: ${stats.today.users}\n` +
      `• Выручка: ${FormatUtils.formatMoney(stats.today.revenue)}\n\n` +
      
      `<b>📊 За неделю:</b>\n` +
      `• Заказов: ${stats.week.orders}\n` +
      `• Средний чек: ${FormatUtils.formatMoney(stats.week.avgOrder)}\n` +
      `• Конверсия: ${stats.week.conversion}%\n\n` +
      
      `<b>📈 За месяц:</b>\n` +
      `• Всего заказов: ${stats.month.orders}\n` +
      `• Выручка: ${FormatUtils.formatMoney(stats.month.revenue)}\n` +
      `• Прибыль: ${FormatUtils.formatMoney(stats.month.profit)}\n\n` +
      
      `<b>👥 Пользователи:</b>\n` +
      `• Всего: ${stats.users.total}\n` +
      `• Активных (7 дней): ${stats.users.active}\n` +
      `• С заказами: ${stats.users.withOrders}\n\n` +
      
      `<b>📦 Заказы:</b>\n` +
      `• В обработке: ${stats.orders.processing}\n` +
      `• В пути: ${stats.orders.inTransit}\n` +
      `• Доставлено: ${stats.orders.delivered}\n`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('Admin stats error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка загрузки статистики');
  }
}

// ==================== УПРАВЛЕНИЕ ЗАКАЗАМИ ====================

export async function handleAdminOrders(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;
    
    await ctx.answerCallbackQuery();
    
    const orders = await apiClient.getOrders({
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    
    const keyboard = new InlineKeyboard();
    
    // Быстрые фильтры
    keyboard
      .text('⏳ Ожидающие', 'admin_orders_pending')
      .text('📦 На складе', 'admin_orders_warehouse').row()
      .text('✈️ В пути', 'admin_orders_transit')
      .text('❌ Проблемные', 'admin_orders_problem').row();
    
    // Последние заказы
    orders.data.slice(0, 5).forEach((order: any) => {
      keyboard.text(
        `#${order.id} - ${order.user.firstName} - ${ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}`,
        `admin_order_${order.id}`
      ).row();
    });
    
    keyboard
      .text('🔍 Поиск по треку', 'admin_order_search').row()
      .text('📋 Все заказы', 'admin_orders_all').row()
      .text('⬅️ Назад', 'admin');
    
    await ctx.editMessageText(
      `${EMOJI.PACKAGE} <b>Управление заказами</b>\n\n` +
      `Всего заказов: ${orders.meta.total}\n` +
      `Последние 5 заказов:`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('Admin orders error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}

export async function handleOrderDetails(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;
    
    const orderId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    
    const order = await apiClient.getOrder(orderId);
    
    const keyboard = new InlineKeyboard()
      .text('📝 Изменить статус', `admin_order_status_${orderId}`)
      .text('💬 Написать клиенту', `admin_message_user_${order.userId}`).row()
      .text('📸 Фото', `admin_order_photos_${orderId}`)
      .text('📜 История', `admin_order_history_${orderId}`).row()
      .text('❌ Отменить заказ', `admin_order_cancel_${orderId}`).row()
      .text('⬅️ К заказам', 'admin_orders')
      .text('⬅️ Меню', 'admin');
    
    await ctx.editMessageText(
      `${EMOJI.PACKAGE} <b>Заказ #${order.id}</b>\n\n` +

      `<b>Информация:</b>\n` +
      `• Статус: ${ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}\n` +
      `• Тип: ${order.type === 'SHIPPING' ? '✈️ Доставка' : '🛍 Выкуп'}\n` +
      `• Трек: <code>${order.trackNumber}</code>\n` +
      `• Создан: ${FormatUtils.formatDate(order.createdAt)}\n\n` +
      
      `<b>Клиент:</b>\n` +
      `• ID: #${order.user.id}\n` +
      `• Имя: ${order.user.firstName} ${order.user.lastName || ''}\n` +
      `• Телефон: ${order.user.phone}\n` +
      `• Email: ${order.user.email}\n\n` +
      
      `<b>Детали:</b>\n` +
      `• Вес: ${order.weight ? FormatUtils.formatWeight(order.weight) : 'Не указан'}\n` +
      `• Стоимость: ${FormatUtils.formatMoney(order.totalAmount || 0)}\n` +
      `• Оплачен: ${order.paidAt ? FormatUtils.formatDate(order.paidAt) : '❌ Нет'}\n\n` +
      
      `<b>Действия:</b>`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('Order details error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}

export async function handleOrderStatusChange(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;
    
    const orderId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    
    const keyboard = new InlineKeyboard();
    
    // Все возможные статусы
    Object.values(OrderStatus).forEach(status => {
      keyboard.text(
        ORDER_STATUS_LABELS[status],
        `admin_set_status_${orderId}_${status}`
      ).row();
    });
    
    keyboard.text('❌ Отмена', `admin_order_${orderId}`);
    
    await ctx.editMessageText(
      `${EMOJI.PACKAGE} <b>Изменить статус заказа #${orderId}</b>\n\n` +
      `Выберите новый статус:`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('Order status change error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}

// ==================== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ====================

export async function handleAdminUsers(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;

    await ctx.answerCallbackQuery();

    const users = await apiClient.getUsers({
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    const keyboard = new InlineKeyboard();

    // Быстрые действия
    keyboard
      .text('🔍 Поиск пользователя', 'admin_user_search')
      .text('📊 Статистика пользователей', 'admin_users_stats').row()
      .text('🎁 Топ клиентов', 'admin_users_top')
      .text('⛔ Заблокированные', 'admin_users_banned').row();

    // Последние пользователи - кнопки
    if (users.data && users.data.length > 0) {
      users.data.slice(0, 5).forEach((user: any) => {
        keyboard.text(
          `#${user.id} - ${user.firstName} - ${FormatUtils.formatMoney(user.totalSpent || 0)}`,
          `admin_user_${user.id}`
        ).row();
      });
    }

    keyboard
      .text('📋 Все пользователи', 'admin_users_all').row()
      .text('⬅️ Назад', 'admin');

    await ctx.editMessageText(
      `${EMOJI.PROFILE} <b>Управление пользователями</b>\n\n` +
      `Всего пользователей: ${users.meta?.total || 0}\n` +
      `Новых за сегодня: ${users.meta?.todayNew || 0}\n\n` +
      `Последние 5 пользователей:`,
      { reply_markup: keyboard }
    );

  } catch (error) {
    logger.error('Admin users error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}

export async function handleUserDetails(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;
    
    const userId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    
    const user = await apiClient.getUserProfile(userId);
    
    const keyboard = new InlineKeyboard()
      .text('💬 Написать', `admin_message_user_${userId}`)
      .text('📦 Заказы', `admin_user_orders_${userId}`).row()
      .text('💰 Изменить баланс', `admin_user_balance_${userId}`)
      .text('🎁 Начислить бонус', `admin_user_bonus_${userId}`).row()
      .text('📊 Статистика', `admin_user_stats_${userId}`)
      .text('📜 История', `admin_user_history_${userId}`).row();
    
    if (user.isBanned) {
      keyboard.text('✅ Разблокировать', `admin_user_unban_${userId}`).row();
    } else {
      keyboard.text('⛔ Заблокировать', `admin_user_ban_${userId}`).row();
    }
    
    keyboard
      .text('⬅️ К пользователям', 'admin_users')
      .text('⬅️ Меню', 'admin');
    
    await ctx.editMessageText(
      `${EMOJI.PROFILE} <b>Пользователь #${user.id}</b>\n\n` +

      `<b>Информация:</b>\n` +
      `• Имя: ${user.firstName} ${user.lastName || ''}\n` +
      `• Username: @${user.username || 'не указан'}\n` +
      `• Телефон: ${user.phone}\n` +
      `• Email: ${user.email}\n` +
      `• Город: ${user.city?.name || 'Не указан'}\n` +
      `• Telegram ID: <code>${user.telegramId}</code>\n\n` +

      `<b>Финансы:</b>\n` +
      `• Баланс: ${FormatUtils.formatMoney(user.balance)}\n` +
      `• Бонусы: ${FormatUtils.formatMoney(user.bonusBalance)}\n` +
      `• Потрачено: ${FormatUtils.formatMoney(user.totalSpent || 0)}\n\n` +

      `<b>Активность:</b>\n` +
      `• Заказов: ${user.ordersCount || user._count?.orders || 0}\n` +
      `• Рефералов: ${user.referrals?.length || 0}\n` +
      `• Реф. код: <code>${user.referralCode}</code>\n` +
      `• Регистрация: ${FormatUtils.formatDate(user.createdAt)}\n` +
      `• Статус: ${user.isBanned ? '⛔ Заблокирован' : '✅ Активен'}\n\n` +

      `<b>Действия:</b>`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('User details error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}

// ==================== СКАНЕР ====================

export async function handleAdminScanner(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;

    await ctx.answerCallbackQuery();

    const sessions = await apiClient.getScannerSessions({
      limit: 5
    });

    const keyboard = new InlineKeyboard()
      .text('🚀 Начать сканирование', 'admin_scanner_start').row()
      .text('📋 Массовое обновление', 'admin_scanner_bulk').row()
      .text('📊 Статистика сканирования', 'admin_scanner_stats').row();

    // Последние сессии
    if (sessions.data.length > 0) {
      keyboard.text('📜 Последние сессии:', 'noop').row();
      sessions.data.slice(0, 3).forEach((session: any) => {
        keyboard.text(
          `${FormatUtils.formatDate(session.startedAt)} - ${session.totalScanned} шт`,
          `admin_scanner_session_${session.id}`
        ).row();
      });
    }
    
    keyboard.text('⬅️ Назад', 'admin');
    
    await ctx.editMessageText(
      `${EMOJI.PACKAGE} <b>Сканер посылок</b>\n\n` +
      
      `Сканер позволяет быстро обновлять статусы заказов.\n\n` +
      
      `<b>Как использовать:</b>\n` +
      `1. Нажмите "Начать сканирование"\n` +
      `2. Выберите целевой статус\n` +
      `3. Отправляйте трек-номера\n` +
      `4. Статус будет автоматически обновлен\n\n` +
      
      `<b>Статистика:</b>\n` +
      `• Сессий сегодня: ${sessions.meta?.todayCount || 0}\n` +
      `• Отсканировано сегодня: ${sessions.meta?.todayScanned || 0}`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('Admin scanner error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}

// ==================== ПОДДЕРЖКА ====================

export async function handleAdminSupport(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;

    await ctx.answerCallbackQuery();

    const chats = await apiClient.getSupportChats({
      status: 'WAITING',
      limit: 10
    });

    const keyboard = new InlineKeyboard();

    // Безопасное получение значений
    const waiting = chats.meta?.waiting || 0;
    const inProgress = chats.meta?.inProgress || 0;
    const resolved = chats.meta?.resolved || 0;
    const avgResponseTime = chats.meta?.avgResponseTime || 0;
    const rating = chats.meta?.rating || 0;

    // Статистика
    keyboard
      .text(`⏳ Ожидают: ${waiting}`, 'admin_support_waiting')
      .text(`💬 В работе: ${inProgress}`, 'admin_support_progress').row()
      .text(`✅ Решены: ${resolved}`, 'admin_support_resolved').row();

    // Активные чаты
    if (chats.data && chats.data.length > 0) {
      keyboard.text('💬 Активные чаты:', 'noop').row();
      chats.data.slice(0, 5).forEach((chat: any) => {
        const emoji = chat.priority === 2 ? '🔴' : chat.priority === 1 ? '🟡' : '⚪';
        keyboard.text(
          `${emoji} #${chat.id} - ${chat.user?.firstName || 'User'} - ${chat.messages?.length || 0} сообщ.`,
          `admin_support_chat_${chat.id}`
        ).row();
      });
    }

    keyboard
      .text('📊 Статистика поддержки', 'admin_support_stats').row()
      .text('⬅️ Назад', 'admin');

    await ctx.editMessageText(
      `${EMOJI.SUPPORT} <b>Управление поддержкой</b>\n\n` +

      `<b>Текущая ситуация:</b>\n` +
      `• Ожидают ответа: ${waiting}\n` +
      `• В работе: ${inProgress}\n` +
      `• Среднее время ответа: ${avgResponseTime} мин\n` +
      `• Рейтинг: ${rating.toFixed(1)}/5.0\n\n` +

      `Выберите чат для ответа:`,
      { reply_markup: keyboard }
    );

  } catch (error) {
    logger.error('Admin support error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}

// ==================== РАССЫЛКА ====================

export async function handleAdminBroadcast(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;
    
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('adminBroadcast');
    
  } catch (error) {
    logger.error('Admin broadcast error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}

// ==================== ФИНАНСЫ ====================

export async function handleAdminFinance(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) return;
    
    await ctx.answerCallbackQuery();
    
    const finance = await apiClient.getFinanceStats();
    
    const keyboard = new InlineKeyboard()
      .text('💳 Платежи', 'admin_finance_payments')
      .text('💰 Балансы', 'admin_finance_balances').row()
      .text('📊 Отчеты', 'admin_finance_reports')
      .text('💸 Выводы', 'admin_finance_withdrawals').row()
      .text('🧾 Счета', 'admin_finance_invoices')
      .text('💹 График', 'admin_finance_chart').row()
      .text('⬅️ Назад', 'admin');
    
    await ctx.editMessageText(
      `${EMOJI.BALANCE} <b>Финансы</b>\n\n` +
      
      `<b>📅 Сегодня:</b>\n` +
      `• Доход: ${FormatUtils.formatMoney(finance.today.revenue)}\n` +
      `• Расход: ${FormatUtils.formatMoney(finance.today.expenses)}\n` +
      `• Прибыль: ${FormatUtils.formatMoney(finance.today.profit)}\n` +
      `• Транзакций: ${finance.today.transactions}\n\n` +
      
      `<b>📊 За месяц:</b>\n` +
      `• Доход: ${FormatUtils.formatMoney(finance.month.revenue)}\n` +
      `• Расход: ${FormatUtils.formatMoney(finance.month.expenses)}\n` +
      `• Прибыль: ${FormatUtils.formatMoney(finance.month.profit)}\n` +
      `• Средний чек: ${FormatUtils.formatMoney(finance.month.avgOrder)}\n\n` +
      
      `<b>💰 Балансы:</b>\n` +
      `• Пользователей: ${FormatUtils.formatMoney(finance.balances.users)}\n` +
      `• Бонусов: ${FormatUtils.formatMoney(finance.balances.bonuses)}\n` +
      `• В обработке: ${FormatUtils.formatMoney(finance.balances.pending)}\n\n` +
      
      `<b>💳 Методы оплаты:</b>\n` +
      `• Карты: ${FormatUtils.formatMoney(finance.methods.card)} (${finance.methods.cardPercent}%)\n` +
      `• Крипта: ${FormatUtils.formatMoney(finance.methods.crypto)} (${finance.methods.cryptoPercent}%)\n` +
      `• СБП: ${FormatUtils.formatMoney(finance.methods.sbp)} (${finance.methods.sbpPercent}%)`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('Admin finance error:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
}


export async function handleAdminToken(ctx: MyContext) {
  try {
    if (!isAdmin(ctx.from?.id!)) {
      await ctx.answerCallbackQuery({ text: 'Доступ запрещен', show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();

    const token = await apiClient.generateAdminToken(ctx.from!.id);
    const adminUrl = `${config.ADMIN_URL}/auth/token/${token}`;

    // Check if URL is localhost (Telegram doesn't allow localhost URLs in buttons)
    const isLocalhost = config.ADMIN_URL.includes('localhost') || config.ADMIN_URL.includes('127.0.0.1');

    const keyboard = new InlineKeyboard();

    if (!isLocalhost) {
      keyboard.url('🌐 Открыть панель', adminUrl).row();
    }

    keyboard.text('⬅️ Назад', 'admin');

    let message = `${EMOJI.SETTINGS} <b>Вход в админ-панель</b>\n\n`;

    if (isLocalhost) {
      message += `⚠️ <b>Скопируйте ссылку для входа:</b>\n` +
                 `<code>${adminUrl}</code>\n\n` +
                 `🔑 <b>Токен действителен:</b> 15 минут\n` +
                 `🔐 <b>Одноразовый вход</b>\n\n` +
                 `${EMOJI.WARNING} <b>Безопасность:</b>\n` +
                 `• Не передавайте ссылку третьим лицам\n` +
                 `• После входа ссылка станет недействительной\n` +
                 `• Все действия логируются`;
    } else {
      message += `🔗 <b>Ссылка для входа:</b>\n` +
                 `<code>${adminUrl}</code>\n\n` +
                 `🔑 <b>Токен действителен:</b> 15 минут\n` +
                 `🔐 <b>Одноразовый вход</b>\n\n` +
                 `${EMOJI.WARNING} <b>Безопасность:</b>\n` +
                 `• Не передавайте ссылку третьим лицам\n` +
                 `• После входа ссылка станет недействительной\n` +
                 `• Все действия логируются`;
    }

    await ctx.reply(message, {
      link_preview_options: { is_disabled: true },
      reply_markup: keyboard
    });

    logger.info(`Admin token generated for ${ctx.from!.id}`);
    
  } catch (error) {
    logger.error('Admin token generation error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка генерации токена', show_alert: true });
  }
}

export async function handleOrderCancel(ctx: MyContext) {
  try {
    const orderId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();

    const confirmKeyboard = new InlineKeyboard()
      .text('✅ Да, отменить', `confirm_cancel_order_${orderId}`)
      .text('❌ Нет', `admin_order_${orderId}`);

    await ctx.editMessageText(
      `${EMOJI.WARNING} <b>Отмена заказа #${orderId}</b>\n\n` +
      `Вы уверены, что хотите отменить этот заказ?\n` +
      `Если заказ оплачен, будет создан возврат средств.`,
      { reply_markup: confirmKeyboard }
    );
  } catch (error) {
    logger.error('Order cancel error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleConfirmCancelOrder(ctx: MyContext) {
  try {
    const orderId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery({ text: 'Отменяю заказ...' });

    await apiClient.cancelOrder(orderId, 'Отменен администратором');

    await ctx.editMessageText(
      `${EMOJI.SUCCESS} Заказ #${orderId} отменен.\n` +
      `Клиент получит уведомление.`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ К заказам', 'admin_orders')
          .text('⬅️ Меню', 'admin')
      }
    );

  } catch (error) {
    logger.error('Confirm cancel order error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка отмены', show_alert: true });
  }
}

export async function handleUserBan(ctx: MyContext) {
  try {
    const userId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();

    ctx.session.tempData = { userId };
    await ctx.conversation.enter('adminUserBan');

  } catch (error) {
    logger.error('User ban error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleUserUnban(ctx: MyContext) {
  try {
    const userId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery({ text: 'Разблокирую...' });

    await apiClient.updateUser(userId, { isBanned: false });

    await ctx.reply(
      `${EMOJI.SUCCESS} Пользователь #${userId} разблокирован.`
    );

    // Обновляем сообщение
    await handleUserDetails(ctx);

  } catch (error) {
    logger.error('User unban error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleUserBalance(ctx: MyContext) {
  try {
    const userId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();

    ctx.session.tempData = { userId };
    await ctx.conversation.enter('adminUserBalance');

  } catch (error) {
    logger.error('User balance error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleUserBonus(ctx: MyContext) {
  try {
    const userId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();

    ctx.session.tempData = { userId };
    await ctx.conversation.enter('adminUserBonus');

  } catch (error) {
    logger.error('User bonus error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleUserOrders(ctx: MyContext) {
  try {
    const userId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();

    const orders = await apiClient.getUserOrders(userId);

    let message = `${EMOJI.PACKAGE} <b>Заказы пользователя #${userId}</b>\n\n`;

    if (orders.length === 0) {
      message += 'У пользователя нет заказов.';
    } else {
      for (const order of orders.slice(0, 10)) {
        message += `#${order.id} - ${ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]} - ${FormatUtils.formatMoney(order.totalAmount || 0)}\n`;
      }

      if (orders.length > 10) {
        message += `\n... и еще ${orders.length - 10} заказов`;
      }
    }

    await ctx.reply(message, {
      reply_markup: new InlineKeyboard()
        .text('⬅️ К пользователю', `admin_user_${userId}`)
    });

  } catch (error) {
    logger.error('User orders error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleMessageUser(ctx: MyContext) {
  try {
    const userId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();

    ctx.session.tempData = { userId };
    await ctx.conversation.enter('adminMessageUser');

  } catch (error) {
    logger.error('Message user error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleSupportChat(ctx: MyContext) {
  try {
    const chatId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();

    const chat = await apiClient.getSupportChat(chatId);

    let message = `${EMOJI.SUPPORT} <b>Чат поддержки #${chat.id}</b>\n\n`;
    message += `<b>Пользователь:</b> ${chat.user.firstName} ${chat.user.lastName || ''}\n`;
    message += `<b>Телефон:</b> ${chat.user.phone}\n`;
    message += `<b>Тема:</b> ${chat.subject}\n`;
    message += `<b>Статус:</b> ${chat.status}\n`;
    message += `<b>Создан:</b> ${FormatUtils.formatDate(chat.createdAt)}\n\n`;

    message += `<b>Последние сообщения:</b>\n\n`;

    for (const msg of chat.messages.slice(-5)) {
      const emoji = msg.fromUser ? '👤' : '👨‍💼';
      message += `${emoji} ${FormatUtils.formatDate(msg.createdAt)}:\n`;
      message += `${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}\n\n`;
    }

    const keyboard = new InlineKeyboard()
      .text('💬 Ответить', `admin_support_reply_${chatId}`)
      .text('✅ Закрыть чат', `admin_support_close_${chatId}`).row()
      .text('🔴 Высокий приоритет', `admin_support_priority_${chatId}_high`)
      .text('🟡 Средний', `admin_support_priority_${chatId}_medium`).row()
      .text('⬅️ К поддержке', 'admin_support');

    await ctx.reply(message, { reply_markup: keyboard });

  } catch (error) {
    logger.error('Support chat error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleSupportClose(ctx: MyContext) {
  try {
    const chatId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery({ text: 'Закрываю чат...' });

    await apiClient.closeSupportChat(chatId);

    await ctx.reply(
      `${EMOJI.SUCCESS} Чат #${chatId} закрыт.`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ К поддержке', 'admin_support')
      }
    );

  } catch (error) {
    logger.error('Support close error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

export async function handleAdminSettings(ctx: MyContext) {
  try {
    if (!isSuperAdmin(ctx.from?.id!)) {
      await ctx.answerCallbackQuery({ text: 'Только для супер-админов', show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();
    
    const keyboard = new InlineKeyboard()
      .text('🌍 Управление странами', 'admin_settings_countries').row()
      .text('🏪 Управление складами', 'admin_settings_warehouses').row()
      .text('💰 Настройка тарифов', 'admin_settings_tariffs').row()
      .text('🛍 Каталог товаров', 'admin_settings_products').row()
      .text('👨‍💼 Администраторы', 'admin_settings_admins').row()
      .text('🔧 Системные настройки', 'admin_settings_system').row()
      .text('⬅️ Назад', 'admin');
    
    await ctx.editMessageText(
      `${EMOJI.SETTINGS} <b>Настройки системы</b>\n\n` +
      `Выберите раздел для настройки:`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('Admin settings error:', error);
    await ctx.answerCallbackQuery({ text: 'Ошибка', show_alert: true });
  }
}

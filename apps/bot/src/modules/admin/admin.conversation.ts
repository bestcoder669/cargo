// ==================== apps/bot/src/modules/admin/admin.conversation.ts ====================

import { MyContext, MyConversation } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { InlineKeyboard } from 'grammy';
import { EMOJI, OrderStatus } from '@cargoexpress/shared';
import { logger } from '../../core/logger';
import { isAdmin } from './admin.handlers';

// ==================== СКАНЕР В БОТЕ ====================

export async function adminScannerConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  try {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Доступ запрещен');
      return;
    }
    
    // Выбор статуса
    const statusKeyboard = new InlineKeyboard();
    Object.values(OrderStatus).forEach(status => {
      statusKeyboard.text(
        ORDER_STATUS_LABELS[status],
        `scanner_status_${status}`
      ).row();
    });
    
    await ctx.reply(
      `${EMOJI.PACKAGE} <b>Сканер заказов</b>\n\n` +
      `Выберите статус, который нужно установить:`,
      { reply_markup: statusKeyboard }
    );
    
    const statusCtx = await conversation.waitForCallbackQuery(/^scanner_status_/);
    const targetStatus = statusCtx.callbackQuery.data.replace('scanner_status_', '') as OrderStatus;
    await statusCtx.answerCallbackQuery();
    
    // Старт сессии
    const session = await apiClient.startScannerSession({
      adminId: ctx.from!.id,
      targetStatus,
      confirmationMode: false,
      soundEnabled: false
    });
    
    await ctx.reply(
      `✅ Сессия сканирования начата!\n\n` +
      `Целевой статус: ${ORDER_STATUS_LABELS[targetStatus]}\n\n` +
      `Отправляйте трек-номера по одному или списком.\n` +
      `Для завершения отправьте /stop`,
      { reply_markup: { remove_keyboard: true } }
    );
    
    // Обработка треков
    let scannedCount = 0;
    let errorCount = 0;
    
    while (true) {
      const message = await conversation.wait();
      
      if (message.message?.text === '/stop') {
        break;
      }
      
      if (!message.message?.text) {
        await ctx.reply('❌ Отправьте текстовое сообщение с трек-номером');
        continue;
      }
      
      // Разбиваем на строки (если несколько треков)
      const tracks = message.message.text
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      for (const trackNumber of tracks) {
        const result = await apiClient.scanOrder({
          sessionId: session.id,
          trackNumber,
          timestamp: new Date()
        });
        
        if (result.success) {
          scannedCount++;
          await ctx.reply(
            `✅ ${trackNumber}\n` +
            `Заказ #${result.orderId} → ${ORDER_STATUS_LABELS[targetStatus]}`
          );
        } else {
          errorCount++;
          await ctx.reply(
            `❌ ${trackNumber}\n` +
            `Ошибка: ${result.error}`
          );
        }
      }
    }
    
    // Завершение сессии
    await apiClient.endScannerSession(session.id);
    
    await ctx.reply(
      `${EMOJI.SUCCESS} <b>Сессия завершена!</b>\n\n` +
      `✅ Успешно: ${scannedCount}\n` +
      `❌ Ошибок: ${errorCount}\n` +
      `⏱ Всего: ${scannedCount + errorCount}`,
      { reply_markup: mainAdminKeyboard }
    );
    
  } catch (error) {
    logger.error('Scanner conversation error:', error);
    await ctx.reply('❌ Ошибка сканера');
  }
}

// ==================== РАССЫЛКА ====================

export async function adminBroadcastConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  try {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('❌ Доступ запрещен');
      return;
    }
    
    // Выбор аудитории
    const audienceKeyboard = new InlineKeyboard()
      .text('👥 Всем пользователям', 'broadcast_all').row()
      .text('🆕 Новым (7 дней)', 'broadcast_new').row()
      .text('💰 С балансом', 'broadcast_balance').row()
      .text('📦 С заказами', 'broadcast_orders').row()
      .text('❌ Отмена', 'cancel');
    
    await ctx.reply(
      `${EMOJI.SUPPORT} <b>Массовая рассылка</b>\n\n` +
      `Выберите аудиторию:`,
      { reply_markup: audienceKeyboard }
    );
    
    const audienceCtx = await conversation.waitForCallbackQuery(/^broadcast_|cancel/);
    await audienceCtx.answerCallbackQuery();
    
    if (audienceCtx.callbackQuery.data === 'cancel') {
      await ctx.reply('Рассылка отменена');
      return;
    }
    
    const audience = audienceCtx.callbackQuery.data.replace('broadcast_', '');
    
    // Ввод сообщения
    await ctx.reply(
      `📝 Введите текст рассылки:\n\n` +
      `Поддерживается HTML форматирование:\n` +
      `<b>жирный</b>, <i>курсив</i>, <code>код</code>`
    );
    
    const messageCtx = await conversation.wait();
    const broadcastText = messageCtx.message?.text;
    
    if (!broadcastText) {
      await ctx.reply('❌ Текст не может быть пустым');
      return;
    }
    
    // Подтверждение
    const confirmKeyboard = new InlineKeyboard()
      .text('✅ Отправить', 'confirm_send')
      .text('❌ Отмена', 'cancel_send');
    
    const users = await apiClient.getUsersCount({ audience });
    
    await ctx.reply(
      `<b>Проверьте рассылку:</b>\n\n` +
      `<b>Аудитория:</b> ${getAudienceName(audience)}\n` +
      `<b>Получателей:</b> ${users.count}\n\n` +
      `<b>Текст сообщения:</b>\n${broadcastText}\n\n` +
      `Отправить?`,
      { reply_markup: confirmKeyboard }
    );
    
    const confirmCtx = await conversation.waitForCallbackQuery(/^confirm_send|cancel_send/);
    await confirmCtx.answerCallbackQuery();
    
    if (confirmCtx.callbackQuery.data === 'cancel_send') {
      await ctx.reply('Рассылка отменена');
      return;
    }
    
    // Отправка
    await ctx.reply(`${EMOJI.LOADING} Начинаю рассылку...`);
    
    const result = await apiClient.sendBroadcast({
      audience,
      message: broadcastText,
      adminId: ctx.from!.id
    });
    
    await ctx.reply(
      `${EMOJI.SUCCESS} <b>Рассылка завершена!</b>\n\n` +
      `✅ Отправлено: ${result.sent}\n` +
      `❌ Ошибок: ${result.failed}\n` +
      `⏱ Время: ${result.duration} сек`
    );
    
  } catch (error) {
    logger.error('Broadcast conversation error:', error);
    await ctx.reply('❌ Ошибка рассылки');
  }
}

// ==================== ПОИСК ПОЛЬЗОВАТЕЛЯ ====================

export async function adminUserSearchConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  try {
    if (!isAdmin(ctx.from!.id)) return;
    
    await ctx.reply(
      `🔍 <b>Поиск пользователя</b>\n\n` +
      `Отправьте:\n` +
      `• ID пользователя (например: 123)\n` +
      `• Telegram ID\n` +
      `• Телефон\n` +
      `• Email\n` +
      `• Трек-номер заказа`
    );
    
    const searchCtx = await conversation.wait();
    const query = searchCtx.message?.text;
    
    if (!query) return;
    
    const results = await apiClient.searchUsers({ query });
    
    if (results.length === 0) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    const keyboard = new InlineKeyboard();
    
    results.forEach(user => {
      keyboard.text(
        `#${user.id} - ${user.firstName} ${user.lastName || ''}`,
        `admin_user_${user.id}`
      ).row();
    });
    
    keyboard.text('⬅️ Назад', 'admin_users');
    
    await ctx.reply(
      `Найдено пользователей: ${results.length}`,
      { reply_markup: keyboard }
    );
    
  } catch (error) {
    logger.error('User search error:', error);
    await ctx.reply('❌ Ошибка поиска');
  }
}

// ==================== ИЗМЕНЕНИЕ БАЛАНСА ====================

export async function adminUserBalanceConversation(
  conversation: MyConversation,
  ctx: MyContext,
  userId: number
) {
  try {
    if (!isAdmin(ctx.from!.id)) return;
    
    const operationKeyboard = new InlineKeyboard()
      .text('➕ Пополнить', 'balance_add')
      .text('➖ Списать', 'balance_subtract').row()
      .text('❌ Отмена', 'cancel');
    
    await ctx.reply(
      `💰 <b>Изменение баланса пользователя #${userId}</b>\n\n` +
      `Выберите операцию:`,
      { reply_markup: operationKeyboard }
    );
    
    const opCtx = await conversation.waitForCallbackQuery(/^balance_|cancel/);
    await opCtx.answerCallbackQuery();
    
    if (opCtx.callbackQuery.data === 'cancel') return;
    
    const operation = opCtx.callbackQuery.data.replace('balance_', '');
    
    await ctx.reply('Введите сумму в рублях:');
    
    const amountCtx = await conversation.wait();
    const amount = parseFloat(amountCtx.message?.text || '0');
    
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Неверная сумма');
      return;
    }
    
    await ctx.reply('Введите причину/комментарий:');
    
    const reasonCtx = await conversation.wait();
    const reason = reasonCtx.message?.text || 'Без комментария';
    
    const result = await apiClient.updateUserBalance({
      userId,
      amount: operation === 'add' ? amount : -amount,
      reason,
      adminId: ctx.from!.id
    });
    
    await ctx.reply(
      `✅ <b>Баланс изменен!</b>\n\n` +
      `Пользователь: #${userId}\n` +
      `Операция: ${operation === 'add' ? 'Пополнение' : 'Списание'}\n` +
      `Сумма: ${FormatUtils.formatMoney(amount)}\n` +
      `Новый баланс: ${FormatUtils.formatMoney(result.newBalance)}\n` +
      `Причина: ${reason}`
    );
    
  } catch (error) {
    logger.error('Balance change error:', error);
    await ctx.reply('❌ Ошибка изменения баланса');
  }
}

export async function adminUserBanConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  const userId = ctx.session.tempData?.userId;
  
  await ctx.reply(
    `${EMOJI.WARNING} <b>Блокировка пользователя #${userId}</b>\n\n` +
    `Укажите причину блокировки:`
  );
  
  const reason = await conversation.form.text();
  
  const confirmKeyboard = new InlineKeyboard()
    .text('✅ Заблокировать', 'confirm_ban')
    .text('❌ Отмена', 'cancel_ban');
  
  await ctx.reply(
    `Подтвердите блокировку пользователя #${userId}\n` +
    `Причина: ${reason}`,
    { reply_markup: confirmKeyboard }
  );
  
  const confirmCtx = await conversation.waitForCallbackQuery(/^(confirm|cancel)_ban/);
  await confirmCtx.answerCallbackQuery();
  
  if (confirmCtx.callbackQuery.data === 'confirm_ban') {
    await apiClient.updateUser(userId, { 
      isBanned: true,
      banReason: reason,
      bannedAt: new Date(),
      bannedBy: ctx.from!.id
    });
    
    await ctx.reply(
      `${EMOJI.SUCCESS} Пользователь #${userId} заблокирован.\n` +
      `Причина: ${reason}`
    );
    
    // Уведомляем пользователя
    try {
      await ctx.api.sendMessage(
        userId,
        `${EMOJI.WARNING} <b>Ваш аккаунт заблокирован</b>\n\n` +
        `Причина: ${reason}\n\n` +
        `Для разблокировки обратитесь в поддержку.`
      );
    } catch {}
  } else {
    await ctx.reply('Блокировка отменена');
  }
}

export async function adminUserBonusConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  const userId = ctx.session.tempData?.userId;
  
  await ctx.reply(
    `${EMOJI.STAR} <b>Начисление бонусов пользователю #${userId}</b>\n\n` +
    `Введите сумму бонусов в рублях:`
  );
  
  const amountText = await conversation.form.text();
  const amount = parseFloat(amountText);
  
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Неверная сумма');
    return;
  }
  
  await ctx.reply('Укажите причину начисления:');
  const reason = await conversation.form.text();
  
  await apiClient.updateUser(userId, {
    bonusBalance: { increment: amount }
  });
  
  await ctx.reply(
    `${EMOJI.SUCCESS} Бонусы начислены!\n\n` +
    `Пользователь: #${userId}\n` +
    `Сумма: ${FormatUtils.formatMoney(amount)}\n` +
    `Причина: ${reason}`
  );
  
  // Уведомляем пользователя
  try {
    await ctx.api.sendMessage(
      userId,
      `${EMOJI.STAR} <b>Вам начислены бонусы!</b>\n\n` +
      `Сумма: ${FormatUtils.formatMoney(amount)}\n` +
      `Причина: ${reason}\n\n` +
      `Проверьте баланс в /profile`
    );
  } catch {}
}

export async function adminMessageUserConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  const userId = ctx.session.tempData?.userId;
  
  await ctx.reply(
    `${EMOJI.SUPPORT} <b>Сообщение пользователю #${userId}</b>\n\n` +
    `Введите текст сообщения:`
  );
  
  const message = await conversation.form.text();
  
  try {
    await ctx.api.sendMessage(
      userId,
      `${EMOJI.INFO} <b>Сообщение от администрации</b>\n\n${message}`
    );
    
    await ctx.reply(
      `${EMOJI.SUCCESS} Сообщение отправлено пользователю #${userId}`
    );
  } catch (error) {
    await ctx.reply('❌ Не удалось отправить сообщение');
  }
}


function getAudienceName(audience: string): string {
  const names = {
    all: 'Все пользователи',
    new: 'Новые пользователи (7 дней)',
    balance: 'Пользователи с балансом',
    orders: 'Пользователи с заказами'
  };
  return names[audience] || audience;
}
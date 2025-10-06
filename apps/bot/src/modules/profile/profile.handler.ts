// ==================== apps/bot/src/modules/profile/profile.handler.ts ====================

import { MyContext } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { InlineKeyboard } from 'grammy';
import { 
  EMOJI, 
  FormatUtils,
  ORDER_STATUS_LABELS 
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';

export async function handleProfile(ctx: MyContext) {
  try {
    if (!ctx.session.userId) {
      await ctx.reply(
        `${EMOJI.WARNING} Вы не зарегистрированы.\n` +
        `Нажмите /start для регистрации.`
      );
      return;
    }
    
    const user = await apiClient.getUserProfile(ctx.session.userId);

    const profileKeyboard = new InlineKeyboard()
      .text('📦 Мои заказы', 'my_orders')
      .text('📍 Мои адреса', 'my_addresses').row()
      .text('💰 Баланс', 'my_balance')
      .text('🎁 Реферальная программа', 'referral').row()
      .text('📊 Статистика', 'my_stats')
      .text('⚙️ Настройки', 'settings');

    const stats = user.statistics || {};
    const balance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
    const bonusBalance = typeof user.bonusBalance === 'string' ? parseFloat(user.bonusBalance) : user.bonusBalance;

    await ctx.reply(
      `${EMOJI.PROFILE} <b>Мой профиль</b>\n\n` +

      `🆔 <b>ID:</b> <code>${user.id}</code>\n` +
      `👤 <b>Имя:</b> ${user.firstName} ${user.lastName || ''}\n` +
      `📱 <b>Телефон:</b> ${FormatUtils.formatPhoneNumber(user.phone)}\n` +
      `📧 <b>Email:</b> ${user.email || 'Не указан'}\n` +
      `🏙 <b>Город:</b> ${user.city?.name || 'Не указан'}\n\n` +

      `💰 <b>Баланс:</b> ${FormatUtils.formatMoney(balance || 0)}\n` +
      `🎁 <b>Бонусы:</b> ${FormatUtils.formatMoney(bonusBalance || 0)}\n` +
      `📦 <b>Заказов:</b> ${stats.ordersCount || 0}\n` +
      `💸 <b>Потрачено:</b> ${FormatUtils.formatMoney(stats.totalSpent || 0)}\n\n` +

      `🔗 <b>Реферальный код:</b> <code>${user.referralCode}</code>\n` +
      `👥 <b>Приглашено:</b> ${stats.referralsCount || 0} человек\n\n` +

      `📅 <b>Дата регистрации:</b> ${FormatUtils.formatDate(user.createdAt)}`,
      { reply_markup: profileKeyboard }
    );
    
  } catch (error) {
    logger.error('Profile handler error:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Не удалось загрузить профиль.\n` +
      `Попробуйте позже.`
    );
  }
}

export async function handleMyOrders(ctx: MyContext) {
  try {
    const orders = await apiClient.getUserOrders(ctx.session.userId!);
    
    if (orders.length === 0) {
      const emptyKeyboard = new InlineKeyboard()
        .text('✈️ Отправить посылку', 'shipping')
        .text('🛍 Заказать товар', 'purchase');
      
      await ctx.reply(
        `${EMOJI.PACKAGE} <b>Мои заказы</b>\n\n` +
        `У вас пока нет заказов.\n` +
        `Создайте первый заказ прямо сейчас!`,
        { reply_markup: emptyKeyboard }
      );
      return;
    }
    
    // Group orders by status
    const activeOrders = orders.filter(o => 
      !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)
    );
    const completedOrders = orders.filter(o => 
      ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)
    );
    
    let message = `${EMOJI.PACKAGE} <b>Мои заказы</b>\n\n`;
    
    if (activeOrders.length > 0) {
      message += `<b>📦 Активные заказы:</b>\n\n`;
      
      for (const order of activeOrders.slice(0, 5)) {
        message += `${FormatUtils.formatOrderId(order.id)} • ${ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}\n`;
        message += `Трек: <code>${order.trackNumber}</code>\n`;
        if (order.externalTrackNumber) {
          message += `Внешний трек: <code>${order.externalTrackNumber}</code>\n`;
        }
        message += `Создан: ${FormatUtils.formatDate(order.createdAt)}\n\n`;
      }
    }
    
    if (completedOrders.length > 0) {
      message += `<b>✅ Завершенные заказы:</b>\n\n`;
      
      for (const order of completedOrders.slice(0, 3)) {
        message += `${FormatUtils.formatOrderId(order.id)} • ${ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}\n`;
        message += `Завершен: ${FormatUtils.formatDate(order.deliveredAt || order.cancelledAt)}\n\n`;
      }
    }
    
    const ordersKeyboard = new InlineKeyboard();
    
    // Add buttons for active orders
    activeOrders.slice(0, 5).forEach(order => {
      ordersKeyboard.text(
        `${FormatUtils.formatOrderId(order.id)} - ${order.status}`,
        `order_details_${order.id}`
      ).row();
    });
    
    if (orders.length > 5) {
      ordersKeyboard.text('📋 Все заказы', 'all_orders').row();
    }
    
    ordersKeyboard.text('🔍 Найти по треку', 'track_search');
    
    await ctx.reply(message, { reply_markup: ordersKeyboard });
    
  } catch (error) {
    logger.error('My orders handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить заказы.`);
  }
}

export async function handleOrderDetails(ctx: MyContext, orderId: number) {
  try {
    const order = await apiClient.getOrder(orderId);
    
    if (!order) {
      await ctx.reply(`${EMOJI.ERROR} Заказ не найден.`);
      return;
    }
    
    // Check ownership
    if (order.userId !== ctx.session.userId) {
      await ctx.reply(`${EMOJI.ERROR} У вас нет доступа к этому заказу.`);
      return;
    }
    
    const detailsKeyboard = new InlineKeyboard();
    
    // Add action buttons based on status
    if (order.status === 'PENDING') {
      detailsKeyboard.text('💳 Оплатить', `pay_order_${order.id}`).row();
      detailsKeyboard.text('❌ Отменить', `cancel_order_${order.id}`).row();
    } else if (order.status === 'WAREHOUSE_RECEIVED') {
      detailsKeyboard.text('📸 Фото посылки', `order_photos_${order.id}`).row();
    } else if (order.status === 'DELIVERED') {
      detailsKeyboard.text('⭐ Оставить отзыв', `order_review_${order.id}`).row();
    }
    
    if (order.externalTrackNumber) {
      detailsKeyboard.text('🔍 Отследить', `track_external_${order.id}`).row();
    }
    
    detailsKeyboard.text('📜 История статусов', `order_history_${order.id}`).row();
    detailsKeyboard.text('⬅️ К заказам', 'my_orders');
    
    let message = `${EMOJI.PACKAGE} <b>Заказ ${FormatUtils.formatOrderId(order.id)}</b>\n\n`;
    
    message += `<b>Основная информация:</b>\n`;
    message += `Тип: ${order.type === 'SHIPPING' ? '✈️ Доставка' : '🛍 Выкуп'}\n`;
    message += `Статус: ${ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}\n`;
    message += `Трек: <code>${order.trackNumber}</code>\n`;
    
    if (order.externalTrackNumber) {
      message += `Внешний трек: <code>${order.externalTrackNumber}</code>\n`;
    }
    
    message += `\n<b>Детали:</b>\n`;
    
    if (order.type === 'SHIPPING') {
      message += `Откуда: ${order.warehouse?.country?.flagEmoji} ${order.warehouse?.country?.name}\n`;
      message += `Склад: ${order.warehouse?.name}\n`;
      message += `Вес: ${FormatUtils.formatWeight(order.weight)}\n`;
      if (order.volumeWeight) {
        message += `Объемный вес: ${FormatUtils.formatWeight(order.volumeWeight)}\n`;
      }
      message += `Стоимость товара: $${order.declaredValue}\n`;
      message += `Описание: ${order.description}\n`;
    } else {
      message += `Товар: ${order.productName}\n`;
      message += `Количество: ${order.productQuantity} шт.\n`;
      if (order.productSize) {
        message += `Размер: ${order.productSize}\n`;
      }
      if (order.productColor) {
        message += `Цвет: ${order.productColor}\n`;
      }
      message += `Стоимость: $${order.purchaseCost}\n`;
    }
    
    message += `\n<b>Доставка:</b>\n`;
    message += `Адрес: ${order.address?.cityName}, ${order.address?.address}\n`;
    
    message += `\n<b>Финансы:</b>\n`;
    if (order.shippingCost) {
      message += `Доставка: ${FormatUtils.formatMoney(order.shippingCost)}\n`;
    }
    if (order.commissionAmount) {
      message += `Комиссия: ${FormatUtils.formatMoney(order.commissionAmount)}\n`;
    }
    message += `<b>Итого: ${FormatUtils.formatMoney(order.totalAmount || 0)}</b>\n`;
    
    message += `\n<b>Даты:</b>\n`;
    message += `Создан: ${FormatUtils.formatDate(order.createdAt)}\n`;
    if (order.paidAt) {
      message += `Оплачен: ${FormatUtils.formatDate(order.paidAt)}\n`;
    }
    if (order.shippedAt) {
      message += `Отправлен: ${FormatUtils.formatDate(order.shippedAt)}\n`;
    }
    if (order.deliveredAt) {
      message += `Доставлен: ${FormatUtils.formatDate(order.deliveredAt)}\n`;
    }
    
    await ctx.reply(message, { reply_markup: detailsKeyboard });
    
  } catch (error) {
    logger.error('Order details handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить детали заказа.`);
  }
}

export async function handleMyAddresses(ctx: MyContext) {
  try {
    const addresses = await apiClient.getUserAddresses(ctx.session.userId!);
    
    const addressKeyboard = new InlineKeyboard();
    
    if (addresses.length === 0) {
      await ctx.reply(
        `${EMOJI.LOCATION} <b>Мои адреса</b>\n\n` +
        `У вас пока нет сохраненных адресов.`,
        {
          reply_markup: addressKeyboard
            .text('➕ Добавить адрес', 'add_address')
            .row()
            .text('⬅️ В профиль', 'profile')
        }
      );
      return;
    }
    
    let message = `${EMOJI.LOCATION} <b>Мои адреса доставки</b>\n\n`;
    
    addresses.forEach((addr, index) => {
      message += `${index + 1}. <b>${addr.name}</b> ${addr.isDefault ? '⭐' : ''}\n`;
      message += `${addr.cityName}, ${addr.address}\n`;
      if (addr.postalCode) {
        message += `Индекс: ${addr.postalCode}\n`;
      }
      if (addr.phone) {
        message += `Телефон: ${addr.phone}\n`;
      }
      message += '\n';
      
      addressKeyboard.text(
        `✏️ ${addr.name}`,
        `edit_address_${addr.id}`
      );
      
      if ((index + 1) % 2 === 0) {
        addressKeyboard.row();
      }
    });
    
    addressKeyboard.row();
    addressKeyboard.text('➕ Добавить адрес', 'add_address').row();
    addressKeyboard.text('⬅️ В профиль', 'profile');
    
    await ctx.reply(message, { reply_markup: addressKeyboard });
    
  } catch (error) {
    logger.error('My addresses handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить адреса.`);
  }
}

export async function handleBalance(ctx: MyContext) {
  try {
    const balance = await apiClient.getUserBalance(ctx.session.userId!);
    
    const balanceKeyboard = new InlineKeyboard()
      .text('💳 Пополнить баланс', 'deposit').row()
      .text('📜 История операций', 'transactions').row()
      .text('🎁 Использовать бонусы', 'use_bonus').row()
      .text('⬅️ В профиль', 'profile');
    
    await ctx.reply(
      `${EMOJI.BALANCE} <b>Мой баланс</b>\n\n` +
      
      `💰 <b>Основной баланс:</b> ${FormatUtils.formatMoney(balance.balance)}\n` +
      `🎁 <b>Бонусный баланс:</b> ${FormatUtils.formatMoney(balance.bonusBalance)}\n` +
      `🔒 <b>Заблокировано:</b> ${FormatUtils.formatMoney(balance.blockedAmount || 0)}\n\n` +
      
      `<b>Последние операции:</b>\n` +
      (balance.lastTransactions?.map(t => 
        `${t.type === 'deposit' ? '➕' : '➖'} ${FormatUtils.formatMoney(t.amount)} - ${t.description}`
      ).join('\n') || 'Нет операций'),
      { reply_markup: balanceKeyboard }
    );
    
  } catch (error) {
    logger.error('Balance handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить баланс.`);
  }
}

export async function handleMyStats(ctx: MyContext) {
  try {
    const user = await apiClient.getUserProfile(ctx.session.userId!);
    const stats = user.statistics || {};

    const statsKeyboard = new InlineKeyboard()
      .text('⬅️ В профиль', 'profile');

    await ctx.reply(
      `📊 <b>Моя статистика</b>\n\n` +

      `<b>Заказы:</b>\n` +
      `• Всего заказов: ${stats.ordersCount || 0}\n` +
      `• Активных: ${stats.activeOrders || 0}\n` +
      `• Доставлено: ${stats.deliveredOrders || 0}\n` +
      `• Отменено: ${stats.cancelledOrders || 0}\n\n` +

      `<b>Финансы:</b>\n` +
      `• Потрачено всего: ${FormatUtils.formatMoney(stats.totalSpent || 0)}\n` +
      `• Средний чек: ${FormatUtils.formatMoney(stats.avgOrderValue || 0)}\n` +
      `• Экономия на выкупе: ${FormatUtils.formatMoney(stats.savedAmount || 0)}\n\n` +

      `<b>Активность:</b>\n` +
      `• С нами с: ${FormatUtils.formatDate(user.createdAt)}\n` +
      `• Дней с нами: ${Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}\n` +
      `• Последний заказ: ${stats.lastOrderDate ? FormatUtils.formatDate(stats.lastOrderDate) : 'Нет заказов'}\n\n` +

      `<b>Рефералы:</b>\n` +
      `• Приглашено: ${stats.referralsCount || 0} чел.\n` +
      `• Заработано: ${FormatUtils.formatMoney(stats.referralEarnings || 0)}`,
      { reply_markup: statsKeyboard }
    );

  } catch (error) {
    logger.error('My stats handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить статистику.`);
  }
}

export async function handleReferral(ctx: MyContext) {
  try {
    const user = await apiClient.getUserProfile(ctx.session.userId!);
    const stats = user.statistics || {};

    const referralKeyboard = new InlineKeyboard()
      .text('📤 Поделиться ссылкой', 'share_referral').row()
      .text('👥 Мои рефералы', 'my_referrals').row()
      .text('⬅️ В профиль', 'profile');

    const botUsername = (await ctx.api.getMe()).username;
    const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

    await ctx.reply(
      `🎁 <b>Реферальная программа</b>\n\n` +

      `<b>Ваши бонусы:</b>\n` +
      `• Приглашено друзей: ${stats.referralsCount || 0}\n` +
      `• Заработано бонусов: ${FormatUtils.formatMoney(stats.referralEarnings || 0)}\n` +
      `• Активных рефералов: ${stats.activeReferrals || 0}\n\n` +

      `<b>Как это работает?</b>\n` +
      `1️⃣ Пригласите друга по вашей ссылке\n` +
      `2️⃣ Друг регистрируется и делает первый заказ\n` +
      `3️⃣ Вы получаете 5% от суммы его заказов\n` +
      `4️⃣ Друг получает 500₽ бонусов\n\n` +

      `<b>Ваша реферальная ссылка:</b>\n` +
      `<code>${referralLink}</code>\n\n` +

      `<b>Ваш реферальный код:</b>\n` +
      `<code>${user.referralCode}</code>`,
      { reply_markup: referralKeyboard }
    );

  } catch (error) {
    logger.error('Referral handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить информацию о реферальной программе.`);
  }
}

export async function handleSettings(ctx: MyContext) {
  try {
    const user = await apiClient.getUserProfile(ctx.session.userId!);

    const settingsKeyboard = new InlineKeyboard()
      .text('👤 Изменить имя', 'edit_name')
      .text('📱 Изменить телефон', 'edit_phone').row()
      .text('📧 Изменить email', 'edit_email')
      .text('🏙 Изменить город', 'edit_city').row()
      .text('🔔 Уведомления', 'notifications_settings').row()
      .text('🌐 Язык', 'language_settings')
      .text('💱 Валюта', 'currency_settings').row()
      .text('🗑 Удалить аккаунт', 'delete_account').row()
      .text('⬅️ В профиль', 'profile');

    await ctx.reply(
      `⚙️ <b>Настройки профиля</b>\n\n` +

      `<b>Текущие данные:</b>\n` +
      `👤 Имя: ${user.firstName} ${user.lastName || ''}\n` +
      `📱 Телефон: ${FormatUtils.formatPhoneNumber(user.phone)}\n` +
      `📧 Email: ${user.email || 'Не указан'}\n` +
      `🏙 Город: ${user.city?.name || 'Не указан'}\n\n` +

      `<b>Настройки:</b>\n` +
      `🔔 Уведомления: ${user.settings?.notifications !== false ? 'Включены' : 'Выключены'}\n` +
      `🌐 Язык: Русский\n` +
      `💱 Валюта: RUB (₽)`,
      { reply_markup: settingsKeyboard }
    );

  } catch (error) {
    logger.error('Settings handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить настройки.`);
  }
}

export async function handleTransactions(ctx: MyContext) {
  try {
    const user = await apiClient.getUserProfile(ctx.session.userId!);
    // Mock transactions for now
    const transactions = [
      { type: 'deposit', amount: 5000, description: 'Пополнение баланса', date: new Date() },
      { type: 'payment', amount: -3500, description: 'Оплата заказа #1234', date: new Date() },
      { type: 'bonus', amount: 500, description: 'Бонус за реферала', date: new Date() }
    ];

    const transactionsKeyboard = new InlineKeyboard()
      .text('⬅️ К балансу', 'my_balance');

    let message = `📜 <b>История операций</b>\n\n`;

    if (transactions.length === 0) {
      message += `История операций пуста.`;
    } else {
      transactions.slice(0, 10).forEach(tx => {
        const emoji = tx.type === 'deposit' || tx.type === 'bonus' ? '➕' : '➖';
        message += `${emoji} <b>${FormatUtils.formatMoney(Math.abs(tx.amount))}</b>\n`;
        message += `${tx.description}\n`;
        message += `${FormatUtils.formatDate(tx.date)}\n\n`;
      });
    }

    await ctx.reply(message, { reply_markup: transactionsKeyboard });

  } catch (error) {
    logger.error('Transactions handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить историю операций.`);
  }
}

export async function handleUseBonus(ctx: MyContext) {
  try {
    const balance = await apiClient.getUserBalance(ctx.session.userId!);

    const bonusKeyboard = new InlineKeyboard()
      .text('⬅️ К балансу', 'my_balance');

    await ctx.reply(
      `🎁 <b>Использование бонусов</b>\n\n` +

      `💰 <b>Доступно бонусов:</b> ${FormatUtils.formatMoney(balance.bonusBalance)}\n\n` +

      `<b>Как использовать бонусы:</b>\n` +
      `1️⃣ Создайте новый заказ\n` +
      `2️⃣ При оплате выберите "Оплатить бонусами"\n` +
      `3️⃣ Бонусы можно использовать до 50% от суммы заказа\n\n` +

      `<b>Как получить бонусы:</b>\n` +
      `• Приглашайте друзей (+500₽ за каждого)\n` +
      `• Оставляйте отзывы (+100₽)\n` +
      `• Участвуйте в акциях\n` +
      `• Получайте кешбэк с заказов (2%)`,
      { reply_markup: bonusKeyboard }
    );

  } catch (error) {
    logger.error('Use bonus handler error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить информацию о бонусах.`);
  }
}


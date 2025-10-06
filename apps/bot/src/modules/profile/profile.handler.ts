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
    
    await ctx.reply(
      `${EMOJI.PROFILE} <b>Мой профиль</b>\n\n` +
      
      `🆔 <b>ID:</b> <code>${user.id}</code>\n` +
      `👤 <b>Имя:</b> ${user.firstName} ${user.lastName || ''}\n` +
      `📱 <b>Телефон:</b> ${FormatUtils.formatPhoneNumber(user.phone)}\n` +
      `📧 <b>Email:</b> ${user.email}\n` +
      `🏙 <b>Город:</b> ${user.city?.name || 'Не указан'}\n\n` +
      
      `💰 <b>Баланс:</b> ${FormatUtils.formatMoney(user.balance)}\n` +
      `🎁 <b>Бонусы:</b> ${FormatUtils.formatMoney(user.bonusBalance)}\n` +
      `📦 <b>Заказов:</b> ${user.ordersCount}\n` +
      `💸 <b>Потрачено:</b> ${FormatUtils.formatMoney(user.totalSpent)}\n\n` +
      
      `🔗 <b>Реферальный код:</b> <code>${user.referralCode}</code>\n` +
      `👥 <b>Приглашено:</b> ${user.referrals?.length || 0} человек\n\n` +
      
      `📅 <b>Дата регистрации:</b> ${FormatUtils.formatDate(user.registeredAt)}`,
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
        message += `${FormatUtils.formatOrderId(order.id)} • ${ORDER_STATUS_LABELS[order.status]}\n`;
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
        message += `${FormatUtils.formatOrderId(order.id)} • ${ORDER_STATUS_LABELS[order.status]}\n`;
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
    message += `Статус: ${ORDER_STATUS_LABELS[order.status]}\n`;
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


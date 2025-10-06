// ==================== apps/bot/src/handlers/payment.handler.ts ====================

import { MyContext } from '../core/types';
import { apiClient } from '../core/api/client';
import { InlineKeyboard } from 'grammy';
import { EMOJI, FormatUtils, PaymentStatus } from '@cargoexpress/shared';
import { logger } from '../core/logger';

export async function handlePayment(ctx: MyContext, orderId: number, method: string) {
  try {
    await ctx.answerCallbackQuery('Подготовка платежа...');
    
    const order = await apiClient.getOrder(orderId);
    
    if (!order) {
      await ctx.reply(`${EMOJI.ERROR} Заказ не найден`);
      return;
    }
    
    if (order.status !== 'PENDING') {
      await ctx.reply(`${EMOJI.ERROR} Заказ уже оплачен или отменен`);
      return;
    }
    
    const amount = order.totalAmount || 0;
    
    switch (method) {
      case 'card':
        await handleCardPayment(ctx, order, amount);
        break;
        
      case 'crypto':
        await handleCryptoPayment(ctx, order, amount);
        break;
        
      case 'balance':
        await handleBalancePayment(ctx, order, amount);
        break;
        
      default:
        await ctx.reply(`${EMOJI.ERROR} Неизвестный способ оплаты`);
    }
    
  } catch (error) {
    logger.error('Payment handler error:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Ошибка при создании платежа.\n` +
      `Попробуйте позже или обратитесь в поддержку.`
    );
  }
}

async function handleCardPayment(ctx: MyContext, order: any, amount: number) {
  try {
    // Создаем платеж
    const payment = await apiClient.createPayment(order.id, 'card');
    
    // Telegram Payments API
    await ctx.replyWithInvoice(
      `Заказ #${order.id}`, // title
      `Оплата заказа на ${order.type === 'SHIPPING' ? 'доставку' : 'выкуп'}`, // description
      JSON.stringify({ orderId: order.id, paymentId: payment.id }), // payload
      'RUB', // currency
      [{ label: 'К оплате', amount: amount * 100 }], // prices (в копейках)
      {
        provider_token: process.env.PAYMENT_PROVIDER_TOKEN!,
        start_parameter: `order_${order.id}`,
        photo_url: 'https://cargoexpress.com/invoice.jpg',
        need_name: true,
        need_phone_number: true,
        need_email: true,
        send_phone_number_to_provider: true,
        send_email_to_provider: true
      }
    );
    
  } catch (error) {
    logger.error('Card payment error:', error);
    
    // Fallback - внешняя ссылка на оплату
    await ctx.reply(
      `${EMOJI.BALANCE} <b>Оплата картой</b>\n\n` +
      `Сумма к оплате: ${FormatUtils.formatMoney(amount)}\n\n` +
      `Для оплаты перейдите по ссылке:\n` +
      `https://pay.cargoexpress.com/order/${order.id}\n\n` +
      `После оплаты статус заказа обновится автоматически.`,
      {
        reply_markup: new InlineKeyboard()
          .url('💳 Оплатить', `https://pay.cargoexpress.com/order/${order.id}`)
          .row()
          .text('🔄 Проверить статус', `check_payment_${order.id}`)
      }
    );
  }
}

async function handleCryptoPayment(ctx: MyContext, order: any, amount: number) {
  const payment = await apiClient.createPayment(order.id, 'crypto');
  
  // Расчет в крипте
  const btcRate = 3500000; // Примерный курс BTC/RUB
  const usdtRate = 90; // Примерный курс USDT/RUB
  
  const btcAmount = (amount / btcRate).toFixed(8);
  const usdtAmount = (amount / usdtRate).toFixed(2);
  
  await ctx.reply(
    `${EMOJI.BALANCE} <b>Оплата криптовалютой</b>\n\n` +
    `Заказ: #${order.id}\n` +
    `Сумма: ${FormatUtils.formatMoney(amount)}\n\n` +
    
    `<b>Варианты оплаты:</b>\n\n` +
    
    `<b>Bitcoin (BTC):</b>\n` +
    `Сумма: <code>${btcAmount}</code> BTC\n` +
    `Адрес: <code>${payment.cryptoAddress?.btc || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'}</code>\n\n` +
    
    `<b>USDT (TRC20):</b>\n` +
    `Сумма: <code>${usdtAmount}</code> USDT\n` +
    `Адрес: <code>${payment.cryptoAddress?.usdt || 'TXxxx...'}</code>\n\n` +
    
    `${EMOJI.WARNING} <b>Важно:</b>\n` +
    `• Отправьте точную сумму\n` +
    `• Сохраните хеш транзакции\n` +
    `• Платеж обработается автоматически\n` +
    `• Время подтверждения: 10-60 минут`,
    {
      reply_markup: new InlineKeyboard()
        .text('✅ Я оплатил', `confirm_crypto_${order.id}`)
        .text('❌ Отмена', 'cancel_payment')
    }
  );
}

async function handleBalancePayment(ctx: MyContext, order: any, amount: number) {
  const user = await apiClient.getUserProfile(ctx.session.userId!);
  
  if (user.balance < amount) {
    await ctx.reply(
      `${EMOJI.ERROR} <b>Недостаточно средств</b>\n\n` +
      `Необходимо: ${FormatUtils.formatMoney(amount)}\n` +
      `Ваш баланс: ${FormatUtils.formatMoney(user.balance)}\n` +
      `Не хватает: ${FormatUtils.formatMoney(amount - user.balance)}\n\n` +
      `Пополните баланс или выберите другой способ оплаты.`,
      {
        reply_markup: new InlineKeyboard()
          .text('💳 Пополнить баланс', 'deposit')
          .row()
          .text('⬅️ Назад', `order_details_${order.id}`)
      }
    );
    return;
  }
  
  await ctx.reply(
    `${EMOJI.BALANCE} <b>Оплата с баланса</b>\n\n` +
    `Заказ: #${order.id}\n` +
    `Сумма: ${FormatUtils.formatMoney(amount)}\n` +
    `Ваш баланс: ${FormatUtils.formatMoney(user.balance)}\n` +
    `Останется: ${FormatUtils.formatMoney(user.balance - amount)}\n\n` +
    `Подтвердить оплату?`,
    {
      reply_markup: new InlineKeyboard()
        .text('✅ Подтвердить', `confirm_balance_payment_${order.id}`)
        .text('❌ Отмена', 'cancel_payment')
    }
  );
}

// Pre-checkout handler для Telegram Payments
export function handlePreCheckout(bot: Bot<MyContext>) {
  bot.on('pre_checkout_query', async (ctx) => {
    try {
      const payload = JSON.parse(ctx.preCheckoutQuery.invoice_payload);
      
      // Проверяем заказ
      const order = await apiClient.getOrder(payload.orderId);
      
      if (!order || order.status !== 'PENDING') {
        await ctx.answerPreCheckoutQuery(false, {
          error_message: 'Заказ не найден или уже оплачен'
        });
        return;
      }
      
      // Подтверждаем
      await ctx.answerPreCheckoutQuery(true);
      
    } catch (error) {
      logger.error('Pre-checkout error:', error);
      await ctx.answerPreCheckoutQuery(false, {
        error_message: 'Ошибка проверки платежа'
      });
    }
  });
  
  // Successful payment handler
  bot.on('message:successful_payment', async (ctx) => {
    try {
      const payment = ctx.message.successful_payment;
      const payload = JSON.parse(payment.invoice_payload);
      
      // Обновляем статус заказа
      await apiClient.updateOrder(payload.orderId, {
        status: 'PAID',
        paymentId: payment.telegram_payment_charge_id
      });
      
      await ctx.reply(
        `${EMOJI.SUCCESS} <b>Оплата прошла успешно!</b>\n\n` +
        `Заказ #${payload.orderId} оплачен.\n` +
        `Сумма: ${FormatUtils.formatMoney(payment.total_amount / 100)}\n\n` +
        `Мы начали обработку вашего заказа.`,
        {
          reply_markup: new InlineKeyboard()
            .text('📦 Мои заказы', 'my_orders')
        }
      );
      
    } catch (error) {
      logger.error('Successful payment handler error:', error);
    }
  });
}
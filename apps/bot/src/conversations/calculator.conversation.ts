// ==================== apps/bot/src/conversations/calculator.conversation.ts ====================

import { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../core/types';
import { apiClient } from '../core/api/client';
import { InlineKeyboard } from 'grammy';
import {
  EMOJI,
  CalculationUtils,
  FormatUtils
} from '@cargoexpress/shared';
import { logger } from '../core/logger';

export async function calculatorConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    const typeKeyboard = new InlineKeyboard()
      .text('✈️ Доставка посылки', 'calc_shipping').row()
      .text('🛍 Выкуп товара', 'calc_purchase').row()
      .text('❌ Отмена', 'cancel');
    
    const typeMsg = await ctx.reply(
      `${EMOJI.CALCULATOR} <b>Калькулятор стоимости</b>\n\n` +
      `Что вы хотите рассчитать?`,
      { reply_markup: typeKeyboard }
    );
    
    const typeCtx = await conversation.waitForCallbackQuery(/^(calc_|cancel)/);
    await typeCtx.answerCallbackQuery();
    
    if (typeCtx.callbackQuery.data === 'cancel') {
      await ctx.api.deleteMessage(ctx.chat!.id, typeMsg.message_id);
      await ctx.reply('Расчет отменен');
      return;
    }
    
    const calcType = typeCtx.callbackQuery.data.replace('calc_', '');
    
    if (calcType === 'shipping') {
      await calculateShipping(conversation, ctx, typeMsg.message_id);
    } else {
      await calculatePurchase(conversation, ctx, typeMsg.message_id);
    }
    
  } catch (error) {
    logger.error('Calculator conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Ошибка при расчете.`);
  }
}

async function calculateShipping(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  messageId: number
) {
  // Select country
  const countries = await apiClient.getCountries(true);
  const shippingCountries = countries.filter(c => c.shippingAvailable);
  
  const countryKeyboard = new InlineKeyboard();
  shippingCountries.forEach((country, index) => {
    countryKeyboard.text(
      `${country.flagEmoji} ${country.name}`,
      `calc_country_${country.id}`
    );
    if ((index + 1) % 2 === 0) {
      countryKeyboard.row();
    }
  });
  
  await ctx.api.editMessageText(
    ctx.chat!.id,
    messageId,
    `${EMOJI.CALCULATOR} <b>Калькулятор доставки</b>\n\n` +
    `Выберите страну отправления:`,
    {
      reply_markup: countryKeyboard,
      parse_mode: 'HTML'
    }
  );
  
  const countryCtx = await conversation.waitForCallbackQuery(/^calc_country_/);
  await countryCtx.answerCallbackQuery();
  
  const countryId = parseInt(countryCtx.callbackQuery.data.replace('calc_country_', ''));
  const country = shippingCountries.find(c => c.id === countryId);
  
  // Enter weight
  await ctx.api.editMessageText(
    ctx.chat!.id,
    messageId,
    `${EMOJI.CALCULATOR} <b>Калькулятор доставки из ${country?.name}</b>\n\n` +
    `Введите вес посылки в кг:`,
    { parse_mode: 'HTML' }
  );

  const weightCtx = await conversation.wait();
  const weightText = weightCtx.message?.text || '0';
  const weight = parseFloat(weightText.replace(',', '.'));
  
  if (isNaN(weight) || weight <= 0) {
    await ctx.reply(`${EMOJI.ERROR} Неверный вес`);
    return calculateShipping(conversation, ctx, messageId);
  }
  
  // Optional dimensions
  const dimKeyboard = new InlineKeyboard()
    .text('Указать размеры', 'calc_dim_yes')
    .text('Только вес', 'calc_dim_no');
  
  await ctx.reply(
    'Хотите указать размеры для точного расчета?',
    { reply_markup: dimKeyboard }
  );
  
  const dimCtx = await conversation.waitForCallbackQuery(/^calc_dim_/);
  await dimCtx.answerCallbackQuery();
  
  let volumeWeight = 0;
  
  if (dimCtx.callbackQuery.data === 'calc_dim_yes') {
    await ctx.reply('Введите длину (см):');
    const lengthCtx = await conversation.wait();
    const length = parseFloat(lengthCtx.message?.text || '0');

    await ctx.reply('Введите ширину (см):');
    const widthCtx = await conversation.wait();
    const width = parseFloat(widthCtx.message?.text || '0');

    await ctx.reply('Введите высоту (см):');
    const heightCtx = await conversation.wait();
    const height = parseFloat(heightCtx.message?.text || '0');

    volumeWeight = CalculationUtils.calculateVolumetricWeight(
      length, width, height
    );
  }

  // Enter declared value
  await ctx.reply('Введите стоимость товара в долларах:');
  const valueCtx = await conversation.wait();
  const valueText = valueCtx.message?.text || '0';
  const declaredValue = parseFloat(valueText);
  
  // Calculate
  const calculation = await apiClient.calculateShipping({
    fromCountryId: countryId,
    weight,
    length: volumeWeight > 0 ? 100 : undefined,
    width: volumeWeight > 0 ? 100 : undefined,
    height: volumeWeight > 0 ? 100 : undefined,
    declaredValue
  });
  
  // Show results
  let message = `${EMOJI.CALCULATOR} <b>Результат расчета</b>\n\n`;
  message += `<b>Маршрут:</b> ${country?.flagEmoji} ${country?.name} → 🇷🇺 Россия\n`;
  message += `<b>Вес:</b> ${FormatUtils.formatWeight(weight)}\n`;
  
  if (volumeWeight > 0) {
    message += `<b>Объемный вес:</b> ${FormatUtils.formatWeight(volumeWeight)}\n`;
    message += `<b>К оплате:</b> ${FormatUtils.formatWeight(Math.max(weight, volumeWeight))}\n`;
  }
  
  message += `<b>Стоимость товара:</b> $${declaredValue}\n\n`;
  
  message += `<b>📊 Варианты доставки:</b>\n\n`;
  
  for (const option of calculation.options) {
    message += `<b>${option.name}</b>\n`;
    message += `Срок: ${option.deliveryDays}\n`;
    message += `Доставка: ${FormatUtils.formatMoney(option.shippingCost)}\n`;
    
    if (option.customsFee > 0) {
      message += `Таможня: ${FormatUtils.formatMoney(option.customsFee)}\n`;
    }
    
    message += `<b>Итого: ${FormatUtils.formatMoney(option.totalCost)}</b>\n\n`;
  }
  
  const resultKeyboard = new InlineKeyboard()
    .text('✈️ Создать заказ', 'create_shipping_order').row()
    .text('🔄 Новый расчет', 'calculator').row()
    .text('❌ Закрыть', 'close');
  
  await ctx.reply(message, { reply_markup: resultKeyboard });
}

async function calculatePurchase(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  messageId: number
) {
  // Select country
  const countries = await apiClient.getCountries(true);
  const purchaseCountries = countries.filter(c => c.purchaseAvailable);
  
  const countryKeyboard = new InlineKeyboard();
  purchaseCountries.forEach((country, index) => {
    countryKeyboard.text(
      `${country.flagEmoji} ${country.name}`,
      `calc_pcountry_${country.id}`
    );
    if ((index + 1) % 2 === 0) {
      countryKeyboard.row();
    }
  });
  
  await ctx.api.editMessageText(
    ctx.chat!.id,
    messageId,
    `${EMOJI.CALCULATOR} <b>Калькулятор выкупа</b>\n\n` +
    `В какой стране купить товар?`,
    {
      reply_markup: countryKeyboard,
      parse_mode: 'HTML'
    }
  );
  
  const countryCtx = await conversation.waitForCallbackQuery(/^calc_pcountry_/);
  await countryCtx.answerCallbackQuery();
  
  const countryId = parseInt(countryCtx.callbackQuery.data.replace('calc_pcountry_', ''));
  const country = purchaseCountries.find(c => c.id === countryId);
  
  // Enter product cost
  await ctx.api.editMessageText(
    ctx.chat!.id,
    messageId,
    `${EMOJI.CALCULATOR} <b>Калькулятор выкупа в ${country?.name}</b>\n\n` +
    `Введите стоимость товара в долларах:`,
    { parse_mode: 'HTML' }
  );

  const costCtx = await conversation.wait();
  const costText = costCtx.message?.text || '0';
  const productCost = parseFloat(costText);

  if (isNaN(productCost) || productCost <= 0) {
    await ctx.reply(`${EMOJI.ERROR} Неверная стоимость`);
    return calculatePurchase(conversation, ctx, messageId);
  }

  // Enter quantity
  await ctx.reply('Количество товара:');
  const quantityCtx = await conversation.wait();
  const quantityText = quantityCtx.message?.text || '1';
  const quantity = parseInt(quantityText) || 1;
  
  // Calculate
  const calculation = await apiClient.calculatePurchase({
    countryId,
    productCost,
    quantity
  });
  
  // Show results
  await ctx.reply(
    `${EMOJI.CALCULATOR} <b>Результат расчета выкупа</b>\n\n` +
    
    `<b>Страна:</b> ${country?.flagEmoji} ${country?.name}\n` +
    `<b>Товар:</b> $${productCost} × ${quantity} шт.\n\n` +
    
    `<b>Расчет стоимости:</b>\n` +
    `Товар: ${FormatUtils.formatMoney(productCost * quantity * calculation.exchangeRate)}\n` +
    `Комиссия (${country?.purchaseCommission}%): ${FormatUtils.formatMoney(calculation.commission)}\n` +
    `Доставка до склада: ${FormatUtils.formatMoney(calculation.domesticShipping || 0)}\n` +
    `<b>Итого: ${FormatUtils.formatMoney(calculation.totalCost)}</b>\n\n` +
    
    `${EMOJI.INFO} <b>Важно:</b>\n` +
    `• Это стоимость только выкупа\n` +
    `• Доставка в Россию оплачивается отдельно\n` +
    `• Товар будет доставлен на склад в ${country?.name}\n` +
    `• Срок выкупа: 1-3 дня после оплаты`,
    {
      reply_markup: new InlineKeyboard()
        .text('🛍 Создать заказ', 'create_purchase_order').row()
        .text('🔄 Новый расчет', 'calculator').row()
        .text('❌ Закрыть', 'close')
    }
  );
}


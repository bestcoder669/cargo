// ==================== apps/bot/src/modules/shipping/shipping.conversation.ts ====================

import { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { InlineKeyboard } from 'grammy';
import {
  EMOJI,
  OrderType,
  CalculationUtils,
  FormatUtils
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';

export async function shippingConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    ctx.session.shippingData = {};
    
    // Step 1: Select country
    const countries = await apiClient.getCountries(true);
    const shippingCountries = countries.filter(c => c.shippingAvailable);
    
    if (shippingCountries.length === 0) {
      await ctx.reply(
        `${EMOJI.ERROR} К сожалению, доставка временно недоступна.\n` +
        `Попробуйте позже или обратитесь в поддержку.`
      );
      return;
    }
    
    const countryKeyboard = new InlineKeyboard();
    shippingCountries
      .sort((a, b) => b.popularityScore - a.popularityScore || a.sortOrder - b.sortOrder)
      .slice(0, 10)
      .forEach((country, index) => {
        const text = `${country.flagEmoji} ${country.name}`;
        countryKeyboard.text(text, `country_${country.id}`);
        if ((index + 1) % 2 === 0) {
          countryKeyboard.row();
        }
      });
    
    countryKeyboard.row();
    countryKeyboard.text(`${EMOJI.BACK} Отмена`, 'cancel');
    
    const countryMsg = await ctx.reply(
      `${EMOJI.SHIPPING} <b>Отправка посылки</b>\n\n` +
      `<b>Шаг 1/6:</b> Из какой страны отправляем?`,
      { reply_markup: countryKeyboard }
    );
    
    const countryCtx = await conversation.waitForCallbackQuery(/^(country_|cancel)/);
    await countryCtx.answerCallbackQuery();
    
    if (countryCtx.callbackQuery.data === 'cancel') {
      await ctx.api.deleteMessage(ctx.chat!.id, countryMsg.message_id);
      await ctx.reply('❌ Создание заказа отменено');
      return;
    }
    
    const countryId = parseInt(countryCtx.callbackQuery.data.replace('country_', ''));
    const country = shippingCountries.find(c => c.id === countryId);
    ctx.session.shippingData.countryId = countryId;
    
    // Step 2: Select warehouse
    const warehouses = await apiClient.getWarehouses(countryId);
    
    if (warehouses.length === 0) {
      await ctx.reply(
        `${EMOJI.ERROR} В выбранной стране нет доступных складов.\n` +
        `Выберите другую страну или обратитесь в поддержку.`
      );
      return;
    }
    
    const warehouseKeyboard = new InlineKeyboard();
    
    for (const warehouse of warehouses) {
      const tariffs = warehouse.tariffs || [];
      const minPrice = tariffs.length > 0 
        ? Math.min(...tariffs.map(t => t.pricePerKg))
        : 0;
      
      const text = `${warehouse.name} (от ${minPrice}₽/кг)`;
      warehouseKeyboard.text(text, `warehouse_${warehouse.id}`).row();
    }
    
    warehouseKeyboard.text(`${EMOJI.BACK} Назад`, 'back');
    
    await ctx.api.editMessageText(
      ctx.chat!.id,
      countryMsg.message_id,
      `${EMOJI.PACKAGE} <b>Склад в ${country?.name}</b>\n\n` +
      `<b>Шаг 2/6:</b> Выберите склад:`,
      {
        reply_markup: warehouseKeyboard,
        parse_mode: 'HTML'
      }
    );
    
    const warehouseCtx = await conversation.waitForCallbackQuery(/^(warehouse_|back)/);
    await warehouseCtx.answerCallbackQuery();
    
    if (warehouseCtx.callbackQuery.data === 'back') {
      return shippingConversation(conversation, ctx);
    }
    
    const warehouseId = parseInt(warehouseCtx.callbackQuery.data.replace('warehouse_', ''));
    const warehouse = warehouses.find(w => w.id === warehouseId);
    ctx.session.shippingData.warehouseId = warehouseId;
    
    // Show warehouse info
    await ctx.api.editMessageText(
      ctx.chat!.id,
      countryMsg.message_id,
      `${EMOJI.PACKAGE} <b>Информация о складе</b>\n\n` +
      `<b>Страна:</b> ${country?.flagEmoji} ${country?.name}\n` +
      `<b>Склад:</b> ${warehouse?.name}\n` +
      `<b>Адрес:</b>\n<code>${warehouse?.address}</code>\n` +
      `<b>Город:</b> ${warehouse?.city}\n` +
      `<b>Индекс:</b> ${warehouse?.postalCode || '-'}\n\n` +
      
      `<b>При отправке укажите:</b>\n` +
      `Получатель: <b>CargoExpress</b>\n` +
      `ID клиента: <b>#${ctx.session.userId}</b>\n\n` +
      
      `${EMOJI.WARNING} <b>Важно!</b> Обязательно укажите ваш ID при отправке!`,
      { parse_mode: 'HTML' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Weight
    await ctx.api.editMessageText(
      ctx.chat!.id,
      countryMsg.message_id,
      `${EMOJI.PACKAGE} <b>Вес посылки</b>\n\n` +
      `<b>Шаг 3/7:</b> Введите вес посылки в кг:\n` +
      `<i>Например: 1.5 или 2.3</i>`,
      { parse_mode: 'HTML' }
    );

    let weightCtx;
    let attempts = 0;
    while (attempts < 3) {
      weightCtx = await conversation.wait();

      // Ignore callback queries
      if (weightCtx.callbackQuery) {
        await weightCtx.answerCallbackQuery();
        await ctx.reply(
          `${EMOJI.INFO} Пожалуйста, введите вес посылки в килограммах.\n` +
          `Например: 1.5 или 2.3`
        );
        continue;
      }

      const weightText = weightCtx.message?.text || '0';
      const weight = parseFloat(weightText.replace(',', '.'));

      if (isNaN(weight) || weight < 0.1 || weight > 100) {
        attempts++;
        await ctx.reply(
          `${EMOJI.ERROR} Неверный вес.\n` +
          `Введите вес от 0.1 до 100 кг.`
        );
        if (attempts >= 3) {
          await ctx.reply('❌ Слишком много попыток. Начните заново: /shipping');
          return;
        }
        continue;
      }

      ctx.session.shippingData.weight = weight;
      break;
    }

    // Step 4: Dimensions (optional)
    const dimensionsKeyboard = new InlineKeyboard()
      .text('Указать размеры', 'dimensions_yes')
      .text('Пропустить', 'dimensions_no');
    
    await ctx.reply(
      `${EMOJI.PACKAGE} <b>Размеры посылки</b>\n\n` +
      `<b>Шаг 4/7:</b> Хотите указать размеры?\n` +
      `Это поможет точнее рассчитать стоимость.`,
      { reply_markup: dimensionsKeyboard }
    );
    
    const dimCtx = await conversation.waitForCallbackQuery(/^dimensions_/);
    await dimCtx.answerCallbackQuery();
    
    if (dimCtx.callbackQuery.data === 'dimensions_yes') {
      // Length
      await ctx.reply('Введите длину (см):');
      const lengthCtx = await conversation.wait();
      const lengthText = lengthCtx.message?.text || '0';
      const length = parseFloat(lengthText);

      if (isNaN(length) || length <= 0) {
        await ctx.reply(`${EMOJI.ERROR} Неверная длина`);
        return shippingConversation(conversation, ctx);
      }

      // Width
      await ctx.reply('Введите ширину (см):');
      const widthCtx = await conversation.wait();
      const widthText = widthCtx.message?.text || '0';
      const width = parseFloat(widthText);

      if (isNaN(width) || width <= 0) {
        await ctx.reply(`${EMOJI.ERROR} Неверная ширина`);
        return shippingConversation(conversation, ctx);
      }

      // Height
      await ctx.reply('Введите высоту (см):');
      const heightCtx = await conversation.wait();
      const heightText = heightCtx.message?.text || '0';
      const height = parseFloat(heightText);
      
      if (isNaN(height) || height <= 0) {
        await ctx.reply(`${EMOJI.ERROR} Неверная высота`);
        return shippingConversation(conversation, ctx);
      }
      
      ctx.session.shippingData.length = length;
      ctx.session.shippingData.width = width;
      ctx.session.shippingData.height = height;
      
      // Calculate volumetric weight
      const volumeWeight = CalculationUtils.calculateVolumetricWeight(
        length, width, height
      );
      
      await ctx.reply(
        `${EMOJI.INFO} <b>Расчет веса:</b>\n` +
        `Фактический вес: ${weight} кг\n` +
        `Объемный вес: ${volumeWeight.toFixed(2)} кг\n` +
        `К оплате: ${Math.max(weight, volumeWeight).toFixed(2)} кг`
      );
    }
    
    // Step 5: Declared value
    await ctx.reply(
      `${EMOJI.PACKAGE} <b>Стоимость содержимого</b>\n\n` +
      `<b>Шаг 5/7:</b> Укажите стоимость содержимого в долларах:\n` +
      `<i>Для таможенного декларирования</i>`
    );

    const valueCtx = await conversation.wait();
    const valueText = valueCtx.message?.text || '0';
    const declaredValue = parseFloat(valueText);
    
    if (isNaN(declaredValue) || declaredValue <= 0) {
      await ctx.reply(`${EMOJI.ERROR} Неверная стоимость`);
      return shippingConversation(conversation, ctx);
    }
    
    ctx.session.shippingData.declaredValue = declaredValue;
    
    // Step 6: Description
    await ctx.reply(
      `${EMOJI.PACKAGE} <b>Описание посылки</b>\n\n` +
      `<b>Шаг 6/7:</b> Кратко опишите содержимое:\n` +
      `<i>Например: Одежда, электроника, косметика</i>`
    );

    const descCtx = await conversation.wait();
    const description = descCtx.message?.text || '';
    ctx.session.shippingData.description = description;

    // Step 7: External tracking number (required)
    await ctx.reply(
      `${EMOJI.PACKAGE} <b>Трек-номер посылки</b>\n\n` +
      `<b>Шаг 7/7:</b> Введите трек-номер вашей посылки от транспортной компании:\n\n` +
      `<i>Этот номер вы получили при отправке посылки на наш склад</i>`
    );

    let trackCtx;
    let trackAttempts = 0;
    while (trackAttempts < 3) {
      trackCtx = await conversation.wait();

      const externalTrack = trackCtx.message?.text?.trim();

      if (!externalTrack || externalTrack.length < 5 || externalTrack.length > 50) {
        trackAttempts++;
        await ctx.reply(
          `${EMOJI.ERROR} Неверный формат трек-номера.\n` +
          `Введите трек-номер от 5 до 50 символов.`
        );
        if (trackAttempts >= 3) {
          await ctx.reply('❌ Слишком много попыток. Начните заново: /shipping');
          return;
        }
        continue;
      }

      ctx.session.shippingData.externalTrackNumber = externalTrack;
      await ctx.reply(`${EMOJI.SUCCESS} Трек-номер сохранен: ${externalTrack}`);
      break;
    }

    // Select delivery address
    const addresses = await apiClient.getUserAddresses(ctx.session.userId!);
    
    let addressId: number;
    
    if (addresses.length > 0) {
      const addressKeyboard = new InlineKeyboard();
      
      addresses.forEach((addr) => {
        const text = `${addr.name} (${addr.cityName})`;
        addressKeyboard.text(text, `address_${addr.id}`).row();
      });
      
      addressKeyboard.text('➕ Новый адрес', 'address_new');
      
      await ctx.reply(
        `${EMOJI.LOCATION} <b>Адрес доставки</b>\n\n` +
        `Выберите адрес доставки:`,
        { reply_markup: addressKeyboard }
      );
      
      const addrCtx = await conversation.waitForCallbackQuery(/^address_/);
      await addrCtx.answerCallbackQuery();
      
      if (addrCtx.callbackQuery.data === 'address_new') {
        // Create new address
        await ctx.reply('Введите название адреса (Дом, Офис и т.д.):');
        const nameCtx = await conversation.wait();
        const name = nameCtx.message?.text || '';

        await ctx.reply('Введите полный адрес:');
        const addressCtx = await conversation.wait();
        const address = addressCtx.message?.text || '';
        
        const newAddress = await apiClient.createAddress(ctx.session.userId!, {
          name,
          address,
          cityId: ctx.user.cityId
        });
        
        addressId = newAddress.id;
      } else {
        addressId = parseInt(addrCtx.callbackQuery.data.replace('address_', ''));
      }
    } else {
      // Create first address
      const user = await apiClient.getUserProfile(ctx.session.userId!);
      const newAddress = await apiClient.createAddress(ctx.session.userId!, {
        name: 'Основной',
        address: user.addresses[0]?.address || '',
        cityId: user.cityId,
        isDefault: true
      });
      addressId = newAddress.id;
    }
    
    ctx.session.shippingData.addressId = addressId;
    
    // Calculate shipping cost
    const calculationResult = await apiClient.calculateShipping({
      fromCountryId: ctx.session.shippingData.countryId!,
      weight: ctx.session.shippingData.weight!,
      length: ctx.session.shippingData.length,
      width: ctx.session.shippingData.width,
      height: ctx.session.shippingData.height,
      declaredValue: ctx.session.shippingData.declaredValue
    });

    // Get cheapest option (first one, sorted by price)
    const calculation = calculationResult.options[0];

    if (!calculation) {
      await ctx.reply(
        `${EMOJI.ERROR} Не удалось рассчитать стоимость доставки.\n` +
        `Попробуйте позже или обратитесь в поддержку.`
      );
      return;
    }

    // Save tariff ID for order creation
    ctx.session.shippingData.tariffId = calculation.tariffId;

    const confirmKeyboard = new InlineKeyboard()
      .text(`${EMOJI.SUCCESS} Создать заказ`, 'confirm_order')
      .text(`${EMOJI.CLOSE} Отменить`, 'cancel_order');

    await ctx.reply(
      `${EMOJI.PACKAGE} <b>Подтверждение заказа</b>\n\n` +

      `<b>Откуда:</b> ${country?.flagEmoji} ${country?.name}\n` +
      `<b>Склад:</b> ${calculation.warehouseName}\n` +
      `<b>Вес:</b> ${FormatUtils.formatWeight(ctx.session.shippingData.weight!)}\n` +
      (ctx.session.shippingData.length ?
        `<b>Размеры:</b> ${ctx.session.shippingData.length}×${ctx.session.shippingData.width}×${ctx.session.shippingData.height} см\n` : '') +
      `<b>Стоимость товара:</b> $${ctx.session.shippingData.declaredValue}\n` +
      `<b>Описание:</b> ${ctx.session.shippingData.description}\n\n` +

      `${EMOJI.CALCULATOR} <b>Расчет стоимости:</b>\n` +
      `Доставка: ${FormatUtils.formatMoney(calculation.shippingCost)}\n` +
      `Таможня: ${FormatUtils.formatMoney(calculation.customsFee || 0)}\n` +
      `Обработка: ${FormatUtils.formatMoney(calculation.processingFee || 0)}\n` +
      `<b>ИТОГО: ${FormatUtils.formatMoney(calculation.totalCost)}</b>\n\n` +

      `⏱ Срок доставки: ${calculation.deliveryDays} дней\n\n` +

      `Создать заказ?`,
      { reply_markup: confirmKeyboard }
    );
    
    const confirmCtx = await conversation.waitForCallbackQuery(/^(confirm|cancel)_order/);
    await confirmCtx.answerCallbackQuery();
    
    if (confirmCtx.callbackQuery.data === 'cancel_order') {
      await ctx.reply('❌ Заказ отменен');
      return;
    }
    
    // Create order
    try {
      logger.info(`Creating shipping order for userId: ${ctx.session.userId}, telegramId: ${ctx.from.id}`);

      const orderData = {
        userId: ctx.session.userId!,
        type: OrderType.SHIPPING,
        warehouseId: ctx.session.shippingData.warehouseId!,
        addressId: ctx.session.shippingData.addressId!,
        weight: ctx.session.shippingData.weight!,
        length: ctx.session.shippingData.length,
        width: ctx.session.shippingData.width,
        height: ctx.session.shippingData.height,
        declaredValue: ctx.session.shippingData.declaredValue,
        description: ctx.session.shippingData.description,
        externalTrackNumber: ctx.session.shippingData.externalTrackNumber,
        shippingCost: calculation.shippingCost
      };

      logger.info(`Order data:`, orderData);

      const order = await apiClient.createOrder(orderData);
      
      const paymentKeyboard = new InlineKeyboard()
        .text('💳 Оплатить картой', `pay_card_${order.id}`)
        .text('🪙 Оплатить криптой', `pay_crypto_${order.id}`).row()
        .text('💰 Оплатить с баланса', `pay_balance_${order.id}`).row()
        .text('📦 Мои заказы', 'my_orders');
      
      await ctx.reply(
        `${EMOJI.SUCCESS} <b>Заказ создан!</b>\n\n` +

        `<b>Номер заказа:</b> ${FormatUtils.formatOrderId(order.id)}\n` +
        `<b>Ваш трек-номер:</b> <code>${order.trackNumber}</code>\n\n` +

        `✅ Ваша посылка принята в обработку!\n\n` +

        `Мы отслеживаем вашу посылку по трек-номеру <b>${order.trackNumber}</b>.\n` +
        `Как только она прибудет на наш склад <b>${warehouse?.name}</b>, мы сообщим вам и отправим её по адресу доставки.\n\n` +

        `<b>💰 К оплате: ${FormatUtils.formatMoney(calculation.totalCost)}</b>\n\n` +

        `Выберите способ оплаты:`,
        { reply_markup: paymentKeyboard }
      );
      
      // Clear session data
      ctx.session.shippingData = undefined;
      
      logger.info(`Shipping order created: ${order.id} by user ${ctx.session.userId}`);
      
    } catch (error) {
      logger.error('Failed to create order:', error);
      await ctx.reply(
        `${EMOJI.ERROR} Не удалось создать заказ.\n` +
        `Попробуйте позже или обратитесь в поддержку.`
      );
    }
    
  } catch (error) {
    logger.error('Shipping conversation error:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Произошла ошибка.\n` +
      `Попробуйте начать заново или обратитесь в поддержку.`
    );
  }
}

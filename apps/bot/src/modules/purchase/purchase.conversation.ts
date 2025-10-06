
// ==================== apps/bot/src/modules/purchase/purchase.conversation.ts ====================

import { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { InlineKeyboard } from 'grammy';
import {
  EMOJI,
  OrderType,
  FormatUtils,
  ValidationUtils
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';

export async function purchaseConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    ctx.session.purchaseData = {};
    
    // Choose purchase type
    const typeKeyboard = new InlineKeyboard()
      .text('🔗 По ссылке на товар', 'type_link').row()
      .text('🛍 Из нашего каталога', 'type_catalog').row()
      .text(`${EMOJI.BACK} Отмена`, 'cancel');
    
    const typeMsg = await ctx.reply(
      `${EMOJI.PURCHASE} <b>Выкуп товара</b>\n\n` +
      `Мы можем купить для вас товар с любого зарубежного сайта!\n\n` +
      `<b>Как вы хотите заказать товар?</b>`,
      { reply_markup: typeKeyboard }
    );
    
    const typeCtx = await conversation.waitForCallbackQuery(/^(type_|cancel)/);
    await typeCtx.answerCallbackQuery();
    
    if (typeCtx.callbackQuery.data === 'cancel') {
      await ctx.api.deleteMessage(ctx.chat!.id, typeMsg.message_id);
      await ctx.reply('❌ Заказ отменен');
      return;
    }
    
    const purchaseType = typeCtx.callbackQuery.data.replace('type_', '') as 'link' | 'catalog';
    ctx.session.purchaseData.type = purchaseType;
    
    if (purchaseType === 'link') {
      // Purchase by link
      await purchaseLinkFlow(conversation, ctx, typeMsg.message_id);
    } else {
      // Purchase from catalog
      await purchaseCatalogFlow(conversation, ctx, typeMsg.message_id);
    }
    
  } catch (error) {
    logger.error('Purchase conversation error:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Произошла ошибка.\n` +
      `Попробуйте начать заново или обратитесь в поддержку.`
    );
  }
}

async function purchaseLinkFlow(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  messageId: number
) {
  // Step 1: Product URL
  await ctx.api.editMessageText(
    ctx.chat!.id,
    messageId,
    `${EMOJI.PURCHASE} <b>Выкуп по ссылке</b>\n\n` +
    `<b>Шаг 1/7:</b> Отправьте ссылку на товар:\n\n` +
    `<i>Поддерживаются сайты: Amazon, eBay, AliExpress, Taobao и другие</i>`,
    { parse_mode: 'HTML' }
  );

  const urlCtx = await conversation.wait();
  const urlText = urlCtx.message?.text || '';
  
  if (!ValidationUtils.isValidUrl(urlText)) {
    await ctx.reply(
      `${EMOJI.ERROR} Неверная ссылка.\n` +
      `Пожалуйста, отправьте полную ссылку на товар.`
    );
    return purchaseLinkFlow(conversation, ctx, messageId);
  }
  
  ctx.session.purchaseData!.productUrl = urlText;
  
  // Try to parse product info
  await ctx.reply(`${EMOJI.LOADING} Анализирую товар...`);
  
  // TODO: Implement product parser
  // const productInfo = await parseProductUrl(urlText);
  
  // Step 2: Product name
  await ctx.reply(
    `${EMOJI.PACKAGE} <b>Название товара</b>\n\n` +
    `<b>Шаг 2/7:</b> Введите название товара:`
  );

  const nameCtx = await conversation.wait();
  const productName = nameCtx.message?.text || '';
  ctx.session.purchaseData!.productName = productName;

  // Step 3: Quantity
  await ctx.reply(
    `${EMOJI.PACKAGE} <b>Количество</b>\n\n` +
    `<b>Шаг 3/7:</b> Сколько штук заказать?`
  );

  const quantityCtx = await conversation.wait();
  const quantityText = quantityCtx.message?.text || '0';
  const quantity = parseInt(quantityText);
  
  if (isNaN(quantity) || quantity <= 0 || quantity > 100) {
    await ctx.reply(
      `${EMOJI.ERROR} Неверное количество.\n` +
      `Введите число от 1 до 100.`
    );
    return purchaseLinkFlow(conversation, ctx, messageId);
  }
  
  ctx.session.purchaseData!.productQuantity = quantity;
  
  // Step 4: Size (optional)
  const sizeKeyboard = new InlineKeyboard()
    .text('Указать размер', 'size_yes')
    .text('Пропустить', 'size_no');
  
  await ctx.reply(
    `${EMOJI.PACKAGE} <b>Размер</b>\n\n` +
    `<b>Шаг 4/7:</b> Нужно указать размер?`,
    { reply_markup: sizeKeyboard }
  );
  
  const sizeCtx = await conversation.waitForCallbackQuery(/^size_/);
  await sizeCtx.answerCallbackQuery();
  
  if (sizeCtx.callbackQuery.data === 'size_yes') {
    await ctx.reply('Введите размер (S, M, L, XL, 42, 44 и т.д.):');
    const sizeInputCtx = await conversation.wait();
    const size = sizeInputCtx.message?.text || '';
    ctx.session.purchaseData!.productSize = size;
  }

  // Step 5: Color (optional)
  const colorKeyboard = new InlineKeyboard()
    .text('Указать цвет', 'color_yes')
    .text('Пропустить', 'color_no');

  await ctx.reply(
    `${EMOJI.PACKAGE} <b>Цвет</b>\n\n` +
    `<b>Шаг 5/7:</b> Нужно указать цвет?`,
    { reply_markup: colorKeyboard }
  );

  const colorCtx = await conversation.waitForCallbackQuery(/^color_/);
  await colorCtx.answerCallbackQuery();

  if (colorCtx.callbackQuery.data === 'color_yes') {
    await ctx.reply('Введите цвет:');
    const colorInputCtx = await conversation.wait();
    const color = colorInputCtx.message?.text || '';
    ctx.session.purchaseData!.productColor = color;
  }
  
  // Step 6: Product cost
  await ctx.reply(
    `${EMOJI.PACKAGE} <b>Стоимость товара</b>\n\n` +
    `<b>Шаг 6/7:</b> Введите стоимость товара в долларах:\n` +
    `<i>Цена за ${quantity} шт.</i>`
  );

  const costCtx = await conversation.wait();
  const costText = costCtx.message?.text || '0';
  const cost = parseFloat(costText);

  if (isNaN(cost) || cost <= 0) {
    await ctx.reply(`${EMOJI.ERROR} Неверная стоимость`);
    return purchaseLinkFlow(conversation, ctx, messageId);
  }

  ctx.session.purchaseData!.purchaseCost = cost;

  // Step 7: Additional notes
  await ctx.reply(
    `${EMOJI.PACKAGE} <b>Дополнительная информация</b>\n\n` +
    `<b>Шаг 7/7:</b> Есть особые пожелания?\n` +
    `<i>Или отправьте "-" чтобы пропустить</i>`
  );

  const noteCtx = await conversation.wait();
  const note = noteCtx.message?.text || '';
  if (note !== '-') {
    ctx.session.purchaseData!.productNote = note;
  }
  
  // Select country for delivery
  const countries = await apiClient.getCountries(true);
  const purchaseCountries = countries.filter(c => c.purchaseAvailable);
  
  const countryKeyboard = new InlineKeyboard();
  purchaseCountries.forEach((country, index) => {
    const text = `${country.flagEmoji} ${country.name}`;
    countryKeyboard.text(text, `pcountry_${country.id}`);
    if ((index + 1) % 2 === 0) {
      countryKeyboard.row();
    }
  });
  
  await ctx.reply(
    `${EMOJI.LOCATION} <b>Страна покупки</b>\n\n` +
    `В какой стране купить товар?`,
    { reply_markup: countryKeyboard }
  );
  
  const countryCtx = await conversation.waitForCallbackQuery(/^pcountry_/);
  await countryCtx.answerCallbackQuery();
  
  const countryId = parseInt(countryCtx.callbackQuery.data.replace('pcountry_', ''));
  const country = purchaseCountries.find(c => c.id === countryId);
  ctx.session.purchaseData!.countryId = countryId;
  
  // Calculate purchase
  const calculation = await apiClient.calculatePurchase({
    countryId,
    productCost: cost,
    quantity
  });
  
  // Confirm order
  const confirmKeyboard = new InlineKeyboard()
    .text(`${EMOJI.SUCCESS} Создать заказ`, 'confirm_purchase')
    .text(`${EMOJI.CLOSE} Отменить`, 'cancel_purchase');
  
  await ctx.reply(
    `${EMOJI.PURCHASE} <b>Подтверждение заказа на выкуп</b>\n\n` +
    
    `<b>Товар:</b> ${productName}\n` +
    `<b>Ссылка:</b> ${urlText.substring(0, 50)}...\n` +
    `<b>Количество:</b> ${quantity} шт.\n` +
    (ctx.session.purchaseData!.productSize ? 
      `<b>Размер:</b> ${ctx.session.purchaseData!.productSize}\n` : '') +
    (ctx.session.purchaseData!.productColor ?
      `<b>Цвет:</b> ${ctx.session.purchaseData!.productColor}\n` : '') +
    `<b>Страна покупки:</b> ${country?.flagEmoji} ${country?.name}\n\n` +
    
    `${EMOJI.CALCULATOR} <b>Расчет стоимости:</b>\n` +
    `Товар: ${FormatUtils.formatMoney(cost * calculation.exchangeRate)}\n` +
    `Комиссия (${country?.purchaseCommission}%): ${FormatUtils.formatMoney(calculation.commission)}\n` +
    `Доставка до склада: ${FormatUtils.formatMoney(calculation.domesticShipping || 0)}\n` +
    `<b>ИТОГО: ${FormatUtils.formatMoney(calculation.totalCost)}</b>\n\n` +
    
    `${EMOJI.INFO} После выкупа товар будет доставлен на наш склад.\n` +
    `Доставка в Россию оплачивается отдельно.\n\n` +
    
    `Создать заказ?`,
    { reply_markup: confirmKeyboard }
  );
  
  const confirmCtx = await conversation.waitForCallbackQuery(/^(confirm|cancel)_purchase/);
  await confirmCtx.answerCallbackQuery();
  
  if (confirmCtx.callbackQuery.data === 'cancel_purchase') {
    await ctx.reply('❌ Заказ отменен');
    return;
  }
  
  // Get warehouse and address
  const warehouses = await apiClient.getWarehouses(countryId);
  const warehouse = warehouses[0];

  if (!warehouse) {
    await ctx.reply(`${EMOJI.ERROR} Нет доступных складов для этой страны.`);
    return;
  }

  const addresses = await apiClient.getUserAddresses(ctx.session.userId!);
  let addressId: number;

  if (addresses.length > 0) {
    addressId = addresses[0].id;
  } else {
    const user = await apiClient.getUserProfile(ctx.session.userId!);
    const newAddress = await apiClient.createAddress(ctx.session.userId!, {
      name: 'Основной',
      address: user.addresses[0]?.address || '',
      cityId: user.cityId,
      isDefault: true
    });
    addressId = newAddress.id;
  }

  // Create order
  try {
    const orderData = {
      userId: ctx.session.userId!,
      type: OrderType.PURCHASE,
      warehouseId: warehouse.id,
      addressId,
      productUrl: ctx.session.purchaseData!.productUrl,
      productName: ctx.session.purchaseData!.productName,
      productQuantity: ctx.session.purchaseData!.productQuantity,
      productSize: ctx.session.purchaseData!.productSize,
      productColor: ctx.session.purchaseData!.productColor,
      productNote: ctx.session.purchaseData!.productNote,
      purchaseCost: ctx.session.purchaseData!.purchaseCost,
      commissionAmount: calculation.commission,
      totalAmount: calculation.totalCost
    };
    
    const order = await apiClient.createOrder(orderData);
    
    const paymentKeyboard = new InlineKeyboard()
      .text('💳 Оплатить картой', `pay_card_${order.id}`)
      .text('🪙 Оплатить криптой', `pay_crypto_${order.id}`).row()
      .text('📦 Мои заказы', 'my_orders');
    
    await ctx.reply(
      `${EMOJI.SUCCESS} <b>Заказ на выкуп создан!</b>\n\n` +
      
      `<b>Номер заказа:</b> ${FormatUtils.formatOrderId(order.id)}\n` +
      `<b>Трек-номер:</b> <code>${order.trackNumber}</code>\n\n` +
      
      `<b>Что дальше:</b>\n` +
      `1. Оплатите заказ\n` +
      `2. Мы купим товар в течение 24 часов\n` +
      `3. Отправим фото товара после получения\n` +
      `4. Доставим на склад в ${country?.name}\n` +
      `5. Вы оформите доставку в Россию\n\n` +
      
      `<b>К оплате: ${FormatUtils.formatMoney(calculation.totalCost)}</b>\n\n` +
      
      `Выберите способ оплаты:`,
      { reply_markup: paymentKeyboard }
    );
    
    // Clear session data
    ctx.session.purchaseData = undefined;
    
    logger.info(`Purchase order created: ${order.id} by user ${ctx.session.userId}`);
    
  } catch (error) {
    logger.error('Failed to create purchase order:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Не удалось создать заказ.\n` +
      `Попробуйте позже или обратитесь в поддержку.`
    );
  }
}

async function purchaseCatalogFlow(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  messageId: number
) {
  // Select country
  const catalogCountries = await apiClient.getCatalogCountries();

  if (catalogCountries.length === 0) {
    await ctx.reply(
      `${EMOJI.ERROR} Каталог товаров временно недоступен.\n` +
      `Вы можете заказать товар по ссылке.`
    );
    return;
  }
  
  const countryKeyboard = new InlineKeyboard();
  catalogCountries.forEach((country, index) => {
    const text = `${country.flagEmoji} ${country.name} (${country.productsCount})`;
    countryKeyboard.text(text, `catalog_country_${country.id}`);
    if ((index + 1) % 2 === 0) {
      countryKeyboard.row();
    }
  });
  
  await ctx.api.editMessageText(
    ctx.chat!.id,
    messageId,
    `${EMOJI.PURCHASE} <b>Каталог товаров</b>\n\n` +
    `Выберите страну:`,
    {
      reply_markup: countryKeyboard,
      parse_mode: 'HTML'
    }
  );
  
  const countryCtx = await conversation.waitForCallbackQuery(/^catalog_country_/);
  await countryCtx.answerCallbackQuery();
  
  const countryId = parseInt(countryCtx.callbackQuery.data.replace('catalog_country_', ''));
  
  // Get categories
  const categories = await apiClient.getProductCategories(countryId);
  
  const categoryKeyboard = new InlineKeyboard();
  categories.forEach((category) => {
    const text = `${category.icon} ${category.name}`;
    categoryKeyboard.text(text, `catalog_cat_${category.id}`).row();
  });
  categoryKeyboard.text(`${EMOJI.BACK} Назад`, 'back_to_countries');
  
  await ctx.api.editMessageText(
    ctx.chat!.id,
    messageId,
    `${EMOJI.PURCHASE} <b>Выберите категорию товаров:</b>`,
    {
      reply_markup: categoryKeyboard,
      parse_mode: 'HTML'
    }
  );
  
  const categoryCtx = await conversation.waitForCallbackQuery(/^catalog_cat_/);
  await categoryCtx.answerCallbackQuery();
  
  const categoryId = parseInt(categoryCtx.callbackQuery.data.replace('catalog_cat_', ''));
  
  // Get products
  const productsResponse = await apiClient.getProducts({
    countryId,
    categoryId,
    limit: 10
  });

  const products = productsResponse?.items || [];

  if (products.length === 0) {
    await ctx.reply(
      `${EMOJI.ERROR} В этой категории пока нет товаров.\n` +
      `Попробуйте другую категорию или закажите по ссылке.`
    );
    return;
  }

  // Show products carousel
  let currentProductIndex = 0;
  let selectedProduct = null;
  let lastProductMsgId: number | null = null;

  while (!selectedProduct && currentProductIndex < products.length) {
    const product = products[currentProductIndex];

    const productKeyboard = new InlineKeyboard()
      .text('🛒 Заказать', `order_product_${product.id}`);

    if (currentProductIndex < products.length - 1) {
      productKeyboard.text('➡️ Следующий', 'next_product');
    }

    const productMsg = await ctx.reply(
      `${product.imageUrl ? `<a href="${product.imageUrl}">​</a>` : ''}` +
      `<b>${product.name}</b>\n\n` +
      `💰 <b>Цена:</b> ${FormatUtils.formatMoney(Number(product.price) * 90)}\n` +
      (product.oldPrice ? `<s>${FormatUtils.formatMoney(Number(product.oldPrice) * 90)}</s>\n` : '') +
      (product.rating ? `⭐ <b>Рейтинг:</b> ${product.rating}/5 (${product.reviewCount} отзывов)\n` : '') +
      `📦 <b>Продано:</b> ${product.soldCount} шт.\n\n` +
      `${product.description?.substring(0, 200) || 'Нет описания'}...`,
      {
        reply_markup: productKeyboard,
        parse_mode: 'HTML'
      }
    );

    const productCtx = await conversation.waitForCallbackQuery(/^(order_product_|next_product)/);
    await productCtx.answerCallbackQuery();

    if (productCtx.callbackQuery.data.startsWith('order_product_')) {
      selectedProduct = product;
      break;
    } else if (productCtx.callbackQuery.data === 'next_product') {
      // Delete the previous product message to avoid clutter
      if (lastProductMsgId) {
        await ctx.api.deleteMessage(ctx.chat!.id, lastProductMsgId).catch(() => {});
      }
      await ctx.api.deleteMessage(ctx.chat!.id, productMsg.message_id).catch(() => {});

      currentProductIndex++;
    }

    lastProductMsgId = productMsg.message_id;
  }

  if (!selectedProduct) {
    await ctx.reply(
      `${EMOJI.INFO} Вы просмотрели все товары.\n` +
      `Попробуйте другую категорию или закажите по ссылке.`
    );
    return;
  }

  // Collect purchase details
  const qtyMsg = await ctx.reply(`📦 <b>Заказ: ${selectedProduct.name}</b>\n\nСколько штук вы хотите заказать?`, { parse_mode: 'HTML' });

  let quantity = 0;
  let qtyAttempts = 0;

  while (qtyAttempts < 3) {
    const qtyCtx = await conversation.wait();
    quantity = parseInt(qtyCtx.message?.text || '0');

    if (isNaN(quantity) || quantity < 1 || quantity > 100) {
      qtyAttempts++;
      const errorMsg = await ctx.reply(`${EMOJI.ERROR} Неверное количество. Укажите от 1 до 100.`);

      if (qtyAttempts >= 3) {
        await ctx.reply('❌ Слишком много попыток. Начните заново: /purchase');
        return;
      }

      // Delete error message after 3 seconds
      setTimeout(() => {
        ctx.api.deleteMessage(ctx.chat!.id, errorMsg.message_id).catch(() => {});
      }, 3000);

      continue;
    }

    // Delete the quantity message prompt
    await ctx.api.deleteMessage(ctx.chat!.id, qtyMsg.message_id).catch(() => {});
    break;
  }

  // Get warehouse from country
  const warehouses = await apiClient.getWarehouses(countryId);
  const warehouse = warehouses[0];

  if (!warehouse) {
    await ctx.reply(`${EMOJI.ERROR} Нет доступных складов для этой страны.`);
    return;
  }

  // Get delivery address
  const addresses = await apiClient.getUserAddresses(ctx.session.userId!);
  let addressId: number;

  if (addresses.length > 0) {
    const addressKeyboard = new InlineKeyboard();
    addresses.forEach((addr) => {
      addressKeyboard.text(`${addr.name} (${addr.cityName})`, `addr_${addr.id}`).row();
    });
    addressKeyboard.text('➕ Новый адрес', 'addr_new');

    const addrMsg = await ctx.reply('Выберите адрес доставки:', { reply_markup: addressKeyboard });

    const addrCtx = await conversation.waitForCallbackQuery(/^addr_/);
    await addrCtx.answerCallbackQuery();

    // Delete address selection message
    await ctx.api.deleteMessage(ctx.chat!.id, addrMsg.message_id).catch(() => {});

    if (addrCtx.callbackQuery.data === 'addr_new') {
      const nameMsg = await ctx.reply('Введите название адреса (Дом, Офис и т.д.):');
      const nameCtx = await conversation.wait();
      const name = nameCtx.message?.text || 'Адрес';

      // Delete name prompt
      await ctx.api.deleteMessage(ctx.chat!.id, nameMsg.message_id).catch(() => {});

      const addressMsg = await ctx.reply('Введите полный адрес:');
      const addressCtx = await conversation.wait();
      const address = addressCtx.message?.text || '';

      // Delete address prompt
      await ctx.api.deleteMessage(ctx.chat!.id, addressMsg.message_id).catch(() => {});

      const newAddress = await apiClient.createAddress(ctx.session.userId!, {
        name,
        address,
        cityId: ctx.user.cityId
      });

      addressId = newAddress.id;
    } else {
      addressId = parseInt(addrCtx.callbackQuery.data.replace('addr_', ''));
    }
  } else {
    const user = await apiClient.getUserProfile(ctx.session.userId!);
    const newAddress = await apiClient.createAddress(ctx.session.userId!, {
      name: 'Основной',
      address: user.addresses[0]?.address || '',
      cityId: user.cityId,
      isDefault: true
    });
    addressId = newAddress.id;
  }

  // Calculate totals
  const purchaseCost = Number(selectedProduct.price) * quantity;
  const commissionAmount = purchaseCost * 0.1; // 10% commission
  const totalAmount = purchaseCost + commissionAmount;

  // Create purchase order
  try {
    const orderData = {
      userId: ctx.session.userId!,
      type: OrderType.PURCHASE,
      warehouseId: warehouse.id,
      addressId,
      productUrl: selectedProduct.url,
      productName: selectedProduct.name,
      productQuantity: quantity,
      purchaseCost,
      commissionAmount,
      totalAmount
    };

    const order = await apiClient.createOrder(orderData);

    const paymentKeyboard = new InlineKeyboard()
      .text('💳 Оплатить картой', `pay_card_${order.id}`)
      .text('🪙 Оплатить криптой', `pay_crypto_${order.id}`).row()
      .text('💰 Оплатить с баланса', `pay_balance_${order.id}`).row()
      .text('📦 Мои заказы', 'my_orders');

    await ctx.reply(
      `${EMOJI.SUCCESS} <b>Заказ создан!</b>\n\n` +
      `<b>Номер заказа:</b> ${FormatUtils.formatOrderId(order.id)}\n` +
      `<b>Товар:</b> ${selectedProduct.name}\n` +
      `<b>Количество:</b> ${quantity} шт.\n\n` +
      `💰 <b>Стоимость товара:</b> ${FormatUtils.formatMoney(purchaseCost)}\n` +
      `📊 <b>Комиссия (10%):</b> ${FormatUtils.formatMoney(commissionAmount)}\n` +
      `<b>Итого к оплате: ${FormatUtils.formatMoney(totalAmount)}</b>\n\n` +
      `Мы выкупим товар и отправим его на ваш адрес.\n\n` +
      `Выберите способ оплаты:`,
      { reply_markup: paymentKeyboard, parse_mode: 'HTML' }
    );

    ctx.session.purchaseData = undefined;

  } catch (error) {
    logger.error('Failed to create purchase order:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Не удалось создать заказ.\n` +
      `Попробуйте позже или обратитесь в поддержку.`
    );
  }
}
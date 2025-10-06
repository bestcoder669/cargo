
// ==================== apps/bot/src/modules/purchase/purchase.conversation.ts ====================

import { MyContext, MyConversation } from '../../core/types';
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
  conversation: MyConversation,
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
  conversation: MyConversation,
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
  
  const urlText = await conversation.form.text();
  
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
  
  const productName = await conversation.form.text();
  ctx.session.purchaseData!.productName = productName;
  
  // Step 3: Quantity
  await ctx.reply(
    `${EMOJI.PACKAGE} <b>Количество</b>\n\n` +
    `<b>Шаг 3/7:</b> Сколько штук заказать?`
  );
  
  const quantityText = await conversation.form.text();
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
    const size = await conversation.form.text();
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
    const color = await conversation.form.text();
    ctx.session.purchaseData!.productColor = color;
  }
  
  // Step 6: Product cost
  await ctx.reply(
    `${EMOJI.PACKAGE} <b>Стоимость товара</b>\n\n` +
    `<b>Шаг 6/7:</b> Введите стоимость товара в долларах:\n` +
    `<i>Цена за ${quantity} шт.</i>`
  );
  
  const costText = await conversation.form.text();
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
  
  const note = await conversation.form.text();
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
  
  // Create order
  try {
    const orderData = {
      userId: ctx.session.userId,
      type: OrderType.PURCHASE,
      countryId: ctx.session.purchaseData!.countryId,
      productUrl: ctx.session.purchaseData!.productUrl,
      productName: ctx.session.purchaseData!.productName,
      productQuantity: ctx.session.purchaseData!.productQuantity,
      productSize: ctx.session.purchaseData!.productSize,
      productColor: ctx.session.purchaseData!.productColor,
      productNote: ctx.session.purchaseData!.productNote,
      purchaseCost: ctx.session.purchaseData!.purchaseCost
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
  conversation: MyConversation,
  ctx: MyContext,
  messageId: number
) {
  // Select country
  const countries = await apiClient.getCountries(true);
  const catalogCountries = countries.filter(c => 
    c.purchaseAvailable && c.products?.length > 0
  );
  
  if (catalogCountries.length === 0) {
    await ctx.reply(
      `${EMOJI.ERROR} Каталог товаров временно недоступен.\n` +
      `Вы можете заказать товар по ссылке.`
    );
    return;
  }
  
  const countryKeyboard = new InlineKeyboard();
  catalogCountries.forEach((country, index) => {
    const text = `${country.flagEmoji} ${country.name}`;
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
  const products = await apiClient.getProducts({
    countryId,
    categoryId,
    limit: 10
  });
  
  if (!products.items || products.items.length === 0) {
    await ctx.reply(
      `${EMOJI.ERROR} В этой категории пока нет товаров.\n` +
      `Попробуйте другую категорию или закажите по ссылке.`
    );
    return;
  }
  
  // Show products carousel
  for (const product of products.items) {
    const productKeyboard = new InlineKeyboard()
      .text('🛒 Заказать', `order_product_${product.id}`)
      .text('ℹ️ Подробнее', `info_product_${product.id}`).row()
      .text('➡️ Следующий', 'next_product');
    
    await ctx.reply(
      `${product.imageUrl ? `<a href="${product.imageUrl}">​</a>` : ''}`  +
      `<b>${product.name}</b>\n\n` +
      `💰 <b>Цена:</b> ${FormatUtils.formatMoney(product.price * 90)}\n` +
      (product.oldPrice ? `<s>${FormatUtils.formatMoney(product.oldPrice * 90)}</s>\n` : '') +
      `⭐ <b>Рейтинг:</b> ${product.rating}/5 (${product.reviewCount} отзывов)\n` +
      `📦 <b>Продано:</b> ${product.soldCount} шт.\n\n` +
      `${product.description?.substring(0, 200)}...`,
      { 
        reply_markup: productKeyboard,
        parse_mode: 'HTML'
      }
    );
    
    const productCtx = await conversation.waitForCallbackQuery();
    await productCtx.answerCallbackQuery();
    
    if (productCtx.callbackQuery.data.startsWith('order_product_')) {
      const productId = parseInt(productCtx.callbackQuery.data.replace('order_product_', ''));
      const selectedProduct = products.items.find(p => p.id === productId);
      
      ctx.session.purchaseData = {
        type: 'catalog',
        productId,
        productName: selectedProduct.name,
        purchaseCost: selectedProduct.price,
        countryId,
        productQuantity: 1
      };
      
      // Continue with order creation...
      // Similar to link flow
      break;
    }
  }
}
// apps/bot/src/modules/profile/profile.conversation.ts

import { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { EMOJI, FormatUtils } from '@cargoexpress/shared';
import { logger } from '../../core/logger';
import { InlineKeyboard } from 'grammy';

export async function addAddressConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    await ctx.reply(
      `📍 <b>Добавление нового адреса</b>\n\n` +
      `Введите название адреса (например, "Дом", "Работа"):`,
      { reply_markup: new InlineKeyboard().text('❌ Отменить', 'my_addresses') }
    );

    const nameCtx = await conversation.wait();
    if (!nameCtx.message?.text) {
      await ctx.reply('❌ Название адреса не может быть пустым');
      return;
    }
    const name = nameCtx.message.text;

    await ctx.reply(`Введите город:`);
    const cityCtx = await conversation.wait();
    if (!cityCtx.message?.text) {
      await ctx.reply('❌ Город не может быть пустым');
      return;
    }
    const cityName = cityCtx.message.text;

    await ctx.reply(`Введите улицу и номер дома:`);
    const addressCtx = await conversation.wait();
    if (!addressCtx.message?.text) {
      await ctx.reply('❌ Адрес не может быть пустым');
      return;
    }
    const address = addressCtx.message.text;

    await ctx.reply(`Введите почтовый индекс (или пропустите, отправив "-"):`);
    const postalCodeCtx = await conversation.wait();
    const postalCode = postalCodeCtx.message?.text === '-' ? undefined : postalCodeCtx.message?.text;

    await ctx.reply(`Введите телефон получателя (или пропустите, отправив "-"):`);
    const phoneCtx = await conversation.wait();
    const phone = phoneCtx.message?.text === '-' ? undefined : phoneCtx.message?.text;

    await ctx.reply(`Введите ФИО получателя (или пропустите, отправив "-"):`);
    const recipientNameCtx = await conversation.wait();
    const recipientName = recipientNameCtx.message?.text === '-' ? undefined : recipientNameCtx.message?.text;

    // Create address
    const newAddress = await apiClient.createAddress(ctx.session.userId!, {
      name,
      cityName,
      address,
      postalCode,
      phone,
      recipientName,
      isDefault: false
    });

    await ctx.reply(
      `✅ <b>Адрес успешно добавлен!</b>\n\n` +
      `${name}\n` +
      `${cityName}, ${address}\n` +
      (postalCode ? `Индекс: ${postalCode}\n` : '') +
      (phone ? `Телефон: ${phone}\n` : '') +
      (recipientName ? `Получатель: ${recipientName}` : ''),
      { reply_markup: new InlineKeyboard().text('📍 Мои адреса', 'my_addresses') }
    );

  } catch (error) {
    logger.error('Add address conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось добавить адрес. Попробуйте позже.`);
  }
}

export async function editAddressConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    const addressId = ctx.session.tempData?.addressId;
    if (!addressId) {
      await ctx.reply('❌ Адрес не найден');
      return;
    }

    const addresses = await apiClient.getUserAddresses(ctx.session.userId!);
    const address = addresses.find(a => a.id === addressId);

    if (!address) {
      await ctx.reply('❌ Адрес не найден');
      return;
    }

    const editKeyboard = new InlineKeyboard()
      .text('✏️ Изменить', `edit_addr_confirm_${addressId}`)
      .text('⭐ Сделать основным', `set_default_addr_${addressId}`).row()
      .text('🗑 Удалить', `delete_addr_${addressId}`)
      .text('⬅️ Назад', 'my_addresses');

    await ctx.reply(
      `📍 <b>Редактирование адреса</b>\n\n` +
      `<b>${address.name}</b>\n` +
      `${address.cityName}, ${address.address}\n` +
      (address.postalCode ? `Индекс: ${address.postalCode}\n` : '') +
      (address.phone ? `Телефон: ${address.phone}\n` : '') +
      (address.recipientName ? `Получатель: ${address.recipientName}\n` : '') +
      (address.isDefault ? `\n⭐ <b>Основной адрес</b>` : ''),
      { reply_markup: editKeyboard }
    );

  } catch (error) {
    logger.error('Edit address conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить адрес.`);
  }
}

export async function depositConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    const paymentKeyboard = new InlineKeyboard()
      .text('💳 Банковская карта', 'deposit_card')
      .text('₿ Криптовалюта', 'deposit_crypto').row()
      .text('🏦 СБП', 'deposit_sbp')
      .text('❌ Отменить', 'my_balance');

    await ctx.reply(
      `💰 <b>Пополнение баланса</b>\n\n` +
      `Выберите способ пополнения:`,
      { reply_markup: paymentKeyboard }
    );

    const methodCtx = await conversation.wait();
    const method = methodCtx.callbackQuery?.data?.replace('deposit_', '');

    if (!method || method === 'my_balance') {
      return;
    }

    await ctx.answerCallbackQuery();

    await ctx.reply(
      `💳 <b>Пополнение через ${method === 'card' ? 'карту' : method === 'crypto' ? 'криптовалюту' : 'СБП'}</b>\n\n` +
      `Введите сумму пополнения (минимум 100₽):`,
      { reply_markup: new InlineKeyboard().text('❌ Отменить', 'my_balance') }
    );

    const amountCtx = await conversation.wait();
    const amountText = amountCtx.message?.text;

    if (!amountText) {
      await ctx.reply('❌ Сумма не может быть пустой');
      return;
    }

    const amount = parseFloat(amountText);

    if (isNaN(amount) || amount < 100) {
      await ctx.reply('❌ Минимальная сумма пополнения - 100₽');
      return;
    }

    // Create payment
    const payment = await apiClient.depositBalance(ctx.session.userId!, amount, method);

    const confirmKeyboard = new InlineKeyboard()
      .text('✅ Оплатить', `confirm_deposit_${payment.id}`)
      .text('❌ Отменить', 'my_balance');

    await ctx.reply(
      `💰 <b>Подтверждение пополнения</b>\n\n` +
      `Сумма: ${FormatUtils.formatMoney(amount)}\n` +
      `Способ: ${method === 'card' ? 'Банковская карта' : method === 'crypto' ? 'Криптовалюта' : 'СБП'}\n` +
      `Комиссия: ${FormatUtils.formatMoney(0)}\n\n` +
      `<b>Итого к оплате: ${FormatUtils.formatMoney(amount)}</b>`,
      { reply_markup: confirmKeyboard }
    );

  } catch (error) {
    logger.error('Deposit conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось создать пополнение. Попробуйте позже.`);
  }
}

export async function editNameConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    await ctx.reply(
      `👤 <b>Изменение имени</b>\n\n` +
      `Введите ваше новое имя:`,
      { reply_markup: new InlineKeyboard().text('❌ Отменить', 'settings') }
    );

    const nameCtx = await conversation.wait();
    if (!nameCtx.message?.text) {
      await ctx.reply('❌ Имя не может быть пустым');
      return;
    }

    const firstName = nameCtx.message.text.trim();

    logger.info(`Updating user ${ctx.session.userId} firstName to: "${firstName}"`);
    // Reset lastName to null to avoid concatenation with old lastName
    await apiClient.updateUser(ctx.session.userId!, { firstName, lastName: null });

    await ctx.reply(
      `✅ Имя успешно изменено на: ${firstName}`,
      { reply_markup: new InlineKeyboard().text('⚙️ Настройки', 'settings') }
    );

  } catch (error) {
    logger.error('Edit name conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось изменить имя.`);
  }
}

export async function editPhoneConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    await ctx.reply(
      `📱 <b>Изменение телефона</b>\n\n` +
      `Введите новый номер телефона в формате +79991234567:`,
      { reply_markup: new InlineKeyboard().text('❌ Отменить', 'settings') }
    );

    const phoneCtx = await conversation.wait();
    if (!phoneCtx.message?.text) {
      await ctx.reply('❌ Телефон не может быть пустым');
      return;
    }

    const phone = phoneCtx.message.text;

    if (!phone.match(/^\+?\d{10,15}$/)) {
      await ctx.reply('❌ Неверный формат номера телефона');
      return;
    }

    await apiClient.updateUser(ctx.session.userId!, { phone });

    await ctx.reply(
      `✅ Телефон успешно изменен`,
      { reply_markup: new InlineKeyboard().text('⚙️ Настройки', 'settings') }
    );

  } catch (error) {
    logger.error('Edit phone conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось изменить телефон.`);
  }
}

export async function editEmailConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    await ctx.reply(
      `📧 <b>Изменение email</b>\n\n` +
      `Введите новый email адрес:`,
      { reply_markup: new InlineKeyboard().text('❌ Отменить', 'settings') }
    );

    const emailCtx = await conversation.wait();
    if (!emailCtx.message?.text) {
      await ctx.reply('❌ Email не может быть пустым');
      return;
    }

    const email = emailCtx.message.text;

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      await ctx.reply('❌ Неверный формат email');
      return;
    }

    await apiClient.updateUser(ctx.session.userId!, { email });

    await ctx.reply(
      `✅ Email успешно изменен на: ${email}`,
      { reply_markup: new InlineKeyboard().text('⚙️ Настройки', 'settings') }
    );

  } catch (error) {
    logger.error('Edit email conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось изменить email.`);
  }
}

export async function editCityConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    await ctx.reply(
      `🏙 <b>Изменение города</b>\n\n` +
      `Введите название вашего города:`,
      { reply_markup: new InlineKeyboard().text('❌ Отменить', 'settings') }
    );

    const cityCtx = await conversation.wait();
    if (!cityCtx.message?.text) {
      await ctx.reply('❌ Город не может быть пустым');
      return;
    }

    const cityName = cityCtx.message.text;

    // Try to find city
    const cities = await apiClient.getCities('RU');

    // Aliases for popular cities
    const cityAliases: Record<string, string[]> = {
      'Санкт-Петербург': ['питер', 'спб', 'петербург', 'санкт-петербург', 'ленинград'],
      'Москва': ['москва', 'мск'],
      'Нижний Новгород': ['нижний', 'нижний новгород', 'ннов'],
      'Екатеринбург': ['екатеринбург', 'екб', 'екат'],
      'Ростов-на-Дону': ['ростов', 'ростов-на-дону', 'ростов на дону']
    };

    let city = cities.find(c => {
      const searchLower = cityName.toLowerCase().trim();
      const cityNameLower = c.name.toLowerCase();

      // Exact match
      if (cityNameLower === searchLower) return true;

      // Check aliases
      const aliases = cityAliases[c.name] || [];
      if (aliases.includes(searchLower)) return true;

      // Contains match
      return cityNameLower.includes(searchLower) || searchLower.includes(cityNameLower);
    });

    if (!city) {
      await ctx.reply(
        `❌ Город "${cityName}" не найден.\n` +
        `Попробуйте ввести название более точно.`
      );
      return;
    }

    await apiClient.updateUser(ctx.session.userId!, { cityId: city.id });

    await ctx.reply(
      `✅ Город успешно изменен на: ${city.name}`,
      { reply_markup: new InlineKeyboard().text('⚙️ Настройки', 'settings') }
    );

  } catch (error) {
    logger.error('Edit city conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось изменить город.`);
  }
}

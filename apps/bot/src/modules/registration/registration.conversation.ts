// ==================== apps/bot/src/modules/registration/registration.conversation.ts ====================

import { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { Keyboard, InlineKeyboard } from 'grammy';
import { ValidationUtils, EMOJI } from '@cargoexpress/shared';
import { logger } from '../../core/logger';

export async function registrationConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    // Cleanup function
    const cleanup = async () => {
      if (ctx.session.messageIds) {
        for (const msgId of ctx.session.messageIds) {
          try {
            await ctx.api.deleteMessage(ctx.chat!.id, msgId);
          } catch {}
        }
        ctx.session.messageIds = [];
      }
    };
    
    // Start registration
    const welcomeMsg = await ctx.reply(
      `${EMOJI.FIRE} <b>Добро пожаловать в CargoExpress!</b>\n\n` +
      `Я помогу вам зарегистрироваться в системе.\n` +
      `Это займет всего 2-3 минуты.\n\n` +
      `Давайте начнем! ${EMOJI.SUCCESS}`
    );
    
    ctx.session.messageIds = [welcomeMsg.message_id];
    ctx.session.registrationData = {};
    
    // Step 1: Full Name
    const nameMsg = await ctx.reply(
      `${EMOJI.PROFILE} <b>Шаг 1/5: Ваше имя</b>\n\n` +
      `Введите ваше полное имя (Имя Фамилия):`
    );
    ctx.session.messageIds!.push(nameMsg.message_id);

    const nameCtx = await conversation.wait();
    const fullName = nameCtx.message?.text || '';
    
    // Validate name
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length < 2) {
      const errorMsg = await ctx.reply(
        `${EMOJI.ERROR} Пожалуйста, введите имя и фамилию через пробел.\n` +
        `Например: Иван Иванов`
      );
      ctx.session.messageIds!.push(errorMsg.message_id);
      return registrationConversation(conversation, ctx);
    }
    
    ctx.session.registrationData.fullName = fullName;
    ctx.session.registrationData.firstName = nameParts[0];
    ctx.session.registrationData.lastName = nameParts.slice(1).join(' ');
    
    await cleanup();
    
    // Step 2: Phone Number
    const phoneKeyboard = new Keyboard()
      .requestContact(`${EMOJI.PHONE} Поделиться номером`)
      .resized()
      .oneTime();
    
    const phoneMsg = await ctx.reply(
      `${EMOJI.PHONE} <b>Шаг 2/5: Номер телефона</b>\n\n` +
      `Нажмите кнопку ниже, чтобы поделиться номером телефона,\n` +
      `или введите его вручную в формате: +7XXXXXXXXXX`,
      { reply_markup: phoneKeyboard }
    );
    ctx.session.messageIds = [phoneMsg.message_id];
    
    const phoneCtx = await conversation.wait();
    let phone: string;
    
    if (phoneCtx.message?.contact) {
      phone = phoneCtx.message.contact.phone_number;
      if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }
    } else if (phoneCtx.message?.text) {
      phone = phoneCtx.message.text.replace(/[\s\-\(\)]/g, '');
      if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }
      
      if (!ValidationUtils.isValidPhone(phone)) {
        const errorMsg = await ctx.reply(
          `${EMOJI.ERROR} Неверный формат номера телефона.\n` +
          `Пожалуйста, введите номер в формате: +7XXXXXXXXXX`
        );
        ctx.session.messageIds!.push(errorMsg.message_id);
        return registrationConversation(conversation, ctx);
      }
    } else {
      return registrationConversation(conversation, ctx);
    }
    
    ctx.session.registrationData.phone = phone;
    await cleanup();
    
    // Step 3: Email
    const emailMsg = await ctx.reply(
      `${EMOJI.EMAIL} <b>Шаг 3/5: Email</b>\n\n` +
      `Введите ваш email для получения уведомлений:`,
      { reply_markup: { remove_keyboard: true } }
    );
    ctx.session.messageIds = [emailMsg.message_id];

    const emailCtx = await conversation.wait();
    const email = emailCtx.message?.text || '';
    
    if (!ValidationUtils.isValidEmail(email)) {
      const errorMsg = await ctx.reply(
        `${EMOJI.ERROR} Неверный формат email.\n` +
        `Пожалуйста, введите корректный email адрес.`
      );
      ctx.session.messageIds!.push(errorMsg.message_id);
      return registrationConversation(conversation, ctx);
    }
    
    ctx.session.registrationData.email = email;
    await cleanup();
    
    // Step 4: City
    const cityMsg = await ctx.reply(
      `${EMOJI.LOCATION} <b>Шаг 4/5: Город</b>\n\n` +
      `Введите название вашего города:`
    );
    ctx.session.messageIds = [cityMsg.message_id];

    const cityInputCtx = await conversation.wait();
    const cityName = cityInputCtx.message?.text || '';

    if (cityName.length < 2) {
      const errorMsg = await ctx.reply(
        `${EMOJI.ERROR} Название города слишком короткое.\n` +
        `Пожалуйста, введите корректное название города.`
      );
      ctx.session.messageIds!.push(errorMsg.message_id);
      return registrationConversation(conversation, ctx);
    }

    ctx.session.registrationData.cityId = 1; // Temporary ID
    ctx.session.registrationData.cityName = cityName;
    await cleanup();
    
    // Step 5: Address
    const addressMsg = await ctx.reply(
      `${EMOJI.LOCATION} <b>Шаг 5/5: Адрес доставки</b>\n\n` +
      `Введите полный адрес доставки в ${cityName}:\n\n` +
      `<i>Например: ул. Ленина, д. 10, кв. 25</i>`
    );
    ctx.session.messageIds = [addressMsg.message_id];

    const addressCtx = await conversation.wait();
    const address = addressCtx.message?.text || '';
    
    if (address.length < 10) {
      const errorMsg = await ctx.reply(
        `${EMOJI.ERROR} Адрес слишком короткий.\n` +
        `Пожалуйста, введите полный адрес с улицей и номером дома.`
      );
      ctx.session.messageIds!.push(errorMsg.message_id);
      return registrationConversation(conversation, ctx);
    }
    
    ctx.session.registrationData.address = address;
    await cleanup();
    
    // Optional: Referral Code
    const refKeyboard = new InlineKeyboard()
      .text('У меня есть код', 'ref_yes')
      .text('Пропустить', 'ref_no');
    
    const refMsg = await ctx.reply(
      `${EMOJI.STAR} <b>Бонус!</b>\n\n` +
      `У вас есть реферальный код?\n` +
      `Введите его и получите бонусы на первый заказ!`,
      { reply_markup: refKeyboard }
    );
    
    const refCtx = await conversation.waitForCallbackQuery(/^ref_/);
    await refCtx.answerCallbackQuery();
    
    if (refCtx.callbackQuery.data === 'ref_yes') {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        refMsg.message_id,
        `${EMOJI.STAR} Введите реферальный код:`,
        { parse_mode: 'HTML' }
      );

      const refCodeCtx = await conversation.wait();
      const refCode = refCodeCtx.message?.text || '';
      ctx.session.registrationData.referralCode = refCode.toUpperCase();
    }
    
    await ctx.api.deleteMessage(ctx.chat!.id, refMsg.message_id);
    
    // Confirmation
    const confirmKeyboard = new InlineKeyboard()
      .text(`${EMOJI.SUCCESS} Все верно`, 'confirm_yes')
      .text(`${EMOJI.EDIT} Изменить`, 'confirm_edit');
    
    const confirmMsg = await ctx.reply(
      `<b>Проверьте ваши данные:</b>\n\n` +
      `${EMOJI.PROFILE} <b>Имя:</b> ${ctx.session.registrationData.fullName}\n` +
      `${EMOJI.PHONE} <b>Телефон:</b> ${ctx.session.registrationData.phone}\n` +
      `${EMOJI.EMAIL} <b>Email:</b> ${ctx.session.registrationData.email}\n` +
      `${EMOJI.LOCATION} <b>Город:</b> ${cityName}\n` +
      `${EMOJI.LOCATION} <b>Адрес:</b> ${ctx.session.registrationData.address}\n` +
      (ctx.session.registrationData.referralCode ? 
        `${EMOJI.STAR} <b>Реф. код:</b> ${ctx.session.registrationData.referralCode}\n` : '') +
      `\n<b>Все верно?</b>`,
      { reply_markup: confirmKeyboard }
    );
    
    const confirmCtx = await conversation.waitForCallbackQuery(/^confirm_/);
    await confirmCtx.answerCallbackQuery();
    
    if (confirmCtx.callbackQuery.data === 'confirm_edit') {
      await ctx.api.deleteMessage(ctx.chat!.id, confirmMsg.message_id);
      return registrationConversation(conversation, ctx);
    }
    
    // Save to database
    await ctx.api.editMessageText(
      ctx.chat!.id,
      confirmMsg.message_id,
      `${EMOJI.LOADING} Сохраняю данные...`,
      { parse_mode: 'HTML' }
    );
    
    try {
      const userData = {
        telegramId: ctx.from!.id,
        username: ctx.from!.username,
        firstName: ctx.session.registrationData.firstName!,
        lastName: ctx.session.registrationData.lastName,
        phone: ctx.session.registrationData.phone!,
        email: ctx.session.registrationData.email!,
        cityId: ctx.session.registrationData.cityId!,
        address: ctx.session.registrationData.address!,
        referralCode: ctx.session.registrationData.referralCode
      };
      
      const user = await apiClient.registerUser(userData);
      
      // Save user ID to session
      ctx.session.userId = user.id;
      ctx.session.isRegistered = true;
      
      // Success message
      await ctx.api.deleteMessage(ctx.chat!.id, confirmMsg.message_id);
      
      const mainKeyboard = new InlineKeyboard()
        .text(`${EMOJI.SHIPPING} Отправить посылку`, 'shipping').row()
        .text(`${EMOJI.PURCHASE} Заказать товар`, 'purchase').row()
        .text(`${EMOJI.PROFILE} Мой профиль`, 'profile')
        .text(`${EMOJI.CALCULATOR} Калькулятор`, 'calculator').row()
        .text(`${EMOJI.SUPPORT} Поддержка`, 'support')
        .text(`${EMOJI.INFO} Помощь`, 'help');
      
      await ctx.reply(
        `${EMOJI.SUCCESS} <b>Отлично! Регистрация завершена!</b>\n\n` +
        `🆔 <b>Ваш ID:</b> <code>${user.id}</code>\n` +
        `${EMOJI.STAR} <b>Реферальный код:</b> <code>${user.referralCode}</code>\n\n` +
        
        `<b>Что важно знать:</b>\n` +
        `• Используйте ID <code>${user.id}</code> при отправке посылок\n` +
        `• Делитесь реферальным кодом с друзьями\n` +
        `• Получайте бонусы за каждого приглашенного\n\n` +
        
        `<b>Наши услуги:</b>\n` +
        `${EMOJI.SHIPPING} <b>Доставка посылок</b> - из США, Китая, Турции и др.\n` +
        `${EMOJI.PURCHASE} <b>Выкуп товаров</b> - покупаем за вас с любых сайтов\n` +
        `${EMOJI.CALCULATOR} <b>Калькулятор</b> - рассчитайте стоимость доставки\n\n` +
        
        `<b>Выберите, что вас интересует:</b>`,
        { reply_markup: mainKeyboard }
      );
      
      // Clean up registration data
      ctx.session.registrationData = undefined;
      
      logger.info(`User registered: ${user.id} (${ctx.from!.id})`);
      
    } catch (error) {
      logger.error('Registration error:', error);
      
      await ctx.api.editMessageText(
        ctx.chat!.id,
        confirmMsg.message_id,
        `${EMOJI.ERROR} <b>Ошибка регистрации</b>\n\n` +
        `Произошла ошибка при сохранении данных.\n` +
        `Пожалуйста, попробуйте позже или обратитесь в поддержку.\n\n` +
        `/support - написать в поддержку`,
        { parse_mode: 'HTML' }
      );
    }
    
  } catch (error) {
    logger.error('Registration conversation error:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Произошла ошибка.\n` +
      `Пожалуйста, начните регистрацию заново: /start`
    );
  }
}

// ==================== apps/bot/src/conversations/settings.conversation.ts ====================

import { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../core/types';
import { apiClient } from '../core/api/client';
import { InlineKeyboard } from 'grammy';
import { EMOJI, ValidationUtils } from '@cargoexpress/shared';
import { logger } from '../core/logger';

export async function settingsConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  try {
    const settingsKeyboard = new InlineKeyboard()
      .text('🌐 Язык', 'settings_language').row()
      .text('🔔 Уведомления', 'settings_notifications').row()
      .text('📧 Изменить email', 'settings_email').row()
      .text('📱 Изменить телефон', 'settings_phone').row()
      .text('🗑 Удалить аккаунт', 'settings_delete').row()
      .text('❌ Закрыть', 'close');
    
    const settingsMsg = await ctx.reply(
      `${EMOJI.SETTINGS} <b>Настройки</b>\n\n` +
      `Выберите, что хотите изменить:`,
      { reply_markup: settingsKeyboard }
    );
    
    const settingCtx = await conversation.waitForCallbackQuery(/^settings_|close/);
    await settingCtx.answerCallbackQuery();
    
    if (settingCtx.callbackQuery.data === 'close') {
      await ctx.api.deleteMessage(ctx.chat!.id, settingsMsg.message_id);
      return;
    }
    
    const setting = settingCtx.callbackQuery.data.replace('settings_', '');
    
    switch (setting) {
      case 'language':
        await changeLanguage(conversation, ctx);
        break;
      case 'notifications':
        await changeNotifications(conversation, ctx);
        break;
      case 'email':
        await changeEmail(conversation, ctx);
        break;
      case 'phone':
        await changePhone(conversation, ctx);
        break;
      case 'delete':
        await deleteAccount(conversation, ctx);
        break;
    }
    
  } catch (error) {
    logger.error('Settings conversation error:', error);
    await ctx.reply(`${EMOJI.ERROR} Ошибка в настройках.`);
  }
}

async function changeLanguage(conversation: Conversation<MyContext>, ctx: MyContext) {
  const langKeyboard = new InlineKeyboard()
    .text('🇷🇺 Русский', 'lang_ru')
    .text('🇬🇧 English', 'lang_en').row()
    .text('🇨🇳 中文', 'lang_zh')
    .text('🇹🇷 Türkçe', 'lang_tr').row()
    .text('❌ Отмена', 'cancel');
  
  await ctx.reply(
    '🌐 Выберите язык интерфейса:',
    { reply_markup: langKeyboard }
  );
  
  const langCtx = await conversation.waitForCallbackQuery(/^lang_|cancel/);
  await langCtx.answerCallbackQuery();
  
  if (langCtx.callbackQuery.data === 'cancel') {
    await ctx.reply('Изменение языка отменено');
    return;
  }
  
  const language = langCtx.callbackQuery.data.replace('lang_', '');
  
  await apiClient.updateUser(ctx.session.userId!, { language });
  ctx.session.language = language;
  
  await ctx.reply(`✅ Язык изменен на ${language}`);
}

async function changeNotifications(conversation: Conversation<MyContext>, ctx: MyContext) {
  const notifKeyboard = new InlineKeyboard()
    .text('✅ Все уведомления', 'notif_all').row()
    .text('📦 Только заказы', 'notif_orders').row()
    .text('💰 Только платежи', 'notif_payments').row()
    .text('🔕 Отключить все', 'notif_none').row()
    .text('❌ Отмена', 'cancel');
  
  await ctx.reply(
    '🔔 Настройка уведомлений:',
    { reply_markup: notifKeyboard }
  );
  
  const notifCtx = await conversation.waitForCallbackQuery(/^notif_|cancel/);
  await notifCtx.answerCallbackQuery();
  
  if (notifCtx.callbackQuery.data === 'cancel') {
    return;
  }
  
  const notifType = notifCtx.callbackQuery.data.replace('notif_', '');
  
  // Save notification preferences
  await apiClient.updateUserSettings(ctx.session.userId!, {
    notifications: notifType
  });
  
  await ctx.reply('✅ Настройки уведомлений обновлены');
}

async function changeEmail(conversation: Conversation<MyContext>, ctx: MyContext) {
  await ctx.reply('📧 Введите новый email:');

  const emailCtx = await conversation.wait();
  const email = emailCtx.message?.text || '';

  if (!ValidationUtils.isValidEmail(email)) {
    await ctx.reply(`${EMOJI.ERROR} Неверный формат email`);
    return;
  }

  await apiClient.updateUser(ctx.session.userId!, { email });

  await ctx.reply(`✅ Email изменен на ${email}`);
}

async function changePhone(conversation: Conversation<MyContext>, ctx: MyContext) {
  await ctx.reply('📱 Введите новый номер телефона:');

  const phoneCtx = await conversation.wait();
  const phone = phoneCtx.message?.text || '';

  if (!ValidationUtils.isValidPhone(phone)) {
    await ctx.reply(`${EMOJI.ERROR} Неверный формат телефона`);
    return;
  }

  await apiClient.updateUser(ctx.session.userId!, { phone });

  await ctx.reply(`✅ Телефон изменен на ${phone}`);
}

async function deleteAccount(conversation: Conversation<MyContext>, ctx: MyContext) {
  const confirmKeyboard = new InlineKeyboard()
    .text('⚠️ Да, удалить', 'confirm_delete')
    .text('❌ Отмена', 'cancel');
  
  await ctx.reply(
    `⚠️ <b>ВНИМАНИЕ!</b>\n\n` +
    `Вы действительно хотите удалить свой аккаунт?\n` +
    `Это действие необратимо!\n\n` +
    `Будут удалены:\n` +
    `• Все ваши данные\n` +
    `• История заказов\n` +
    `• Баланс и бонусы`,
    { reply_markup: confirmKeyboard }
  );
  
  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm_delete|cancel/);
  await confirmCtx.answerCallbackQuery();
  
  if (confirmCtx.callbackQuery.data === 'cancel') {
    await ctx.reply('Удаление аккаунта отменено');
    return;
  }
  
  // Final confirmation
  await ctx.reply('Для подтверждения введите: УДАЛИТЬ');

  const confirmationCtx = await conversation.wait();
  const confirmation = confirmationCtx.message?.text || '';

  if (confirmation !== 'УДАЛИТЬ') {
    await ctx.reply('Удаление отменено');
    return;
  }
  
  // Delete account
  await apiClient.deleteUser(ctx.session.userId!);
  
  // Clear session
  ctx.session = {};
  
  await ctx.reply(
    'Ваш аккаунт удален.\n' +
    'Спасибо, что были с нами.'
  );
}


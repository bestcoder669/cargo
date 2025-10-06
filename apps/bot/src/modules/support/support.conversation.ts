// ==================== apps/bot/src/modules/support/support.conversation.ts ====================

import { MyContext, MyConversation } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { wsClient } from '../../core/websocket/client';
import { Keyboard, InlineKeyboard } from 'grammy';
import { EMOJI, SocketEvents } from '@cargoexpress/shared';
import { logger } from '../../core/logger';

export async function supportConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  try {
    // Check for existing open chat
    const chats = await apiClient.getUserSupportChats(ctx.session.userId!);
    const openChat = chats.find(c => c.status !== 'CLOSED');
    
    if (openChat) {
      // Continue existing chat
      await continueSupportChat(conversation, ctx, openChat);
    } else {
      // Start new chat
      await startNewSupportChat(conversation, ctx);
    }
    
  } catch (error) {
    logger.error('Support conversation error:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Не удалось открыть чат поддержки.\n` +
      `Попробуйте позже.`
    );
  }
}

async function startNewSupportChat(
  conversation: MyConversation,
  ctx: MyContext
) {
  const topicsKeyboard = new InlineKeyboard()
    .text('📦 Проблема с заказом', 'topic_order').row()
    .text('💳 Вопросы по оплате', 'topic_payment').row()
    .text('🚚 Доставка и тарифы', 'topic_shipping').row()
    .text('💬 Другой вопрос', 'topic_other').row()
    .text('❌ Отмена', 'cancel');
  
  const topicMsg = await ctx.reply(
    `${EMOJI.SUPPORT} <b>Служба поддержки</b>\n\n` +
    `Выберите тему обращения:`,
    { reply_markup: topicsKeyboard }
  );
  
  const topicCtx = await conversation.waitForCallbackQuery(/^(topic_|cancel)/);
  await topicCtx.answerCallbackQuery();
  
  if (topicCtx.callbackQuery.data === 'cancel') {
    await ctx.api.deleteMessage(ctx.chat!.id, topicMsg.message_id);
    await ctx.reply('Обращение отменено');
    return;
  }
  
  const topic = topicCtx.callbackQuery.data.replace('topic_', '');
  const topicNames = {
    order: 'Проблема с заказом',
    payment: 'Вопросы по оплате',
    shipping: 'Доставка и тарифы',
    other: 'Другой вопрос'
  };
  
  await ctx.api.editMessageText(
    ctx.chat!.id,
    topicMsg.message_id,
    `${EMOJI.SUPPORT} <b>Тема: ${topicNames[topic]}</b>\n\n` +
    `Опишите вашу проблему подробно.\n` +
    `Можете прикрепить фото или документы.`,
    { parse_mode: 'HTML' }
  );
  
  // Wait for message
  const messageCtx = await conversation.wait();
  
  let messageText = '';
  let attachments = [];
  
  if (messageCtx.message?.text) {
    messageText = messageCtx.message.text;
  } else if (messageCtx.message?.photo) {
    const photo = messageCtx.message.photo[messageCtx.message.photo.length - 1];
    attachments.push({
      type: 'photo',
      fileId: photo.file_id
    });
    messageText = messageCtx.message.caption || 'Фото';
  } else if (messageCtx.message?.document) {
    attachments.push({
      type: 'document',
      fileId: messageCtx.message.document.file_id,
      name: messageCtx.message.document.file_name
    });
    messageText = messageCtx.message.caption || 'Документ';
  }
  
  // Create support chat
  const chat = await apiClient.createSupportChat(
    ctx.session.userId!,
    messageText,
    topicNames[topic]
  );
  
  // Send via WebSocket to admin panel
  wsClient.emit(SocketEvents.SUPPORT_NEW_MESSAGE, {
    chatId: chat.id,
    userId: ctx.session.userId,
    message: messageText,
    attachments
  });
  
  const exitKeyboard = new Keyboard()
    .text('❌ Завершить чат')
    .resized();
  
  await ctx.reply(
    `${EMOJI.SUCCESS} <b>Чат создан!</b>\n\n` +
    `Номер обращения: #${chat.id}\n` +
    `Оператор ответит в ближайшее время.\n\n` +
    `Вы можете продолжать писать сообщения.`,
    { reply_markup: exitKeyboard }
  );
  
  // Continue chat
  await continueSupportChat(conversation, ctx, chat);
}

async function continueSupportChat(
  conversation: MyConversation,
  ctx: MyContext,
  chat: any
) {
  await ctx.reply(
    `${EMOJI.SUPPORT} <b>Чат поддержки #${chat.id}</b>\n\n` +
    `Статус: ${chat.status === 'WAITING' ? '⏳ Ожидает ответа' : '💬 В работе'}\n` +
    `Оператор ${chat.status === 'IN_PROGRESS' ? 'подключен' : 'скоро ответит'}\n\n` +
    `Отправьте сообщение или нажмите "Завершить чат":`
  );
  
  // Listen for WebSocket events
  const handleAdminReply = (data: any) => {
    if (data.chatId === chat.id) {
      ctx.reply(
        `${EMOJI.SUPPORT} <b>Оператор:</b>\n${data.message}`
      );
    }
  };
  
  wsClient.on('support:admin_reply', handleAdminReply);
  
  // Chat loop
  while (true) {
    const msgCtx = await conversation.wait();
    
    if (msgCtx.message?.text === '❌ Завершить чат') {
      // Close chat
      await ctx.reply(
        'Вы уверены, что хотите завершить чат?',
        {
          reply_markup: new InlineKeyboard()
            .text('✅ Да, завершить', 'confirm_close')
            .text('❌ Нет, продолжить', 'cancel_close')
        }
      );
      
      const closeCtx = await conversation.waitForCallbackQuery(/^(confirm|cancel)_close/);
      await closeCtx.answerCallbackQuery();
      
      if (closeCtx.callbackQuery.data === 'confirm_close') {
        wsClient.emit('support:chat_closed', { chatId: chat.id });
        wsClient.off('support:admin_reply', handleAdminReply);
        
        await ctx.reply(
          `${EMOJI.SUCCESS} Чат завершен.\n` +
          `Спасибо за обращение!\n\n` +
          `Оцените качество поддержки:`,
          {
            reply_markup: new InlineKeyboard()
              .text('⭐', 'rate_1')
              .text('⭐⭐', 'rate_2')
              .text('⭐⭐⭐', 'rate_3')
              .text('⭐⭐⭐⭐', 'rate_4')
              .text('⭐⭐⭐⭐⭐', 'rate_5'),
            ...{ remove_keyboard: true }
          }
        );
        
        const rateCtx = await conversation.waitForCallbackQuery(/^rate_/);
        const rating = parseInt(rateCtx.callbackQuery.data.replace('rate_', ''));
        await rateCtx.answerCallbackQuery('Спасибо за оценку!');
        
        // Save rating
        await apiClient.rateSupportChat(chat.id, rating);
        
        break;
      }
    } else if (msgCtx.message?.text) {
      // Send message to support
      await apiClient.sendSupportMessage(chat.id, msgCtx.message.text);
      
      // Send via WebSocket
      wsClient.emit(SocketEvents.SUPPORT_NEW_MESSAGE, {
        chatId: chat.id,
        userId: ctx.session.userId,
        message: msgCtx.message.text,
        fromUser: true
      });
      
      await ctx.reply('✅ Сообщение отправлено');
    } else if (msgCtx.message?.photo || msgCtx.message?.document) {
      // Handle attachments
      const attachments = [];
      
      if (msgCtx.message.photo) {
        const photo = msgCtx.message.photo[msgCtx.message.photo.length - 1];
        attachments.push({
          type: 'photo',
          fileId: photo.file_id
        });
      } else if (msgCtx.message.document) {
        attachments.push({
          type: 'document',
          fileId: msgCtx.message.document.file_id,
          name: msgCtx.message.document.file_name
        });
      }
      
      await apiClient.sendSupportMessage(
        chat.id,
        msgCtx.message.caption || 'Вложение',
        attachments
      );
      
      await ctx.reply('✅ Файл отправлен');
    }
  }
  
  wsClient.off('support:admin_reply', handleAdminReply);
}


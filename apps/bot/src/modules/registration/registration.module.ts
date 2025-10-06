// ==================== apps/bot/src/modules/registration/registration.module.ts ====================

import { Bot } from 'grammy';
import { MyContext } from '../../core/types';
import { createConversation } from '@grammyjs/conversations';
import { registrationConversation } from './registration.conversation';
import { checkRegistration } from './registration.middleware';

export function registerRegistrationModule(bot: Bot<MyContext>) {
  // Register conversation
  bot.use(createConversation(registrationConversation, 'registration'));

  // Middleware to check registration
  bot.use(checkRegistration);
}
// ==================== apps/bot/src/modules/registration/registration.module.ts ====================

import { Bot } from 'grammy';
import { MyContext } from '../../core/types';
import { registrationConversation } from './registration.conversation';
import { checkRegistration } from './registration.middleware';

export function registerRegistrationModule(bot: Bot<MyContext>) {
  // Register conversation
  bot.use(registrationConversation);
  
  // Middleware to check registration
  bot.use(checkRegistration);
}
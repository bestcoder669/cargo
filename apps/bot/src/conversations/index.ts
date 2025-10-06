// ==================== apps/bot/src/conversations/index.ts ====================

import { Bot } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import { MyContext } from '../core/types';
import { registrationConversation } from '../modules/registration/registration.conversation';
import { shippingConversation } from '../modules/shipping/shipping.conversation';
import { purchaseConversation } from '../modules/purchase/purchase.conversation';
import { supportConversation } from '../modules/support/support.conversation';
import { calculatorConversation } from './calculator.conversation';
import { settingsConversation } from './settings.conversation';
import {
  addAddressConversation,
  editAddressConversation,
  depositConversation,
  editNameConversation,
  editPhoneConversation,
  editEmailConversation,
  editCityConversation
} from '../modules/profile/profile.conversation';

export function registerConversations(bot: Bot<MyContext>) {
  // User conversations
  bot.use(createConversation(registrationConversation, 'registration'));
  bot.use(createConversation(shippingConversation, 'shipping'));
  bot.use(createConversation(purchaseConversation, 'purchase'));
  bot.use(createConversation(supportConversation, 'support'));
  bot.use(createConversation(calculatorConversation, 'calculator'));
  bot.use(createConversation(settingsConversation, 'settings'));

  // Profile conversations
  bot.use(createConversation(addAddressConversation, 'addAddress'));
  bot.use(createConversation(editAddressConversation, 'editAddress'));
  bot.use(createConversation(depositConversation, 'deposit'));
  bot.use(createConversation(editNameConversation, 'editName'));
  bot.use(createConversation(editPhoneConversation, 'editPhone'));
  bot.use(createConversation(editEmailConversation, 'editEmail'));
  bot.use(createConversation(editCityConversation, 'editCity'));
}

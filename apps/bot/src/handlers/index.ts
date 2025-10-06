// ==================== apps/bot/src/handlers/index.ts ====================

import { Bot } from 'grammy';
import { MyContext } from '../core/types';
import { handleCallbackQueries } from './callback.handler';
import { handleMessages } from './message.handler';
import { handleInlineQueries } from './inline.handler';

export function registerHandlers(bot: Bot<MyContext>) {
  // Callback queries
  handleCallbackQueries(bot);
  
  // Text messages
  handleMessages(bot);
  
  // Inline queries
  handleInlineQueries(bot);
}


// ==================== apps/bot/src/commands/index.ts ====================

import { Bot } from 'grammy';
import { MyContext } from '../core/types';
import { handleStart } from './start.command';
import { handleHelp } from './help.command';
import { handleProfile } from '../modules/profile/profile.handler';
import { handleMyOrders } from '../modules/profile/profile.handler';
import { handleAdminCommand } from '../modules/admin/admin.handler';

export function registerCommands(bot: Bot<MyContext>) {
  // Basic commands
  bot.command('start', handleStart);
  bot.command('help', handleHelp);
  
  // User commands
  bot.command('profile', handleProfile);
  bot.command('orders', handleMyOrders);
  bot.command('shipping', (ctx) => ctx.conversation.enter('shipping'));
  bot.command('purchase', (ctx) => ctx.conversation.enter('purchase'));
  bot.command('support', (ctx) => ctx.conversation.enter('support'));
  bot.command('calculator', (ctx) => ctx.conversation.enter('calculator'));
  bot.command('settings', (ctx) => ctx.conversation.enter('settings'));
  
  // Admin command
  bot.command('admin', handleAdminCommand);
}


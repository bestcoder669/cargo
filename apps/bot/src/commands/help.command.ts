// ==================== apps/bot/src/commands/help.command.ts ====================

import { CommandContext } from 'grammy';
import { MyContext } from '../core/types';
import { InlineKeyboard } from 'grammy';
import { EMOJI } from '@cargoexpress/shared';

export async function handleHelp(ctx: CommandContext<MyContext>) {
  const helpKeyboard = new InlineKeyboard()
    .text('📖 Как отправить посылку', 'help_shipping').row()
    .text('🛍 Как заказать товар', 'help_purchase').row()
    .text('💰 Способы оплаты', 'help_payment').row()
    .text('📦 Отслеживание заказов', 'help_tracking').row()
    .text('🚚 Тарифы и сроки', 'help_tariffs').row()
    .text('❓ FAQ', 'help_faq').row()
    .text('💬 Связаться с поддержкой', 'support');
  
  await ctx.reply(
    `${EMOJI.INFO} <b>Справка CargoExpress</b>\n\n` +
    
    `<b>Основные команды:</b>\n` +
    `/start - Главное меню\n` +
    `/profile - Ваш профиль\n` +
    `/orders - Ваши заказы\n` +
    `/shipping - Отправить посылку\n` +
    `/purchase - Заказать товар\n` +
    `/calculator - Рассчитать стоимость\n` +
    `/support - Поддержка\n` +
    `/settings - Настройки\n\n` +
    
    `<b>Выберите раздел справки:</b>`,
    { reply_markup: helpKeyboard }
  );
}


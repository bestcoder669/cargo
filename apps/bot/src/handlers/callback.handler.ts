// ==================== apps/bot/src/handlers/callback.handler.ts ====================

import { Bot, InlineKeyboard } from 'grammy';
import { MyContext } from '../core/types';
import {
  handleProfile,
  handleMyOrders,
  handleOrderDetails,
  handleMyAddresses,
  handleBalance,
  handleMyStats,
  handleReferral,
  handleSettings,
  handleTransactions,
  handleUseBonus
} from '../modules/profile/profile.handler';
import { handleAdminToken, handleAdminStats } from '../modules/admin/admin.handler';
import { EMOJI } from '@cargoexpress/shared';
import { logger } from '../core/logger';
import { apiClient } from '../core/api/client';

export function handleCallbackQueries(bot: Bot<MyContext>) {
  // Navigation
  bot.callbackQuery('main_menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleStart(ctx);
  });
  
  bot.callbackQuery('back', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage();
  });
  
  // Registration
  bot.callbackQuery('start_registration', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('registration');
  });
  
  bot.callbackQuery('about_service', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showAboutService(ctx);
  });
  
  // Main actions
  bot.callbackQuery('shipping', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('shipping');
  });
  
  bot.callbackQuery('purchase', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('purchase');
  });
  
  bot.callbackQuery('calculator', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('calculator');
  });
  
  bot.callbackQuery('support', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('support');
  });
  
  // Profile
  bot.callbackQuery('profile', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleProfile(ctx);
  });
  
  bot.callbackQuery('my_orders', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMyOrders(ctx);
  });
  
  bot.callbackQuery('my_addresses', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMyAddresses(ctx);
  });
  
  bot.callbackQuery('my_balance', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleBalance(ctx);
  });

  bot.callbackQuery('my_stats', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMyStats(ctx);
  });

  bot.callbackQuery('referral', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleReferral(ctx);
  });

  bot.callbackQuery('settings', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleSettings(ctx);
  });

  bot.callbackQuery('transactions', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleTransactions(ctx);
  });

  bot.callbackQuery('use_bonus', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleUseBonus(ctx);
  });

  bot.callbackQuery('add_address', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('addAddress');
  });

  bot.callbackQuery(/^edit_address_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.tempData = { addressId: parseInt(ctx.match[1]) };
    await ctx.conversation.enter('editAddress');
  });

  bot.callbackQuery('deposit', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('deposit');
  });

  // Referral actions
  bot.callbackQuery('share_referral', async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await apiClient.getUserProfile(ctx.session.userId!);
    const botUsername = (await ctx.api.getMe()).username;
    const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

    await ctx.reply(
      `📤 <b>Поделитесь вашей реферальной ссылкой:</b>\n\n` +
      `${referralLink}\n\n` +
      `Скопируйте и отправьте друзьям!`,
      {
        reply_markup: new InlineKeyboard()
          .url('📤 Поделиться в Telegram', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Присоединяйся к CargoExpress! Получи 500₽ бонусов на первый заказ 🎁')}`)
          .row()
          .text('⬅️ Назад', 'referral')
      }
    );
  });

  bot.callbackQuery('my_referrals', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      const user = await apiClient.getUserProfile(ctx.session.userId!);
      // Mock referrals data
      const referrals = [
        { firstName: 'Иван', ordersCount: 3, earnings: 450 },
        { firstName: 'Мария', ordersCount: 1, earnings: 150 },
      ];

      let message = `👥 <b>Мои рефералы</b>\n\n`;

      if (referrals.length === 0) {
        message += `У вас пока нет рефералов.\n\nПригласите друзей и получайте 5% с их заказов!`;
      } else {
        message += `<b>Всего рефералов:</b> ${referrals.length}\n\n`;
        referrals.forEach((ref, index) => {
          message += `${index + 1}. ${ref.firstName}\n`;
          message += `   Заказов: ${ref.ordersCount} | Заработано: ${ref.earnings}₽\n\n`;
        });
      }

      await ctx.reply(message, {
        reply_markup: new InlineKeyboard().text('⬅️ Назад', 'referral')
      });
    } catch (error) {
      await ctx.reply('❌ Не удалось загрузить список рефералов');
    }
  });

  // Settings actions
  bot.callbackQuery('edit_name', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('editName');
  });

  bot.callbackQuery('edit_phone', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('editPhone');
  });

  bot.callbackQuery('edit_email', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('editEmail');
  });

  bot.callbackQuery('edit_city', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('editCity');
  });

  bot.callbackQuery('notifications_settings', async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await apiClient.getUserProfile(ctx.session.userId!);
    const notificationsEnabled = user.settings?.notifications !== false;

    const keyboard = new InlineKeyboard()
      .text(notificationsEnabled ? '🔕 Выключить' : '🔔 Включить', 'toggle_notifications')
      .row()
      .text('⬅️ Назад', 'settings');

    await ctx.reply(
      `🔔 <b>Настройки уведомлений</b>\n\n` +
      `Статус: ${notificationsEnabled ? '✅ Включены' : '❌ Выключены'}\n\n` +
      `<b>Вы будете получать уведомления о:</b>\n` +
      `• Изменении статуса заказа\n` +
      `• Поступлении посылки на склад\n` +
      `• Новых сообщениях в поддержке\n` +
      `• Акциях и специальных предложениях`,
      { reply_markup: keyboard }
    );
  });

  bot.callbackQuery('toggle_notifications', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const user = await apiClient.getUserProfile(ctx.session.userId!);
      const newValue = !(user.settings?.notifications !== false);

      await apiClient.updateUserSettings(ctx.session.userId!, {
        notifications: newValue
      });

      await ctx.reply(
        `✅ Уведомления ${newValue ? 'включены' : 'выключены'}`,
        { reply_markup: new InlineKeyboard().text('⬅️ Назад', 'notifications_settings') }
      );
    } catch (error) {
      logger.error('Toggle notifications error:', error);
      await ctx.reply('❌ Не удалось изменить настройки уведомлений');
    }
  });

  bot.callbackQuery('language_settings', async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text('🇷🇺 Русский ✅', 'lang_ru')
      .text('🇬🇧 English', 'lang_en').row()
      .text('⬅️ Назад', 'settings');

    await ctx.reply(
      `🌐 <b>Выбор языка</b>\n\n` +
      `Выберите язык интерфейса:`,
      { reply_markup: keyboard }
    );
  });

  bot.callbackQuery('currency_settings', async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text('₽ RUB (Рубль) ✅', 'currency_rub')
      .text('$ USD (Доллар)', 'currency_usd').row()
      .text('€ EUR (Евро)', 'currency_eur')
      .text('₸ KZT (Тенге)', 'currency_kzt').row()
      .text('⬅️ Назад', 'settings');

    await ctx.reply(
      `💱 <b>Выбор валюты</b>\n\n` +
      `Выберите валюту для отображения цен:`,
      { reply_markup: keyboard }
    );
  });

  bot.callbackQuery('delete_account', async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text('✅ Да, удалить', 'confirm_delete_account')
      .text('❌ Отмена', 'settings');

    await ctx.reply(
      `⚠️ <b>Удаление аккаунта</b>\n\n` +
      `Вы уверены, что хотите удалить свой аккаунт?\n\n` +
      `<b>Это действие необратимо!</b>\n\n` +
      `Будут удалены:\n` +
      `• Все ваши данные\n` +
      `• История заказов\n` +
      `• Баланс и бонусы\n` +
      `• Сохраненные адреса`,
      { reply_markup: keyboard }
    );
  });

  bot.callbackQuery('confirm_delete_account', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await apiClient.deleteUser(ctx.session.userId!);
      await ctx.reply(
        `✅ <b>Аккаунт удален</b>\n\n` +
        `Ваш аккаунт был успешно удален.\n` +
        `Надеемся увидеть вас снова!`
      );
      ctx.session = { messageIds: [] };
    } catch (error) {
      await ctx.reply('❌ Не удалось удалить аккаунт. Обратитесь в поддержку.');
    }
  });

  // Address actions
  bot.callbackQuery(/^delete_addr_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const addressId = parseInt(ctx.match[1]);
    try {
      await apiClient.deleteAddress(addressId);
      await ctx.reply('✅ Адрес удален', {
        reply_markup: new InlineKeyboard().text('📍 Мои адреса', 'my_addresses')
      });
    } catch (error) {
      await ctx.reply('❌ Не удалось удалить адрес');
    }
  });

  bot.callbackQuery(/^set_default_addr_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const addressId = parseInt(ctx.match[1]);
    try {
      await apiClient.updateAddress(addressId, { isDefault: true });
      await ctx.reply('✅ Адрес установлен как основной', {
        reply_markup: new InlineKeyboard().text('📍 Мои адреса', 'my_addresses')
      });
    } catch (error) {
      await ctx.reply('❌ Не удалось изменить адрес');
    }
  });

  // Order details
  bot.callbackQuery(/^order_details_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const orderId = parseInt(ctx.match[1]);
    await handleOrderDetails(ctx, orderId);
  });
  
  // Payment
  bot.callbackQuery(/^pay_(card|crypto|balance)_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const method = ctx.match[1];
    const orderId = parseInt(ctx.match[2]);
    await handlePayment(ctx, orderId, method);
  });
  
  // Admin
  bot.callbackQuery('admin_token', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAdminToken(ctx);
  });
  
  bot.callbackQuery('admin_stats', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAdminStats(ctx);
  });
  
  // Help sections
  bot.callbackQuery(/^help_/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const section = ctx.callbackQuery.data.replace('help_', '');
    await showHelpSection(ctx, section);
  });
  
  // Default handler
  bot.on('callback_query', async (ctx) => {
    await ctx.answerCallbackQuery('Функция в разработке');
    logger.warn(`Unhandled callback query: ${ctx.callbackQuery.data}`);
  });
}

async function showAboutService(ctx: MyContext) {
  await ctx.reply(
    `${EMOJI.INFO} <b>О сервисе CargoExpress</b>\n\n` +
    
    `<b>Кто мы?</b>\n` +
    `CargoExpress - международная компания по доставке товаров с 2019 года.\n` +
    `У нас собственные склады в 7 странах и партнерская сеть по всему миру.\n\n` +
    
    `<b>Наши склады:</b>\n` +
    `🇺🇸 США (Делавэр, Нью-Джерси)\n` +
    `🇨🇳 Китай (Гуанчжоу, Иу)\n` +
    `🇹🇷 Турция (Стамбул)\n` +
    `🇬🇧 Великобритания (Лондон)\n` +
    `🇩🇪 Германия (Берлин)\n` +
    `🇯🇵 Япония (Токио)\n` +
    `🇰🇷 Южная Корея (Сеул)\n\n` +
    
    `<b>Статистика:</b>\n` +
    `• Более 50,000 довольных клиентов\n` +
    `• Более 200,000 доставленных посылок\n` +
    `• 99.2% посылок доставлены вовремя\n` +
    `• Средний рейтинг 4.8/5.0\n\n` +
    
    `<b>Гарантии:</b>\n` +
    `✅ Страхование всех посылок\n` +
    `✅ Возврат денег при утере\n` +
    `✅ Фото посылки на складе\n` +
    `✅ Отслеживание на всех этапах\n` +
    `✅ Поддержка 24/7`
  );
}

async function showHelpSection(ctx: MyContext, section: string) {
  const helpTexts = {
    shipping: `${EMOJI.SHIPPING} <b>Как отправить посылку</b>\n\n` +
      `1. Нажмите "Отправить посылку" или /shipping\n` +
      `2. Выберите страну отправления\n` +
      `3. Выберите склад\n` +
      `4. Укажите вес и размеры\n` +
      `5. Укажите стоимость содержимого\n` +
      `6. Оплатите заказ\n\n` +
      `<b>При отправке на склад укажите:</b>\n` +
      `• CargoExpress\n` +
      `• Ваш ID клиента\n` +
      `• Трек-номер заказа`,
    
    purchase: `${EMOJI.PURCHASE} <b>Как заказать товар</b>\n\n` +
      `1. Нажмите "Заказать товар" или /purchase\n` +
      `2. Выберите способ:\n` +
      `   • По ссылке - вставьте ссылку на товар\n` +
      `   • Из каталога - выберите из нашего каталога\n` +
      `3. Укажите детали (размер, цвет, количество)\n` +
      `4. Оплатите заказ\n\n` +
      `Мы купим товар в течение 24 часов после оплаты.`,
    
    payment: `${EMOJI.BALANCE} <b>Способы оплаты</b>\n\n` +
      `💳 <b>Банковская карта</b>\n` +
      `Visa, MasterCard, МИР\n` +
      `Комиссия: 0%\n\n` +
      `🪙 <b>Криптовалюта</b>\n` +
      `BTC, ETH, USDT\n` +
      `Комиссия: 1%\n\n` +
      `💰 <b>Баланс аккаунта</b>\n` +
      `Пополните баланс заранее\n` +
      `Бонус: +2% при пополнении`,
    
    tracking: `${EMOJI.PACKAGE} <b>Отслеживание заказов</b>\n\n` +
      `• /orders - все ваши заказы\n` +
      `• Нажмите на заказ для деталей\n` +
      `• Используйте трек-номер для отслеживания\n` +
      `• Получайте уведомления об изменении статуса\n\n` +
      `<b>Статусы заказов:</b>\n` +
      `⏳ Ожидает оплаты\n` +
      `✅ Оплачен\n` +
      `📦 Принят на складе\n` +
      `✈️ Отправлен\n` +
      `🚚 В пути\n` +
      `📬 Готов к выдаче\n` +
      `✅ Доставлен`,
    
    tariffs: `${EMOJI.CALCULATOR} <b>Тарифы и сроки</b>\n\n` +
      `🇺🇸 <b>США:</b> от $8/кг, 10-15 дней\n` +
      `🇨🇳 <b>Китай:</b> от $6/кг, 15-20 дней\n` +
      `🇹🇷 <b>Турция:</b> от $7/кг, 7-10 дней\n` +
      `🇬🇧 <b>UK:</b> от $9/кг, 10-14 дней\n` +
      `🇩🇪 <b>Германия:</b> от $8/кг, 8-12 дней\n\n` +
      `<b>Дополнительные услуги:</b>\n` +
      `📦 Переупаковка: $3\n` +
      `📸 Фото товара: $2\n` +
      `🔒 Страхование: 2% от стоимости`,
    
    faq: `${EMOJI.INFO} <b>Часто задаваемые вопросы</b>\n\n` +
      `<b>❓ Как узнать мой ID?</b>\n` +
      `Ваш ID показан в профиле (/profile)\n\n` +
      `<b>❓ Сколько стоит доставка?</b>\n` +
      `Используйте /calculator для расчета\n\n` +
      `<b>❓ Как долго хранится посылка?</b>\n` +
      `Бесплатно 30 дней, далее $1/день\n\n` +
      `<b>❓ Можно ли объединить посылки?</b>\n` +
      `Да, услуга консолидации - $5\n\n` +
      `<b>❓ Есть ли ограничения?</b>\n` +
      `Макс. вес: 30 кг, макс. размер: 120 см`
  };
  
  await ctx.reply(helpTexts[section] || 'Раздел справки не найден');
}


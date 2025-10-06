// ==================== apps/bot/src/services/keyboard-builder.service.ts ====================

import { InlineKeyboard } from 'grammy';
import { apiClient } from '../core/api/client';
import { EMOJI, ArrayUtils } from '@cargoexpress/shared';

export class KeyboardBuilder {
  async buildMainMenu(isRegistered: boolean = false): Promise<InlineKeyboard> {
    const keyboard = new InlineKeyboard();
    
    if (isRegistered) {
      keyboard
        .text(`${EMOJI.SHIPPING} Отправить посылку`, 'shipping').row()
        .text(`${EMOJI.PURCHASE} Заказать товар`, 'purchase').row()
        .text(`${EMOJI.CALCULATOR} Калькулятор`, 'calculator')
        .text(`${EMOJI.SUPPORT} Поддержка`, 'support').row()
        .text(`${EMOJI.PROFILE} Профиль`, 'profile')
        .text(`${EMOJI.PACKAGE} Заказы`, 'my_orders');
    } else {
      keyboard
        .text(`${EMOJI.SUCCESS} Зарегистрироваться`, 'start_registration').row()
        .text(`${EMOJI.INFO} О сервисе`, 'about_service')
        .text(`${EMOJI.SUPPORT} Поддержка`, 'support');
    }
    
    return keyboard;
  }
  
  async buildCountriesKeyboard(
    type: 'shipping' | 'purchase' = 'shipping'
  ): Promise<InlineKeyboard> {
    const countries = await apiClient.getCountries(true);
    const filteredCountries = countries.filter(c => 
      type === 'shipping' ? c.shippingAvailable : c.purchaseAvailable
    );
    
    const keyboard = new InlineKeyboard();
    
    // Sort by popularity and add to keyboard
    filteredCountries
      .sort((a, b) => b.popularityScore - a.popularityScore || a.sortOrder - b.sortOrder)
      .slice(0, 10)
      .forEach((country, index) => {
        const text = `${country.flagEmoji} ${country.name}`;
        keyboard.text(text, `${type}_country_${country.id}`);
        
        if ((index + 1) % 2 === 0) {
          keyboard.row();
        }
      });
    
    keyboard.row();
    keyboard.text(`${EMOJI.BACK} Назад`, 'back');
    
    return keyboard;
  }
  
  async buildWarehousesKeyboard(countryId: number): Promise<InlineKeyboard> {
    const warehouses = await apiClient.getWarehouses(countryId);
    const keyboard = new InlineKeyboard();
    
    if (warehouses.length === 0) {
      keyboard.text('🚫 Нет доступных складов', 'no_warehouses');
    } else {
      warehouses.forEach(warehouse => {
        const minTariff = warehouse.tariffs?.length > 0
          ? Math.min(...warehouse.tariffs.map(t => t.pricePerKg))
          : 0;
        
        const text = `${warehouse.name} (от ${minTariff}₽/кг)`;
        keyboard.text(text, `warehouse_${warehouse.id}`).row();
      });
    }
    
    keyboard.text(`${EMOJI.CALCULATOR} Калькулятор`, 'calculator');
    keyboard.text(`${EMOJI.BACK} Назад`, 'back');
    
    return keyboard;
  }
  
  async buildCitiesKeyboard(
    countryCode: string = 'RU',
    popular: boolean = true
  ): Promise<InlineKeyboard> {
    const cities = await apiClient.getCities(countryCode, popular);
    const keyboard = new InlineKeyboard();
    
    // Group cities by 3 columns
    const citiesChunks = ArrayUtils.chunk(cities.slice(0, 12), 3);
    
    citiesChunks.forEach(chunk => {
      chunk.forEach(city => {
        keyboard.text(city.name, `city_${city.id}`);
      });
      keyboard.row();
    });
    
    keyboard.text(`${EMOJI.SEARCH} Другой город`, 'city_search');
    keyboard.text(`${EMOJI.BACK} Назад`, 'back');
    
    return keyboard;
  }
  
  async buildProductCategoriesKeyboard(countryId?: number): Promise<InlineKeyboard> {
    const categories = await apiClient.getProductCategories(countryId);
    const keyboard = new InlineKeyboard();
    
    categories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(category => {
        const text = `${category.icon} ${category.name}`;
        keyboard.text(text, `category_${category.id}`).row();
      });
    
    keyboard.text(`${EMOJI.BACK} Назад`, 'back');
    
    return keyboard;
  }
  
  buildPaymentKeyboard(orderId: number): InlineKeyboard {
    return new InlineKeyboard()
      .text('💳 Банковская карта', `pay_card_${orderId}`)
      .text('🪙 Криптовалюта', `pay_crypto_${orderId}`).row()
      .text('💰 С баланса', `pay_balance_${orderId}`).row()
      .text(`${EMOJI.BACK} Отмена`, 'cancel_payment');
  }
  
  buildConfirmKeyboard(action: string): InlineKeyboard {
    return new InlineKeyboard()
      .text(`${EMOJI.SUCCESS} Подтвердить`, `confirm_${action}`)
      .text(`${EMOJI.CLOSE} Отменить`, `cancel_${action}`);
  }
  
  buildPaginationKeyboard(
    page: number,
    totalPages: number,
    prefix: string
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    
    if (page > 1) {
      keyboard.text('⬅️', `${prefix}_page_${page - 1}`);
    }
    
    keyboard.text(`${page}/${totalPages}`, 'current_page');
    
    if (page < totalPages) {
      keyboard.text('➡️', `${prefix}_page_${page + 1}`);
    }
    
    return keyboard;
  }
}

export const keyboardBuilder = new KeyboardBuilder();
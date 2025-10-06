// ==================== apps/bot/src/core/middleware/i18n.middleware.ts ====================

import { NextFunction } from 'grammy';
import { MyContext } from '../types';

const translations = {
  ru: {
    welcome: 'Добро пожаловать',
    help: 'Помощь',
    profile: 'Профиль',
    orders: 'Заказы',
    support: 'Поддержка',
    error: 'Произошла ошибка'
  },
  en: {
    welcome: 'Welcome',
    help: 'Help',
    profile: 'Profile',
    orders: 'Orders',
    support: 'Support',
    error: 'An error occurred'
  },
  zh: {
    welcome: '欢迎',
    help: '帮助',
    profile: '个人资料',
    orders: '订单',
    support: '支持',
    error: '发生错误'
  }
};

export async function i18nMiddleware(ctx: MyContext, next: NextFunction) {
  const language = ctx.session.language || 'ru';
  
  ctx.i18n = {
    t: (key: string): string => {
      return translations[language]?.[key] || translations.ru[key] || key;
    },
    language
  };
  
  return next();
}


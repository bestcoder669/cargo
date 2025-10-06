// ==================== apps/bot/src/core/types.ts ====================

import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';
import { I18nFlavor } from '@grammyjs/i18n';
import { ParseModeFlavor } from '@grammyjs/parse-mode';
import { HydrateFlavor } from '@grammyjs/hydrate';

export interface SessionData {
  userId?: number;
  isRegistered?: boolean;
  step?: string;
  scene?: string;
  registrationData?: Partial<RegistrationData>;
  shippingData?: Partial<ShippingData>;
  purchaseData?: Partial<PurchaseData>;
  currentOrder?: any;
  tempData?: Record<string, any>;
  language?: string;
  lastActivity?: number;
  messageIds?: number[]; // For cleanup
}

export interface RegistrationData {
  fullName: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email: string;
  cityId: number;
  cityName?: string;
  address: string;
  postalCode?: string;
  referralCode?: string;
}

export interface ShippingData {
  countryId: number;
  warehouseId: number;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  declaredValue: number;
  description: string;
  externalTrackNumber?: string;
  addressId: number;
  shippingTariffId: number;
  estimatedCost?: number;
}

export interface PurchaseData {
  type: 'link' | 'catalog';
  productUrl?: string;
  productId?: number;
  productName?: string;
  productQuantity: number;
  productSize?: string;
  productColor?: string;
  productNote?: string;
  purchaseCost: number;
  countryId: number;
  warehouseId: number;
  addressId: number;
}

export type MyContext = Context & 
  SessionFlavor<SessionData> & 
  ConversationFlavor &
  I18nFlavor &
  ParseModeFlavor<Context> &
  HydrateFlavor<Context> & {
    user?: any; // User from database
    isAdmin?: boolean;
    adminRole?: string;
  };

export type MyConversation = ConversationFlavor['conversation'];


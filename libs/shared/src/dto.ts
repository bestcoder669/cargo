// ==================== libs/shared/src/dto.ts ====================

// User DTOs
export interface CreateUserDto {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email: string;
  cityId: number;
  address: string;
  postalCode?: string;
  language?: string;
  referralCode?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  cityId?: number;
  language?: string;
}

// Order DTOs
export interface CreateOrderDto {
  userId?: number;
  type: OrderType;
  warehouseId?: number;
  addressId?: number;
  weight?: number;
  declaredValue?: number;
  description?: string;
  customerNote?: string;
  
  // For PURCHASE type
  productUrl?: string;
  productName?: string;
  productQuantity?: number;
  productSize?: string;
  productColor?: string;
  productNote?: string;
  purchaseCost?: number;
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  weight?: number;
  volumeWeight?: number;
  length?: number;
  width?: number;
  height?: number;
  declaredValue?: number;
  shippingCost?: number;
  adminNote?: string;
  externalTrackNumber?: string;
}

// Scanner DTOs
export interface StartScannerSessionDto {
  adminId: number;
  targetStatus: OrderStatus;
  confirmationMode: boolean;
  soundEnabled?: boolean;
  batchMode?: boolean;
}

export interface ScanDto {
  sessionId: string;
  trackNumber: string;
  timestamp: Date;
}

export interface ConfirmScanDto {
  sessionId: string;
  trackNumber: string;
  confirmed: boolean;
}

// Payment DTOs
export interface CreatePaymentDto {
  orderId?: number;
  userId: number;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentDto {
  transactionId: string;
  externalId: string;
  status: PaymentStatus;
  processedAt: Date;
  metadata?: Record<string, any>;
}

// Support DTOs
export interface CreateSupportChatDto {
  userId: number;
  subject?: string;
  priority?: number;
  initialMessage: string;
}

export interface SendSupportMessageDto {
  chatId: number;
  text: string;
  fromUser: boolean;
  operatorId?: number;
  attachments?: Attachment[];
}

// Country & Warehouse DTOs
export interface CreateCountryDto {
  name: string;
  nameEn?: string;
  code: string;
  flagEmoji: string;
  phoneCode?: string;
  currency?: string;
  shippingAvailable?: boolean;
  purchaseAvailable?: boolean;
  purchaseCommission?: number;
}

export interface CreateWarehouseDto {
  countryId: number;
  name: string;
  code: string;
  address: string;
  city: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  workingHours?: string;
  instructions?: string;
}

// Product DTOs
export interface CreateProductDto {
  storeId?: number;
  categoryId: number;
  countryId: number;
  name: string;
  nameEn?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  price: number;
  oldPrice?: number;
  currency?: string;
  inStock?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Notification DTOs
export interface SendNotificationDto {
  userId?: number;
  userIds?: number[];
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: ('telegram' | 'email' | 'push')[];
  scheduled?: Date;
}
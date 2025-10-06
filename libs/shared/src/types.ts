// ==================== libs/shared/src/types.ts ====================

import { AdminRole, OrderStatus, OrderType, PaymentMethod, PaymentStatus, NotificationType } from './enums';
import { CreateOrderDto } from './dto';

export interface KeyboardData {
  buttons: Array<{
    id: number;
    text: string;
    callbackData: string;
    emoji?: string;
    badge?: string;
    row?: number;
  }>;
  columns: number;
}

export interface DynamicButton {
  id: string | number;
  text: string;
  emoji?: string;
  callbackData?: string;
  url?: string;
  requestContact?: boolean;
  requestLocation?: boolean;
  badge?: string;
  row?: number;
  column?: number;
}

export interface AdminJwtPayload {
  telegramId: number;
  role: AdminRole;
  permissions: string[];
  adminId: number;
  iat: number;
  exp: number;
}

export interface SessionData {
  telegramId: number;
  userId?: number;
  step?: string;
  scene?: string;
  registrationData?: Partial<RegistrationData>;
  currentOrder?: Partial<CreateOrderDto>;
  tempData?: Record<string, any>;
}

export interface RegistrationData {
  fullName: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email: string;
  cityId: number;
  address: string;
  postalCode?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WebSocketMessage<T = any> {
  event: string;
  data: T;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Scanner Types
export interface ScannerConfig {
  targetStatus: OrderStatus;
  confirmationMode: boolean;
  soundEnabled: boolean;
  batchMode?: boolean;
  autoCloseDelay?: number; // ms
}

export interface ScannerSession {
  id: string;
  adminId: number;
  config: ScannerConfig;
  startTime: Date;
  endTime?: Date;
  scannedItems: ScanResult[];
  status: 'active' | 'paused' | 'completed';
}

export interface ScanResult {
  trackNumber: string;
  orderId?: number;
  success: boolean;
  oldStatus?: OrderStatus;
  newStatus?: OrderStatus;
  error?: string;
  timestamp: Date;
  processingTime?: number; // ms
}

// Order Types
export interface OrderFilter {
  status?: OrderStatus | OrderStatus[];
  type?: OrderType;
  userId?: number;
  warehouseId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
  trackNumber?: string;
}

export interface OrderStatistics {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  revenue: number;
  averageDeliveryDays: number;
}

// User Types
export interface UserProfile {
  id: number;
  telegramId: number;
  firstName: string;
  lastName?: string;
  phone: string;
  email: string;
  balance: number;
  bonusBalance: number;
  referralCode: string;
  addresses: UserAddress[];
  ordersCount: number;
  totalSpent: number;
  registeredAt: Date;
}

export interface UserAddress {
  id: number;
  name: string;
  cityId: number;
  cityName: string;
  address: string;
  postalCode?: string;
  phone?: string;
  isDefault: boolean;
}

// Payment Types
export interface PaymentRequest {
  orderId: number;
  amount: number;
  currency: string;
  method: PaymentMethod;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  externalId?: string;
  status: PaymentStatus;
  error?: string;
  redirectUrl?: string;
}

// Notification Types
export interface NotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: ('telegram' | 'email' | 'push')[];
}

// Support Types
export interface SupportMessageDto {
  chatId?: number;
  userId?: number;
  text: string;
  attachments?: Attachment[];
  fromUser: boolean;
  operatorId?: number;
}

export interface Attachment {
  type: 'photo' | 'document' | 'voice' | 'video';
  fileId?: string;
  url?: string;
  name?: string;
  size?: number;
  mimeType?: string;
}




// ==================== apps/bot/src/core/api/client.ts ====================

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import type { 
  ApiResponse, 
  CreateUserDto, 
  CreateOrderDto,
  KeyboardData 
} from '@cargoexpress/shared';

class ApiClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: config.API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Token': config.BOT_TOKEN
      }
    });
    
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }
  
  // ========== Auth ==========
  
  async registerUser(data: CreateUserDto): Promise<any> {
    const response = await this.client.post<ApiResponse>('/auth/register', data);
    return response.data.data;
  }
  
  async getUserByTelegramId(telegramId: number): Promise<any> {
    const response = await this.client.get<ApiResponse>(`/users/telegram/${telegramId}`);
    return response.data.data;
  }
  
  async updateUser(userId: number, data: any): Promise<any> {
    const response = await this.client.patch<ApiResponse>(`/users/${userId}`, data);
    return response.data.data;
  }
  
  // ========== Dynamic Data ==========
  
  async getCountries(active: boolean = true): Promise<any[]> {
    const response = await this.client.get<ApiResponse>('/bot/countries', {
      params: { active }
    });
    return response.data.data || [];
  }
  
  async getCities(countryCode: string = 'RU', popular?: boolean): Promise<any[]> {
    const response = await this.client.get<ApiResponse>('/bot/cities', {
      params: { countryCode, popular }
    });
    return response.data.data || [];
  }
  
  async getWarehouses(countryId: number): Promise<any[]> {
    const response = await this.client.get<ApiResponse>(`/bot/warehouses/${countryId}`);
    return response.data.data || [];
  }
  
  async getProductCategories(countryId?: number): Promise<any[]> {
    const response = await this.client.get<ApiResponse>('/bot/products/categories', {
      params: { countryId }
    });
    return response.data.data || [];
  }
  
  async getProducts(params: {
    categoryId?: number;
    countryId?: number;
    storeId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const response = await this.client.get<ApiResponse>('/bot/products', { params });
    return response.data.data;
  }
  
  async getTariffs(warehouseId: number): Promise<any[]> {
    const response = await this.client.get<ApiResponse>(`/bot/tariffs/${warehouseId}`);
    return response.data.data || [];
  }
  
  // ========== Orders ==========
  
  async createOrder(data: CreateOrderDto): Promise<any> {
    const response = await this.client.post<ApiResponse>('/orders', data);
    return response.data.data;
  }
  
  async getUserOrders(userId: number, params?: any): Promise<any[]> {
    const response = await this.client.get<ApiResponse>(`/orders/user/${userId}`, { params });
    return response.data.data || [];
  }
  
  async getOrder(orderId: number): Promise<any> {
    const response = await this.client.get<ApiResponse>(`/orders/${orderId}`);
    return response.data.data;
  }
  
  async getOrderByTrackNumber(trackNumber: string): Promise<any> {
    const response = await this.client.get<ApiResponse>(`/orders/track/${trackNumber}`);
    return response.data.data;
  }
  
  async cancelOrder(orderId: number, reason?: string): Promise<any> {
    const response = await this.client.post<ApiResponse>(`/orders/${orderId}/cancel`, { reason });
    return response.data.data;
  }
  
  // ========== Calculator ==========
  
  async calculateShipping(params: {
    fromCountryId: number;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    declaredValue?: number;
  }): Promise<any> {
    const response = await this.client.post<ApiResponse>('/calculator/shipping', params);
    return response.data.data;
  }
  
  async calculatePurchase(params: {
    countryId: number;
    productCost: number;
    weight?: number;
    quantity?: number;
  }): Promise<any> {
    const response = await this.client.post<ApiResponse>('/calculator/purchase', params);
    return response.data.data;
  }
  
  // ========== User Profile ==========
  
  async getUserProfile(userId: number): Promise<any> {
    const response = await this.client.get<ApiResponse>(`/users/${userId}/profile`);
    return response.data.data;
  }
  
  async getUserAddresses(userId: number): Promise<any[]> {
    const response = await this.client.get<ApiResponse>(`/users/${userId}/addresses`);
    return response.data.data || [];
  }
  
  async createAddress(userId: number, data: any): Promise<any> {
    const response = await this.client.post<ApiResponse>(`/users/${userId}/addresses`, data);
    return response.data.data;
  }
  
  async updateAddress(addressId: number, data: any): Promise<any> {
    const response = await this.client.patch<ApiResponse>(`/addresses/${addressId}`, data);
    return response.data.data;
  }
  
  async deleteAddress(addressId: number): Promise<void> {
    await this.client.delete(`/addresses/${addressId}`);
  }
  
  // ========== Support ==========
  
  async createSupportChat(userId: number, message: string, subject?: string): Promise<any> {
    const response = await this.client.post<ApiResponse>('/support/chats', {
      userId,
      initialMessage: message,
      subject
    });
    return response.data.data;
  }
  
  async sendSupportMessage(chatId: number, message: string, attachments?: any[]): Promise<any> {
    const response = await this.client.post<ApiResponse>(`/support/chats/${chatId}/messages`, {
      text: message,
      fromUser: true,
      attachments
    });
    return response.data.data;
  }
  
  async getUserSupportChats(userId: number): Promise<any[]> {
    const response = await this.client.get<ApiResponse>(`/support/user/${userId}/chats`);
    return response.data.data || [];
  }
  
  async getSupportChat(chatId: number): Promise<any> {
    const response = await this.client.get<ApiResponse>(`/support/chats/${chatId}`);
    return response.data.data;
  }
  
  // ========== Payments ==========
  
  async createPayment(orderId: number, method: string): Promise<any> {
    const response = await this.client.post<ApiResponse>('/payments/create', {
      orderId,
      method
    });
    return response.data.data;
  }
  
  async getPaymentStatus(transactionId: string): Promise<any> {
    const response = await this.client.get<ApiResponse>(`/payments/${transactionId}/status`);
    return response.data.data;
  }
  
  async getUserBalance(userId: number): Promise<any> {
    const response = await this.client.get<ApiResponse>(`/users/${userId}/balance`);
    return response.data.data;
  }
  
  async depositBalance(userId: number, amount: number, method: string): Promise<any> {
    const response = await this.client.post<ApiResponse>(`/users/${userId}/deposit`, {
      amount,
      method
    });
    return response.data.data;
  }
  
  // ========== Notifications ==========
  
  async getNotifications(userId: number, unread?: boolean): Promise<any[]> {
    const response = await this.client.get<ApiResponse>(`/notifications/user/${userId}`, {
      params: { unread }
    });
    return response.data.data || [];
  }
  
  async markNotificationRead(notificationId: number): Promise<void> {
    await this.client.patch(`/notifications/${notificationId}/read`);
  }
  
  // ========== Admin ==========
  
  async generateAdminToken(telegramId: number): Promise<string> {
    const response = await this.client.post<ApiResponse>('/auth/admin/token', {
      telegramId
    });
    return response.data.data.token;
  }
  
  async getAdminStats(): Promise<any> {
    const response = await this.client.get<ApiResponse>('/admin/stats');
    return response.data.data;
  }
  
  async logAdminAction(action: any): Promise<void> {
    await this.client.post('/admin/actions', action);
  }
  
  // ========== Bot Specific ==========
  
  async getKeyboardData(type: string, params?: any): Promise<KeyboardData> {
    const response = await this.client.get<ApiResponse>(`/bot/keyboards/${type}`, { params });
    return response.data.data;
  }
  
  async reportError(error: any, context?: any): Promise<void> {
    await this.client.post('/bot/errors', {
      error: error.message || error,
      stack: error.stack,
      context
    });
  }
}

export const apiClient = new ApiClient();


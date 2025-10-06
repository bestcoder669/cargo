// ==================== libs/shared/src/utils.ts ====================

export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  }
  
  static isValidTrackNumber(trackNumber: string): boolean {
    return trackNumber.length >= 5 && trackNumber.length <= 50;
  }
  
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export class FormatUtils {
  static formatMoney(amount: number, currency: string = 'RUB'): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency
    }).format(amount);
  }
  
  static formatDate(date: Date | string, locale: string = 'ru-RU'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
  
  static formatWeight(weight: number): string {
    if (weight < 1) {
      return `${(weight * 1000).toFixed(0)} г`;
    }
    return `${weight.toFixed(2)} кг`;
  }
  
  static formatPhoneNumber(phone: string): string {
    // Format: +7 (999) 123-45-67
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{3})(\d{2})(\d{2})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
    }
    return phone;
  }
  
  static formatOrderId(id: number): string {
    return `#${id.toString().padStart(6, '0')}`;
  }
  
  static formatTrackNumber(trackNumber: string): string {
    return trackNumber.toUpperCase();
  }
}

export class CalculationUtils {
  static calculateVolumetricWeight(
    length: number,
    width: number,
    height: number,
    divider: number = CONSTANTS.VOLUMETRIC_DIVIDER
  ): number {
    return (length * width * height) / divider;
  }
  
  static calculateShippingCost(
    weight: number,
    volumeWeight: number,
    pricePerKg: number,
    processingFee: number = 0,
    customsFee: number = 0
  ): number {
    const chargeableWeight = Math.max(weight, volumeWeight);
    return (chargeableWeight * pricePerKg) + processingFee + customsFee;
  }
  
  static calculateCommission(amount: number, rate: number): number {
    return amount * (rate / 100);
  }
  
  static calculateTotalAmount(
    baseAmount: number,
    commission: number = 0,
    shipping: number = 0,
    insurance: number = 0
  ): number {
    return baseAmount + commission + shipping + insurance;
  }
}

export class CryptoUtils {
  static generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  static generateTrackNumber(prefix: string = 'CE'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}

export class ArrayUtils {
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
  
  static sortByField<T>(array: T[], field: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
      if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
      if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
}

export function getPermissionsByRole(role: AdminRole): string[] {
  return CONSTANTS.PERMISSIONS[role] || [];
}

export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes('*') || permissions.includes(required);
}

export function getStatusEmoji(status: OrderStatus): string {
  const emojis: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: '⏳',
    [OrderStatus.PAID]: '✅',
    [OrderStatus.PROCESSING]: '⚙️',
    [OrderStatus.PURCHASING]: '🛍',
    [OrderStatus.WAREHOUSE_RECEIVED]: '📦',
    [OrderStatus.PACKING]: '📦',
    [OrderStatus.SHIPPED]: '✈️',
    [OrderStatus.IN_TRANSIT]: '🚚',
    [OrderStatus.CUSTOMS_CLEARANCE]: '🏛',
    [OrderStatus.ARRIVED]: '📍',
    [OrderStatus.LOCAL_DELIVERY]: '🚚',
    [OrderStatus.READY_FOR_PICKUP]: '📬',
    [OrderStatus.DELIVERED]: '✅',
    [OrderStatus.CANCELLED]: '❌',
    [OrderStatus.REFUNDED]: '💰'
  };
  return emojis[status] || '❓';
}
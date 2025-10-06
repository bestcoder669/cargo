export declare class ValidationUtils {
    static isValidEmail(email: string): boolean;
    static isValidPhone(phone: string): boolean;
    static isValidTrackNumber(trackNumber: string): boolean;
    static isValidUrl(url: string): boolean;
}
export declare class FormatUtils {
    static formatMoney(amount: number, currency?: string): string;
    static formatDate(date: Date | string, locale?: string): string;
    static formatWeight(weight: number): string;
    static formatPhoneNumber(phone: string): string;
    static formatOrderId(id: number): string;
    static formatTrackNumber(trackNumber: string): string;
}
export declare class CalculationUtils {
    static calculateVolumetricWeight(length: number, width: number, height: number, divider?: number): number;
    static calculateShippingCost(weight: number, volumeWeight: number, pricePerKg: number, processingFee?: number, customsFee?: number): number;
    static calculateCommission(amount: number, rate: number): number;
    static calculateTotalAmount(baseAmount: number, commission?: number, shipping?: number, insurance?: number): number;
}
export declare class CryptoUtils {
    static generateReferralCode(): string;
    static generateSessionId(): string;
    static generateTrackNumber(prefix?: string): string;
}
export declare class ArrayUtils {
    static chunk<T>(array: T[], size: number): T[][];
    static groupBy<T>(array: T[], key: keyof T): Record<string, T[]>;
    static sortByField<T>(array: T[], field: keyof T, order?: 'asc' | 'desc'): T[];
}
export declare function getPermissionsByRole(role: AdminRole): string[];
export declare function hasPermission(permissions: string[], required: string): boolean;
export declare function getStatusEmoji(status: OrderStatus): string;
//# sourceMappingURL=utils.d.ts.map
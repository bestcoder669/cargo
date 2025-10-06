"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayUtils = exports.CryptoUtils = exports.CalculationUtils = exports.FormatUtils = exports.ValidationUtils = void 0;
exports.getPermissionsByRole = getPermissionsByRole;
exports.hasPermission = hasPermission;
exports.getStatusEmoji = getStatusEmoji;
class ValidationUtils {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static isValidPhone(phone) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
    }
    static isValidTrackNumber(trackNumber) {
        return trackNumber.length >= 5 && trackNumber.length <= 50;
    }
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.ValidationUtils = ValidationUtils;
class FormatUtils {
    static formatMoney(amount, currency = 'RUB') {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency
        }).format(amount);
    }
    static formatDate(date, locale = 'ru-RU') {
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }
    static formatWeight(weight) {
        if (weight < 1) {
            return `${(weight * 1000).toFixed(0)} г`;
        }
        return `${weight.toFixed(2)} кг`;
    }
    static formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{3})(\d{2})(\d{2})$/);
        if (match) {
            return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
        }
        return phone;
    }
    static formatOrderId(id) {
        return `#${id.toString().padStart(6, '0')}`;
    }
    static formatTrackNumber(trackNumber) {
        return trackNumber.toUpperCase();
    }
}
exports.FormatUtils = FormatUtils;
class CalculationUtils {
    static calculateVolumetricWeight(length, width, height, divider = CONSTANTS.VOLUMETRIC_DIVIDER) {
        return (length * width * height) / divider;
    }
    static calculateShippingCost(weight, volumeWeight, pricePerKg, processingFee = 0, customsFee = 0) {
        const chargeableWeight = Math.max(weight, volumeWeight);
        return (chargeableWeight * pricePerKg) + processingFee + customsFee;
    }
    static calculateCommission(amount, rate) {
        return amount * (rate / 100);
    }
    static calculateTotalAmount(baseAmount, commission = 0, shipping = 0, insurance = 0) {
        return baseAmount + commission + shipping + insurance;
    }
}
exports.CalculationUtils = CalculationUtils;
class CryptoUtils {
    static generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    static generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static generateTrackNumber(prefix = 'CE') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 5).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }
}
exports.CryptoUtils = CryptoUtils;
class ArrayUtils {
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = String(item[key]);
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    }
    static sortByField(array, field, order = 'asc') {
        return [...array].sort((a, b) => {
            if (a[field] < b[field])
                return order === 'asc' ? -1 : 1;
            if (a[field] > b[field])
                return order === 'asc' ? 1 : -1;
            return 0;
        });
    }
}
exports.ArrayUtils = ArrayUtils;
function getPermissionsByRole(role) {
    return CONSTANTS.PERMISSIONS[role] || [];
}
function hasPermission(permissions, required) {
    return permissions.includes('*') || permissions.includes(required);
}
function getStatusEmoji(status) {
    const emojis = {
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
//# sourceMappingURL=utils.js.map
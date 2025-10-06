"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotCommand = exports.NotificationType = exports.ChatStatus = exports.AdminRole = exports.PaymentMethod = exports.PaymentStatus = exports.OrderType = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["PROCESSING"] = "PROCESSING";
    OrderStatus["PURCHASING"] = "PURCHASING";
    OrderStatus["WAREHOUSE_RECEIVED"] = "WAREHOUSE_RECEIVED";
    OrderStatus["PACKING"] = "PACKING";
    OrderStatus["SHIPPED"] = "SHIPPED";
    OrderStatus["IN_TRANSIT"] = "IN_TRANSIT";
    OrderStatus["CUSTOMS_CLEARANCE"] = "CUSTOMS_CLEARANCE";
    OrderStatus["ARRIVED"] = "ARRIVED";
    OrderStatus["LOCAL_DELIVERY"] = "LOCAL_DELIVERY";
    OrderStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["REFUNDED"] = "REFUNDED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OrderType;
(function (OrderType) {
    OrderType["SHIPPING"] = "SHIPPING";
    OrderType["PURCHASE"] = "PURCHASE";
})(OrderType || (exports.OrderType = OrderType = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PROCESSING"] = "PROCESSING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["CANCELLED"] = "CANCELLED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["CRYPTO"] = "CRYPTO";
    PaymentMethod["SBP"] = "SBP";
    PaymentMethod["BALANCE"] = "BALANCE";
    PaymentMethod["BONUS"] = "BONUS";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    AdminRole["ORDER_MANAGER"] = "ORDER_MANAGER";
    AdminRole["SUPPORT_OPERATOR"] = "SUPPORT_OPERATOR";
    AdminRole["WAREHOUSE_OPERATOR"] = "WAREHOUSE_OPERATOR";
    AdminRole["CONTENT_MANAGER"] = "CONTENT_MANAGER";
    AdminRole["FINANCE_MANAGER"] = "FINANCE_MANAGER";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
var ChatStatus;
(function (ChatStatus) {
    ChatStatus["WAITING"] = "WAITING";
    ChatStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ChatStatus["RESOLVED"] = "RESOLVED";
    ChatStatus["CLOSED"] = "CLOSED";
})(ChatStatus || (exports.ChatStatus = ChatStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER_STATUS"] = "ORDER_STATUS";
    NotificationType["PAYMENT"] = "PAYMENT";
    NotificationType["PROMOTION"] = "PROMOTION";
    NotificationType["SYSTEM"] = "SYSTEM";
    NotificationType["SUPPORT"] = "SUPPORT";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var BotCommand;
(function (BotCommand) {
    BotCommand["START"] = "start";
    BotCommand["HELP"] = "help";
    BotCommand["PROFILE"] = "profile";
    BotCommand["ORDERS"] = "orders";
    BotCommand["SUPPORT"] = "support";
    BotCommand["SETTINGS"] = "settings";
    BotCommand["ADMIN"] = "admin";
})(BotCommand || (exports.BotCommand = BotCommand = {}));
//# sourceMappingURL=enums.js.map
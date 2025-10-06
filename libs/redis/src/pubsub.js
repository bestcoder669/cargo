"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sub = exports.pub = void 0;
const client_1 = require("./client");
exports.pub = client_1.redis.duplicate();
exports.sub = client_1.redis.duplicate();
Promise.all([exports.pub.connect(), exports.sub.connect()]).catch(console.error);
//# sourceMappingURL=pubsub.js.map
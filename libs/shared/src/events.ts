// ==================== libs/shared/src/events.ts ====================

export enum SocketEvents {
  // Connection
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  
  // Auth
  AUTH_SUCCESS = 'auth:success',
  AUTH_ERROR = 'auth:error',
  
  // Orders
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_STATUS_CHANGED = 'order:status_changed',
  ORDER_PAID = 'order:paid',
  ORDER_CANCELLED = 'order:cancelled',
  
  // Scanner
  SCANNER_SESSION_START = 'scanner:session_start',
  SCANNER_SESSION_STARTED = 'scanner:session_started',
  SCANNER_SESSION_END = 'scanner:session_end',
  SCANNER_SESSION_ENDED = 'scanner:session_ended',
  SCANNER_SCAN = 'scanner:scan',
  SCANNER_SCAN_RESULT = 'scanner:scan_result',
  SCANNER_CONFIRM_REQUIRED = 'scanner:confirm_required',
  SCANNER_CONFIRM = 'scanner:confirm',
  SCANNER_PLAY_SOUND = 'scanner:play_sound',
  SCANNER_ERROR = 'scanner:error',
  
  // Support
  SUPPORT_NEW_MESSAGE = 'support:new_message',
  SUPPORT_MESSAGE_READ = 'support:message_read',
  SUPPORT_CHAT_ASSIGNED = 'support:chat_assigned',
  SUPPORT_CHAT_CLOSED = 'support:chat_closed',
  SUPPORT_TYPING = 'support:typing',
  
  // Admin
  ADMIN_CONNECTED = 'admin:connected',
  ADMIN_ACTION = 'admin:action',
  
  // Bot
  BOT_STATUS_UPDATE = 'bot:status_update',
  BOT_USER_ACTION = 'bot:user_action',
  
  // Notifications
  NOTIFICATION_SENT = 'notification:sent',
  NOTIFICATION_READ = 'notification:read',
  
  // Real-time updates
  DATA_UPDATE = 'data:update',
  STATS_UPDATE = 'stats:update',
  
  // Broadcast
  BROADCAST_MESSAGE = 'broadcast:message',
  BROADCAST_NOTIFICATION = 'broadcast:notification'
}

export enum RedisChannels {
  BOT_UPDATES = 'bot:updates',
  ORDER_UPDATES = 'order:updates',
  SCANNER_UPDATES = 'scanner:updates',
  SUPPORT_UPDATES = 'support:updates',
  NOTIFICATION_QUEUE = 'notification:queue',
  CACHE_INVALIDATION = 'cache:invalidation'
}




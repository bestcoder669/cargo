// ==================== apps/api/src/modules/scanner/scanner.service.ts ====================

import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { 
  ScannerSession,
  ScanResult,
  OrderStatus,
  StartScannerSessionDto,
  ScanDto,
  ConfirmScanDto
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';
import { notificationService } from '../notifications/notification.service';

class ScannerService {
  private sessions = new Map<string, ScannerSession>();
  
  async startSession(data: StartScannerSessionDto): Promise<ScannerSession> {
    const sessionId = this.generateSessionId();
    
    const session: ScannerSession = {
      id: sessionId,
      adminId: data.adminId,
      config: {
        targetStatus: data.targetStatus,
        confirmationMode: data.confirmationMode,
        soundEnabled: data.soundEnabled ?? true,
        batchMode: data.batchMode ?? false
      },
      startTime: new Date(),
      scannedItems: [],
      status: 'active'
    };
    
    // Store in memory
    this.sessions.set(sessionId, session);
    
    // Store in Redis with TTL
    await redis.setex(
      `scanner:session:${sessionId}`,
      3600, // 1 hour TTL
      JSON.stringify(session)
    );
    
    // Create DB record
    await prisma.scannerSession.create({
      data: {
        id: sessionId,
        adminId: data.adminId,
        targetStatus: data.targetStatus,
        confirmationMode: data.confirmationMode,
        soundEnabled: data.soundEnabled ?? true
      }
    });
    
    logger.info(`Scanner session started: ${sessionId}`);
    
    return session;
  }
  
  async endSession(sessionId: string): Promise<ScannerSession> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    session.endTime = new Date();
    session.status = 'completed';
    
    // Calculate stats
    const successCount = session.scannedItems.filter(i => i.success).length;
    const failedCount = session.scannedItems.filter(i => !i.success).length;
    
    // Update DB
    await prisma.scannerSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        totalScanned: session.scannedItems.length,
        successfulScans: successCount,
        failedScans: failedCount
      }
    });
    
    // Remove from memory
    this.sessions.delete(sessionId);
    
    // Remove from Redis
    await redis.del(`scanner:session:${sessionId}`);
    
    logger.info(`Scanner session ended: ${sessionId}`);
    
    return session;
  }
  
  async processScan(data: ScanDto): Promise<ScanResult> {
    const session = await this.getSession(data.sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }
    
    const startTime = Date.now();
    
    try {
      // Find order by track number
      const order = await prisma.order.findUnique({
        where: { trackNumber: data.trackNumber },
        include: {
          user: true,
          warehouse: {
            include: { country: true }
          }
        }
      });
      
      if (!order) {
        const result: ScanResult = {
          trackNumber: data.trackNumber,
          success: false,
          error: 'Order not found',
          timestamp: new Date(),
          processingTime: Date.now() - startTime
        };
        
        session.scannedItems.push(result);
        await this.logScan(session.id, result);
        
        return result;
      }
      
      // Check if status can be changed
      const canChange = await this.canChangeStatus(
        order.status,
        session.config.targetStatus
      );
      
      if (!canChange) {
        const result: ScanResult = {
          trackNumber: data.trackNumber,
          orderId: order.id,
          success: false,
          error: `Cannot change status from ${order.status} to ${session.config.targetStatus}`,
          timestamp: new Date(),
          processingTime: Date.now() - startTime
        };
        
        session.scannedItems.push(result);
        await this.logScan(session.id, result);
        
        return result;
      }
      
      // If confirmation required, return order for confirmation
      if (session.config.confirmationMode) {
        const result: ScanResult = {
          trackNumber: data.trackNumber,
          orderId: order.id,
          success: false,
          error: 'Confirmation required',
          oldStatus: order.status,
          newStatus: session.config.targetStatus,
          timestamp: new Date(),
          processingTime: Date.now() - startTime
        };
        
        // Store pending confirmation
        await redis.setex(
          `scanner:confirm:${data.trackNumber}`,
          60, // 1 minute TTL
          JSON.stringify({
            sessionId: session.id,
            orderId: order.id,
            oldStatus: order.status,
            newStatus: session.config.targetStatus
          })
        );
        
        return { ...result, order };
      }
      
      // Update order status
      await this.updateOrderStatus(
        order.id,
        order.status,
        session.config.targetStatus,
        session.adminId
      );
      
      const result: ScanResult = {
        trackNumber: data.trackNumber,
        orderId: order.id,
        success: true,
        oldStatus: order.status,
        newStatus: session.config.targetStatus,
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      };
      
      session.scannedItems.push(result);
      await this.logScan(session.id, result);
      
      // Send notification to user
      await notificationService.sendOrderStatusNotification(
        order.userId,
        order.id,
        session.config.targetStatus
      );
      
      return result;
      
    } catch (error) {
      logger.error('Scan processing error:', error);
      
      const result: ScanResult = {
        trackNumber: data.trackNumber,
        success: false,
        error: error.message,
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      };
      
      session.scannedItems.push(result);
      await this.logScan(session.id, result);
      
      return result;
    }
  }
  
  async confirmScan(data: ConfirmScanDto): Promise<ScanResult> {
    const pendingData = await redis.get(`scanner:confirm:${data.trackNumber}`);
    
    if (!pendingData) {
      throw new Error('No pending confirmation found');
    }
    
    const pending = JSON.parse(pendingData);
    
    if (!data.confirmed) {
      await redis.del(`scanner:confirm:${data.trackNumber}`);
      
      return {
        trackNumber: data.trackNumber,
        orderId: pending.orderId,
        success: false,
        error: 'Scan cancelled by operator',
        timestamp: new Date()
      };
    }
    
    // Update order status
    await this.updateOrderStatus(
      pending.orderId,
      pending.oldStatus,
      pending.newStatus,
      pending.adminId
    );
    
    // Clear pending confirmation
    await redis.del(`scanner:confirm:${data.trackNumber}`);
    
    const result: ScanResult = {
      trackNumber: data.trackNumber,
      orderId: pending.orderId,
      success: true,
      oldStatus: pending.oldStatus,
      newStatus: pending.newStatus,
      timestamp: new Date()
    };
    
    const session = await this.getSession(pending.sessionId);
    if (session) {
      session.scannedItems.push(result);
    }
    
    await this.logScan(pending.sessionId, result);
    
    return result;
  }
  
  async bulkUpdateStatus(data: {
    trackNumbers: string[];
    status: OrderStatus;
    adminId: number;
    comment?: string;
  }) {
    const results = [];
    
    for (const trackNumber of data.trackNumbers) {
      try {
        const order = await prisma.order.findUnique({
          where: { trackNumber }
        });
        
        if (!order) {
          results.push({
            trackNumber,
            success: false,
            error: 'Order not found'
          });
          continue;
        }
        
        await this.updateOrderStatus(
          order.id,
          order.status,
          data.status,
          data.adminId,
          data.comment
        );
        
        results.push({
          trackNumber,
          orderId: order.id,
          success: true
        });
        
      } catch (error) {
        results.push({
          trackNumber,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  private async updateOrderStatus(
    orderId: number,
    oldStatus: OrderStatus,
    newStatus: OrderStatus,
    adminId: number,
    comment?: string
  ) {
    await prisma.$transaction(async (tx) => {
      // Update order
      await tx.order.update({
        where: { id: orderId },
        data: { 
          status: newStatus,
          ...(this.getStatusTimestamps(newStatus))
        }
      });
      
      // Create history record
      await tx.statusHistory.create({
        data: {
          orderId,
          fromStatus: oldStatus,
          toStatus: newStatus,
          changedBy: 'scanner',
          changedById: adminId,
          comment: comment || `Scanned by admin ${adminId}`
        }
      });
      
      // Log admin action
      await tx.adminAction.create({
        data: {
          adminId,
          action: 'ORDER_STATUS_CHANGED',
          entityType: 'order',
          entityId: orderId.toString(),
          details: {
            oldStatus,
            newStatus,
            method: 'scanner'
          }
        }
      });
    });
  }
  
  private getStatusTimestamps(status: OrderStatus) {
    switch (status) {
      case OrderStatus.PAID:
        return { paidAt: new Date() };
      case OrderStatus.SHIPPED:
        return { shippedAt: new Date() };
      case OrderStatus.DELIVERED:
        return { deliveredAt: new Date() };
      case OrderStatus.CANCELLED:
        return { cancelledAt: new Date() };
      default:
        return {};
    }
  }
  
  private async canChangeStatus(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus
  ): Promise<boolean> {
    // Define allowed status transitions
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.PURCHASING, OrderStatus.WAREHOUSE_RECEIVED, OrderStatus.CANCELLED],
      [OrderStatus.PURCHASING]: [OrderStatus.WAREHOUSE_RECEIVED, OrderStatus.CANCELLED],
      [OrderStatus.WAREHOUSE_RECEIVED]: [OrderStatus.PACKING, OrderStatus.SHIPPED],
      [OrderStatus.PACKING]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.IN_TRANSIT, OrderStatus.CUSTOMS_CLEARANCE],
      [OrderStatus.IN_TRANSIT]: [OrderStatus.CUSTOMS_CLEARANCE, OrderStatus.ARRIVED],
      [OrderStatus.CUSTOMS_CLEARANCE]: [OrderStatus.ARRIVED],
      [OrderStatus.ARRIVED]: [OrderStatus.LOCAL_DELIVERY, OrderStatus.READY_FOR_PICKUP],
      [OrderStatus.LOCAL_DELIVERY]: [OrderStatus.DELIVERED],
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
      [OrderStatus.REFUNDED]: []
    };
    
    return transitions[currentStatus]?.includes(targetStatus) || false;
  }
  
  private async logScan(sessionId: string, result: ScanResult) {
    await prisma.scannerLog.create({
      data: {
        sessionId,
        orderId: result.orderId,
        trackNumber: result.trackNumber,
        success: result.success,
        error: result.error,
        oldStatus: result.oldStatus,
        newStatus: result.newStatus
      }
    });
  }
  
  async getSession(sessionId: string): Promise<ScannerSession | null> {
    // Check memory first
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    
    // Check Redis
    const cached = await redis.get(`scanner:session:${sessionId}`);
    if (cached) {
      const session = JSON.parse(cached);
      this.sessions.set(sessionId, session);
      return session;
    }
    
    // Load from DB
    const dbSession = await prisma.scannerSession.findUnique({
      where: { id: sessionId },
      include: { logs: true }
    });
    
    if (!dbSession) {
      return null;
    }
    
    const session: ScannerSession = {
      id: dbSession.id,
      adminId: dbSession.adminId,
      config: {
        targetStatus: dbSession.targetStatus as OrderStatus,
        confirmationMode: dbSession.confirmationMode,
        soundEnabled: dbSession.soundEnabled
      },
      startTime: dbSession.startedAt,
      endTime: dbSession.endedAt || undefined,
      scannedItems: dbSession.logs.map(log => ({
        trackNumber: log.trackNumber,
        orderId: log.orderId || undefined,
        success: log.success,
        error: log.error || undefined,
        oldStatus: log.oldStatus as OrderStatus | undefined,
        newStatus: log.newStatus as OrderStatus | undefined,
        timestamp: log.scannedAt
      })),
      status: dbSession.endedAt ? 'completed' : 'active'
    };
    
    if (session.status === 'active') {
      this.sessions.set(sessionId, session);
    }
    
    return session;
  }
  
  async getSessions(filters: any) {
    const sessions = await prisma.scannerSession.findMany({
      where: {
        adminId: filters.adminId,
        endedAt: filters.active ? null : { not: null }
      },
      orderBy: { startedAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0,
      include: {
        _count: {
          select: { logs: true }
        }
      }
    });
    
    return sessions;
  }
  
  async getOrderByTrackNumber(trackNumber: string) {
    return prisma.order.findUnique({
      where: { trackNumber },
      include: {
        user: true,
        warehouse: {
          include: { country: true }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }
  
  private generateSessionId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const scannerService = new ScannerService();


// ==================== apps/api/src/modules/index.ts ====================

import { FastifyInstance } from 'fastify';
import { authModule } from './auth';
import { usersModule } from './users';
import { ordersModule } from './orders';
import { scannerModule } from './scanner';
import { countriesModule } from './countries';
import { productsModule } from './products';
import { paymentsModule } from './payments';
import { supportModule } from './support';
// import { notificationsModule } from './notifications';
import { adminModule } from './admin';
import { botModule } from './bot';
import { calculatorModule } from './calculator';

export async function registerModules(app: FastifyInstance) {
  // Public modules
  await app.register(authModule, { prefix: '/auth' });
  await app.register(botModule, { prefix: '/bot' });
  await app.register(calculatorModule, { prefix: '/calculator' });
  
  // Protected modules
  await app.register(usersModule, { prefix: '/users' });
  await app.register(ordersModule, { prefix: '/orders' });
  await app.register(scannerModule, { prefix: '/scanner' });
  await app.register(countriesModule, { prefix: '/countries' });
  await app.register(productsModule, { prefix: '/products' });
  await app.register(paymentsModule, { prefix: '/payments' });
  await app.register(supportModule, { prefix: '/support' });
  // await app.register(notificationsModule, { prefix: '/notifications' });
  await app.register(adminModule, { prefix: '/admin' });
}


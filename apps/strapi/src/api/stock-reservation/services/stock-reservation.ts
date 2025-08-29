/**
 * stock-reservation service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService(
  'api::stock-reservation.stock-reservation' as any
);

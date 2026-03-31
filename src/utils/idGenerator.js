/**
 * Generate a unique order ID
 * Format: ORD-TIMESTAMP-RANDOM
 */
export const generateOrderId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

/**
 * Generate a unique item ID for tracking items within an order
 */
export const generateItemId = () => {
  return `ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

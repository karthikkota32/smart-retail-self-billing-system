/**
 * Order Management Utilities
 * Handles localStorage operations for grocery pre-orders
 */

const STORAGE_KEY = 'grocery_pre_orders';

// Fallback in-memory storage if localStorage is unavailable
let inMemoryOrders = [];

/**
 * Check if localStorage is available
 */
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('localStorage is not available, using in-memory storage:', error);
    return false;
  }
};

/**
 * Get all orders from localStorage or in-memory storage
 */
export const getAllOrders = () => {
  try {
    if (isLocalStorageAvailable()) {
      const orders = localStorage.getItem(STORAGE_KEY);
      const parsed = orders ? JSON.parse(orders) : [];
      console.log('Orders retrieved from localStorage:', parsed);
      return parsed;
    } else {
      console.log('Using in-memory orders:', inMemoryOrders);
      return [...inMemoryOrders];
    }
  } catch (error) {
    console.error('Error retrieving orders:', error);
    return [...inMemoryOrders];
  }
};

/**
 * Get a single order by ID
 */
export const getOrderById = (orderId) => {
  const orders = getAllOrders();
  return orders.find((order) => order.orderId === orderId);
};

/**
 * Save a new order to localStorage and in-memory storage
 */
export const saveOrder = (order) => {
  try {
    const orders = getAllOrders();
    orders.push(order);
    
    // Save to in-memory storage
    inMemoryOrders = [...orders];
    
    // Try to save to localStorage
    if (isLocalStorageAvailable()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      console.log('Order saved to localStorage:', order);
    } else {
      console.warn('Order saved to in-memory storage only:', order);
    }
    
    return order;
  } catch (error) {
    console.error('Error saving order:', error);
    throw error;
  }
};

/**
 * Update an existing order
 */
export const updateOrder = (orderId, updates) => {
  try {
    const orders = getAllOrders();
    const index = orders.findIndex((order) => order.orderId === orderId);

    if (index === -1) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    orders[index] = { ...orders[index], ...updates };
    
    // Update in-memory storage
    inMemoryOrders = [...orders];
    
    // Try to update localStorage
    if (isLocalStorageAvailable()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
    
    console.log('Order updated:', orders[index]);
    return orders[index];
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};

/**
 * Delete an order (admin only)
 */
export const deleteOrder = (orderId) => {
  try {
    const orders = getAllOrders();
    const filteredOrders = orders.filter((order) => order.orderId !== orderId);
    
    // Update in-memory storage
    inMemoryOrders = [...filteredOrders];
    
    // Try to update localStorage
    if (isLocalStorageAvailable()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredOrders));
    }
    
    console.log('Order deleted:', orderId);
    return true;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

/**
 * Filter orders by status
 */
export const filterOrdersByStatus = (status) => {
  const orders = getAllOrders();
  if (status === 'All') return orders;
  return orders.filter((order) => order.status === status);
};

/**
 * Clear all orders (for testing/demo purposes)
 */
export const clearAllOrders = () => {
  try {
    // Clear in-memory storage
    inMemoryOrders = [];
    
    // Try to clear localStorage
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    console.log('All orders cleared');
  } catch (error) {
    console.error('Error clearing orders:', error);
  }
};

/**
 * Get order statistics
 */
export const getOrderStats = () => {
  const orders = getAllOrders();
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'Pending').length,
    processing: orders.filter((o) => o.status === 'Processing').length,
    ready: orders.filter((o) => o.status === 'Ready').length,
    completed: orders.filter((o) => o.status === 'Completed').length,
    paid: orders.filter((o) => o.isPaid).length,
  };
};

/**
 * Create a new order object
 */
export const createOrder = (orderId, items, timeSlot) => {
  return {
    orderId,
    items,
    timeSlot,
    status: 'Pending',
    totalAmount: 0,
    isPaid: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

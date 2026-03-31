/**
 * Order Management Utilities
 * Handles localStorage operations for grocery pre-orders
 */

const STORAGE_KEY = 'grocery_pre_orders';

/**
 * Get all orders from localStorage
 */
export const getAllOrders = () => {
  try {
    const orders = localStorage.getItem(STORAGE_KEY);
    return orders ? JSON.parse(orders) : [];
  } catch (error) {
    console.error('Error retrieving orders:', error);
    return [];
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
 * Save a new order to localStorage
 */
export const saveOrder = (order) => {
  try {
    const orders = getAllOrders();
    orders.push(order);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredOrders));
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
  localStorage.removeItem(STORAGE_KEY);
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

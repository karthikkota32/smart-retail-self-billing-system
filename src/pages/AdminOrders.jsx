import React from 'react';
import OrdersDashboard from '../components/GroceryPreOrder/OrdersDashboard';
import '../styles/AdminOrders.css';

/**
 * AdminOrders Page
 * Wrapper page for the admin orders dashboard
 */
const AdminOrders = () => {
  return (
    <div className="admin-orders-page">
      <div className="page-header">
        <h1>🏢 Admin Dashboard - Order Management</h1>
        <p>Manage and track all customer grocery pre-orders</p>
      </div>
      <OrdersDashboard />
    </div>
  );
};

export default AdminOrders;

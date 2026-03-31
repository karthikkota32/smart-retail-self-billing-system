import React, { useEffect, useMemo, useState } from 'react';
import OrderCard from './OrderCard';
import { getAllOrders, updateOrder, deleteOrder } from '../../utils/orderUtils.js';
import '../styles/AdminOrders.css';

const OrdersDashboard = () => {
  const [orders, setOrders] = useState(() => getAllOrders());
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [successMessage, setSuccessMessage] = useState('');

  const statusFilters = ['All', 'Pending', 'Processing', 'Ready', 'Completed'];

  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'All') return orders;
    return orders.filter((order) => order.status === selectedFilter);
  }, [orders, selectedFilter]);

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === 'Pending').length,
      processing: orders.filter((o) => o.status === 'Processing').length,
      ready: orders.filter((o) => o.status === 'Ready').length,
      completed: orders.filter((o) => o.status === 'Completed').length,
      paid: orders.filter((o) => o.isPaid).length,
    }),
    [orders]
  );

  const refreshOrders = () => {
    setOrders(getAllOrders());
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };

  const handleStatusChange = (orderId, newStatus) => {
    try {
      updateOrder(orderId, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      showSuccessMessage(`Order status updated to ${newStatus}`);
      refreshOrders();
    } catch (error) {
      alert(`Error updating order: ${error.message}`);
    }
  };

  const handlePaymentProcess = (orderId) => {
    try {
      updateOrder(orderId, {
        isPaid: true,
        status: 'Completed',
        updatedAt: new Date().toISOString(),
      });
      showSuccessMessage('Payment processed successfully');
      refreshOrders();
    } catch (error) {
      alert(`Error processing payment: ${error.message}`);
    }
  };

  const handleDeleteOrder = (orderId) => {
    try {
      deleteOrder(orderId);
      showSuccessMessage('Order deleted successfully');
      refreshOrders();
    } catch (error) {
      alert(`Error deleting order: ${error.message}`);
    }
  };

  const handleClearAllOrders = () => {
    if (
      window.confirm(
        'Are you sure you want to clear ALL orders? This cannot be undone.'
      )
    ) {
      localStorage.removeItem('grocery_pre_orders');
      refreshOrders();
      showSuccessMessage('All orders cleared');
    }
  };

  return (
    <div className="orders-dashboard-container">
      <h1>Grocery Pre-Order Management Dashboard</h1>
      <p className="subtitle">Manage all customer orders and time slots</p>

      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="dashboard-stats">
        <div className="stat-card total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card processing">
          <div className="stat-value">{stats.processing}</div>
          <div className="stat-label">Processing</div>
        </div>
        <div className="stat-card ready">
          <div className="stat-value">{stats.ready}</div>
          <div className="stat-label">Ready</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card paid">
          <div className="stat-value">{stats.paid}</div>
          <div className="stat-label">Paid</div>
        </div>
      </div>

      <div className="filter-section">
        <h3>Filter by Status</h3>
        <div className="filter-buttons">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              className={`filter-btn ${selectedFilter === filter ? 'active' : ''}`}
              onClick={() => handleFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="orders-list">
        {filteredOrders.length > 0 ? (
          <>
            <h3>
              {selectedFilter} Orders ({filteredOrders.length})
            </h3>
            <div className="orders-grid">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onPaymentProcess={handlePaymentProcess}
                  onDelete={handleDeleteOrder}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No orders found</p>
            {selectedFilter !== 'All' && <p>Try selecting a different filter</p>}
          </div>
        )}
      </div>

      <div className="admin-actions">
        <button
          className="btn btn-danger"
          onClick={handleClearAllOrders}
          disabled={orders.length === 0}
        >
          Clear All Orders (Testing Only)
        </button>
      </div>
    </div>
  );
};

export default OrdersDashboard;

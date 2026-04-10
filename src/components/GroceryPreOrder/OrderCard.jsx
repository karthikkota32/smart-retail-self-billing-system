import React from 'react';
import '../../styles/AdminOrders.css';

/**
 * OrderCard Component
 * Displays order details and allows status updates
 */
const OrderCard = ({ order, onStatusChange, onPaymentProcess, onDelete }) => {
  const statusSequence = ['Pending', 'Processing', 'Ready', 'Completed'];
  const currentStatusIndex = statusSequence.indexOf(order.status);
  const canAdvanceStatus = currentStatusIndex < statusSequence.length - 1;
  const nextStatus =
    canAdvanceStatus ? statusSequence[currentStatusIndex + 1] : null;

  /**
   * Handle status advancement
   */
  const handleNextStatus = () => {
    if (canAdvanceStatus) {
      onStatusChange(order.orderId, nextStatus);
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    const colors = {
      Pending: '#ffc107',
      Processing: '#17a2b8',
      Ready: '#28a745',
      Completed: '#6c757d',
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div className="order-card">
      {/* Order Header */}
      <div className="order-header">
        <div>
          <h3 className="order-id">{order.orderId}</h3>
          <p className="order-time">
            📅 {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="order-status-badge" style={{
          backgroundColor: getStatusColor(order.status),
        }}>
          {order.status}
        </div>
      </div>

      {/* Order Details */}
      <div className="order-details">
        <div className="detail-section">
          <h4>� Customer Details</h4>
          <div className="detail-row">
            <label>📱 Phone:</label>
            <span className="value">{order.phone || 'N/A'}</span>
          </div>
        </div>

        <div className="detail-section">
          <h4>�📦 Items ({order.items.length})</h4>
          <div className="items-list">
            {order.items.map((item, index) => (
              <div key={index} className="item-entry">
                <span className="item-number">{index + 1}.</span>
                <span className="item-name">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-row">
          <label>🕐 Time Slot:</label>
          <span className="value">{order.timeSlot}</span>
        </div>

        <div className="detail-row">
          <label>💰 Total Amount:</label>
          <span className="value">₹{Number(order.totalAmount || 0).toFixed(2)}</span>
        </div>

        <div className="detail-row">
          <label>💳 Payment Status:</label>
          <span className={`payment-status ${order.isPaid ? 'paid' : 'unpaid'}`}>
            {order.isPaid ? '✓ Paid' : '⏳ Unpaid'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="order-actions">
        {canAdvanceStatus && (
          <button
            className="btn btn-advance-status"
            onClick={handleNextStatus}
            title={`Move to ${nextStatus}`}
          >
            → {nextStatus}
          </button>
        )}

        {order.status === 'Ready' && !order.isPaid && (
          <button
            className="btn btn-payment"
            onClick={() => onPaymentProcess(order.orderId)}
          >
            💳 Process Payment
          </button>
        )}

        <button
          className="btn btn-delete"
          onClick={() => {
            if (
              window.confirm(
                `Are you sure you want to delete order ${order.orderId}?`
              )
            ) {
              onDelete(order.orderId);
            }
          }}
        >
          🗑️ Delete
        </button>
      </div>

      {/* Order Footer */}
      <div className="order-footer">
        <small>Last updated: {formatDate(order.updatedAt)}</small>
      </div>
    </div>
  );
};

export default OrderCard;

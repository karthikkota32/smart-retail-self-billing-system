import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterNavbar from '../components/MasterNavbar';
import UploadList from '../components/GroceryPreOrder/UploadList';
import TimeSlotSelector from '../components/GroceryPreOrder/TimeSlotSelector';
import {
  generateOrderId,
} from '../utils/idGenerator.js';
import {
  createOrder,
  getOrdersByPhone,
  saveOrder,
} from '../utils/orderUtils.js';
import '../styles/GroceryPreOrder.css';

/**
 * GroceryPreOrder Page
 * Main customer-facing page for creating pre-orders
 * Step 1: Upload List → Step 2: Select Time Slot → Step 3: Confirmation
 */
const GroceryPreOrder = () => {
  const navigate = useNavigate();
  const userPhone = (localStorage.getItem('userPhone') || localStorage.getItem('phone') || 'guest').trim() || 'guest';
  const [step, setStep] = useState(1); // 1: Upload, 2: Time Slot, 3: Confirmation
  const [items, setItems] = useState([]);
  const [timeSlotData, setTimeSlotData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [allOrders, setAllOrders] = useState(() => getOrdersByPhone(userPhone));

  useEffect(() => {
    const refreshOrders = () => {
      setAllOrders(getOrdersByPhone(userPhone));
    };

    refreshOrders();
    window.addEventListener('appUpdate', refreshOrders);
    return () => window.removeEventListener('appUpdate', refreshOrders);
  }, [userPhone]);

  const statusCounts = useMemo(() => {
    return allOrders.reduce(
      (acc, order) => {
        const status = String(order.status || 'Pending').toLowerCase();
        if (status === 'processing') acc.processing += 1;
        else if (status === 'ready') acc.ready += 1;
        else if (status === 'completed') acc.completed += 1;
        else acc.pending += 1;
        return acc;
      },
      { pending: 0, processing: 0, ready: 0, completed: 0 }
    );
  }, [allOrders]);

  /**
   * Handle items submission from UploadList component
   */
  const handleItemsSubmit = (uploadedItems) => {
    setItems(uploadedItems);
    setStep(2);
    window.scrollTo(0, 0);
  };

  /**
   * Handle time slot submission from TimeSlotSelector component
   */
  const handleTimeSlotSubmit = (slotData) => {
    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      try {
        const orderId = generateOrderId();
        const newOrder = createOrder(orderId, items, slotData.timeSlot, userPhone);

        console.log('Creating new order:', newOrder);
        saveOrder(newOrder);
        console.log('Order saved successfully for phone:', userPhone);

        setCreatedOrderId(orderId);

        // Update local state
        const updatedOrders = getOrdersByPhone(userPhone);
        console.log('Updated orders in state:', updatedOrders);
        setAllOrders(updatedOrders);

        setTimeSlotData(slotData);
        setStep(3);
        setIsLoading(false);
        window.scrollTo(0, 0);
      } catch (error) {
        console.error('Error creating order:', error);
        alert(`Error creating order: ${error.message}`);
        setIsLoading(false);
      }
    }, 500);
  };

  /**
   * Handle back navigation
   */
  const handleBackFromTimeSlot = () => {
    setStep(1);
    setTimeSlotData(null);
    window.scrollTo(0, 0);
  };

  /**
   * Handle creating another order
   */
  const handleCreateAnother = () => {
    setStep(1);
    setItems([]);
    setTimeSlotData(null);
    setCreatedOrderId(null);
    window.scrollTo(0, 0);
  };

  /**
   * Render confirmation page
   */
  const renderConfirmation = () => (
    <div className="confirmation-container">
      <div className="confirmation-card success">
        <div className="confirmation-icon">✓</div>
        <h2>Order Created Successfully!</h2>

        <div className="order-summary">
          <div className="summary-section">
            <h3>Order Details</h3>
            <div className="summary-row">
              <label>Order ID:</label>
              <span className="order-id-display">{createdOrderId}</span>
              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(createdOrderId);
                  alert('Order ID copied to clipboard!');
                }}
              >
                📋 Copy
              </button>
            </div>
            <div className="summary-row">
              <label>Time Slot:</label>
              <span>{timeSlotData?.timeSlotLabel}</span>
            </div>
            <div className="summary-row">
              <label>Items Count:</label>
              <span>{items.length} items</span>
            </div>
            <div className="summary-row">
              <label>Status:</label>
              <span className="status-badge">Pending</span>
            </div>
          </div>

          <div className="summary-section items-section">
            <h3>Your Items</h3>
            <div className="confirmation-items">
              {items.map((item, index) => (
                <div key={index} className="confirmation-item">
                  <span className="item-number">{index + 1}</span>
                  <span className="item-text">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section next-steps">
            <h3>Next Steps</h3>
            <ol>
              <li>Your order will be processed by our staff</li>
              <li>Status will be updated from "Pending" to "Processing"</li>
              <li>Once items are prepared, it will move to "Ready"</li>
              <li>You can then proceed with payment (via Admin Dashboard)</li>
              <li>Order will be marked as "Completed" after payment</li>
            </ol>
          </div>
        </div>

        <div className="confirmation-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              navigate('/history');
            }}
          >
            View Order History
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCreateAnother}
          >
            Create Another Order
          </button>
        </div>
      </div>

      {/* Orders Overview */}
      <div className="orders-overview">
        <h3>📊 Your Orders ({allOrders.length})</h3>
        {allOrders.length > 0 ? (
          <div className="orders-preview">
            {allOrders.slice(0, 3).map((order) => (
              <div key={order.orderId} className="preview-order">
                <div className="preview-id">{order.orderId}</div>
                <div className="preview-slot">{order.timeSlot}</div>
                <div className="preview-amount">₹{Number(order.totalAmount || 0).toFixed(2)}</div>
                <div
                  className="preview-status"
                  style={{
                    backgroundColor:
                      order.status === 'Completed'
                        ? '#28a745'
                        : order.status === 'Ready'
                          ? '#17a2b8'
                          : order.status === 'Processing'
                            ? '#ffc107'
                            : '#6c757d',
                  }}
                >
                  {order.status}
                </div>
              </div>
            ))}
            {allOrders.length > 3 && (
              <p className="preview-more">+{allOrders.length - 3} more orders</p>
            )}
          </div>
        ) : (
          <p>No orders yet</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="grocery-preorder-shell">
      <MasterNavbar />
      <div className="grocery-preorder-page">
        <div className="page-header">
          <h1>🛒 Grocery Pre-Order System</h1>
          <p>Order your groceries in advance and pick them up at your convenience</p>
        </div>

        <div className="preorder-status-board">
          <div className="preorder-status-header">
            <h2>Pre-Order Status</h2>
            <button className="status-link-btn" onClick={() => navigate('/history')}>
              Open History
            </button>
          </div>
          <div className="preorder-status-grid">
            <div className="status-card pending">
              <span className="status-label">Pending</span>
              <span className="status-value">{statusCounts.pending}</span>
            </div>
            <div className="status-card processing">
              <span className="status-label">Processing</span>
              <span className="status-value">{statusCounts.processing}</span>
            </div>
            <div className="status-card ready">
              <span className="status-label">Ready</span>
              <span className="status-value">{statusCounts.ready}</span>
            </div>
            <div className="status-card completed">
              <span className="status-label">Completed</span>
              <span className="status-value">{statusCounts.completed}</span>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Upload List</span>
          </div>
          <div className="progress-connector"></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Select Slot</span>
          </div>
          <div className="progress-connector"></div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Confirmation</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          {step === 1 && <UploadList onSubmit={handleItemsSubmit} />}
          {step === 2 && (
            <TimeSlotSelector
              items={items}
              onSubmit={handleTimeSlotSubmit}
              onBack={handleBackFromTimeSlot}
              isLoading={isLoading}
            />
          )}
          {step === 3 && renderConfirmation()}
        </div>
      </div>
    </div>
  );
};

export default GroceryPreOrder;

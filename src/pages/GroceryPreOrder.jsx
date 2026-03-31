import React, { useState } from 'react';
import UploadList from '../components/GroceryPreOrder/UploadList';
import TimeSlotSelector from '../components/GroceryPreOrder/TimeSlotSelector';
import {
  generateOrderId,
} from '../utils/idGenerator.js';
import {
  createOrder,
  saveOrder,
  getAllOrders,
} from '../utils/orderUtils.js';
import '../styles/GroceryPreOrder.css';

/**
 * GroceryPreOrder Page
 * Main customer-facing page for creating pre-orders
 * Step 1: Upload List → Step 2: Select Time Slot → Step 3: Confirmation
 */
const GroceryPreOrder = () => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Time Slot, 3: Confirmation
  const [items, setItems] = useState([]);
  const [timeSlotData, setTimeSlotData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [allOrders, setAllOrders] = useState(() => getAllOrders());

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
        const newOrder = createOrder(orderId, items, slotData.timeSlot);

        console.log('Creating new order:', newOrder);
        saveOrder(newOrder);
        console.log('Order saved successfully. All current orders:', getAllOrders());
        
        setCreatedOrderId(orderId);

        // Update local state
        const updatedOrders = getAllOrders();
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
              // Redirect to orders view or dashboard
              window.location.href = '/admin-orders';
            }}
          >
            View All Orders
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
    <div className="grocery-preorder-page">
      <div className="page-header">
        <h1>🛒 Grocery Pre-Order System</h1>
        <p>Order your groceries in advance and pick them up at your convenience</p>
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
  );
};

export default GroceryPreOrder;

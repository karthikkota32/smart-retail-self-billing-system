import React, { useState } from 'react';
import '../../styles/GroceryPreOrder.css';

/**
 * TimeSlotSelector Component
 * Allows users to select a delivery/pickup time slot
 */
const TimeSlotSelector = ({ items, onSubmit, isLoading = false, onBack }) => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState('');

  /**
   * Available time slots for the day
   * Can be customized based on business hours
   */
  const timeSlots = [
    { id: '10-12', label: '10:00 AM - 12:00 PM', icon: '🌅' },
    { id: '12-14', label: '12:00 PM - 2:00 PM', icon: '☀️' },
    { id: '14-16', label: '2:00 PM - 4:00 PM', icon: '☀️' },
    { id: '16-18', label: '4:00 PM - 6:00 PM', icon: '🌤️' },
    { id: '18-20', label: '6:00 PM - 8:00 PM', icon: '🌆' },
  ];

  /**
   * Handle slot selection
   */
  const handleSlotSelect = (slotId) => {
    setSelectedSlot(slotId);
    setError('');
  };

  /**
   * Handle submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    const selectedSlotObj = timeSlots.find((slot) => slot.id === selectedSlot);
    onSubmit({
      timeSlot: selectedSlot,
      timeSlotLabel: selectedSlotObj.label,
    });
  };

  /**
   * Format item for display
   */
  const formatItemName = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    const name = item.name || 'Item';
    const quantity = item.quantity;
    if (!quantity) return name;
    const unit = item.is_loose_item ? (item.unit_type || 'unit') : 'item';
    const unitText = item.is_loose_item ? unit : (Number(quantity) > 1 ? 'items' : 'item');
    return `${name} × ${quantity} ${unitText}`;
  };

  return (
    <div className="time-slot-selector-container">
      <h2>Select Your Delivery Time Slot</h2>
      <p className="subtitle">Choose when you'd like to pick up your order</p>

      {/* Items Summary */}
      <div className="items-summary">
        <h3>Order Summary</h3>
        <p>Items selected: <strong>{items.length}</strong></p>
        <div className="items-quick-view">
          {items.slice(0, 3).map((item, index) => (
            <span key={item?.product_id || index} className="quick-item">
              {formatItemName(item)}
            </span>
          ))}
          {items.length > 3 && (
            <span className="quick-item more">+{items.length - 3} more</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="slot-selection-form">
        {/* Time Slots Grid */}
        <div className="time-slots-grid">
          {timeSlots.map((slot) => (
            <label
              key={slot.id}
              className={`time-slot-card ${
                selectedSlot === slot.id ? 'selected' : ''
              }`}
            >
              <input
                type="radio"
                name="timeSlot"
                value={slot.id}
                checked={selectedSlot === slot.id}
                onChange={() => handleSlotSelect(slot.id)}
                hidden
              />
              <div className="slot-content">
                <span className="slot-icon">{slot.icon}</span>
                <span className="slot-label">{slot.label}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            disabled={isLoading}
          >
            ← Back
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!selectedSlot || isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm & Reserve Slot'}
          </button>
        </div>
      </form>

      {/* Time Slot Info */}
      <div className="time-slot-info">
        <p>ℹ️ All slots are subject to availability. You'll receive a confirmation once your order is processed.</p>
      </div>
    </div>
  );
};

export default TimeSlotSelector;

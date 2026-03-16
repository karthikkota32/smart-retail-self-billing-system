import React, { useEffect } from "react";
import "../styles/CartNotification.css";

function CartNotification({ message, isVisible, onClose, type = "success" }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`cart-notification ${type}`}>
      <div className="notification-content">
        <span className="notification-icon">
          {type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}
        </span>
        <span className="notification-message">{message}</span>
        <button className="notification-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

export default CartNotification;

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import MasterNavbar from "../components/MasterNavbar";
import { createOrder, validateCoupon } from "../services/api";
import CartNotification from "../components/CartNotification";
import "../styles/Payment.css";

function Payment() {
  const navigate = useNavigate();
  const userPhone = localStorage.getItem("userPhone");
  const username = localStorage.getItem("username");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");

  useEffect(() => {
    if (!userPhone) {
      navigate("/");
      return;
    }

    const cartData = JSON.parse(localStorage.getItem(`cart_${userPhone}`)) || [];
    setCart(cartData);
  }, [userPhone, navigate]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const total = subtotal - discount;

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setErrorMessage("Please enter a coupon code");
      return;
    }

    try {
      const res = await validateCoupon(couponCode, subtotal);
      if (res.ok) {
        const discountAmount = (subtotal * res.discountPercentage / 100);
        setDiscount(discountAmount);
        setAppliedCoupon({
          code: couponCode,
          percentage: res.discountPercentage,
          amount: discountAmount
        });
        setErrorMessage("");
      } else {
        setErrorMessage(res.message || "Invalid coupon code");
        setAppliedCoupon(null);
        setDiscount(0);
      }
    } catch {
      setErrorMessage("Error validating coupon");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode("");
    setErrorMessage("");
  };

  const confirmPayment = async () => {
    if (cart.length === 0) {
      setNotificationMessage("Your cart is empty");
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = {
        phone: userPhone,
        items: cart.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          unit_type: item.unit_type || "unit",
          is_loose_item: Boolean(item.is_loose_item),
          price_per_unit: Number(item.price_per_unit ?? item.price) || 0,
          product_id: item.product_id || item.id
        })),
        total: total,
        paymentMode: paymentMode
      };

      if (!username) {
        setNotificationMessage("Session expired. Please login again.");
        setNotificationType("error");
        setShowNotification(true);
        setTimeout(() => navigate("/"), 1500);
        return;
      }

      const res = await createOrder(orderData.phone, orderData.items, orderData.total, orderData.paymentMode);
      
      if (res.ok) {
        // Clear cart first
        localStorage.removeItem(`cart_${userPhone}`);
        localStorage.removeItem(`appliedCoupons_${userPhone}`);
        
        // Dispatch update event
        window.dispatchEvent(new Event("appUpdate"));
        window.dispatchEvent(new Event("stockUpdate"));
        
        // Navigate immediately without blocking alert
        navigate("/history");
      } else {
        setNotificationMessage(res.message || "Failed to create order");
        setNotificationType("error");
        setShowNotification(true);
      }
    } catch {
      setNotificationMessage("Error processing payment. Please try again.");
      setNotificationType("error");
      setShowNotification(true);
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="payment-page">
        <MasterNavbar />
        <div className="payment-header">
          <h1>💳 Secure Payment</h1>
          <p>Complete your purchase safely</p>
        </div>
        <div className="payment-container">
          <div className="empty-cart">
            <h2>Your cart is empty</h2>
            <p>Add items to your cart before proceeding to payment</p>
            <button onClick={() => navigate("/shop")} className="btn-continue-shopping">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <MasterNavbar />

      <div className="payment-header">
        <h1>💳 Secure Payment</h1>
        <p>Complete your purchase safely</p>
      </div>

      <div className="payment-container">
        <div className="payment-content">
          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="cart-items">
              {cart.map((item, idx) => (
                <div key={idx} className="cart-item">
                  <div className="item-details">
                    <p className="item-name">{item.name}</p>
                    <p className="item-qty">
                      Qty: {item.quantity || 1} {item.is_loose_item ? (item.unit_type || "unit") : ""}
                    </p>
                    {item.is_loose_item && (
                      <p className="item-qty">Rate: ₹{Number(item.price_per_unit ?? item.price).toFixed(2)}/{item.unit_type || "unit"}</p>
                    )}
                  </div>
                  <p className="item-price">₹{(item.price * (item.quantity || 1)).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="price-row discount">
                  <span>Discount ({appliedCoupon?.percentage}%):</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="price-row total">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="payment-form">
            <div className="form-section">
              <h3>Coupon Code</h3>
              {appliedCoupon ? (
                <div className="applied-coupon">
                  <p>✅ Coupon Applied: <strong>{appliedCoupon.code}</strong></p>
                  <p>Discount: ₹{appliedCoupon.amount.toFixed(2)}</p>
                  <button onClick={removeCoupon} className="btn-remove-coupon">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="coupon-input-group">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="input-coupon"
                  />
                  <button onClick={applyCoupon} className="btn-apply-coupon">
                    Apply
                  </button>
                </div>
              )}
              {errorMessage && <p className="error-message">{errorMessage}</p>}
            </div>

            <div className="form-section">
              <h3>Payment Method</h3>
              <div className="payment-methods">
                {[
                  { value: "UPI", label: "🏦 UPI (Google Pay, PhonePe)" },
                  { value: "Debit Card", label: "💳 Debit Card" },
                  { value: "Credit Card", label: "💳 Credit Card" },
                  { value: "Net Banking", label: "🏦 Net Banking" },
                  { value: "Cash on Delivery", label: "💰 Cash on Delivery" }
                ].map(method => (
                  <label key={method.value} className="payment-method-label">
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={paymentMode === method.value}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>

              <div className="selected-method-display">
                <p className="payment-mode-label">Payment Mode</p>
                <p className="payment-mode-value">{paymentMode}</p>
              </div>
            </div>

            <div className="form-actions">
              <button
                onClick={confirmPayment}
                disabled={isProcessing}
                className="btn-confirm-payment"
              >
                {isProcessing ? "⏳ Processing..." : "✅ Confirm Payment"}
              </button>

              <button
                onClick={() => navigate("/cart")}
                className="btn-back-to-cart"
              >
                ← Back to Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      <CartNotification
        message={notificationMessage}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        type={notificationType}
      />
    </div>
  );
}

export default Payment;

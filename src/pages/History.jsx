import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterNavbar from "../components/MasterNavbar";
import { getOrders } from "../services/api";
import "../styles/History.css";

function History() {
  const navigate = useNavigate();
  const userPhone = (localStorage.getItem("userPhone") || localStorage.getItem("phone") || "").trim();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    if (!userPhone) {
      navigate("/");
      return;
    }

    // Load orders from backend; fallback to localStorage for resilience.
    const loadOrders = async () => {
      try {
        const res = await getOrders(userPhone);
        if (res?.ok && Array.isArray(res.orders)) {
          setOrders(res.orders);
          localStorage.setItem(`history_${userPhone}`, JSON.stringify(res.orders));
          return;
        }

        const savedOrders = JSON.parse(localStorage.getItem(`history_${userPhone}`)) || [];
        setOrders(savedOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
        const savedOrders = JSON.parse(localStorage.getItem(`history_${userPhone}`)) || [];
        setOrders(savedOrders);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();

    // Listen for order updates from cart page
    const handleOrderUpdate = () => {
      loadOrders();
    };

    window.addEventListener("appUpdate", handleOrderUpdate);
    return () => window.removeEventListener("appUpdate", handleOrderUpdate);
  }, [userPhone, navigate]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "confirmed":
        return "status-confirmed";
      case "shipped":
        return "status-shipped";
      case "delivered":
        return "status-delivered";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-pending";
    }
  };

  if (loading) {
    return (
      <div className="history-page">
        <MasterNavbar />
        <div className="loading-message">Loading your orders...</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <MasterNavbar />

      <div className="history-header">
        <h1>📦 Purchase History</h1>
        <p>{orders.length} order{orders.length !== 1 ? "s" : ""} completed</p>
      </div>

      <div className="history-container">
        {orders.length === 0 ? (
          <div className="empty-state">
            <h2>📭 No Orders Yet</h2>
            <p>Start shopping to see your purchase history</p>
            <button
              onClick={() => navigate("/shop")}
              className="btn-start-shopping"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-info-left">
                    <h3 className="order-id">Order #{order.id}</h3>
                    <p className="order-date">
                      📅 {order.date || (order.statusUpdatedAt ? new Date(order.statusUpdatedAt).toLocaleDateString() : "N/A")}
                    </p>
                  </div>
                  <div className="order-info-right">
                    <div className="order-total">
                      <p className="total-label">Total</p>
                      <p className="total-amount">₹{(order.total || order.totalAmount || 0).toFixed(2)}</p>
                    </div>
                    <p className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status || "pending"}
                    </p>
                  </div>
                </div>

                <div className="order-details">
                  <div className="order-detail-item">
                    <span className="detail-label">Payment Mode:</span>
                    <span className="detail-value">💳 {order.mode || order.paymentMode || "N/A"}</span>
                  </div>
                  <div className="order-detail-item">
                    <span className="detail-label">Items:</span>
                    <span className="detail-value">{order.items?.length || 0} item(s)</span>
                  </div>
                  <div className="order-detail-item">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{order.phone || userPhone}</span>
                  </div>
                </div>

                <button
                  className="btn-expand"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  {expandedOrder === order.id ? "▼ Hide Items" : "▶ Show Items"}
                </button>

                {expandedOrder === order.id && order.items && (
                  <div className="order-items">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="item-row">
                        <div className="item-info">
                          <p className="item-name">{item.name || "Product"}</p>
                          <p className="item-details">
                            ₹{item.price} × {item.quantity} {item.is_loose_item ? (item.unit_type || "unit") : ""}
                          </p>
                          {item.is_loose_item && (
                            <p className="item-details">Rate: ₹{Number(item.price_per_unit ?? item.price).toFixed(2)}/{item.unit_type || "unit"}</p>
                          )}
                        </div>
                        <p className="item-subtotal">₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;

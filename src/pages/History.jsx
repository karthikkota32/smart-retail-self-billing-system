import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterNavbar from "../components/MasterNavbar";
import { getOrders } from "../services/api";
import { getOrdersByPhone } from "../utils/orderUtils";
import "../styles/History.css";

const normalizeStatus = (status) => {
  const value = String(status || "pending").toLowerCase();
  if (
    [
      "pending",
      "processing",
      "ready",
      "completed",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ].includes(value)
  ) {
    return value;
  }
  return "pending";
};

const normalizeBackendOrder = (order) => ({
  id: String(order.id),
  source: "purchase",
  date: order.date || order.createdAt || order.statusUpdatedAt || null,
  status: normalizeStatus(order.status),
  total: Number(order.total ?? order.totalAmount ?? 0),
  mode: order.mode || order.paymentMode || "N/A",
  phone: order.phone,
  items: Array.isArray(order.items) ? order.items : [],
});

const mapPreorderToHistoryOrder = (order) => {
  // Ensure totalAmount is calculated in case it was 0 from old data
  let totalAmount = Number(order.totalAmount || 0);
  if (totalAmount === 0 && Array.isArray(order.items)) {
    totalAmount = order.items.reduce((sum, item) => {
      const price = typeof item === "string" ? 0 : Number(item.price || 0);
      const qty = typeof item === "string" ? 1 : Number(item.quantity || 1);
      return sum + price * qty;
    }, 0);
  }
  return {
    id: String(order.orderId),
    source: "preorder",
    date: order.createdAt || order.updatedAt || null,
    status: normalizeStatus(order.status),
    total: totalAmount,
    mode: order.isPaid ? "Paid" : "Unpaid",
    phone: order.phone,
    items: Array.isArray(order.items)
      ? order.items.map((item) =>
          typeof item === "string" ? { name: item, quantity: 1, price: 0 } : item
        )
      : [],
    timeSlot: order.timeSlot || "",
  };
};

const toTimestamp = (dateValue) => {
  if (!dateValue) return 0;
  const ts = new Date(dateValue).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

function History() {
  const navigate = useNavigate();
  const userPhone = (
    localStorage.getItem("userPhone") || localStorage.getItem("phone") || ""
  ).trim();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    if (!userPhone) {
      navigate("/");
      return;
    }

    const loadOrders = async () => {
      try {
        const res = await getOrders(userPhone);
        const backendOrders = res?.ok && Array.isArray(res.orders) ? res.orders : [];
        const cachedOrders = JSON.parse(localStorage.getItem(`history_${userPhone}`)) || [];
        const purchaseOrders = (backendOrders.length ? backendOrders : cachedOrders).map(
          normalizeBackendOrder
        );

        if (backendOrders.length) {
          localStorage.setItem(`history_${userPhone}`, JSON.stringify(backendOrders));
        }

        const preOrders = getOrdersByPhone(userPhone).map(mapPreorderToHistoryOrder);
        const combinedOrders = [...preOrders, ...purchaseOrders].sort(
          (a, b) => toTimestamp(b.date) - toTimestamp(a.date)
        );
        setOrders(combinedOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
        const savedOrders = JSON.parse(localStorage.getItem(`history_${userPhone}`)) || [];
        const fallbackPurchase = savedOrders.map(normalizeBackendOrder);
        const fallbackPreorders = getOrdersByPhone(userPhone).map(
          mapPreorderToHistoryOrder
        );
        const combinedOrders = [...fallbackPreorders, ...fallbackPurchase].sort(
          (a, b) => toTimestamp(b.date) - toTimestamp(a.date)
        );
        setOrders(combinedOrders);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();

    const handleOrderUpdate = () => {
      loadOrders();
    };

    window.addEventListener("appUpdate", handleOrderUpdate);
    return () => window.removeEventListener("appUpdate", handleOrderUpdate);
  }, [userPhone, navigate]);

  const getStatusBadgeClass = (status) => {
    switch (normalizeStatus(status)) {
      case "confirmed":
        return "status-confirmed";
      case "shipped":
        return "status-shipped";
      case "delivered":
        return "status-delivered";
      case "cancelled":
        return "status-cancelled";
      case "processing":
        return "status-processing";
      case "ready":
        return "status-ready";
      case "completed":
        return "status-completed";
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
        <h1>Purchase History</h1>
        <p>{orders.length} order{orders.length !== 1 ? "s" : ""} completed</p>
      </div>

      <div className="history-container">
        {orders.length === 0 ? (
          <div className="empty-state">
            <h2>No Orders Yet</h2>
            <p>Start shopping to see your purchase history</p>
            <button onClick={() => navigate("/shop")} className="btn-start-shopping">
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={`${order.source}-${order.id}`} className="order-card">
                <div className="order-card-header">
                  <div className="order-info-left">
                    <h3 className="order-id">
                      {order.source === "preorder" ? "Pre-Order" : "Order"} #{order.id}
                    </h3>
                    <p className="order-date">
                      Date: {order.date ? new Date(order.date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="order-info-right">
                    <div className="order-total">
                      <p className="total-label">Total</p>
                      <p className="total-amount">₹{Number(order.total || 0).toFixed(2)}</p>
                    </div>
                    <p className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                      {normalizeStatus(order.status)}
                    </p>
                  </div>
                </div>

                <div className="order-details">
                  <div className="order-detail-item">
                    <span className="detail-label">Payment Mode:</span>
                    <span className="detail-value">{order.mode || "N/A"}</span>
                  </div>
                  <div className="order-detail-item">
                    <span className="detail-label">Items:</span>
                    <span className="detail-value">{order.items?.length || 0} item(s)</span>
                  </div>
                  {order.source === "preorder" && (
                    <div className="order-detail-item">
                      <span className="detail-label">Time Slot:</span>
                      <span className="detail-value">{order.timeSlot || "Not selected"}</span>
                    </div>
                  )}
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
                          <p className="item-name">
                            {typeof item === "string" ? item : item.name || "Product"}
                          </p>
                          <p className="item-details">
                            ₹{Number(item.price || 0)} × {Number(item.quantity || 1)}{" "}
                            {item.is_loose_item ? item.unit_type || "unit" : ""}
                          </p>
                          {item.is_loose_item && (
                            <p className="item-details">
                              Rate: ₹
                              {Number(item.price_per_unit ?? item.price ?? 0).toFixed(2)}/
                              {item.unit_type || "unit"}
                            </p>
                          )}
                        </div>
                        <p className="item-subtotal">
                          ₹
                          {(
                            Number(item.price || 0) * Number(item.quantity || 1)
                          ).toFixed(2)}
                        </p>
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

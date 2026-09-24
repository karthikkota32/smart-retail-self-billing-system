import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import MasterNavbar from "../components/MasterNavbar";
import CartNotification from "../components/CartNotification";
import { readCartItems, writeCartItems, getQuantityStep, sanitizeQuantity } from "../utils/cartUtils";
import { createOrder } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

function createBillId() {
  return Date.now();
}

function Cart() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const userPhone = localStorage.getItem("userPhone") || "guest";
  const [items, setItems] = useState(() => {
    const cartData = readCartItems(userPhone);
    console.log("Cart initial load:", cartData);
    return cartData;
  });
  const [appliedCoupons, setAppliedCoupons] = useState(
    JSON.parse(localStorage.getItem(`appliedCoupons_${userPhone}`)) || []
  );
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");

  // Listen for cart updates from other pages
  useEffect(() => {
    const handleUpdate = () => {
      const updatedCart = readCartItems(userPhone);
      console.log("Cart updated via appUpdate event:", updatedCart);
      setItems(updatedCart);
    };

    window.addEventListener("appUpdate", handleUpdate);
    return () => window.removeEventListener("appUpdate", handleUpdate);
  }, [userPhone]);

  useEffect(() => {
    console.log("Cart items state:", items);
    console.log("Cart items length:", items.length);
  }, [items]);


  const updateQuantity = (index, qty) => {
    const updated = [...items];
    const item = updated[index];
    const isLoose = Boolean(item.is_loose_item);
    updated[index].quantity = sanitizeQuantity(qty, isLoose, item.unit_type || "unit");
    const saved = writeCartItems(updated, userPhone);
    setItems(saved);
    window.dispatchEvent(new Event("appUpdate"));
  };

  const removeItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    const saved = writeCartItems(updated, userPhone);
    setItems(saved);
    window.dispatchEvent(new Event("appUpdate"));
  };

  const totalPrice = items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
  
  const totalDiscount = appliedCoupons.reduce((sum, coupon) => sum + coupon.discount, 0);
  const discountAmount = (totalPrice * totalDiscount) / 100;
  const finalPrice = Math.max(0, totalPrice - discountAmount);

  const removeCoupon = (couponId) => {
    const updated = appliedCoupons.filter((c) => c.id !== couponId);
    setAppliedCoupons(updated);
    const userPhone = localStorage.getItem("userPhone") || "guest";
    localStorage.setItem(`appliedCoupons_${userPhone}`, JSON.stringify(updated));
    setNotificationMessage("Coupon removed");
    setNotificationType("info");
    setShowNotification(true);
  };

  const generateBill = async () => {
    if (items.length === 0) {
      setNotificationMessage("Your cart is empty");
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    const userPhone = localStorage.getItem("userPhone") || "guest";
    try {
      const orderItems = items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        unit_type: item.unit_type || "unit",
        is_loose_item: Boolean(item.is_loose_item),
        price_per_unit: Number(item.price_per_unit ?? item.price) || 0,
        product_id: item.product_id || item.id,
      }));

      const res = await createOrder(userPhone, orderItems, finalPrice, "Offline Cash");
      if (!res.ok) {
        setNotificationMessage(res.message || "Failed to generate bill");
        setNotificationType("error");
        setShowNotification(true);
        return;
      }

      localStorage.removeItem(`cart_${userPhone}`);
      localStorage.removeItem(`appliedCoupons_${userPhone}`);

      // Backward-compatible local record in case API is temporarily unavailable.
      const history = JSON.parse(localStorage.getItem(`history_${userPhone}`)) || [];
      const newBill = {
        id: res.orderId || createBillId(),
        total: finalPrice,
        originalTotal: totalPrice,
        discountAmount: discountAmount,
        appliedCoupons: appliedCoupons,
        items: orderItems,
        mode: "Offline Cash",
        date: new Date().toLocaleDateString(),
        status: "confirmed",
        statusUpdatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`history_${userPhone}`, JSON.stringify([...history, newBill]));

      // Dispatch update event
      window.dispatchEvent(new Event("appUpdate"));
      window.dispatchEvent(new Event("stockUpdate"));

      // Navigate immediately without blocking alert
      navigate("/history");
    } catch {
      setNotificationMessage("Error generating bill. Please try again.");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  return (
    <div style={{ background: "#f8f9fa", minHeight: "100vh", width: "100%", padding: 0, margin: 0, overflowX: "hidden" }}>
      <MasterNavbar />

      {/* Header Section */}
      <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "36px 24px", color: "white" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "42px", fontWeight: "700", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>🛒 {t("cart.title", "Shopping Cart")}</h1>
          <p style={{ fontSize: "18px", margin: "0", opacity: "0.9", fontWeight: "500" }}>{items.length} {t("dashboard.cart_items", "items in your cart")}</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "40px 24px", minHeight: "calc(100vh - 160px)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          {/* Empty Cart State */}
          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: "36px", color: "#667eea", marginBottom: "16px", fontWeight: "700" }}>{t("cart.empty_cart", "Your cart is empty")}</h2>
              <p style={{ fontSize: "20px", color: "#666", marginBottom: "32px", maxWidth: "600px", margin: "0 auto 32px" }}>{t("cart.empty_cart_msg", "Add some items to get started with your purchase")}</p>
              <button
                onClick={() => navigate("/shop")}
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  padding: "18px 40px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  border: "none",
                  fontSize: "18px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
                }}
              >
                {t("cart.continue_shopping", "Continue Shopping")}
              </button>
            </div>
          )}

          {/* Cart Items Grid Layout */}
          {items.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "32px", alignItems: "start" }}>
              {/* Left: Cart Items */}
              <div>
                <div style={{ display: "grid", gap: "20px" }}>
                  {items.map((i, index) => (
                      <div key={index} style={{ background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "160px 1fr", gap: "24px", alignItems: "start", transition: "all 0.3s ease" }}>
                        {/* Product Image */}
                        <div style={{ background: "#f9fafb", width: "160px", height: "160px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: "1px solid #f1f5f9" }}>
                          {(() => {
                            const imgSrc = String(i.image || i.imageUrl || i.image_url || "").trim();
                            const isUrl =
                              imgSrc.startsWith("http://") ||
                              imgSrc.startsWith("https://") ||
                              imgSrc.startsWith("data:image") ||
                              imgSrc.startsWith("/");
                            if (isUrl) {
                              return (
                                <img
                                  src={imgSrc}
                                  alt={i.name || "Product"}
                                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "10px" }}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60";
                                  }}
                                />
                              );
                            }
                            if (imgSrc && imgSrc.length <= 4) {
                              return <span style={{ fontSize: "64px" }}>{imgSrc}</span>;
                            }
                            return (
                              <img
                                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60"
                                alt={i.name || "Product"}
                                style={{ width: "100%", height: "100%", objectFit: "contain", padding: "10px" }}
                              />
                            );
                          })()}
                        </div>

                        {/* Product Details */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", width: "100%" }}>
                          <div>
                            <h3 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 10px 0", color: "#1a1a1a", lineHeight: "1.4" }}>{i.name || "Unknown Product"}</h3>
                            {i.location && <p style={{ fontSize: "16px", color: "#666", margin: "8px 0", fontWeight: "500" }}>📍 {i.location}</p>}
                            <p style={{ fontSize: "22px", fontWeight: "700", color: "#667eea", margin: "12px 0 0 0" }}>₹{Number(i.price).toFixed(2)}</p>
                            {i.is_loose_item && (
                              <p style={{ fontSize: "13px", color: "#4b5563", margin: "8px 0 0 0", fontWeight: "600" }}>
                                ₹{Number(i.price_per_unit ?? i.price).toFixed(2)}/{i.unit_type || "unit"}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "14px", alignItems: "flex-end" }}>
                            {/* Quantity Selector */}
                            <div style={{ background: "#f3f4f6", padding: "12px 16px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid #e5e7eb" }}>
                              <button
                                onClick={() => updateQuantity(index, (Number(i.quantity) || 1) - getQuantityStep(i.unit_type || "unit"))}
                                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "0 6px" }}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={i.quantity || 1}
                                min={i.is_loose_item ? getQuantityStep(i.unit_type || "unit") : 1}
                                step={i.is_loose_item ? getQuantityStep(i.unit_type || "unit") : 1}
                                onChange={(e) => updateQuantity(index, e.target.value)}
                                style={{ width: "80px", textAlign: "center", border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px", fontSize: "15px", fontWeight: "600" }}
                              />
                              <span style={{ fontSize: "13px", color: "#4b5563", minWidth: "36px", fontWeight: "700" }}>
                                {i.is_loose_item ? (i.unit_type || "unit") : "qty"}
                              </span>
                              <button
                                onClick={() => updateQuantity(index, (Number(i.quantity) || 1) + getQuantityStep(i.unit_type || "unit"))}
                                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "0 6px" }}
                              >
                                +
                              </button>
                            </div>

                            {/* Total Price */}
                            <div style={{ fontSize: "19px", fontWeight: "700", color: "#1a1a1a" }}>
                              = ₹{(i.price * (i.quantity || 1)).toFixed(2)}
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => removeItem(index)}
                              style={{
                                background: "#fee2e2",
                                color: "#dc2626",
                                padding: "12px 18px",
                                borderRadius: "8px",
                                border: "1px solid #fecaca",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "16px",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#fecaca"; e.currentTarget.style.color = "#991b1b"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Sidebar: Summary */}
              <div style={{ position: "sticky", top: "80px" }}>
                {/* Applied Coupons */}
                {appliedCoupons.length > 0 && (
                  <div style={{ background: "#ecfdf5", borderRadius: "14px", padding: "20px", marginBottom: "24px", border: "1px solid #d1fae5" }}>
                    <h4 style={{ margin: "0 0 16px 0", color: "#065f46", fontSize: "17px", fontWeight: "700" }}>✅ Applied Coupons ({appliedCoupons.length})</h4>
                    <div style={{ display: "grid", gap: "12px" }}>
                      {appliedCoupons.map((coupon) => (
                        <div key={coupon.id} style={{ background: "white", padding: "14px 16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid #10b981" }}>
                          <div>
                            <p style={{ margin: "0", fontWeight: "700", color: "#065f46", fontSize: "16px" }}>{coupon.code}</p>
                            <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#6b7280" }}>Save ₹{(totalPrice * coupon.discount / 100).toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => removeCoupon(coupon.id)}
                            style={{ background: "none", border: "none", color: "#dc2626", fontSize: "22px", cursor: "pointer", padding: "0" }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Summary Card */}
                <div style={{ background: "white", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 20px 0", color: "#1a1a1a" }}>{t("cart.title", "Order Summary")}</h3>

                  <div style={{ display: "grid", gap: "16px", marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "17px" }}>
                      <span style={{ color: "#6b7280" }}>{t("cart.subtotal", "Subtotal")} ({items.length} {t("dashboard.cart_items", "items")})</span>
                      <span style={{ fontWeight: "600", color: "#1a1a1a" }}>₹{totalPrice.toFixed(2)}</span>
                    </div>

                    {appliedCoupons.length > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "17px" }}>
                        <span style={{ color: "#6b7280" }}>{t("cart.discount", "Discount")} ({totalDiscount}%)</span>
                        <span style={{ fontWeight: "600", color: "#10b981" }}>−₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <span style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a1a" }}>{t("cart.total", "Total")}</span>
                    <span style={{ fontSize: "30px", fontWeight: "700", color: "#667eea" }}>₹{finalPrice.toFixed(2)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "grid", gap: "12px" }}>
                    <button
                      onClick={() => navigate("/coupons")}
                      style={{
                        background: "white",
                        color: "#667eea",
                        border: "2px solid #667eea",
                        padding: "16px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "17px",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                    >
                      🎟️ {t("coupons.title", "Add Coupons")}
                    </button>

                    <button
                      onClick={generateBill}
                      style={{
                        background: "#10b981",
                        color: "white",
                        padding: "16px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "17px",
                        border: "none",
                        transition: "all 0.2s ease",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      💾 {t("cart.checkout", "Generate Bill")}
                    </button>

                    <button
                      onClick={() => navigate("/payment")}
                      style={{
                        background: "#667eea",
                        color: "white",
                        padding: "16px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "17px",
                        border: "none",
                        transition: "all 0.2s ease",
                        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      💳 Pay Online
                    </button>

                    <button
                      onClick={() => navigate("/shop")}
                      style={{
                        background: "white",
                        color: "#667eea",
                        border: "2px solid #e5e7eb",
                        padding: "16px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "17px",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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

export default Cart;

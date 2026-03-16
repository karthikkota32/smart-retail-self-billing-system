import { useState, useEffect } from "react";
import { getCoupons, createCoupon } from "../services/api";
import "../styles/CouponManagement.css";

function CouponManagement() {
  const adminUsername = localStorage.getItem("username") || "admin";
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discountPercent: 10,
    maxDiscount: 500,
    minPurchase: 100,
    expiryDate: "",
    usageLimit: 100,
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load coupons
  const loadCoupons = async () => {
    try {
      setLoading(true);
      const res = await getCoupons();
      if (res.ok && res.coupons) {
        setCoupons(res.coupons);
      } else {
        console.log("Failed to load coupons");
      }
    } catch (error) {
      console.error("Error loading coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes("limit") || name.includes("Percent") || name.includes("Purchase") || name.includes("Discount")
        ? parseInt(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Validate
      if (!formData.code.trim()) {
        setErrorMessage("Coupon code is required");
        setSubmitting(false);
        return;
      }

      if (formData.discountPercent <= 0 || formData.discountPercent > 100) {
        setErrorMessage("Discount percent must be between 1-100");
        setSubmitting(false);
        return;
      }

      if (formData.minPurchase < 0) {
        setErrorMessage("Minimum purchase cannot be negative");
        setSubmitting(false);
        return;
      }

      if (!formData.expiryDate) {
        setErrorMessage("Expiry date is required");
        setSubmitting(false);
        return;
      }

      const res = await createCoupon(
        formData.code.toUpperCase().trim(),
        formData.discountPercent,
        formData.maxDiscount,
        formData.minPurchase,
        formData.expiryDate,
        formData.usageLimit,
        adminUsername
      );

      if (res.ok || res.success) {
        setSuccessMessage(`✓ Coupon "${formData.code}" created successfully!`);
        setFormData({
          code: "",
          discountPercent: 10,
          maxDiscount: 500,
          minPurchase: 100,
          expiryDate: "",
          usageLimit: 100,
        });
        setShowForm(false);
        // Reload coupons
        await loadCoupons();
        window.dispatchEvent(new Event("appUpdate"));
      } else {
        setErrorMessage(res.message || "Failed to create coupon");
      }
    } catch (error) {
      console.error("Error creating coupon:", error);
      setErrorMessage("Error creating coupon: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN");
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const activeCoupons = coupons.filter(c => !isExpired(c.expiryDate));
  const expiredCoupons = coupons.filter(c => isExpired(c.expiryDate));

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading coupons...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", textAlign: "center", borderTop: "4px solid #667eea" }}>
          <p style={{ fontSize: "12px", color: "#999", fontWeight: "bold", margin: "0 0 10px 0" }}>TOTAL COUPONS</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#667eea", margin: "0" }}>{coupons.length}</p>
        </div>
        <div style={{ background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", textAlign: "center", borderTop: "4px solid #25ae60" }}>
          <p style={{ fontSize: "12px", color: "#999", fontWeight: "bold", margin: "0 0 10px 0" }}>ACTIVE COUPONS</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#27ae60", margin: "0" }}>{activeCoupons.length}</p>
        </div>
        <div style={{ background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", textAlign: "center", borderTop: "4px solid #ffc107" }}>
          <p style={{ fontSize: "12px", color: "#999", fontWeight: "bold", margin: "0 0 10px 0" }}>EXPIRED COUPONS</p>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#ff9800", margin: "0" }}>{expiredCoupons.length}</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div style={{
          background: "#d4edda",
          color: "#155724",
          padding: "15px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #c3e6cb"
        }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          background: "#f8d7da",
          color: "#721c24",
          padding: "15px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #f5c6cb"
        }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Create Coupon Form */}
      {showForm ? (
        <div style={{
          background: "white",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          marginBottom: "30px"
        }}>
          <h2 style={{ marginTop: 0, color: "#333" }}>➕ Create New Coupon</h2>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "15px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Coupon Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="e.g., SAVE20, WELCOME10"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    fontFamily: "monospace"
                  }}
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Discount % *
                </label>
                <input
                  type="number"
                  name="discountPercent"
                  value={formData.discountPercent}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Max Discount Amount (₹)
                </label>
                <input
                  type="number"
                  name="maxDiscount"
                  value={formData.maxDiscount}
                  onChange={handleInputChange}
                  min="0"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Min Purchase (₹)
                </label>
                <input
                  type="number"
                  name="minPurchase"
                  value={formData.minPurchase}
                  onChange={handleInputChange}
                  min="0"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Expiry Date *
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Usage Limit
                </label>
                <input
                  type="number"
                  name="usageLimit"
                  value={formData.usageLimit}
                  onChange={handleInputChange}
                  min="1"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  disabled={submitting}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="submit"
                style={{
                  background: "#667eea",
                  color: "white",
                  padding: "12px 25px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                  opacity: submitting ? 0.6 : 1
                }}
                disabled={submitting}
              >
                {submitting ? "Creating..." : "✓ Create Coupon"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                style={{
                  background: "#6c757d",
                  color: "white",
                  padding: "12px 25px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px"
                }}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: "#667eea",
            color: "white",
            padding: "12px 25px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            marginBottom: "20px",
            fontSize: "16px",
          }}
        >
          ➕ Create New Coupon
        </button>
      )}

      {/* Active Coupons */}
      {activeCoupons.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ color: "#27ae60", marginBottom: "20px" }}>✓ Active Coupons ({activeCoupons.length})</h2>
          <div style={{ display: "grid", gap: "15px" }}>
            {activeCoupons.map((coupon) => (
              <div
                key={coupon.id || coupon._id || coupon.code}
                style={{
                  background: "white",
                  border: "2px solid #27ae60",
                  borderRadius: "12px",
                  padding: "20px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "15px",
                  alignItems: "center"
                }}
              >
                <div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>CODE</p>
                  <p style={{ fontSize: "18px", fontWeight: "bold", color: "#27ae60", margin: "0", fontFamily: "monospace" }}>
                    {coupon.code}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>DISCOUNT</p>
                  <p style={{ fontSize: "18px", fontWeight: "bold", color: "#667eea", margin: "0" }}>
                    {coupon.discountPercentage || coupon.discountPercent}% OFF
                  </p>
                </div>

                {coupon.maxDiscount && (
                  <div>
                    <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>MAX DISCOUNT</p>
                    <p style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0" }}>₹{coupon.maxDiscount}</p>
                  </div>
                )}

                {coupon.minPurchase && (
                  <div>
                    <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>MIN PURCHASE</p>
                    <p style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0" }}>₹{coupon.minPurchase}</p>
                  </div>
                )}

                <div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>EXPIRES</p>
                  <p style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0" }}>
                    {formatDate(coupon.expiryDate)}
                  </p>
                </div>

                {coupon.usageLimit && (
                  <div>
                    <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>USAGE LIMIT</p>
                    <p style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0" }}>
                      {coupon.usageCount || 0}/{coupon.usageLimit}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Coupons */}
      {expiredCoupons.length > 0 && (
        <div>
          <h2 style={{ color: "#999", marginBottom: "20px" }}>⏳ Expired Coupons ({expiredCoupons.length})</h2>
          <div style={{ display: "grid", gap: "15px" }}>
            {expiredCoupons.map((coupon) => (
              <div
                key={coupon.id || coupon._id || coupon.code}
                style={{
                  background: "#f5f5f5",
                  border: "2px solid #ddd",
                  borderRadius: "12px",
                  padding: "20px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "15px",
                  alignItems: "center",
                  opacity: 0.7
                }}
              >
                <div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>CODE</p>
                  <p style={{ fontSize: "18px", fontWeight: "bold", color: "#999", margin: "0", fontFamily: "monospace", textDecoration: "line-through" }}>
                    {coupon.code}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>DISCOUNT</p>
                  <p style={{ fontSize: "18px", fontWeight: "bold", color: "#999", margin: "0" }}>
                    {coupon.discountPercentage || coupon.discountPercent}% OFF
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0", fontWeight: "bold" }}>EXPIRED DATE</p>
                  <p style={{ fontSize: "14px", fontWeight: "bold", color: "#999", margin: "0" }}>
                    {formatDate(coupon.expiryDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {coupons.length === 0 && !showForm && (
        <div style={{
          background: "white",
          padding: "60px 20px",
          borderRadius: "12px",
          textAlign: "center",
          color: "#999"
        }}>
          <p style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 10px 0" }}>🎟️ No Coupons Yet</p>
          <p style={{ margin: "0 0 20px 0" }}>Create your first coupon to start offering discounts</p>
        </div>
      )}
    </div>
  );
}

export default CouponManagement;

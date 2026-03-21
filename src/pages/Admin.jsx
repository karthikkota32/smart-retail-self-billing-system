import { useState, useEffect } from "react"; 
import MasterNavbar from "../components/MasterNavbar";
import ProductForm from "../components/ProductForm";
import ProductList from "../components/ProductList";
import UserManagement from "../components/UserManagement";
import CouponManagement from "../components/CouponManagement";
import { useAdminProducts } from "../hooks/useAdminProducts";
import { getAdminDashboardStats } from "../services/api";

function Admin() {
  const {
    products,
    loading,
    syncStatus,
    refreshProducts,
    removeProductLocal,
  } = useAdminProducts(3000); // Poll every 3 seconds for admin

  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0 });
  const [activeTab, setActiveTab] = useState("products"); // "products", "users", or "coupons"

  // Load live admin stats from backend (MongoDB-backed)
  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const response = await getAdminDashboardStats();
        if (!isMounted || !response?.success || !response?.stats) {
          return;
        }

        setStats({
          totalOrders: Number(response.stats.total_orders) || 0,
          totalRevenue: Number(response.stats.total_revenue) || 0,
        });
      } catch (error) {
        console.error("Failed to load admin dashboard stats", error);
      }
    };

    loadStats();

    const refreshInterval = setInterval(loadStats, 8000);
    window.addEventListener("appUpdate", loadStats);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
      window.removeEventListener("appUpdate", loadStats);
    };
  }, []);

  const handleProductSubmit = async () => {
    setEditingProduct(null);
    setShowForm(false);
    // Refresh products from MongoDB to ensure sync
    await refreshProducts();
    window.dispatchEvent(new Event("appUpdate"));
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleDeleteProduct = async (productId) => {
    // Optimistic UI update: remove from local state immediately
    removeProductLocal(productId);
    // Then refresh from backend to verify
    await refreshProducts();
    window.dispatchEvent(new Event("appUpdate"));
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", minHeight: "100vh" }}>
      <MasterNavbar />

      <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "40px 20px", textAlign: "center", color: "white" }}>
        <h1 style={{ fontSize: "36px", fontWeight: "bold", margin: "0 0 10px 0" }}>👨‍💼 Admin Dashboard</h1>
        <p style={{ fontSize: "16px", margin: "0", opacity: "0.9" }}>Manage Products, Users & Coupons</p>
        
        {/* Sync Status Indicator */}
        {activeTab === "products" && (
          <div style={{ marginTop: "12px", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
            <span style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: syncStatus === "synced" ? "#4ade80" : syncStatus === "syncing" ? "#fbbf24" : "#ef4444",
              animation: syncStatus === "syncing" ? "pulse 1.5s infinite" : "none",
            }} />
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>
              {syncStatus === "synced" && "✓ All synced"}
              {syncStatus === "syncing" && "🔄 Syncing..."}
              {syncStatus === "error" && "⚠️ Sync error"}
            </span>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      <div style={{ background: "#f8f9fa", minHeight: "calc(100vh - 200px)" }}>
        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          gap: "0",
          padding: "20px",
          maxWidth: "1400px",
          margin: "0 auto",
          borderBottom: "2px solid #ddd",
          background: "white",
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "12px"
        }}>
          <button
            onClick={() => setActiveTab("products")}
            style={{
              padding: "12px 24px",
              background: activeTab === "products" ? "#667eea" : "transparent",
              color: activeTab === "products" ? "white" : "#666",
              border: "none",
              borderBottom: activeTab === "products" ? "3px solid #667eea" : "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "all 0.3s ease"
            }}
          >
            📦 Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "12px 24px",
              background: activeTab === "users" ? "#667eea" : "transparent",
              color: activeTab === "users" ? "white" : "#666",
              border: "none",
              borderBottom: activeTab === "users" ? "3px solid #667eea" : "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "all 0.3s ease"
            }}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            style={{
              padding: "12px 24px",
              background: activeTab === "coupons" ? "#667eea" : "transparent",
              color: activeTab === "coupons" ? "white" : "#666",
              border: "none",
              borderBottom: activeTab === "coupons" ? "3px solid #667eea" : "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "all 0.3s ease"
            }}
          >
            🎟️ Coupons
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <div style={{ padding: "30px 20px" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
              {/* Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                <div style={{ background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", textAlign: "center", borderTop: "4px solid #667eea" }}>
                  <p style={{ fontSize: "12px", color: "#999", fontWeight: "bold", margin: "0 0 10px 0" }}>TOTAL ORDERS</p>
                  <p style={{ fontSize: "32px", fontWeight: "bold", color: "#667eea", margin: "0" }}>{stats.totalOrders}</p>
                </div>
                <div style={{ background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", textAlign: "center", borderTop: "4px solid #25ae60" }}>
                  <p style={{ fontSize: "12px", color: "#999", fontWeight: "bold", margin: "0 0 10px 0" }}>TOTAL REVENUE</p>
                  <p style={{ fontSize: "32px", fontWeight: "bold", color: "#27ae60", margin: "0" }}>₹{stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div style={{ background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", textAlign: "center", borderTop: "4px solid #ffc107" }}>
                  <p style={{ fontSize: "12px", color: "#999", fontWeight: "bold", margin: "0 0 10px 0" }}>TOTAL PRODUCTS</p>
                  <p style={{ fontSize: "32px", fontWeight: "bold", color: "#ffc107", margin: "0" }}>{products.length}</p>
                </div>
              </div>

              {/* Add Product Form */}
              {showForm ? (
                <ProductForm
                  product={editingProduct}
                  onSubmit={handleProductSubmit}
                  onCancel={handleCancel}
                />
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
                  ➕ Add New Product
                </button>
              )}

              {/* Products List */}
              <ProductList
                products={products}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <UserManagement />
        )}

        {/* Coupons Tab */}
        {activeTab === "coupons" && (
          <CouponManagement />
        )}
      </div>
    </div>
  );
}

export default Admin;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MasterNavbar from "../components/MasterNavbar";
import { getMongoProducts } from "../services/api";
import { readCartItems, addItemToCart } from "../utils/cartUtils";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const userPhone = localStorage.getItem("userPhone") || "guest";
  const username = localStorage.getItem("username");
  const userRole = localStorage.getItem("userRole");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => readCartItems(userPhone));

  useEffect(() => {
    if (!userPhone) {
      navigate("/");
      return;
    }

    const loadProducts = async () => {
      try {
        const res = await getMongoProducts();
        if (res.success) {
          setProducts(res.products.slice(0, 6)); // Show 6 featured products
        }
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();

    // Listen for product updates from Admin panel
    window.addEventListener("appUpdate", loadProducts);
    return () => {
      window.removeEventListener("appUpdate", loadProducts);
    };
  }, [userPhone, navigate]);

  // Listen for cart updates from other pages
  useEffect(() => {
    const handleCartUpdate = () => {
      const updatedCart = readCartItems(userPhone);
      setCart(updatedCart);
    };

    window.addEventListener("appUpdate", handleCartUpdate);
    return () => window.removeEventListener("appUpdate", handleCartUpdate);
  }, [userPhone]);

  const addToCart = (product) => {
    const result = addItemToCart(product, 1, userPhone);
    if (!result.ok) return;

    setCart(result.items);
    window.dispatchEvent(new Event("appUpdate"));
    alert("Added to cart!");
  };

  return (
    <div className="dashboard">
      <MasterNavbar />
      
      <div className="dashboard-container">
        <div className="hero-section">
          <h1>{t("dashboard.greeting", "Welcome back")}, {username}! 👋</h1>
          <p>{t("dashboard.subtitle", "Your one-stop shopping destination")}</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              className="cta-btn"
              onClick={() => navigate("/shop")}
            >
              🛍️ {t("dashboard.browse_shop", "Start Shopping")}
            </button>
            {userRole === "admin" && (
              <button
                className="cta-btn"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                onClick={() => navigate("/admin")}
              >
                👨‍💼 {t("nav.admin_panel", "Go to Admin Dashboard")}
              </button>
            )}
          </div>
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <span className="stat-icon">🛒</span>
            <span className="stat-label">{t("dashboard.cart_items", "Cart Items")}</span>
            <span className="stat-value">{cart.length}</span>
          </div>
          <div className="stat-card wishlist-card">
            <span className="stat-icon">❤️</span>
            <span className="stat-label">{t("nav.wishlist", "Wishlist")}</span>
            <button
              className="stat-link wishlist-link"
              onClick={() => navigate("/wishlist")}
            >
              {t("common.view", "View")} →
            </button>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📦</span>
            <span className="stat-label">{t("nav.history", "Orders")}</span>
            <button
              className="stat-link"
              onClick={() => navigate("/history")}
            >
              {t("common.view", "View")} →
            </button>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎟️</span>
            <span className="stat-label">{t("nav.coupons", "Coupons")}</span>
            <button
              className="stat-link"
              onClick={() => navigate("/coupons")}
            >
              {t("common.view", "View")} →
            </button>
          </div>
        </div>

        <div className="featured-section">
          <h2>{t("dashboard.recommended", "Featured Products")}</h2>
          {loading ? (
            <p className="loading">{t("common.loading", "Loading products...")}</p>
          ) : products.length > 0 ? (
            <div className="product-grid">
              {products.map((product) => (
                <div key={product._id || product.id} className="product-card">
                  <div
                    className="product-image"
                    onClick={() => navigate(`/product/${product._id || product.id}`)}
                  >
                    {product.image}
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="price">₹{product.price}</p>
                    <p className="category">{product.category}</p>
                    <div className="product-actions">
                      <button
                        className="btn-primary"
                        onClick={() => navigate(`/product/${product._id || product.id}`)}
                      >
                        {t("shop.view_details", "View")}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => addToCart(product)}
                      >
                        {t("shop.add_to_cart", "Add")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-products">{t("shop.no_products", "No products available")}</p>
          )}
        </div>

        <div className="recommendations">
          <h2>{t("dashboard.quick_actions", "Quick Actions")}</h2>
          <div className="action-cards">
            <div className="action-card" onClick={() => navigate("/shop")}>
              <span className="action-icon">🔍</span>
              <span>{t("dashboard.browse_shop", "Browse Shop")}</span>
            </div>
            <div className="action-card" onClick={() => navigate("/comparison")}>
              <span className="action-icon">⚖️</span>
              <span>{t("shop.compare", "Compare Products")}</span>
            </div>
            <div className="action-card" onClick={() => navigate("/cart")}>
              <span className="action-icon">💳</span>
              <span>{t("cart.checkout", "Checkout")}</span>
            </div>
            <div className="action-card" onClick={() => navigate("/profile")}>
              <span className="action-icon">⚙️</span>
              <span>{t("nav.profile", "Profile")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

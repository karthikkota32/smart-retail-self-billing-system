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
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => readCartItems(userPhone));
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (!userPhone) {
      navigate("/");
      return;
    }

    const loadProducts = async () => {
      try {
        const res = await getMongoProducts();
        if (res.success && res.products) {
          const allProds = res.products;

          // Derive user preferences from history & wishlist
          let history = [];
          let wishlist = [];
          try {
            history = JSON.parse(localStorage.getItem(`history_${userPhone}`) || "[]");
          } catch {
            history = [];
          }
          try {
            wishlist = JSON.parse(localStorage.getItem(`wishlist_${userPhone}`) || "[]");
          } catch {
            wishlist = [];
          }

          const preferredCategories = new Set();
          history.forEach((order) => {
            (order.items || []).forEach((it) => {
              if (it.category) preferredCategories.add(it.category.toLowerCase());
            });
          });
          wishlist.forEach((it) => {
            if (it.category) preferredCategories.add(it.category.toLowerCase());
          });

          // Build Recommended List (prioritize preferred categories, ratings >= 4.3, in stock)
          let recs = [];
          if (preferredCategories.size > 0) {
            recs = allProds.filter(
              (p) =>
                preferredCategories.has(String(p.category || "").toLowerCase()) &&
                (p.stock_quantity > 0 || p.stock > 0 || p.stockQuantity > 0)
            );
          }

          // If not enough category matches, top-up with highest rated & in-stock products
          const highRated = [...allProds]
            .filter((p) => (p.stock_quantity > 0 || p.stock > 0 || p.stockQuantity > 0))
            .sort((a, b) => (Number(b.rating) || 4.5) - (Number(a.rating) || 4.5));

          for (const item of highRated) {
            if (!recs.some((r) => (r._id || r.id) === (item._id || item.id))) {
              recs.push(item);
            }
            if (recs.length >= 6) break;
          }

          setRecommended(recs.slice(0, 6));
          setProducts(allProds.slice(0, 8)); // Featured items
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
    const stock =
      [product.stock_quantity, product.stock, product.stockQuantity].find(
        (v) => v !== undefined && v !== null && !isNaN(Number(v))
      ) ?? 0;

    if (Number(stock) <= 0) {
      setToastMessage({ type: "error", text: `"${product.name}" is out of stock.` });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const result = addItemToCart(product, 1, userPhone);
    if (!result.ok) {
      setToastMessage({ type: "error", text: "Could not add to cart." });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setCart(result.items);
    window.dispatchEvent(new Event("appUpdate"));
    setToastMessage({ type: "success", text: `✓ "${product.name}" added to cart!` });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getProductImage = (p) => {
    return (
      p.image_url ||
      p.imageUrl ||
      p.image ||
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500"
    );
  };

  const getProductStock = (p) => {
    const raw = [p.stock_quantity, p.stock, p.stockQuantity].find(
      (v) => v !== undefined && v !== null && !isNaN(Number(v))
    );
    return Math.max(0, Number(raw ?? 0));
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

        {toastMessage && (
          <div className={`dashboard-toast toast-${toastMessage.type}`}>
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* ============= RECOMMENDED FOR YOU SECTION ============= */}
        <div className="recommended-section">
          <div className="section-header-wrap">
            <div>
              <h2 className="section-title">🌟 Recommended For You</h2>
              <p className="section-subtitle">
                Personalized picks based on your shopping preferences & top-rated groceries
              </p>
            </div>
            <button className="browse-more-btn" onClick={() => navigate("/shop")}>
              Browse All →
            </button>
          </div>

          {loading ? (
            <p className="loading">{t("common.loading", "Loading personalized recommendations...")}</p>
          ) : recommended.length > 0 ? (
            <div className="product-grid">
              {recommended.map((product) => {
                const stock = getProductStock(product);
                const inStock = stock > 0;
                return (
                  <div key={`rec_${product._id || product.id}`} className="product-card rec-card">
                    <div className="rec-badge">✨ Top Pick</div>
                    <div
                      className="product-image"
                      onClick={() => navigate(`/product/${product._id || product.id}`)}
                    >
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500";
                        }}
                      />
                    </div>
                    <div className="product-info">
                      <div className="product-meta-row">
                        <span className="category">{product.category}</span>
                        <span className="product-rating">★ {product.rating || 4.7}</span>
                      </div>
                      <h3 title={product.name}>{product.name}</h3>
                      <div className="product-price-stock-row">
                        <p className="price">₹{Number(product.price).toFixed(2)}</p>
                        <span className={`stock-status-pill ${inStock ? "in" : "out"}`}>
                          {inStock ? `In Stock (${stock})` : "Out of Stock"}
                        </span>
                      </div>
                      <div className="product-actions">
                        <button
                          className="btn-primary"
                          onClick={() => navigate(`/product/${product._id || product.id}`)}
                        >
                          {t("shop.view_details", "View")}
                        </button>
                        <button
                          className="btn-secondary"
                          disabled={!inStock}
                          onClick={() => addToCart(product)}
                        >
                          {inStock ? "+ Add to Cart" : "Out of Stock"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-products">No recommendations yet. Start browsing to see personalized picks!</p>
          )}
        </div>

        {/* ============= FEATURED PRODUCTS SECTION ============= */}
        <div className="featured-section" style={{ marginTop: "32px" }}>
          <div className="section-header-wrap">
            <div>
              <h2 className="section-title">🔥 Featured Groceries</h2>
              <p className="section-subtitle">
                Popular pantry essentials and daily staples
              </p>
            </div>
          </div>

          {loading ? (
            <p className="loading">{t("common.loading", "Loading products...")}</p>
          ) : products.length > 0 ? (
            <div className="product-grid">
              {products.map((product) => {
                const stock = getProductStock(product);
                const inStock = stock > 0;
                return (
                  <div key={product._id || product.id} className="product-card">
                    <div
                      className="product-image"
                      onClick={() => navigate(`/product/${product._id || product.id}`)}
                    >
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500";
                        }}
                      />
                    </div>
                    <div className="product-info">
                      <div className="product-meta-row">
                        <span className="category">{product.category}</span>
                        {product.rating > 0 && (
                          <span className="product-rating">★ {product.rating}</span>
                        )}
                      </div>
                      <h3 title={product.name}>{product.name}</h3>
                      <div className="product-price-stock-row">
                        <p className="price">₹{Number(product.price).toFixed(2)}</p>
                        <span className={`stock-status-pill ${inStock ? "in" : "out"}`}>
                          {inStock ? `In Stock (${stock})` : "Out of Stock"}
                        </span>
                      </div>
                      <div className="product-actions">
                        <button
                          className="btn-primary"
                          onClick={() => navigate(`/product/${product._id || product.id}`)}
                        >
                          {t("shop.view_details", "View")}
                        </button>
                        <button
                          className="btn-secondary"
                          disabled={!inStock}
                          onClick={() => addToCart(product)}
                        >
                          {inStock ? "+ Add to Cart" : "Out of Stock"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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

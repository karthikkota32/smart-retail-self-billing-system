import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MasterNavbar from "../components/MasterNavbar";
import { useRealtimeProducts } from "../hooks/useRealtimeProducts";
import { StockStatusBadge, StockIndicator, AddToCartButton } from "../components/StockStatus";
import CartNotification from "../components/CartNotification";
import SmartNlpSearch from "../components/SmartNlpSearch";
import StoreDijkstraNavigator, { resolveShelfForItem } from "../components/StoreDijkstraNavigator";
import { readCartItems, addItemToCart, normalizeProductId, getQuantityStep, sanitizeQuantity } from "../utils/cartUtils";
import { useLanguage } from "../context/LanguageContext";
import "./Shop.css";

const FALLBACK_PRODUCT_IMAGE = "https://placehold.co/600x600/e5e7eb/6b7280?text=No+Image";

function Shop() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const userPhone = localStorage.getItem("userPhone") || "guest";

  // Use real-time products hook with 5-second polling
  const { products: liveProducts, loading: productsLoading, error: productsError, refreshProducts } = useRealtimeProducts(5000);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(readCartItems(userPhone));

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [sortBy, setSortBy] = useState("relevance");
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [bestRatedOnly, setBestRatedOnly] = useState(false);
  const [under199Only, setUnder199Only] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [quickViewItem, setQuickViewItem] = useState(null);
  const [loading, setLoading] = useState(productsLoading);
  const [error, setError] = useState(productsError);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");
  const [looseQuantities, setLooseQuantities] = useState({});
  const [showDijkstraMap, setShowDijkstraMap] = useState(true);
  const [targetShelfForNav, setTargetShelfForNav] = useState("A4");

  // Use live products data
  useEffect(() => {
    if (liveProducts.length > 0) {
      setProducts(liveProducts);
    }
  }, [liveProducts]);

  // Sync loading state from hook
  useEffect(() => {
    setLoading(productsLoading);
  }, [productsLoading]);

  // Sync error state from hook
  useEffect(() => {
    setError(productsError);
  }, [productsError]);

  useEffect(() => {
    const loadRecentlyViewed = () => {
      const userPhone = localStorage.getItem("userPhone") || "guest";
      const viewed =
        JSON.parse(localStorage.getItem(`recentlyViewed_${userPhone}`)) || [];
      setRecentlyViewed(viewed);
    };

    loadRecentlyViewed();

    window.addEventListener("appUpdate", loadRecentlyViewed);

    return () => {
      window.removeEventListener("appUpdate", loadRecentlyViewed);
    };
  }, []);

  // Listen for cart updates from other pages
  useEffect(() => {
    const handleCartUpdate = () => {
      const updatedCart = readCartItems(userPhone);
      setCart(updatedCart);
    };

    window.addEventListener("appUpdate", handleCartUpdate);
    return () => window.removeEventListener("appUpdate", handleCartUpdate);
  }, [userPhone]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const updateLooseQuantity = (item, value) => {
    const productId = normalizeProductId(item);
    if (!productId) return;
    setLooseQuantities((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const resolveLooseQuantity = (item) => {
    const productId = normalizeProductId(item);
    const unitType = item.unit_type || "unit";
    const defaultQty = getQuantityStep(unitType);
    const rawQty = productId ? looseQuantities[productId] : undefined;
    return sanitizeQuantity(rawQty ?? defaultQty, true, unitType);
  };

  const addToCart = (item, e) => {
    if (e?.stopPropagation) e.stopPropagation();

    const stock = item.stockQuantity !== undefined ? item.stockQuantity : (item.stock_quantity !== undefined ? item.stock_quantity : item.stock);
    if (Number(stock) <= 0) {
      setNotificationMessage("This item is out of stock");
      setNotificationType("error");
      setShowNotification(true);
      refreshProducts();
      return;
    }

    const productId = normalizeProductId(item);
    if (!productId) {
      setNotificationMessage("Unable to add this product to cart");
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    const quantity = item.is_loose_item ? resolveLooseQuantity(item) : 1;
    const result = addItemToCart(item, quantity, userPhone);
    if (!result.ok) {
      setNotificationMessage("Unable to add this product to cart");
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    setCart(result.items);
    const qtyText = item.is_loose_item ? `${quantity} ${item.unit_type || "unit"}` : "1 item";
    setNotificationMessage(`${item.name} (${qtyText}) added to cart!`);
    setNotificationType("success");
    setShowNotification(true);
    window.dispatchEvent(new Event("appUpdate"));
  };

  const addToWishlist = (item, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    
    const userPhone = localStorage.getItem("userPhone") || "guest";
    const wishlist = JSON.parse(localStorage.getItem(`wishlist_${userPhone}`)) || [];
    
    if (wishlist.some((p) => p.id === item.id)) {
      setNotificationMessage("Already in your wishlist!");
      setNotificationType("info");
      setShowNotification(true);
      return;
    }

    wishlist.push(item);
    localStorage.setItem(`wishlist_${userPhone}`, JSON.stringify(wishlist));
    setNotificationMessage("Added to your wishlist!");
    setNotificationType("success");
    setShowNotification(true);
    window.dispatchEvent(new Event("appUpdate"));
  };



  const clearFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setMinRating("0");
    setSortBy("relevance");
    setOnSaleOnly(false);
    setBestRatedOnly(false);
    setUnder199Only(false);
  };



  const openQuickView = (item, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setQuickViewItem(item);
  };

  const parsedMin = priceMin === "" ? null : Number(priceMin);
  const parsedMax = priceMax === "" ? null : Number(priceMax);
  const parsedMinRating = Number(minRating) || 0;

  const filteredProducts = products.filter((p) => {
    const nameMatch = p.name
      .toLowerCase()
      .includes(debouncedSearch.toLowerCase());

    const price = Number(p.price) || 0;
    const rating = Number(p.averageRating) || 0;
    const originalPrice = Number(p.originalPrice) || 0;
    const discountPercent = Number(p.discountPercent) || 0;
    const hasDiscount =
      discountPercent > 0 || (originalPrice > 0 && price < originalPrice);

    const minOk = parsedMin === null || price >= parsedMin;
    const maxOk = parsedMax === null || price <= parsedMax;
    const ratingOk = rating >= parsedMinRating;
    const saleOk = !onSaleOnly || hasDiscount;
    const bestRatedOk = !bestRatedOnly || rating >= 4.2;
    const under199Ok = !under199Only || price <= 199;

    return (
      nameMatch &&
      minOk &&
      maxOk &&
      ratingOk &&
      saleOk &&
      bestRatedOk &&
      under199Ok
    );
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortBy === "price-desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortBy === "rating-desc") return (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0);
    if (sortBy === "newest") {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : Number(a.id) || 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : Number(b.id) || 0;
      return bDate - aDate;
    }
    return 0;
  });


  return (
    <div
      className="shop-page"
      style={{
        background: "#eaeded",
        minHeight: "100vh",
        width: "100%"
      }}
    >
      <MasterNavbar />

      <div style={{ maxWidth: "1400px", margin: "20px auto 0 auto", padding: "0 15px" }}>
        <SmartNlpSearch onAddToCart={addToCart} />
      </div>

      <div className="shop-toolbar">
        <div className="shop-toolbar-grid">
          <div className="shop-toolbar-row" style={{ justifyContent: "flex-end" }}>
            <button
              className="shop-toolbar-btn shop-toolbar-btn-primary"
              onClick={refreshProducts}
              title="Refresh latest stock status from server"
            >
              🔄 {t("common.refresh", "Refresh")}
            </button>
            <button
              className="shop-toolbar-btn shop-toolbar-btn-secondary"
              onClick={() => setShowFilters(true)}
            >
              {t("common.filter", "Filters")}
            </button>
            <button
              className="shop-toolbar-btn shop-toolbar-btn-warning"
              onClick={() => setShowHelp(true)}
            >
              Help
            </button>
          </div>
        </div>
        <p className="shop-summary">
          🛒 {t("nav.cart", "Cart")} ({cart.length}) | {t("dashboard.cart_items", "Showing")} {sortedProducts.length} {t("dashboard.cart_items", "items")}
        </p>
      </div>

      {recentlyViewed.length > 0 && (
        <div style={{ 
          padding: "20px 15px", 
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)",
          borderBottom: "2px solid rgba(102, 126, 234, 0.15)",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>👀</span>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#111827" }}>Recently Viewed</h3>
              <span style={{ fontSize: "12px", color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: "12px" }}>
                {recentlyViewed.length}
              </span>
            </div>
            <button
              onClick={() => {
                const userPhone = localStorage.getItem("userPhone") || "guest";
                localStorage.removeItem(`recentlyViewed_${userPhone}`);
                setRecentlyViewed([]);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#6b7280",
                fontSize: "12px",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "6px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#f3f4f6";
                e.target.style.color = "#374151";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.color = "#6b7280";
              }}
            >
              ✕ Clear
            </button>
          </div>
          <div className="recently-viewed-grid-mobile">
            {recentlyViewed.map((item) => (
              <div
                key={`recent-${item.id}`}
                onClick={() => navigate(`/product/${item.id}`)}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  border: "1px solid #e5e7eb",
                  transform: "translateY(0)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(102, 126, 234, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                }}
              >
                {item.image && (
                  <div style={{ 
                    height: "90px", 
                    overflow: "hidden", 
                    background: "#f9fafb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: item.image.length === 1 ? "40px" : "inherit"
                  }}>
                    {typeof item.image === 'string' && item.image.match(/^[\p{Emoji}]/u) ? (
                      <span style={{ fontSize: "40px" }}>{item.image}</span>
                    ) : (
                      <img
                        src={item.image}
                        alt={item.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                )}
                <div style={{ padding: "10px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "#667eea", fontWeight: "bold" }}>
                    ₹{Number(item.price).toFixed(0)}
                  </div>
                  {item.stock !== undefined && (
                    <div style={{ fontSize: "11px", color: Number(item.stock) > 0 ? "#10b981" : "#ef4444", marginTop: "4px", fontWeight: "500" }}>
                      {Number(item.stock) > 0 ? `${item.stock} in stock` : "Out of stock"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px", fontSize: "16px", color: "#667eea" }}>
          <div style={{ marginBottom: "10px" }}>Loading products from MongoDB...</div>
          <div style={{ fontSize: "30px" }}>🔄</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ textAlign: "center", padding: "40px", fontSize: "14px", color: "#dc2626", background: "#fee", borderRadius: "8px", margin: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && (
        <div className="shop-products-grid">
          {sortedProducts.map((item) => (
              <div
                key={item.id}
                className="product-card"
                onClick={() => navigate(`/product/${item.id}`)}
              >
                {/* Top Content Section */}
                <div className="product-card-top">
                  {/* Product Image */}
                  {item.image && (
                    <div className="product-image-container">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="product-image"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                      />
                      <StockIndicator product={item} />
                      {item.averageRating && (
                        <span className="product-rating-badge">
                          ⭐ {item.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Product Title */}
                  <h3 className="product-title">{item.name}</h3>

                  {/* Product Price */}
                  <p className="product-price">₹{item.price}</p>
                  {item.is_loose_item && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#4b5563", fontWeight: "600" }}>
                      ₹{Number(item.price_per_unit ?? item.price).toFixed(2)}/{item.unit_type || "unit"}
                    </p>
                  )}
                </div>

                {/* Bottom Action Section - Always at Bottom */}
                <div className="product-card-bottom">
                  {item.is_loose_item && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: "8px",
                        marginBottom: "10px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="number"
                        min={getQuantityStep(item.unit_type)}
                        step={getQuantityStep(item.unit_type)}
                        value={looseQuantities[normalizeProductId(item)] ?? getQuantityStep(item.unit_type)}
                        onChange={(e) => updateLooseQuantity(item, e.target.value)}
                        style={{
                          width: "100%",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          padding: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      />
                      <span style={{ fontSize: "12px", color: "#4b5563", fontWeight: "700" }}>
                        {item.unit_type || "unit"}
                      </span>
                      <div style={{ gridColumn: "1 / -1", fontSize: "12px", color: "#111827", fontWeight: "700" }}>
                        Total: ₹{(Number(item.price_per_unit ?? item.price) * resolveLooseQuantity(item)).toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="product-actions">
                    {/* Add to Cart Button */}
                    <div style={{ flex: 1 }}>
                      <AddToCartButton product={item} onClick={(e) => addToCart(item, e)} />
                    </div>

                    {/* View Product Details Button */}
                    <button
                      className="btn-view"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/product/${item.id}`);
                      }}
                      title="View full product details"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View
                    </button>
                  </div>

                  {/* Stock Status - Always at Bottom */}
                  <div className="product-stock-status">
                    <StockStatusBadge product={item} compact={true} />
                  </div>
                </div>
              </div>
          ))}
        </div>
      )}

        {quickViewItem && (
        <div
          onClick={() => setQuickViewItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 45,
            animation: "fadeIn 200ms ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              width: "min(95vw, 600px)",
              maxHeight: "90vh",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              display: "grid",
              gap: "18px",
              overflow: "auto",
              animation: "slideUp 300ms ease",
            }}
          >
            {/* Header with Close Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#111827" }}>Product Details</h2>
              <button
                onClick={() => setQuickViewItem(null)}
                style={{
                  background: "#f3f4f6",
                  color: "#111827",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: "bold",
                  transition: "background 200ms ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#e5e7eb"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#f3f4f6"}
              >
                ✕
              </button>
            </div>

            {/* Product Image */}
            {quickViewItem.image && (
              <div style={{ height: "280px", borderRadius: "12px", overflow: "hidden", position: "relative", background: "#f9fafb" }}>
                <img
                  src={quickViewItem.image}
                  alt={quickViewItem.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                  }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <StockIndicator product={quickViewItem} />
              </div>
            )}

            {/* Product Info */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", color: "#111827" }}>{quickViewItem.name}</h3>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#667eea", marginBottom: "4px" }}>₹{quickViewItem.price}</div>
                      {quickViewItem.is_loose_item && (
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>
                          ₹{Number(quickViewItem.price_per_unit ?? quickViewItem.price).toFixed(2)}/{quickViewItem.unit_type || "unit"}
                        </div>
                      )}
                </div>
                <button
                  onClick={() => addToWishlist(quickViewItem)}
                  title="Add to Wishlist"
                  style={{
                    background: "#ec4899",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                    transition: "all 200ms ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(139, 92, 246, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  ❤️ Wishlist
                </button>
              </div>

              {/* Additional Info */}
              <div style={{ fontSize: "13px", color: "#6b7280", display: "grid", gap: "6px" }}>
                {quickViewItem.category && <div>📦 <strong>Category:</strong> {quickViewItem.category}</div>}
                {quickViewItem.location && <div>📍 <strong>Location:</strong> {quickViewItem.location}</div>}
                {quickViewItem.averageRating && <div>⭐ <strong>Rating:</strong> {Number(quickViewItem.averageRating).toFixed(1)}/5</div>}
              </div>

              <div style={{ marginTop: "12px" }}>
                <StockStatusBadge product={quickViewItem} compact={false} />
              </div>
            </div>

            {/* Action Buttons */}
            {quickViewItem.is_loose_item && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", marginTop: "6px" }}>
                <input
                  type="number"
                  min={getQuantityStep(quickViewItem.unit_type)}
                  step={getQuantityStep(quickViewItem.unit_type)}
                  value={looseQuantities[normalizeProductId(quickViewItem)] ?? getQuantityStep(quickViewItem.unit_type)}
                  onChange={(e) => updateLooseQuantity(quickViewItem, e.target.value)}
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                />
                <span style={{ alignSelf: "center", fontSize: "13px", fontWeight: "700", color: "#4b5563" }}>
                  {quickViewItem.unit_type || "unit"}
                </span>
                <div style={{ gridColumn: "1 / -1", fontSize: "13px", fontWeight: "700", color: "#111827" }}>
                  Total: ₹{(Number(quickViewItem.price_per_unit ?? quickViewItem.price) * resolveLooseQuantity(quickViewItem)).toFixed(2)}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
              <AddToCartButton product={quickViewItem} onClick={() => addToCart(quickViewItem)} />
              <button
                onClick={() => navigate(`/product/${quickViewItem.id}`)}
                style={{
                  background: "#f3f4f6",
                  color: "#111827",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "13px",
                  transition: "all 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                  e.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                📖 Full Details
              </button>
            </div>

            <StoreDijkstraNavigator product={quickViewItem} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {showFilters && (
        <div
          onClick={() => setShowFilters(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 40,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 360px)",
              height: "100%",
              background: "white",
              padding: "18px",
              boxShadow: "-12px 0 30px rgba(0,0,0,0.2)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Badges / Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                style={{
                  background: "#111827",
                  color: "white",
                  borderRadius: "8px",
                  border: "none",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <input
                  type="number"
                  min="0"
                  placeholder="Min price"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  style={{
                    flex: "1 1 120px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    fontSize: "12px",
                  }}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Max price"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  style={{
                    flex: "1 1 120px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    fontSize: "12px",
                  }}
                />
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  style={{
                    flex: "1 1 140px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    fontSize: "12px",
                    background: "white",
                  }}
                >
                  <option value="0">All ratings</option>
                  <option value="3">3+ stars</option>
                  <option value="4">4+ stars</option>
                  <option value="4.5">4.5+ stars</option>
                </select>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                  <input
                    type="checkbox"
                    checked={onSaleOnly}
                    onChange={(e) => setOnSaleOnly(e.target.checked)}
                  />
                  On sale
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                  <input
                    type="checkbox"
                    checked={bestRatedOnly}
                    onChange={(e) => setBestRatedOnly(e.target.checked)}
                  />
                  Best rated
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                  <input
                    type="checkbox"
                    checked={under199Only}
                    onChange={(e) => setUnder199Only(e.target.checked)}
                  />
                  Under 199
                </label>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  fontSize: "12px",
                  background: "white",
                }}
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Rating: High to Low</option>
                <option value="newest">Newest</option>
              </select>

              <button
                onClick={clearFilters}
                style={{
                  background: "#111827",
                  color: "white",
                  borderRadius: "8px",
                  border: "none",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                Reset filters
              </button>
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: "12px" }}>
              <h4 style={{ margin: "0 0 8px 0" }}>Badges / Filters</h4>
              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                    -% Off
                  </span>
                  <span style={{ fontSize: "12px", color: "#374151" }}>Discounted price</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                    Discounted Price
                  </span>
                  <span style={{ fontSize: "12px", color: "#374151" }}>Price below original</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                    New
                  </span>
                  <span style={{ fontSize: "12px", color: "#374151" }}>Recently added</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                    Recently Added
                  </span>
                  <span style={{ fontSize: "12px", color: "#374151" }}>Added in last 7 days</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                    Low stock
                  </span>
                  <span style={{ fontSize: "12px", color: "#374151" }}>Only a few left</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                    Only a Few Left
                  </span>
                  <span style={{ fontSize: "12px", color: "#374151" }}>Very limited stock</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0" }}>Customer Care</h3>
            <p style={{ margin: "0 0 6px 0", color: "#374151", fontSize: "13px" }}>
              Phone: 1800-000-000
            </p>
            <p style={{ margin: "0 0 6px 0", color: "#374151", fontSize: "13px" }}>
              Email: support@smartretail.com
            </p>
            <p style={{ margin: "0 0 12px 0", color: "#374151", fontSize: "13px" }}>
              Hours: 9:00 AM - 9:00 PM, Mon-Sun
            </p>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                background: "#111827",
                color: "white",
                borderRadius: "8px",
                border: "none",
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
                width: "100%",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <CartNotification
        message={notificationMessage}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        type={notificationType}
      />
    </div>
  );
}

export default Shop;

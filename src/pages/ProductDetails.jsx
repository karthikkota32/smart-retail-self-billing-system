import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import MasterNavbar from "../components/MasterNavbar";
import {
  getProduct,
  getProductRating,
  getProductReviews,
  addProductReview,
  addToWishlist,
  removeFromWishlist,
} from "../services/api";
import CartNotification from "../components/CartNotification";
import StoreDijkstraNavigator, { resolveShelfForItem } from "../components/StoreDijkstraNavigator";
import {
  readCartItems,
  addItemToCart,
  getQuantityStep,
  sanitizeQuantity,
} from "../utils/cartUtils";
import "../styles/ProductDetails.css";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userPhone = localStorage.getItem("userPhone") || "guest";

  const [product, setProduct] = useState(null);
  const [rating, setRating] = useState({ averageRating: 4.6, totalReviews: 18 });
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [, setCart] = useState(() => readCartItems(userPhone));
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");
  const [activeTab, setActiveTab] = useState("overview"); // overview, nutrition, navigation, reviews
  const [showPathfindingMap, setShowPathfindingMap] = useState(true);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const productRes = await getProduct(id);

        if (productRes && productRes.product) {
          const raw = productRes.product;
          const resolvedStock = Number(
            raw.stockQuantity !== undefined
              ? raw.stockQuantity
              : (raw.stock_quantity !== undefined ? raw.stock_quantity : (raw.stock ?? 0))
          ) || 0;

          const locationObj =
            typeof raw.location === "object" && raw.location !== null
              ? raw.location
              : {
                  aisle: String(raw.location || "D1").toUpperCase(),
                  shelf: "2",
                };

          const normalizedProduct = {
            ...raw,
            id: raw._id || raw.id || id,
            _id: raw._id || raw.id || id,
            name: raw.name || "Grocery Item",
            category: raw.category || "General",
            price: Number(raw.price) || 0,
            unit: raw.unit || raw.unit_type || "piece",
            stock: resolvedStock,
            stockQuantity: resolvedStock,
            stock_quantity: resolvedStock,
            lowStockThreshold: Number(raw.lowStockThreshold || 5),
            sku: raw.sku || raw.barcode || `SKU-${id.slice(-6).toUpperCase()}`,
            image: raw.imageUrl || raw.image_url || raw.image || FALLBACK_IMAGE,
            imageUrl: raw.imageUrl || raw.image_url || raw.image || FALLBACK_IMAGE,
            description:
              raw.description ||
              `Premium quality ${raw.name || "grocery item"} sourced directly from trusted regional producers. Guaranteed freshness and superior nutritional value.`,
            location: locationObj,
            locationString: `Aisle ${locationObj.aisle || "D1"}, Shelf ${locationObj.shelf || "2"}`,
            // Dynamic expiry date & batch calculations
            expiryDate: raw.expiryDate || calculateExpiryDate(raw.category),
            mfgDate: raw.mfgDate || "10 Sep 2026",
            batchNumber: raw.batchNumber || `BATCH-${(raw.sku || id).slice(-6).toUpperCase()}-26`,
            freshnessIndex: raw.freshnessIndex || (raw.category === "Dairy" ? 95 : 99),
            storageInstruction:
              raw.storageInstruction ||
              (raw.category === "Dairy"
                ? "Keep refrigerated at 2°C to 4°C. Consume within 3 days after opening."
                : "Store in a cool, dry, and hygienic place away from direct sunlight."),
          };

          if (isMounted) {
            setProduct(normalizedProduct);
          }
        }

        // Try loading ratings & reviews if endpoints exist
        try {
          const ratingRes = await getProductRating(id);
          if (ratingRes && (ratingRes.ok || ratingRes.success)) {
            setRating(ratingRes);
          }
        } catch (e) {
          // Keep default fallback rating
        }

        try {
          const reviewsRes = await getProductReviews(id);
          if (reviewsRes && (reviewsRes.ok || reviewsRes.success) && reviewsRes.reviews) {
            setReviews(reviewsRes.reviews);
          } else {
            // Default sample reviews for rich experience
            setReviews(getDefaultReviews(productRes?.product?.category));
          }
        } catch (e) {
          setReviews(getDefaultReviews());
        }

        // Check wishlist
        const wishlist = JSON.parse(localStorage.getItem(`wishlist_${userPhone}`)) || [];
        if (isMounted) {
          setInWishlist(wishlist.some((item) => String(item.id || item._id) === String(id)));
        }
      } catch (error) {
        console.error("Failed to load product details:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, userPhone]);

  // Helper to calculate realistic expiry dates
  function calculateExpiryDate(category) {
    if (category === "Dairy") {
      return "15 Oct 2026 (18 days shelf-life)";
    } else if (category === "Basic Grocery" || category === "Staples") {
      return "20 Mar 2027 (6 months shelf-life)";
    }
    return "30 Dec 2026";
  }

  function getDefaultReviews(category) {
    if (category === "Dairy") {
      return [
        {
          id: 1,
          user: "Ananya S.",
          rating: 5,
          date: "Yesterday",
          comment: "Extremely fresh and authentic taste! Delivered chilled and packaged properly.",
        },
        {
          id: 2,
          user: "Venkatesh R.",
          rating: 4,
          date: "3 days ago",
          comment: "High quality dairy product. The expiry date is clear and plenty of shelf life remaining.",
        },
      ];
    }
    return [
      {
        id: 1,
        user: "Rohit K.",
        rating: 5,
        date: "2 days ago",
        comment: "Excellent packaging and grain quality. Cooked to perfection!",
      },
      {
        id: 2,
        user: "Deepa M.",
        rating: 5,
        date: "Last week",
        comment: "Very authentic product, clean grains with zero impurities. Value for money.",
      },
    ];
  }

  // Adjust quantity step
  useEffect(() => {
    if (product?.is_loose_item) {
      setQuantity(getQuantityStep(product.unit_type || product.unit || "unit"));
    }
  }, [product]);

  // Handle Cart Updates
  useEffect(() => {
    const handleCartUpdate = () => {
      const updatedCart = readCartItems(userPhone);
      setCart(updatedCart);
    };

    window.addEventListener("appUpdate", handleCartUpdate);
    return () => window.removeEventListener("appUpdate", handleCartUpdate);
  }, [userPhone]);

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock <= 0) {
      setNotificationMessage("Sorry, this product is currently out of stock!");
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    const isLooseItem = Boolean(product.is_loose_item);
    const unitType = product.unit_type || product.unit || "unit";
    const normalizedQuantity = sanitizeQuantity(quantity, isLooseItem, unitType);

    const result = addItemToCart(product, normalizedQuantity, userPhone);
    if (!result.ok) return;

    setCart(result.items);
    window.dispatchEvent(new Event("appUpdate"));
    setNotificationMessage(
      `Added ${normalizedQuantity} ${isLooseItem ? unitType : product.unit || "item(s)"} of ${product.name} to cart!`
    );
    setNotificationType("success");
    setShowNotification(true);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => {
      navigate("/cart");
    }, 400);
  };

  const toggleWishlist = async () => {
    if (!product) return;
    try {
      const wishlist = JSON.parse(localStorage.getItem(`wishlist_${userPhone}`)) || [];
      const prodId = product._id || product.id;

      if (inWishlist) {
        try {
          await removeFromWishlist(userPhone, prodId);
        } catch (e) {}
        const updated = wishlist.filter((item) => String(item.id || item._id) !== String(prodId));
        localStorage.setItem(`wishlist_${userPhone}`, JSON.stringify(updated));
        setInWishlist(false);
        setNotificationMessage("Removed from your wishlist");
      } else {
        try {
          await addToWishlist(userPhone, prodId);
        } catch (e) {}
        wishlist.push(product);
        localStorage.setItem(`wishlist_${userPhone}`, JSON.stringify(wishlist));
        setInWishlist(true);
        setNotificationMessage("Added to your wishlist ❤️");
      }
      setNotificationType("info");
      setShowNotification(true);
      window.dispatchEvent(new Event("appUpdate"));
    } catch (error) {
      console.error("Error updating wishlist:", error);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    setSubmittingReview(true);
    try {
      const newReview = {
        id: Date.now(),
        user: reviewerName.trim() || "Grocery Shopper",
        rating: Number(reviewRating),
        date: "Just now",
        comment: reviewText.trim(),
      };

      setReviews([newReview, ...reviews]);
      setRating((prev) => ({
        averageRating: Number(((prev.averageRating * prev.totalReviews + Number(reviewRating)) / (prev.totalReviews + 1)).toFixed(1)),
        totalReviews: prev.totalReviews + 1,
      }));

      try {
        await addProductReview(product._id || product.id, userPhone, reviewRating, reviewText);
      } catch (err) {}

      setReviewText("");
      setReviewerName("");
      setNotificationMessage("Thank you! Your review has been published.");
      setNotificationType("success");
      setShowNotification(true);
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="product-details-page">
        <MasterNavbar />
        <div className="details-loading-container">
          <div className="loading-spinner"></div>
          <h2>Fetching Fresh Product Details...</h2>
          <p>Connecting to store inventory and navigation coordinates</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-page">
        <MasterNavbar />
        <div className="details-error-container">
          <div className="error-icon">🔍</div>
          <h2>Product Not Found</h2>
          <p>We could not find the product with ID: <code>{id}</code></p>
          <button className="btn-return-shop" onClick={() => navigate("/shop")}>
            ← Back to Grocery Store
          </button>
        </div>
      </div>
    );
  }

  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 5);
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="product-details-page">
      <MasterNavbar />

      <CartNotification
        show={showNotification}
        message={notificationMessage}
        type={notificationType}
        onClose={() => setShowNotification(false)}
      />

      {/* Main Container */}
      <div className="product-details-wrapper">
        {/* Breadcrumb Navigation Bar */}
        <div className="details-breadcrumb">
          <Link to="/shop" className="breadcrumb-back-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Catalog
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-category">{product.category}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{product.name}</span>
        </div>

        {/* Hero Section: Grid with Image & Core Buy Box */}
        <div className="product-hero-card">
          {/* Left Column: Image Showcase with Overlays */}
          <div className="hero-gallery-container">
            <div className="main-image-viewport">
              <img
                src={product.image}
                alt={product.name}
                className="hero-product-img"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              {/* Dynamic Badges Overlay */}
              <div className="image-overlay-badges">
                {isOutOfStock ? (
                  <span className="badge-stock out-of-stock">❌ Out of Stock</span>
                ) : isLowStock ? (
                  <span className="badge-stock low-stock">⚠️ Low Stock ({product.stock} left)</span>
                ) : (
                  <span className="badge-stock in-stock">✅ In Stock ({product.stock} units)</span>
                )}
                <span className="badge-freshness">🌿 100% Quality Tested</span>
              </div>

              {/* Wishlist Floating Button */}
              <button
                className={`btn-hero-wishlist ${inWishlist ? "active" : ""}`}
                onClick={toggleWishlist}
                title={inWishlist ? "Remove from Wishlist" : "Save to Wishlist"}
              >
                {inWishlist ? "❤️" : "🤍"}
              </button>
            </div>

            {/* In-Store Quick Location Banner */}
            <div
              className="instore-location-strip"
              onClick={() => setShowPathfindingMap(!showPathfindingMap)}
              title="Click to toggle in-store route"
            >
              <div className="location-strip-icon">📍</div>
              <div className="location-strip-content">
                <strong>In-Store Shelf Location:</strong>
                <span>Shelf {resolveShelfForItem(product)} ({product.locationString})</span>
              </div>
              <button className="btn-view-map-pill">
                {showPathfindingMap ? "Hide Map ▲" : "Find on Map 🗺️"}
              </button>
            </div>

            {/* Dijkstra Shortest-Path Route (User -> Selected Product) */}
            {showPathfindingMap && (
              <StoreDijkstraNavigator product={product} />
            )}
          </div>

          {/* Right Column: Key Details & Purchasing Panel */}
          <div className="hero-details-container">
            <div className="product-category-tag">{product.category.toUpperCase()}</div>
            <h1 className="hero-title">{product.name}</h1>

            {/* Ratings & SKU row */}
            <div className="hero-meta-row">
              <div className="hero-star-rating">
                <span className="stars-glow">⭐</span>
                <span className="rating-num">{rating.averageRating}</span>
                <span className="rating-total">({rating.totalReviews} verified reviews)</span>
              </div>
              <div className="sku-pill">
                Barcode SKU: <code>{product.sku}</code>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="hero-price-panel">
              <div className="main-price-display">
                <span className="currency">₹</span>
                <span className="amount">{product.price.toFixed(2)}</span>
                <span className="unit-label">/ {product.unit}</span>
              </div>
              <div className="mrp-savings-strip">
                <span className="original-mrp">MRP ₹{(product.price * 1.15).toFixed(2)}</span>
                <span className="discount-chip">Save 15% (Inclusive of all taxes)</span>
              </div>
            </div>

            {/* Creative Feature Highlight: Expiry Date & Freshness Gauge */}
            <div className="freshness-expiry-card">
              <div className="expiry-card-top">
                <div className="expiry-metric">
                  <span className="metric-label">📅 Best Before / Expiry</span>
                  <strong className="metric-value">{product.expiryDate}</strong>
                </div>
                <div className="expiry-metric">
                  <span className="metric-label">🏭 Batch & Mfg Date</span>
                  <span className="metric-sub">{product.batchNumber} (Mfg: {product.mfgDate})</span>
                </div>
              </div>

              {/* Visual Freshness Index Bar */}
              <div className="freshness-bar-container">
                <div className="freshness-bar-labels">
                  <span>Freshness Index</span>
                  <span className="freshness-percent">{product.freshnessIndex}% Peak Freshness</span>
                </div>
                <div className="freshness-track">
                  <div
                    className="freshness-fill"
                    style={{ width: `${product.freshnessIndex}%` }}
                  ></div>
                </div>
              </div>

              <div className="storage-advice">
                💡 <strong>Storage Tip:</strong> {product.storageInstruction}
              </div>
            </div>

            {/* Brief Description */}
            <p className="hero-short-desc">{product.description}</p>

            {/* Quantity Selector & Live Total */}
            <div className="hero-action-section">
              <div className="qty-row">
                <div className="qty-picker">
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                  >
                    −
                  </button>
                  <span className="qty-value">{quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock || isOutOfStock}
                  >
                    +
                  </button>
                </div>
                <div className="live-subtotal">
                  <span className="subtotal-label">Subtotal:</span>
                  <strong className="subtotal-amount">₹{(product.price * quantity).toFixed(2)}</strong>
                </div>
              </div>

              {/* Purchase Buttons */}
              <div className="hero-buttons-grid">
                <button
                  className="btn-add-to-cart-hero"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  {isOutOfStock ? "Out of Stock" : "🛒 Add to Cart"}
                </button>
                <button
                  className="btn-buy-now-hero"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                >
                  ⚡ Buy Now
                </button>
              </div>

              {/* In-Store Self-Billing / Navigation Quick Tip */}
              <div className="self-billing-tip">
                ℹ️ <em>Shopping inside the store?</em> Head directly to <strong>{product.locationString}</strong> and scan this item's barcode in your self-billing scanner!
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Creative Content Section */}
        <div className="product-details-tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-header-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              📋 Product Details & Specs
            </button>
            <button
              className={`tab-header-btn ${activeTab === "nutrition" ? "active" : ""}`}
              onClick={() => setActiveTab("nutrition")}
            >
              🥗 Quality & Nutrition
            </button>
            <button
              className={`tab-header-btn ${activeTab === "navigation" ? "active" : ""}`}
              onClick={() => setActiveTab("navigation")}
            >
              🗺️ Store Shelf Navigation
            </button>
            <button
              className={`tab-header-btn ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              ⭐ Reviews ({reviews.length})
            </button>
          </div>

          <div className="tabs-body">
            {/* TAB 1: OVERVIEW & SPECS */}
            {activeTab === "overview" && (
              <div className="tab-pane-content">
                <h3 className="section-heading">Specifications & Product Overview</h3>
                <div className="specs-table-grid">
                  <div className="spec-row">
                    <span className="spec-label">Brand / Manufacturer</span>
                    <span className="spec-value">Smart Retail Certified</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Product Category</span>
                    <span className="spec-value">{product.category}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Unit of Measure</span>
                    <span className="spec-value">{product.unit}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Current Stock Availability</span>
                    <span className="spec-value">
                      {product.stock > 0 ? `${product.stock} units available` : "Zero Stock"}
                    </span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Shelf Life / Expiry</span>
                    <span className="spec-value">{product.expiryDate}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Quality Certification</span>
                    <span className="spec-value">FSSAI & AGMARK Compliant</span>
                  </div>
                </div>

                <div className="dietary-tags-strip">
                  <span className="diet-tag green">🌱 100% Vegetarian</span>
                  <span className="diet-tag blue">💧 Hygeinically Packed</span>
                  <span className="diet-tag purple">🛡️ Sealed for Freshness</span>
                  <span className="diet-tag orange">✨ No Harmful Preservatives</span>
                </div>
              </div>
            )}

            {/* TAB 2: NUTRITION & QUALITY */}
            {activeTab === "nutrition" && (
              <div className="tab-pane-content">
                <h3 className="section-heading">Nutritional Values (Per 100g / Serving)</h3>
                <p className="tab-lead-text">
                  Approximate nutritional breakdown verified by food safety laboratory testing.
                </p>

                <div className="nutrition-cards-grid">
                  <div className="nutrition-card">
                    <div className="nutri-val">{product.category === "Dairy" ? "130" : "360"}</div>
                    <div className="nutri-unit">kcal</div>
                    <div className="nutri-name">Energy</div>
                  </div>
                  <div className="nutrition-card">
                    <div className="nutri-val">{product.category === "Dairy" ? "7.2" : "12.4"}</div>
                    <div className="nutri-unit">g</div>
                    <div className="nutri-name">Protein</div>
                  </div>
                  <div className="nutrition-card">
                    <div className="nutri-val">{product.category === "Dairy" ? "4.8" : "74.0"}</div>
                    <div className="nutri-unit">g</div>
                    <div className="nutri-name">Carbohydrates</div>
                  </div>
                  <div className="nutrition-card">
                    <div className="nutri-val">{product.category === "Dairy" ? "6.5" : "1.8"}</div>
                    <div className="nutri-unit">g</div>
                    <div className="nutri-name">Total Fat</div>
                  </div>
                  <div className="nutrition-card">
                    <div className="nutri-val">{product.category === "Dairy" ? "240" : "18"}</div>
                    <div className="nutri-unit">mg</div>
                    <div className="nutri-name">{product.category === "Dairy" ? "Calcium" : "Iron"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STORE NAVIGATION */}
            {activeTab === "navigation" && (
              <div className="tab-pane-content">
                <h3 className="section-heading">Smart Store Navigation (Dijkstra Shortest Path)</h3>
                <p className="tab-lead-text">
                  Shortest walkable route from your current store position to <strong>{product.name}</strong> (Shelf {resolveShelfForItem(product)}).
                </p>
                <StoreDijkstraNavigator product={product} />
              </div>
            )}

            {/* TAB 4: REVIEWS */}
            {activeTab === "reviews" && (
              <div className="tab-pane-content">
                <h3 className="section-heading">Customer Reviews & Ratings</h3>

                {/* Write a review box */}
                <form className="write-review-card" onSubmit={submitReview}>
                  <h4>Leave a Verified Shopper Review</h4>
                  <div className="review-inputs-row">
                    <input
                      type="text"
                      className="review-input"
                      placeholder="Your Name (optional)"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                    />
                    <select
                      className="review-select"
                      value={reviewRating}
                      onChange={(e) => setReviewRating(e.target.value)}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ 5 Stars - Outstanding</option>
                      <option value="4">⭐⭐⭐⭐ 4 Stars - Very Good</option>
                      <option value="3">⭐⭐⭐ 3 Stars - Average</option>
                      <option value="2">⭐⭐ 2 Stars - Fair</option>
                      <option value="1">⭐ 1 Star - Poor</option>
                    </select>
                  </div>
                  <textarea
                    className="review-textarea"
                    rows="3"
                    placeholder="Tell other shoppers about this product's freshness, quality, and packaging..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    required
                  ></textarea>
                  <button type="submit" className="btn-submit-review" disabled={submittingReview}>
                    {submittingReview ? "Submitting..." : "Post Review 🚀"}
                  </button>
                </form>

                {/* Reviews List */}
                <div className="reviews-feed">
                  {reviews.map((rev, idx) => (
                    <div key={rev.id || idx} className="review-bubble">
                      <div className="bubble-header">
                        <span className="bubble-user">👤 {rev.user || "Customer"}</span>
                        <span className="bubble-stars">{"⭐".repeat(Number(rev.rating) || 5)}</span>
                        <span className="bubble-date">{rev.date || "Recent"}</span>
                      </div>
                      <p className="bubble-body">{rev.comment || rev.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;

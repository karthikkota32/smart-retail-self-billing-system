import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import MasterNavbar from "../components/MasterNavbar";
import { getProduct, getProductRating, getProductReviews, addProductReview, addToWishlist, removeFromWishlist } from "../services/api";
import CartNotification from "../components/CartNotification";
import { readCartItems, addItemToCart, getQuantityStep, sanitizeQuantity } from "../utils/cartUtils";
import "../styles/ProductDetails.css";

function ProductDetails() {
  const { id } = useParams();
  const userPhone = localStorage.getItem("userPhone") || "guest";
  const [product, setProduct] = useState(null);
  const [rating, setRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [, setCart] = useState(() => readCartItems(userPhone));
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");
  
  // Review form
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const productRes = await getProduct(id);
        if (productRes.ok) {
          setProduct(productRes.product);
        }

        const ratingRes = await getProductRating(id);
        if (ratingRes.ok) {
          setRating(ratingRes);
        }

        const reviewsRes = await getProductReviews(id);
        if (reviewsRes.ok) {
          setReviews(reviewsRes.reviews);
        }

        // Check if in wishlist
        const wishlist = JSON.parse(localStorage.getItem(`wishlist_${userPhone}`)) || [];
        setInWishlist(wishlist.some(item => item.id === parseInt(id)));
      } catch (error) {
        console.error("Failed to load product:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, userPhone]);

  useEffect(() => {
    if (product?.is_loose_item) {
      setQuantity(getQuantityStep(product.unit_type || "unit"));
    }
  }, [product]);

  // Listen for cart updates from other pages
  useEffect(() => {
    const handleCartUpdate = () => {
      const updatedCart = readCartItems(userPhone);
      setCart(updatedCart);
    };

    window.addEventListener("appUpdate", handleCartUpdate);
    return () => window.removeEventListener("appUpdate", handleCartUpdate);
  }, [userPhone]);

  const addToCart = () => {
    if (!product) return;

    const isLooseItem = Boolean(product.is_loose_item);
    const unitType = product.unit_type || "unit";
    const normalizedQuantity = sanitizeQuantity(quantity, isLooseItem, unitType);

    const result = addItemToCart(product, normalizedQuantity, userPhone);
    if (!result.ok) return;

    setCart(result.items);
    window.dispatchEvent(new Event("appUpdate"));
    setNotificationMessage(`Added ${normalizedQuantity} ${isLooseItem ? unitType : "item(s)"} of ${product.name} to cart!`);
    setNotificationType("success");
    setShowNotification(true);
    setQuantity(isLooseItem ? getQuantityStep(unitType) : 1);
  };

  const toggleWishlist = async () => {
    try {
      if (inWishlist) {
        await removeFromWishlist(userPhone, product.id);
        const wishlist = JSON.parse(localStorage.getItem(`wishlist_${userPhone}`)) || [];
        const updated = wishlist.filter(item => item.id !== product.id);
        localStorage.setItem(`wishlist_${userPhone}`, JSON.stringify(updated));
      } else {
        await addToWishlist(userPhone, product.id);
        const wishlist = JSON.parse(localStorage.getItem(`wishlist_${userPhone}`)) || [];
        wishlist.push(product);
        localStorage.setItem(`wishlist_${userPhone}`, JSON.stringify(wishlist));
      }
      setInWishlist(!inWishlist);
    } catch (error) {
      console.error("Error updating wishlist:", error);
    }
  };

  const submitReview = async () => {
    if (reviewRating === 0) {
      alert("Please select a rating");
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await addProductReview(product.id, userPhone, reviewRating, reviewText);
      if (res.ok) {
        alert("Review added successfully!");
        setReviewRating(0);
        setReviewText("");
        
        // Reload reviews
        const reviewsRes = await getProductReviews(id);
        if (reviewsRes.ok) {
          setReviews(reviewsRes.reviews);
        }
        
        const ratingRes = await getProductRating(id);
        if (ratingRes.ok) {
          setRating(ratingRes);
        }
      } else {
        alert(res.message || "Failed to add review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div><MasterNavbar /> <p style={{ textAlign: "center", padding: "40px" }}>Loading...</p></div>;
  if (!product) return <div><MasterNavbar /> <p style={{ textAlign: "center", padding: "40px" }}>Product not found</p></div>;

  return (
    <div className="product-details-page">
      <MasterNavbar />
      
      <div className="product-details-container">
        <div className="product-main">
          <div className="product-image-section">
            <div className="product-image-large">{product.image}</div>
            <div className="product-image-back">{product.backImage}</div>
          </div>

          <div className="product-info-section">
            <h1 className="product-name">{product.name}</h1>
            
            <div className="rating-section">
              <div className="rating-stars">
                {rating && (
                  <>
                    <span className="stars">{"⭐".repeat(Math.floor(rating.averageRating))}</span>
                    <span className="rating-value">{rating.averageRating.toFixed(1)}</span>
                    <span className="review-count">({rating.totalReviews} reviews)</span>
                  </>
                )}
              </div>
            </div>

            <div className="product-category">
              <span className="category-badge">{product.category}</span>
              <span className="location-badge">📍 {product.location}</span>
            </div>

            <div className="price-section">
              <span className="price">₹{product.price}</span>
              {product.is_loose_item && (
                <p style={{ margin: "6px 0 0 0", color: "#4b5563", fontWeight: "600" }}>
                  ₹{Number(product.price_per_unit ?? product.price).toFixed(2)}/{product.unit_type || "unit"}
                </p>
              )}
            </div>

            <div className="description-section">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>

            <div className="stock-info">
              <strong>Stock: </strong>
              <span className={product.stock > 0 ? "in-stock" : "out-of-stock"}>
                {product.stock > 0 ? `${product.stock} available` : "Out of Stock"}
              </span>
            </div>

            <div className="purchase-section">
              <div className="quantity-selector">
                <button
                  onClick={() =>
                    setQuantity(
                      sanitizeQuantity(
                        quantity - (product.is_loose_item ? getQuantityStep(product.unit_type || "unit") : 1),
                        Boolean(product.is_loose_item),
                        product.unit_type || "unit"
                      )
                    )
                  }
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  min={product.is_loose_item ? getQuantityStep(product.unit_type || "unit") : 1}
                  step={product.is_loose_item ? getQuantityStep(product.unit_type || "unit") : 1}
                  onChange={(e) =>
                    setQuantity(
                      sanitizeQuantity(
                        e.target.value,
                        Boolean(product.is_loose_item),
                        product.unit_type || "unit"
                      )
                    )
                  }
                />
                <button
                  onClick={() =>
                    setQuantity(
                      sanitizeQuantity(
                        quantity + (product.is_loose_item ? getQuantityStep(product.unit_type || "unit") : 1),
                        Boolean(product.is_loose_item),
                        product.unit_type || "unit"
                      )
                    )
                  }
                >
                  +
                </button>
                {product.is_loose_item && (
                  <span style={{ marginLeft: "8px", fontWeight: "600", color: "#4b5563" }}>{product.unit_type || "unit"}</span>
                )}
              </div>

              <button
                className="btn-add-cart"
                onClick={addToCart}
                disabled={product.stock <= 0}
              >
                🛒 Add to Cart
              </button>

              <button
                className={`btn-wishlist ${inWishlist ? "active" : ""}`}
                onClick={toggleWishlist}
              >
                {inWishlist ? "❤️ In Wishlist" : "🤍 Add to Wishlist"}
              </button>
            </div>
          </div>
        </div>

        <div className="reviews-section">
          <h2>Customer Reviews</h2>

          <div className="review-form">
            <h3>Leave a Review</h3>
            <div className="rating-selector">
              <label>Rating:</label>
              <div className="stars-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${reviewRating >= star ? "active" : ""}`}
                    onClick={() => setReviewRating(star)}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="review-text"
              placeholder="Share your thoughts about this product..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows="4"
            />

            <button
              className="btn-submit-review"
              onClick={submitReview}
              disabled={submittingReview}
              style={{ marginTop: "12px" }}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>

          <div className="reviews-list">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <span className="review-rating">{"⭐".repeat(review.rating)}</span>
                    <span className="review-date">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="review-text-content">{review.text}</p>
                  <small className="review-phone">{review.phone}</small>
                </div>
              ))
            ) : (
              <p className="no-reviews">No reviews yet. Be the first to review!</p>
            )}
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

export default ProductDetails;

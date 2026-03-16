import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterNavbar from "../components/MasterNavbar";
import { removeFromWishlist } from "../services/api";
import CartNotification from "../components/CartNotification";
import { addItemToCart } from "../utils/cartUtils";
import "../styles/Wishlist.css";

function Wishlist() {
  const navigate = useNavigate();
  const userPhone = localStorage.getItem("userPhone") || "guest";
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");

  useEffect(() => {
    const isGuest = localStorage.getItem("userPhone") === null;
    if (isGuest) {
      navigate("/");
      return;
    }

    const loadWishlist = () => {
      const saved = JSON.parse(localStorage.getItem(`wishlist_${userPhone}`)) || [];
      setWishlistItems(saved);
    };

    loadWishlist();
    window.addEventListener("appUpdate", loadWishlist);
    return () => window.removeEventListener("appUpdate", loadWishlist);
  }, [userPhone, navigate]);

  const removeItem = async (productId) => {
    setLoading(true);
    try {
      await removeFromWishlist(userPhone, productId);
      const updated = wishlistItems.filter((item) => item.id !== productId && item.product_id !== productId);
      setWishlistItems(updated);
      localStorage.setItem(`wishlist_${userPhone}`, JSON.stringify(updated));
      alert("❌ Removed from wishlist");
      window.dispatchEvent(new Event("appUpdate"));
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const result = addItemToCart(item, 1, userPhone);
    if (!result.ok) {
      setNotificationMessage("Unable to add this product to cart");
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    setNotificationMessage(`${item.name} added to cart!`);
    setNotificationType("success");
    setShowNotification(true);
    window.dispatchEvent(new Event("appUpdate"));
  };

  return (
    <div className="wishlist-page">
      <MasterNavbar />

      <div className="wishlist-header">
        <h1>❤️ My Wishlist</h1>
        <p>{wishlistItems.length} item{wishlistItems.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="wishlist-container">
        {wishlistItems.length === 0 ? (
          <div className="empty-wishlist">
            <h2>💔 No Items Yet</h2>
            <p>Start adding products to your wishlist</p>
            <button
              onClick={() => navigate("/shop")}
              className="btn-continue-shopping"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="wishlist-items">
            {wishlistItems.map((item) => (
              <div key={item.id || item.product_id} className="wishlist-item">
                <div
                  className="item-image"
                  onClick={() => navigate(`/product/${item.id}`)}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <span className="image-placeholder">📦</span>
                  )}
                </div>

                <div
                  className="item-info"
                  onClick={() => navigate(`/product/${item.id}`)}
                >
                  <h3>{item.name}</h3>
                  <p className="description">{item.description || "No description available"}</p>
                  <p className="category">Category: {item.category || "N/A"}</p>
                </div>

                <div className="item-actions">
                  <div className="item-price">
                    <p className="price-label">Price</p>
                    <h2>₹{item.price}</h2>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="btn-add-to-cart"
                  >
                    🛒 Add to Cart
                  </button>
                  <button
                    onClick={() => removeItem(item.id || item.product_id)}
                    className="btn-remove"
                    disabled={loading}
                  >
                    ❌ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

export default Wishlist;

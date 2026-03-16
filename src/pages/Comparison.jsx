import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterNavbar from "../components/MasterNavbar";
import { addItemToCart } from "../utils/cartUtils";
import "../styles/Comparison.css";

function Comparison() {
  const navigate = useNavigate();
  const userPhone = localStorage.getItem("userPhone") || "guest";
  const [comparisonItems, setComparisonItems] = useState([]);

  useEffect(() => {
    const isGuest = localStorage.getItem("userPhone") === null;
    if (isGuest) {
      navigate("/");
      return;
    }

    const loadComparison = () => {
      const saved = JSON.parse(localStorage.getItem(`comparison_${userPhone}`)) || [];
      setComparisonItems(saved);
    };

    loadComparison();
    window.addEventListener("appUpdate", loadComparison);
    return () => window.removeEventListener("appUpdate", loadComparison);
  }, [userPhone, navigate]);

  const removeFromComparison = (id) => {
    const updated = comparisonItems.filter((item) => item.id !== id);
    setComparisonItems(updated);
    localStorage.setItem(`comparison_${userPhone}`, JSON.stringify(updated));
    alert("❌ Removed from comparison");
  };

  const addToCart = (item) => {
    const result = addItemToCart(item, 1, userPhone);
    if (!result.ok) return;

    alert(`✅ Added ${item.name} to cart`);
    window.dispatchEvent(new Event("appUpdate"));
  };

  const addAllToCart = () => {
    comparisonItems.forEach((item) => {
      addItemToCart(item, 1, userPhone);
    });

    alert(`✅ Added ${comparisonItems.length} product(s) to cart`);
    window.dispatchEvent(new Event("appUpdate"));
  };

  const clearComparison = () => {
    if (window.confirm("Clear all comparison items?")) {
      setComparisonItems([]);
      localStorage.setItem(`comparison_${userPhone}`, JSON.stringify([]));
    }
  };

  const getLowestPrice = () => {
    return Math.min(...comparisonItems.map(item => item.price));
  };

  const getHighestPrice = () => {
    return Math.max(...comparisonItems.map(item => item.price));
  };

  return (
    <div className="comparison-page">
      <MasterNavbar />

      <div className="comparison-header">
        <h1>⚖️ Product Comparison</h1>
        <p>{comparisonItems.length} product{comparisonItems.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="comparison-container">
        {comparisonItems.length === 0 ? (
          <div className="empty-comparison">
            <h2>📊 No Products to Compare</h2>
            <p>Start comparing products by clicking the compare button on product pages</p>
            <button
              onClick={() => navigate("/shop")}
              className="btn-browse-products"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="comparison-actions">
              <button onClick={addAllToCart} className="btn-add-all">
                🛒 Add All to Cart
              </button>
              <button onClick={clearComparison} className="btn-clear">
                ❌ Clear All
              </button>
            </div>

            <div className="comparison-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Rating</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonItems.map((item) => (
                    <tr key={item.id} className={item.price === getLowestPrice() ? "lowest-price" : ""}>
                      <td className="product-cell">
                        <div className="product-image">
                          {item.image ? (
                            <img src={item.image} alt={item.name} />
                          ) : (
                            <span className="image-placeholder">📦</span>
                          )}
                        </div>
                        <div className="product-info">
                          <h4>
                            {item.name}
                          </h4>
                          <p>{item.description || "No description"}</p>
                        </div>
                      </td>
                      <td className="price-cell">
                        ₹{item.price}
                        {item.price === getLowestPrice() && (
                          <span className="best-price-badge">Best Price</span>
                        )}
                      </td>
                      <td>{item.category || "N/A"}</td>
                      <td className="stock-cell">
                        <span className={item.stock > 0 ? "in-stock" : "out-of-stock"}>
                          {item.stock > 0 ? `In Stock (${item.stock})` : "Out of Stock"}
                        </span>
                      </td>
                      <td className="rating-cell">
                        {item.averageRating ? (
                          <>
                            <span className="stars">{"⭐".repeat(Math.round(item.averageRating))}</span>
                            <span className="rating-value">{item.averageRating.toFixed(1)}</span>
                          </>
                        ) : (
                          "No ratings"
                        )}
                      </td>
                      <td className="action-cell">
                        <button
                          onClick={() => addToCart(item)}
                          className="btn-add"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => removeFromComparison(item.id)}
                          className="btn-remove"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="comparison-summary">
              <div className="summary-card">
                <p className="summary-label">Price Range</p>
                <p className="summary-value">
                  ₹{getLowestPrice()} - ₹{getHighestPrice()}
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-label">Average Price</p>
                <p className="summary-value">
                  ₹{(comparisonItems.reduce((sum, item) => sum + item.price, 0) / comparisonItems.length).toFixed(0)}
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-label">Products Compared</p>
                <p className="summary-value">{comparisonItems.length}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Comparison;

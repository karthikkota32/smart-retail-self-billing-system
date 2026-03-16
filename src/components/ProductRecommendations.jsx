import React, { useState, useEffect, useCallback } from "react";
import { getProductRecommendations } from "../services/api";
import StarRating from "./StarRating";
import "../styles/ProductRecommendations.css";

const ProductRecommendations = ({ userId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProductRecommendations(userId);
      if (data.success) {
        setProducts(data.recommendations);
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchRecommendations();
    }
  }, [userId, fetchRecommendations]);

  const handleProductClick = (productId) => {
    // Navigate to product detail page
    window.location.href = `/product/${productId}`;
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation(); // Prevent card click
    // Add to cart logic
    console.log("Add to cart:", product.name);
  };

  if (!userId || (products.length === 0 && !loading)) {
    return null;
  }

  return (
    <div className="product-recommendations">
      <h3>✨ Recommended For You</h3>
      {loading ? (
        <div className="loading">Loading recommendations...</div>
      ) : (
        <div className="recommendations-grid">
          {products.map((product) => (
            <div
              key={product._id}
              className="recommendation-card"
              onClick={() => handleProductClick(product._id)}
            >
              <div className="product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <div className="no-image">📦</div>
                )}
                {product.stock_quantity === 0 && (
                  <div className="overlay-badge out-of-stock-badge">Out of Stock</div>
                )}
              </div>
              <div className="product-info">
                <h4 className="product-name">{product.name}</h4>
                <p className="product-category">{product.category}</p>
                <div className="product-rating">
                  <StarRating
                    rating={product.average_rating || 0}
                    readonly
                    size="small"
                  />
                  {product.reviews_count > 0 && (
                    <span className="review-count">({product.reviews_count})</span>
                  )}
                </div>
                <div className="product-footer">
                  <div className="product-price">${product.price.toFixed(2)}</div>
                  {product.stock_quantity > 0 && (
                    <button
                      className="add-to-cart-btn"
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      + Cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductRecommendations;

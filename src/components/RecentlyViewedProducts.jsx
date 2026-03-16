import React, { useState, useEffect, useCallback } from "react";
import { getRecentlyViewed } from "../services/api";
import StarRating from "./StarRating";
import "../styles/RecentlyViewedProducts.css";

const RecentlyViewedProducts = ({ userId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentlyViewed = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRecentlyViewed(userId);
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to fetch recently viewed products:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchRecentlyViewed();
    }
  }, [userId, fetchRecentlyViewed]);

  const handleProductClick = (productId) => {
    // Navigate to product detail page
    window.location.href = `/product/${productId}`;
  };

  if (!userId || (products.length === 0 && !loading)) {
    return null;
  }

  return (
    <div className="recently-viewed-products">
      <h3>Recently Viewed</h3>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="products-scroll">
          {products.map((product) => (
            <div
              key={product._id}
              className="recently-viewed-card"
              onClick={() => handleProductClick(product._id)}
            >
              <div className="product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <div className="no-image">📦</div>
                )}
              </div>
              <div className="product-info">
                <h4 className="product-name">{product.name}</h4>
                <div className="product-rating">
                  <StarRating
                    rating={product.average_rating || 0}
                    readonly
                    size="small"
                  />
                </div>
                <div className="product-price">${product.price.toFixed(2)}</div>
                {product.stock_quantity === 0 && (
                  <div className="out-of-stock">Out of Stock</div>
                )}
                {product.stock_quantity > 0 && product.stock_quantity < 5 && (
                  <div className="low-stock">Only {product.stock_quantity} left</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentlyViewedProducts;

import React, { useState, useEffect, useCallback } from "react";
import { getLowStockProducts } from "../services/api";
import "../styles/LowStockAlerts.css";

const LowStockAlerts = ({ threshold = 5 }) => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLowStockProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLowStockProducts(threshold);
      if (data.success) {
        setLowStockProducts(data.low_stock);
        setOutOfStockProducts(data.out_of_stock);
      } else {
        setError(data.message || "Failed to load stock alerts");
      }
    } catch (err) {
      setError("Failed to fetch stock alerts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchLowStockProducts();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLowStockProducts, 60000);
    return () => clearInterval(interval);
  }, [threshold, fetchLowStockProducts]);

  const getTotalAlerts = () => {
    return lowStockProducts.length + outOfStockProducts.length;
  };

  if (loading && getTotalAlerts() === 0) {
    return <div className="low-stock-loading">Loading stock alerts...</div>;
  }

  if (error) {
    return <div className="low-stock-error">⚠️ {error}</div>;
  }

  const totalAlerts = getTotalAlerts();

  if (totalAlerts === 0) {
    return (
      <div className="low-stock-alerts no-alerts">
        <div className="success-message">
          <span className="icon">✓</span>
          <p>All products are well stocked!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="low-stock-alerts">
      <div className="alerts-header">
        <h3>⚠️ Stock Alerts</h3>
        <div className="alert-badge">{totalAlerts} alert{totalAlerts !== 1 ? "s" : ""}</div>
      </div>

      {outOfStockProducts.length > 0 && (
        <div className="alert-section out-of-stock-section">
          <h4 className="section-title">🔴 Out of Stock ({outOfStockProducts.length})</h4>
          <div className="alert-list">
            {outOfStockProducts.map((product) => (
              <div key={product._id} className="alert-item critical">
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-category">{product.category}</div>
                </div>
                <div className="stock-info">
                  <div className="stock-quantity">0 units</div>
                  <span className="status-badge critical">Out of Stock</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="alert-section low-stock-section">
          <h4 className="section-title">🟡 Low Stock ({lowStockProducts.length})</h4>
          <div className="alert-list">
            {lowStockProducts.map((product) => (
              <div key={product._id} className="alert-item warning">
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-category">{product.category}</div>
                </div>
                <div className="stock-info">
                  <div className="stock-quantity">{product.stock_quantity} units</div>
                  <span className="status-badge warning">Low Stock</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStockAlerts;

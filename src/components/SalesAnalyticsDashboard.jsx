import React, { useState, useEffect, useCallback } from "react";
import { getSalesAnalytics } from "../services/api";
import "../styles/SalesAnalyticsDashboard.css";

const SalesAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSalesAnalytics(period);
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.message || "Failed to load analytics");
      }
    } catch (err) {
      setError("Failed to fetch analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="analytics-error">⚠️ {error}</div>;
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="sales-analytics-dashboard">
      <div className="analytics-header">
        <h2>📊 Sales Analytics</h2>
        <div className="period-selector">
          <button
            className={`period-btn ${period === "day" ? "active" : ""}`}
            onClick={() => setPeriod("day")}
          >
            Today
          </button>
          <button
            className={`period-btn ${period === "week" ? "active" : ""}`}
            onClick={() => setPeriod("week")}
          >
            This Week
          </button>
          <button
            className={`period-btn ${period === "month" ? "active" : ""}`}
            onClick={() => setPeriod("month")}
          >
            This Month
          </button>
          <button
            className={`period-btn ${period === "year" ? "active" : ""}`}
            onClick={() => setPeriod("year")}
          >
            This Year
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">{formatCurrency(analytics.total_revenue)}</div>
          </div>
        </div>

        <div className="stat-card orders">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{analytics.total_orders}</div>
          </div>
        </div>

        <div className="stat-card avg-order">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <div className="stat-label">Avg Order Value</div>
            <div className="stat-value">{formatCurrency(analytics.avg_order_value)}</div>
          </div>
        </div>

        <div className="stat-card customers">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">New Customers</div>
            <div className="stat-value">{analytics.new_customers}</div>
          </div>
        </div>
      </div>

      {analytics.best_sellers && analytics.best_sellers.length > 0 && (
        <div className="best-sellers-section">
          <h3>🔥 Top Selling Products</h3>
          <div className="best-sellers-list">
            {analytics.best_sellers.map((product, index) => (
              <div key={product._id} className="best-seller-item">
                <div className="rank">#{index + 1}</div>
                <div className="product-details">
                  <div className="product-name">{product.name}</div>
                  <div className="product-stats">
                    <span className="sold-count">{product.quantity_sold} sold</span>
                    <span className="revenue">{formatCurrency(product.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.revenue_trend && analytics.revenue_trend.length > 0 && (
        <div className="revenue-trend-section">
          <h3>📈 Revenue Trend</h3>
          <div className="trend-chart">
            {analytics.revenue_trend.map((item) => {
              const maxRevenue = Math.max(...analytics.revenue_trend.map((i) => i.revenue));
              const heightPercentage = (item.revenue / maxRevenue) * 100;

              return (
                <div key={item.date} className="trend-bar-wrapper">
                  <div
                    className="trend-bar"
                    style={{ height: `${heightPercentage}%` }}
                    title={`${formatCurrency(item.revenue)}`}
                  >
                    <span className="bar-value">{formatCurrency(item.revenue)}</span>
                  </div>
                  <div className="trend-label">{formatDate(item.date)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesAnalyticsDashboard;

import React, { useState, useEffect } from "react";
import { searchProductsNlp, getNlpSuggestions, getProductInfoNlp } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import "../styles/SmartNlpSearch.css";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60";

const INTENT_LABELS = {
  PRODUCT_SEARCH: "🔍 Product Search",
  GET_PRODUCT_INFO: "ℹ️ Product Details",
  GET_PRODUCT_PRICE: "💰 Price Inquiry",
  GET_PRODUCT_AVAILABILITY: "📦 Stock Check",
  FIND_CHEAPEST: "📉 Cheapest Product",
  FIND_BY_CATEGORY: "🏷️ Category Filter",
  FIND_BY_BRAND: "🏢 Brand Search",
  SEARCH_PRICE_RANGE: "💵 Price Range",
  COMPARE_PRODUCTS: "⚖️ Comparison",
  UNKNOWN: "❓ General Search",
};

export default function SmartNlpSearch({ onAddToCart, onSearchApplied }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nlpData, setNlpData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [focusedProduct, setFocusedProduct] = useState(null);
  const [infoModalProduct, setInfoModalProduct] = useState(null);

  // Load preset suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await getNlpSuggestions();
        if (res && res.suggestions) {
          setSuggestions(res.suggestions);
        }
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      }
    };
    fetchSuggestions();
  }, []);

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery ?? query).trim();
    if (!q) {
      setError("Please enter a natural language search query.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await searchProductsNlp(q);
      if (data && data.success) {
        setNlpData(data);
        setFocusedProduct(data.focusedProduct || null);
        if (onSearchApplied) {
          onSearchApplied(true, data.products || []);
        }
      } else {
        setError(data?.message || "Could not process your search query. Please try again.");
        setNlpData(null);
      }
    } catch (err) {
      console.error("NLP Search Error:", err);
      setError("Unable to connect to the NLP Search Service. Please ensure the backend is running.");
      setNlpData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (suggestionText) => {
    setQuery(suggestionText);
    handleSearch(suggestionText);
  };

  const handleClear = () => {
    setQuery("");
    setNlpData(null);
    setFocusedProduct(null);
    setError(null);
    setInfoModalProduct(null);
    if (onSearchApplied) {
      onSearchApplied(false, null);
    }
  };

  const handleViewProductInfo = async (product) => {
    // If full ingredients/nutrition already exists, open modal directly
    if (product.ingredients && product.ingredients.length > 0) {
      setInfoModalProduct(product);
      return;
    }

    try {
      const res = await getProductInfoNlp({ productId: product.id || product._id, productName: product.name });
      if (res && res.success && res.product) {
        setInfoModalProduct(res.product);
      } else {
        setInfoModalProduct(product);
      }
    } catch {
      setInfoModalProduct(product);
    }
  };

  return (
    <div className="nlp-search-container">
      {/* Header */}
      <div className="nlp-header">
        <div className="nlp-title-wrap">
          <span className="nlp-badge">✨ AI-Powered</span>
          <div>
            <h2 className="nlp-title">Smart Natural Language Search</h2>
            <p className="nlp-subtitle">
              Ask in plain English: prices, brands, dietary choices, or product information
            </p>
          </div>
        </div>
        {nlpData && (
          <button className="nlp-reset-link" onClick={handleClear}>
            ✕ Clear AI Search
          </button>
        )}
      </div>

      {/* Search Bar Form */}
      <form
        className="nlp-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <div className="nlp-input-wrapper">
          <span className="nlp-search-icon">🔍</span>
          <input
            type="text"
            className="nlp-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t("nlp.placeholder", "Search products naturally... e.g., Biscuits under ₹50, Low sugar drinks")}
            disabled={loading}
          />
          {query && (
            <button
              type="button"
              className="nlp-clear-btn"
              onClick={() => setQuery("")}
              title="Clear input"
            >
              ×
            </button>
          )}
        </div>

        <button type="submit" className="nlp-submit-btn" disabled={loading || !query.trim()}>
          {loading ? (
            <>
              <span className="nlp-spinner" />
              <span>{t("common.loading", "Analyzing...")}</span>
            </>
          ) : (
            <>
              <span>{t("nlp.search_btn", "Ask AI")}</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>

      {/* Example Suggestion Chips */}
      <div className="nlp-suggestions-bar">
        <span className="nlp-suggestions-label">{t("nlp.examples_label", "Try asking:")}</span>
        {suggestions.slice(0, 7).map((item, index) => (
          <button
            key={index}
            type="button"
            className="nlp-chip"
            onClick={() => handleChipClick(item.query)}
            disabled={loading}
          >
            {item.query}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="nlp-empty-state" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
          <div className="nlp-empty-icon">⚠️</div>
          <div className="nlp-empty-text" style={{ color: "#991b1b" }}>{error}</div>
          <div className="nlp-empty-hint">Try clicking one of the suggested query chips above.</div>
        </div>
      )}

      {/* AI Understanding Badge & Entities */}
      {nlpData && (
        <div className="nlp-understanding-card">
          <div className="nlp-understanding-top">
            <span className={`nlp-intent-badge nlp-intent-${nlpData.intent}`}>
              {INTENT_LABELS[nlpData.intent] || nlpData.intent}
            </span>

            {/* Extracted Entity Tags */}
            <div className="nlp-entities-wrap">
              {nlpData.entities?.category && (
                <span className="nlp-entity-pill">🏷️ Category: {nlpData.entities.category}</span>
              )}
              {nlpData.entities?.brand && (
                <span className="nlp-entity-pill">🏢 Brand: {nlpData.entities.brand}</span>
              )}
              {nlpData.entities?.maxPrice !== null && nlpData.entities?.maxPrice !== undefined && (
                <span className="nlp-entity-pill">💵 Max: ₹{nlpData.entities.maxPrice}</span>
              )}
              {nlpData.entities?.minPrice !== null && nlpData.entities?.minPrice !== undefined && (
                <span className="nlp-entity-pill">💵 Min: ₹{nlpData.entities.minPrice}</span>
              )}
              {nlpData.entities?.attributes?.map((attr, idx) => (
                <span key={idx} className="nlp-entity-pill">✨ {attr}</span>
              ))}
              {nlpData.entities?.sortBy === "price_asc" && (
                <span className="nlp-entity-pill">📉 Sort: Low to High</span>
              )}
            </div>
          </div>

          <p className="nlp-summary-text">
            <span>💡</span>
            <span>{nlpData.summary}</span>
          </p>
        </div>
      )}

      {/* Focused Product Card (for GET_PRODUCT_INFO, GET_PRODUCT_PRICE, or FIND_CHEAPEST) */}
      {focusedProduct && (
        <div className="nlp-product-info-highlight">
          <div className="nlp-info-grid">
            <div className="nlp-info-image-wrap">
              <img
                src={focusedProduct.image || FALLBACK_IMAGE}
                alt={focusedProduct.name}
                className="nlp-info-image"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
            </div>

            <div className="nlp-info-body">
              <div className="nlp-info-topline">
                <div>
                  <h3 className="nlp-info-title">{focusedProduct.name}</h3>
                  <div className="nlp-info-tags" style={{ marginTop: "6px" }}>
                    {focusedProduct.brand && (
                      <span className="nlp-info-brand">Brand: {focusedProduct.brand}</span>
                    )}
                    <span className="nlp-info-category">{focusedProduct.category}</span>
                    {focusedProduct.barcode && (
                      <span className="nlp-entity-pill">Barcode: {focusedProduct.barcode}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="nlp-info-price-row">
                <span className="nlp-info-price">₹{Number(focusedProduct.price).toFixed(2)}</span>
                <span
                  className={`nlp-info-stock-badge ${
                    focusedProduct.stock > 0 ? "nlp-stock-in" : "nlp-stock-out"
                  }`}
                >
                  {focusedProduct.stock > 0
                    ? `✓ In Stock (${focusedProduct.stock} left)`
                    : "✗ Out of Stock"}
                </span>
                {focusedProduct.rating > 0 && (
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b" }}>
                    ★ {focusedProduct.rating} ({focusedProduct.reviews_count || 0})
                  </span>
                )}
              </div>

              <p className="nlp-info-desc">{focusedProduct.description}</p>

              {/* Ingredients */}
              {focusedProduct.ingredients && focusedProduct.ingredients.length > 0 && (
                <div>
                  <div className="nlp-section-title">Ingredients</div>
                  <div className="nlp-ingredients-list">
                    {focusedProduct.ingredients.map((ing, i) => (
                      <span key={i} className="nlp-ingredient-tag">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nutritional Information */}
              {focusedProduct.nutritional_info &&
                Object.keys(focusedProduct.nutritional_info).length > 0 && (
                  <div>
                    <div className="nlp-section-title">Nutritional Information</div>
                    <div className="nlp-nutrition-grid">
                      {Object.entries(focusedProduct.nutritional_info).map(([key, value], i) => (
                        <div key={i} className="nlp-nutrition-item">
                          <div className="nlp-nutrition-label">
                            {key.replace(/_/g, " ")}
                          </div>
                          <div className="nlp-nutrition-value">{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="nlp-info-actions">
                <button
                  type="button"
                  className="nlp-add-cart-btn"
                  disabled={focusedProduct.stock <= 0}
                  onClick={() => onAddToCart && onAddToCart(focusedProduct)}
                >
                  🛒 Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid for Multiple Products */}
      {nlpData && nlpData.products && nlpData.products.length > 0 && (
        <div>
          <div className="nlp-results-heading">
            <h3 className="nlp-results-title">
              Search Results ({nlpData.products.length})
            </h3>
          </div>

          <div className="nlp-results-grid">
            {nlpData.products.map((product, index) => (
              <div key={product.id || index} className="nlp-card">
                <div className="nlp-card-image-wrap">
                  <img
                    src={product.image || FALLBACK_IMAGE}
                    alt={product.name}
                    className="nlp-card-image"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  {nlpData.intent === "FIND_CHEAPEST" && index === 0 && (
                    <span className="nlp-rank-badge">🏆 Best Price</span>
                  )}
                </div>

                <div className="nlp-card-content">
                  <div className="nlp-card-meta">
                    <span>{product.brand || product.category}</span>
                    <span
                      style={{
                        color: product.stock > 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {product.stock > 0 ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  <h4 className="nlp-card-title">{product.name}</h4>
                  <p className="nlp-card-desc">{product.description}</p>

                  <div className="nlp-card-bottom">
                    <span className="nlp-card-price">
                      ₹{Number(product.price).toFixed(2)}
                    </span>
                    <div className="nlp-card-actions">
                      <button
                        type="button"
                        className="nlp-card-info-btn"
                        onClick={() => handleViewProductInfo(product)}
                        title="View complete specifications"
                      >
                        ℹ️ Info
                      </button>
                      <button
                        type="button"
                        className="nlp-card-cart-btn"
                        disabled={product.stock <= 0}
                        onClick={() => onAddToCart && onAddToCart(product)}
                      >
                        + Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zero results */}
      {nlpData && (!nlpData.products || nlpData.products.length === 0) && (
        <div className="nlp-empty-state">
          <div className="nlp-empty-icon">🔍</div>
          <div className="nlp-empty-text">No matching products found</div>
          <div className="nlp-empty-hint">{nlpData.summary}</div>
        </div>
      )}

      {/* Product Details Modal (for info click) */}
      {infoModalProduct && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setInfoModalProduct(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              maxWidth: "650px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setInfoModalProduct(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              ×
            </button>

            <div style={{ display: "flex", gap: "20px", marginBottom: "16px", alignItems: "center" }}>
              <img
                src={infoModalProduct.image || FALLBACK_IMAGE}
                alt={infoModalProduct.name}
                style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "10px" }}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#4338ca", background: "#e0e7ff", padding: "3px 8px", borderRadius: "4px" }}>
                  {infoModalProduct.brand || "Brand"}
                </span>
                <h3 style={{ margin: "6px 0 4px 0", fontSize: "18px", color: "#0f172a" }}>
                  {infoModalProduct.name}
                </h3>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a" }}>
                  ₹{Number(infoModalProduct.price).toFixed(2)}
                </div>
              </div>
            </div>

            <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6 }}>
              {infoModalProduct.description}
            </p>

            {infoModalProduct.ingredients && infoModalProduct.ingredients.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div className="nlp-section-title">Ingredients</div>
                <div className="nlp-ingredients-list">
                  {infoModalProduct.ingredients.map((ing, i) => (
                    <span key={i} className="nlp-ingredient-tag">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {infoModalProduct.nutritional_info &&
              Object.keys(infoModalProduct.nutritional_info).length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div className="nlp-section-title">Nutritional Breakdown</div>
                  <div className="nlp-nutrition-grid">
                    {Object.entries(infoModalProduct.nutritional_info).map(([k, v], i) => (
                      <div key={i} className="nlp-nutrition-item">
                        <div className="nlp-nutrition-label">{k.replace(/_/g, " ")}</div>
                        <div className="nlp-nutrition-value">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="nlp-card-info-btn"
                onClick={() => setInfoModalProduct(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="nlp-add-cart-btn"
                disabled={infoModalProduct.stock <= 0}
                onClick={() => {
                  if (onAddToCart) onAddToCart(infoModalProduct);
                  setInfoModalProduct(null);
                }}
              >
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

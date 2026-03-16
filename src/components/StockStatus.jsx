import { isProductInStock, getStockStatusText, getStockStatusColor } from "../hooks/useRealtimeProducts";

/**
 * Stock Status Badge Component
 * Shows real-time stock availability with color-coded status
 */
export const StockStatusBadge = ({ product, compact = false }) => {
  const statusText = getStockStatusText(product);
  const statusColor = getStockStatusColor(product);

  if (compact) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "inline-block",
          padding: "6px 12px",
          borderRadius: "6px",
          background: statusColor,
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {statusText}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        padding: "10px 12px",
        borderRadius: "8px",
        background: statusColor,
        color: "white",
        fontSize: "13px",
        fontWeight: "bold",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {statusText}
    </div>
  );
};

/**
 * Stock Status Indicator for Product Cards
 * Shows whether product is available or out of stock
 */
export const StockIndicator = ({ product }) => {
  const isInStock = isProductInStock(product);

  if (!isInStock) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0, 0, 0, 0.7)",
          borderRadius: "12px",
          backdropFilter: "blur(2px)",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "24px", marginBottom: "4px" }}>📦</div>
          <div style={{ fontSize: "12px", fontWeight: "bold" }}>Out of Stock</div>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Add to Cart Button with Stock-aware State
 */
export const AddToCartButton = ({ product, onClick, disabled = false }) => {
  const isInStock = isProductInStock(product);
  const isDisabled = disabled || !isInStock;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={isInStock ? "Add to cart" : "Product is out of stock"}
      style={{
        background: isInStock ? "#667eea" : "#d1d5db",
        color: isInStock ? "white" : "#9ca3af",
        padding: "10px 12px",
        borderRadius: "8px",
        border: "none",
        cursor: isInStock ? "pointer" : "not-allowed",
        fontWeight: "600",
        fontSize: "12px",
        touchAction: "manipulation",
        opacity: isInStock ? 1 : 0.6,
        transition: "all 0.2s",
        width: "100%",
        height: "44px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
      }}
      onMouseEnter={(e) => {
        if (isInStock) {
          e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.2)";
        }
      }}
      onMouseLeave={(e) => {
        if (isInStock) {
          e.target.style.boxShadow = "none";
        }
      }}
    >
      {isInStock ? "🛒 Add to Cart" : "❌ Out of Stock"}
    </button>
  );
};

/**
 * Notify Me Button for Out of Stock Products
 */
export const NotifyMeButton = ({ product, onClick, disabled = false }) => {
  const isInStock = isProductInStock(product);

  if (isInStock) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "#111827",
        color: "white",
        padding: "8px 6px",
        borderRadius: "6px",
        border: "none",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "clamp(10px, 2.5vw, 12px)",
        touchAction: "manipulation",
        transition: "all 0.2s",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "#374151";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "#111827";
      }}
    >
      🔔 Notify When Available
    </button>
  );
};

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for real-time product fetching with live stock availability
 * Automatically polls the API to get fresh product data
 */
export const useRealtimeProducts = (pollIntervalMs = 2500) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const configuredApiBase = (import.meta.env.VITE_API_BASE || "").trim().replace(/\/+$/, "");
  const isLocalDevHost =
    typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const apiBase = configuredApiBase || (isLocalDevHost
    ? "http://localhost:5000"
    : "https://smart-retail-self-billing-system.onrender.com");

  /**
   * Fetch fresh product data from backend
   * Always gets latest stock status from database
   */
  const fetchProductsData = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/mongo/products`, {
        method: "GET",
        cache: "no-store", // Prevent caching
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.products && isMountedRef.current) {
        // Transform MongoDB products to match app format
        const transformedProducts = data.products.map((p) => {
          const resolvedStock = Number(
            p.stockQuantity !== undefined
              ? p.stockQuantity
              : (p.stock_quantity !== undefined ? p.stock_quantity : (p.stock ?? 0))
          ) || 0;

          const resolvedImage =
            p.imageUrl || p.image_url || p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500";

          const resolvedLocation =
            typeof p.location === "object" && p.location !== null
              ? `Aisle ${p.location.aisle || ""}, Shelf ${p.location.shelf || ""}`
              : (p.location || "");

          return {
            id: p._id,
            name: p.name,
            price: p.price,
            price_per_unit: p.price_per_unit ?? p.price,
            unit_type: p.unit_type || p.unit || "unit",
            is_loose_item: Boolean(p.is_loose_item),
            description: p.description || "",
            category: p.category || "General",
            brand: p.brand || "",
            stock: resolvedStock,
            stock_quantity: resolvedStock,
            stockQuantity: resolvedStock,
            image: resolvedImage,
            imageUrl: resolvedImage,
            image_url: resolvedImage,
            backImage: p.back_image_url || p.backImage || "",
            discount: p.discount || 0,
            rating: p.rating || 0,
            reviews: p.reviews || [],
            location: resolvedLocation,
            barcode: p.sku || p.barcode || "",
            sku: p.sku || p.barcode || "",
            _id: p._id,
          };
        });

        setProducts(transformedProducts);
        setError(null);
        console.log(`✓ Products updated: ${transformedProducts.length} items, fresh from DB`);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [apiBase]);

  /**
   * Initial load and set up polling & real-time event listeners
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchProductsData();

    // Instant update when orders/checkout/stock changes occur
    const handleInstantUpdate = () => {
      console.log("⚡ Instant stock refresh triggered by application event");
      fetchProductsData();
    };

    window.addEventListener("appUpdate", handleInstantUpdate);
    window.addEventListener("stockUpdate", handleInstantUpdate);
    window.addEventListener("focus", handleInstantUpdate);

    // Set up polling interval for real-time background sync
    pollTimerRef.current = setInterval(() => {
      fetchProductsData();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("appUpdate", handleInstantUpdate);
      window.removeEventListener("stockUpdate", handleInstantUpdate);
      window.removeEventListener("focus", handleInstantUpdate);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchProductsData, pollIntervalMs]);

  /**
   * Manual refresh function (call when user needs immediate update)
   */
  const refreshProducts = useCallback(async () => {
    console.log("🔄 Manual refresh triggered");
    await fetchProductsData();
  }, [fetchProductsData]);

  return {
    products,
    loading,
    error,
    refreshProducts,
  };
};

/**
 * Helper function to check if product is in stock
 */
export const isProductInStock = (product) => {
  if (!product) return false;
  const stock = product.stockQuantity !== undefined
    ? product.stockQuantity
    : (product.stock_quantity !== undefined ? product.stock_quantity : product.stock);
  return Number(stock) > 0;
};

/**
 * Helper function to get stock status text
 */
export const getStockStatusText = (product) => {
  if (!product) return "Out of Stock";
  const stock = product.stockQuantity !== undefined
    ? product.stockQuantity
    : (product.stock_quantity !== undefined ? product.stock_quantity : product.stock);
  const stockNum = Number(stock) || 0;

  if (stockNum <= 0) {
    return "Out of Stock";
  } else if (stockNum < 10) {
    return `Only ${stockNum} left!`;
  } else {
    return `In Stock (${stockNum})`;
  }
};

/**
 * Helper function to get stock status color
 */
export const getStockStatusColor = (product) => {
  if (!product) return "#dc2626";
  const stock = product.stockQuantity !== undefined
    ? product.stockQuantity
    : (product.stock_quantity !== undefined ? product.stock_quantity : product.stock);
  const stockNum = Number(stock) || 0;

  if (stockNum <= 0) {
    return "#dc2626"; // Red
  } else if (stockNum < 10) {
    return "#f97316"; // Orange
  } else {
    return "#16a34a"; // Green
  }
};

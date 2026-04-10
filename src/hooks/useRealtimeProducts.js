import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for real-time product fetching with live stock availability
 * Automatically polls the API to get fresh product data
 */
export const useRealtimeProducts = (pollIntervalMs = 5000) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const configuredApiBase = (import.meta.env.VITE_API_BASE || "").trim().replace(/\/+$/, "");
  const apiBase = configuredApiBase || "https://smart-retail-self-billing-system.onrender.com";

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
        const transformedProducts = data.products.map((p) => ({
          id: p._id,
          name: p.name,
          price: p.price,
          price_per_unit: p.price_per_unit ?? p.price,
          unit_type: p.unit_type || "unit",
          is_loose_item: Boolean(p.is_loose_item),
          description: p.description || "",
          category: p.category || "General",
          brand: p.brand || "",
          stock: p.stock_quantity || p.stock || 0,
          stock_quantity: p.stock_quantity || p.stock || 0,
          image: p.image_url || p.image || "https://via.placeholder.com/300x300",
          backImage: p.back_image_url || p.backImage || "",
          discount: p.discount || 0,
          rating: p.rating || 0,
          reviews: p.reviews || [],
          location: p.location || "",
          barcode: p.barcode || "",
          _id: p._id,
        }));

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
   * Initial load and set up polling
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchProductsData();

    // Set up polling interval for real-time updates
    pollTimerRef.current = setInterval(() => {
      console.log("📡 Polling for fresh product data...");
      fetchProductsData();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
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
  const stock = product.stock_quantity !== undefined ? product.stock_quantity : product.stock;
  return Number(stock) > 0;
};

/**
 * Helper function to get stock status text
 */
export const getStockStatusText = (product) => {
  const stock = product.stock_quantity !== undefined ? product.stock_quantity : product.stock;
  const stockNum = Number(stock);

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
  const stock = product.stock_quantity !== undefined ? product.stock_quantity : product.stock;
  const stockNum = Number(stock);

  if (stockNum <= 0) {
    return "#dc2626"; // Red
  } else if (stockNum < 10) {
    return "#f97316"; // Orange
  } else {
    return "#16a34a"; // Green
  }
};

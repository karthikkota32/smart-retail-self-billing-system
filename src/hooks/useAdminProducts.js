import { useState, useEffect, useCallback, useRef } from "react";
import { getMongoProducts } from "../services/api";

/**
 * Custom hook for real-time product management in Admin Panel
 * Handles syncing: Admin Panel UI ↔ Backend Server ↔ MongoDB
 */
export const useAdminProducts = (pollIntervalMs = 3000) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState("synced"); // 'synced', 'syncing', 'error'
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch fresh product data from MongoDB via backend
   * This ensures we always get the latest data from the source of truth
   */
  const fetchProducts = useCallback(async (silentFail = false) => {
    try {
      setSyncStatus("syncing");
      const response = await getMongoProducts();

      if (response.success && response.products && isMountedRef.current) {
        setProducts(response.products);
        setSyncStatus("synced");
        setError(null);
        console.log(`✓ Admin products synced: ${response.products.length} items`);
        return true;
      } else if (!silentFail) {
        throw new Error(response.message || "Failed to fetch products");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      if (!silentFail && isMountedRef.current) {
        setSyncStatus("error");
        setError(err.message);
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Initial fetch and set up polling
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchProducts();

    // Set up polling for real-time sync
    pollTimerRef.current = setInterval(() => {
      console.log("🔄 Admin polling for product updates...");
      fetchProducts(true); // Silent fail to avoid spam
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchProducts, pollIntervalMs]);

  /**
   * Manual refresh function (call after add/edit/delete)
   */
  const refreshProducts = useCallback(async () => {
    console.log("🔄 Manual admin products refresh triggered");
    return await fetchProducts();
  }, [fetchProducts]);

  /**
   * Remove product from local state immediately for UI responsiveness
   * Then verify with backend on next sync
   */
  const removeProductLocal = useCallback((productId) => {
    setProducts((prev) => prev.filter((p) => p._id !== productId));
  }, []);

  /**
   * Add product to local state immediately for UI responsiveness
   */
  const addProductLocal = useCallback((product) => {
    setProducts((prev) => [product, ...prev]);
  }, []);

  /**
   * Update product in local state immediately for UI responsiveness
   */
  const updateProductLocal = useCallback((productId, updates) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === productId ? { ...p, ...updates } : p))
    );
  }, []);

  return {
    products,
    loading,
    error,
    syncStatus,
    refreshProducts,
    fetchProducts,
    removeProductLocal,
    addProductLocal,
    updateProductLocal,
  };
};

/**
 * Helper to check if product has changes
 */
export const hasProductChanges = (oldProduct, newData) => {
  return (
    oldProduct.name !== newData.name ||
    oldProduct.description !== newData.description ||
    oldProduct.price !== parseFloat(newData.price) ||
    oldProduct.stock_quantity !== parseInt(newData.stock_quantity) ||
    oldProduct.category !== newData.category ||
    oldProduct.image_url !== newData.image_url ||
    oldProduct.location !== newData.location
  );
};

/**
 * Helper to format product for API submission
 */
export const formatProductData = (formData) => {
  return {
    name: formData.name.trim(),
    description: formData.description.trim(),
    price: parseFloat(formData.price),
    stock_quantity: parseInt(formData.stock_quantity) || 0,
    category: formData.category.trim(),
    image_url: formData.image_url.trim(),
    location: formData.location.trim(),
  };
};

const configuredApiBase = (import.meta.env.VITE_API_BASE || "").trim().replace(/\/+$/, "");
const isLocalDevHost =
  typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = configuredApiBase || (isLocalDevHost
  ? "http://localhost:5000"
  : "https://smart-retail-self-billing-system.onrender.com");

// Auth endpoints
export const registerUser = async (username, name, phone, email, password) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, name, phone, email, password }),
  });
  return res.json();
};

export const loginUser = async (username, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
};

// Product endpoints
export const getProducts = async () => {
  const res = await fetch(`${API_BASE}/products`);
  return res.json();
};

export const searchProducts = async (query, category, minPrice, maxPrice, sortBy) => {
  const params = new URLSearchParams();
  if (query) params.append("q", query);
  if (category) params.append("category", category);
  if (minPrice) params.append("minPrice", minPrice);
  if (maxPrice) params.append("maxPrice", maxPrice);
  if (sortBy) params.append("sortBy", sortBy);

  const res = await fetch(`${API_BASE}/products/search?${params}`);
  return res.json();
};

export const getProductsByCategory = async (category) => {
  const res = await fetch(`${API_BASE}/products/category/${category}`);
  return res.json();
};

export const getCategories = async () => {
  const res = await fetch(`${API_BASE}/categories`);
  return res.json();
};

export const getProduct = async (productId) => {
  try {
    // 1. Try MongoDB product endpoint
    const mongoRes = await fetch(`${API_BASE}/api/mongo/products/${productId}`);
    if (mongoRes.ok) {
      const data = await mongoRes.json();
      const product = data.product || data.data;
      if (product) {
        return { ok: true, success: true, product };
      }
    }
  } catch (err) {
    console.warn("MongoDB product lookup error:", err);
  }

  try {
    // 2. Try Node Catalog & Inventory module on port 5001
    const catalogRes = await fetch(`http://localhost:5001/api/products/${productId}`);
    if (catalogRes.ok) {
      const data = await catalogRes.json();
      if (data && data.data) {
        return { ok: true, success: true, product: data.data };
      }
    }
  } catch (err) {
    // fallback
  }

  try {
    // 3. Fallback to legacy SQLite endpoint
    const res = await fetch(`${API_BASE}/products/${productId}`);
    const data = await res.json();
    return { ok: res.ok, success: res.ok, ...(data.product ? data : { product: data }) };
  } catch (err) {
    return { ok: false, success: false, error: err.message };
  }
};

export const seedProducts = async () => {
  const res = await fetch(`${API_BASE}/products/seed`);
  return res.json();
};

// MongoDB Product endpoints
export const getMongoProducts = async () => {
  const res = await fetch(`${API_BASE}/api/mongo/products`);
  return res.json();
};

export const getMongoProduct = async (productId) => {
  try {
    const res = await fetch(`${API_BASE}/api/mongo/products/${productId}`);
    const data = await res.json();
    return { ok: res.ok, success: res.ok, product: data.product || data.data, ...data };
  } catch (err) {
    return { ok: false, success: false, error: err.message };
  }
};

export const createMongoProduct = async (productData) => {
  const res = await fetch(`${API_BASE}/api/mongo/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  return res.json();
};

export const updateMongoProduct = async (productId, productData) => {
  const res = await fetch(`${API_BASE}/api/mongo/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  return res.json();
};

export const deleteMongoProduct = async (productId) => {
  const res = await fetch(`${API_BASE}/api/mongo/products/${productId}`, {
    method: "DELETE",
  });
  return res.json();
};

// Order endpoints
export const createOrder = async (phone, items, total, paymentMode) => {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, items, total, paymentMode }),
  });
  return res.json();
};

export const getOrders = async (phone) => {
  const res = await fetch(`${API_BASE}/orders/${phone}`);
  return res.json();
};

// Product Rating endpoint
export const getProductRating = async (productId) => {
  try {
    const res = await fetch(`${API_BASE}/api/products/${productId}/rating`);
    return res.json();
  } catch (err) {
    console.warn("Could not fetch rating:", err);
    return { rating: 0, count: 0 };
  }
};

// Review endpoints (updated for new backend API)
export const getProductReviews = async (productId) => {
  const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`);
  return res.json();
};

export const addProductReview = async (productId, userId, username, rating, reviewText) => {
  const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, username, rating, review_text: reviewText }),
  });
  return res.json();
};

// Wishlist endpoints
export const getWishlist = async (phone) => {
  const res = await fetch(`${API_BASE}/wishlist/${phone}`);
  return res.json();
};

export const addToWishlist = async (phone, productId) => {
  const res = await fetch(`${API_BASE}/wishlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, product_id: productId }),
  });
  return res.json();
};

export const removeFromWishlist = async (phone, productId) => {
  const res = await fetch(`${API_BASE}/wishlist/${phone}/${productId}`, {
    method: "DELETE",
  });
  return res.json();
};

// Coupon endpoints
export const getCoupons = async () => {
  const res = await fetch(`${API_BASE}/coupons`);
  return res.json();
};

export const validateCoupon = async (code, total) => {
  const res = await fetch(`${API_BASE}/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, total }),
  });
  return res.json();
};

export const createCoupon = async (code, discountPercent, maxDiscount, minPurchase, expiryDate, usageLimit, admin_username) => {
  const admin = admin_username || localStorage.getItem("username") || "admin";
  const res = await fetch(`${API_BASE}/admin/coupons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, discountPercent, maxDiscount, minPurchase, expiryDate, usageLimit, admin_username: admin }),
  });
  return res.json();
};

// Profile endpoints
export const getProfile = async (phone) => {
  const res = await fetch(`${API_BASE}/profile/${phone}`);
  return res.json();
};

export const updateProfile = async (phone, name, email, oldPassword, newPassword) => {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, name, email, oldPassword, newPassword }),
  });
  return res.json();
};

// Admin Product endpoints
export const getAdminProducts = async () => {
  const res = await fetch(`${API_BASE}/admin/products`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

export const createProduct = async (product, admin_username) => {
  const res = await fetch(`${API_BASE}/admin/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...product, admin_username }),
  });
  return res.json();
};

export const updateProduct = async (productId, updates, admin_username) => {
  const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...updates, admin_username }),
  });
  return res.json();
};

export const deleteProduct = async (productId, admin_username) => {
  const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_username }),
  });
  return res.json();
};

export const updateProductStock = async (productId, stock, adjustment, admin_username) => {
  const res = await fetch(`${API_BASE}/admin/products/${productId}/stock`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock, adjustment, admin_username }),
  });
  return res.json();
};

// Admin Order endpoints
export const getAdminOrders = async () => {
  const res = await fetch(`${API_BASE}/admin/orders`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

export const getAdminOrdersByPhone = async (phone) => {
  const res = await fetch(`${API_BASE}/admin/orders/${phone}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

export const getAdminOrdersByStatus = async (status) => {
  const res = await fetch(`${API_BASE}/admin/orders/status/${status}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

export const updateOrderStatus = async (orderId, status, admin_username) => {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, admin_username }),
  });
  return res.json();
};

export const getOrderStats = async () => {
  const res = await fetch(`${API_BASE}/admin/orders/stats`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

// ============= MONGODB USER MANAGEMENT ENDPOINTS =============

// User registration and login (MongoDB)
export const registerUserMongo = async (username, name, phone, email, password) => {
  const res = await fetch(`${API_BASE}/api/users/register-mongo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, name, phone, email, password }),
  });
  return res.json();
};

export const loginUserMongo = async (username, password) => {
  const res = await fetch(`${API_BASE}/api/users/login-mongo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
};

// MongoDB Orders
export const createOrderMongo = async (username, items, total, paymentMethod, shippingAddress) => {
  const res = await fetch(`${API_BASE}/api/orders/mongo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, items, total, paymentMethod, shipping_address: shippingAddress }),
  });
  return res.json();
};

// ============= ADMIN USER MANAGEMENT ENDPOINTS =============

// Get all users
export const getAllUsers = async () => {
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

// Get specific user details with login history and orders
export const getUserDetails = async (userId) => {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

// Get user's login history
export const getUserLoginHistory = async (userId) => {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/login-history`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

// Get user's orders/payment history
export const getUserOrders = async (userId) => {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/orders`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

// Get admin dashboard statistics
export const getAdminDashboardStats = async () => {
  const res = await fetch(`${API_BASE}/api/admin/dashboard/stats`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};


// ============= ADVANCED SEARCH & FILTERS =============

export const advancedProductSearch = async (filters) => {
  const params = new URLSearchParams();
  if (filters.query) params.append("q", filters.query);
  if (filters.category) params.append("category", filters.category);
  if (filters.minPrice) params.append("min_price", filters.minPrice);
  if (filters.maxPrice) params.append("max_price", filters.maxPrice);
  if (filters.minRating) params.append("min_rating", filters.minRating);
  if (filters.sortBy) params.append("sort_by", filters.sortBy);
  if (filters.inStockOnly) params.append("in_stock", "true");
  
  const res = await fetch(`${API_BASE}/api/products/search/advanced?${params}`);
  return res.json();
};


// ============= MULTIPLE SHIPPING ADDRESSES =============

export const addShippingAddress = async (userId, address) => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/addresses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(address),
  });
  return res.json();
};

export const getShippingAddresses = async (userId) => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/addresses`);
  return res.json();
};


// ============= LOW STOCK ALERTS (ADMIN) =============

export const getLowStockProducts = async (threshold = 5) => {
  const res = await fetch(`${API_BASE}/api/admin/products/low-stock?threshold=${threshold}`);
  return res.json();
};


// ============= SALES ANALYTICS (ADMIN) =============

export const getSalesAnalytics = async (period = "week") => {
  const res = await fetch(`${API_BASE}/api/admin/analytics/sales?period=${period}`);
  return res.json();
};


// ============= USER NOTIFICATIONS =============

export const createNotification = async (userId, title, message, type = "info") => {
  const res = await fetch(`${API_BASE}/api/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, title, message, type }),
  });
  return res.json();
};

export const getUserNotifications = async (userId) => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/notifications`);
  return res.json();
};

export const markNotificationRead = async (notificationId) => {
  const res = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};


// ============= RECENTLY VIEWED PRODUCTS =============

export const addRecentlyViewed = async (userId, productId) => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/recently-viewed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
  });
  return res.json();
};

export const getRecentlyViewed = async (userId) => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/recently-viewed`);
  return res.json();
};


// ============= PRODUCT RECOMMENDATIONS =============

export const getProductRecommendations = async (userId) => {
  const res = await fetch(`${API_BASE}/api/users/${userId}/recommendations`);
  return res.json();
};


// ============= BULK OPERATIONS (ADMIN) =============

export const bulkUpdateStock = async (updates) => {
  const res = await fetch(`${API_BASE}/api/admin/products/bulk-update-stock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });
  return res.json();
};


// ============= CUSTOMER SUPPORT CHAT =============

export const sendChatMessage = async (userId, username, message, isAdmin = false) => {
  const res = await fetch(`${API_BASE}/api/chat/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, username, message, is_admin: isAdmin }),
  });
  return res.json();
};

export const getChatMessages = async (userId, limit = 50) => {
  const params = new URLSearchParams();
  if (userId) params.append("user_id", userId);
  params.append("limit", limit);
  
  const res = await fetch(`${API_BASE}/api/chat/messages?${params}`);
  return res.json();
};


// ============= NLP-BASED PRODUCT SEARCH & INFORMATION =============

export const searchProductsNlp = async (query) => {
  const res = await fetch(`${API_BASE}/api/nlp/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
};

export const getProductInfoNlp = async ({ productName, productId } = {}) => {
  const res = await fetch(`${API_BASE}/api/nlp/product-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, productId }),
  });
  return res.json();
};

export const getNlpSuggestions = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/nlp/suggestions`);
    return res.json();
  } catch (err) {
    console.warn("Failed to fetch NLP suggestions:", err);
    return {
      success: true,
      suggestions: [
        { query: "Ingredients for Biryani", category: "Recipe to Cart" },
        { query: "How to make Paneer Butter Masala", category: "Recipe to Cart" },
        { query: "What do I need for Pasta Alfredo?", category: "Recipe to Cart" },
        { query: "Show me biscuits under ₹50", category: "Price & Category" },
        { query: "I want low sugar drinks", category: "Health & Attributes" },
        { query: "Show me products from Britannia", category: "Brand Search" },
        { query: "Which rice is cheapest?", category: "Price Discovery" },
        { query: "Show me dairy products", category: "Category" },
        { query: "I need a shampoo for dry hair", category: "Attribute Matching" },
        { query: "What is the price of Maggi?", category: "Price Inquiry" },
        { query: "Tell me about Maggi", category: "Product Details" },
        { query: "Show me products below ₹100", category: "Price Filter" },
      ],
    };
  }
};

export const searchRecipesNlp = async (query, cuisine = null) => {
  const params = new URLSearchParams();
  if (query) params.append("q", query);
  if (cuisine) params.append("cuisine", cuisine);
  const res = await fetch(`${API_BASE}/api/nlp/recipes/search?${params}`);
  return res.json();
};

export const getRecipeDetailsNlp = async (recipeId) => {
  const res = await fetch(`${API_BASE}/api/nlp/recipes/${recipeId}`);
  return res.json();
};

export const getPopularRecipesNlp = async () => {
  const res = await fetch(`${API_BASE}/api/nlp/recipes/popular`);
  return res.json();
};

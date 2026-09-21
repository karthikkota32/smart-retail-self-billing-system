import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterNavbar from '../components/MasterNavbar';
import TimeSlotSelector from '../components/GroceryPreOrder/TimeSlotSelector';
import { StockStatusBadge } from '../components/StockStatus';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { generateOrderId } from '../utils/idGenerator.js';
import {
  createOrder,
  getOrdersByPhone,
  saveOrder,
} from '../utils/orderUtils.js';
import {
  getQuantityStep,
  normalizeProductId,
  sanitizeQuantity,
} from '../utils/cartUtils';
import '../styles/GroceryPreOrder.css';

const FALLBACK_PRODUCT_IMAGE = 'https://placehold.co/600x600/e5e7eb/6b7280?text=No+Image';

const buildBasketItem = (product, quantity) => {
  const unitPrice = Number(product.price_per_unit ?? product.price ?? 0) || 0;
  const isLooseItem = Boolean(product.is_loose_item);
  const defaultQuantity = quantity ?? (isLooseItem ? getQuantityStep(product.unit_type) : 1);

  return {
    product_id: normalizeProductId(product),
    name: product.name || 'Unknown Product',
    price: unitPrice,
    price_per_unit: unitPrice,
    unit_type: product.unit_type || 'unit',
    is_loose_item: isLooseItem,
    image: product.image || product.image_url || '',
    location: product.location || '',
    stock_quantity: Number(product.stock_quantity ?? product.stock ?? 0) || 0,
    category: product.category || '',
    quantity: sanitizeQuantity(defaultQuantity, isLooseItem, product.unit_type || 'unit'),
  };
};

const formatMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

/**
 * GroceryPreOrder Page
 * Main customer-facing page for creating pre-orders
 * Step 1: Browse Products → Step 2: Select Time Slot → Step 3: Confirmation
 */
const GroceryPreOrder = () => {
  const navigate = useNavigate();
  const userPhone = (localStorage.getItem('userPhone') || localStorage.getItem('phone') || 'guest').trim() || 'guest';
  const { products: liveProducts, loading: productsLoading, error: productsError, refreshProducts } = useRealtimeProducts(5000);

  const [step, setStep] = useState(1);
  const [basket, setBasket] = useState([]);
  const [timeSlotData, setTimeSlotData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [allOrders, setAllOrders] = useState(() => getOrdersByPhone(userPhone));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const refreshOrders = () => {
      setAllOrders(getOrdersByPhone(userPhone));
    };

    refreshOrders();
    window.addEventListener('appUpdate', refreshOrders);
    return () => window.removeEventListener('appUpdate', refreshOrders);
  }, [userPhone]);

  const statusCounts = useMemo(() => {
    return allOrders.reduce(
      (acc, order) => {
        const status = String(order.status || 'Pending').toLowerCase();
        if (status === 'processing') acc.processing += 1;
        else if (status === 'ready') acc.ready += 1;
        else if (status === 'completed') acc.completed += 1;
        else acc.pending += 1;
        return acc;
      },
      { pending: 0, processing: 0, ready: 0, completed: 0 }
    );
  }, [allOrders]);

  const productCatalog = useMemo(() => (Array.isArray(liveProducts) ? liveProducts : []), [liveProducts]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      productCatalog.map((product) => String(product.category || '').trim()).filter(Boolean)
    );
    return ['All', ...Array.from(uniqueCategories).sort((left, right) => left.localeCompare(right))];
  }, [productCatalog]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return productCatalog.filter((product) => {
      const name = String(product.name || '').toLowerCase();
      const category = String(product.category || '').trim();
      const matchesQuery = !query || name.includes(query) || category.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [productCatalog, searchQuery, selectedCategory]);

  const basketTotals = useMemo(() => {
    const itemCount = basket.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalAmount = basket.reduce(
      (sum, item) => sum + Number(item.price_per_unit ?? item.price ?? 0) * Number(item.quantity || 0),
      0
    );

    return {
      itemCount,
      totalAmount,
    };
  }, [basket]);

  const basketById = useMemo(() => {
    return basket.reduce((acc, item) => {
      acc[String(item.product_id)] = item;
      return acc;
    }, {});
  }, [basket]);

  const addProductToBasket = (product) => {
    const productId = normalizeProductId(product);
    if (!productId) return;

    const stockQuantity = Number(product.stock_quantity ?? product.stock ?? 0) || 0;
    if (stockQuantity <= 0) {
      alert('This item is out of stock.');
      return;
    }

    const stepQuantity = product.is_loose_item ? getQuantityStep(product.unit_type) : 1;
    setBasket((currentBasket) => {
      const existingIndex = currentBasket.findIndex((item) => String(item.product_id) === productId);
      if (existingIndex === -1) {
        return [...currentBasket, buildBasketItem(product, Math.min(stepQuantity, stockQuantity))];
      }

      const nextBasket = [...currentBasket];
      const existing = nextBasket[existingIndex];
      const nextQuantity = sanitizeQuantity(
        Number(existing.quantity || 0) + stepQuantity,
        Boolean(existing.is_loose_item),
        existing.unit_type || 'unit'
      );
      existing.quantity = Math.min(nextQuantity, stockQuantity);
      return nextBasket;
    });
  };

  const updateBasketQuantity = (productId, direction) => {
    setBasket((currentBasket) => {
      const index = currentBasket.findIndex((item) => String(item.product_id) === String(productId));
      if (index === -1) return currentBasket;

      const nextBasket = [...currentBasket];
      const item = nextBasket[index];
      const stepQuantity = item.is_loose_item ? getQuantityStep(item.unit_type) : 1;
      const stockQuantity = Number(item.stock_quantity || 0) || 0;
      const rawQuantity = Number(item.quantity || 0) + (direction === 'increment' ? stepQuantity : -stepQuantity);
      const nextQuantity = sanitizeQuantity(rawQuantity, item.is_loose_item, item.unit_type || 'unit');

      if (nextQuantity <= 0) {
        nextBasket.splice(index, 1);
        return nextBasket;
      }

      item.quantity = stockQuantity > 0 ? Math.min(nextQuantity, stockQuantity) : nextQuantity;
      return nextBasket;
    });
  };

  const removeFromBasket = (productId) => {
    setBasket((currentBasket) => currentBasket.filter((item) => String(item.product_id) !== String(productId)));
  };

  const clearBasket = () => {
    setBasket([]);
  };

  const handleStartTimeSlotStep = () => {
    if (basket.length === 0) {
      alert('Please add at least one product to your pre-order.');
      return;
    }

    setStep(2);
    window.scrollTo(0, 0);
  };

  /**
   * Handle time slot submission from TimeSlotSelector component
   */
  const handleTimeSlotSubmit = (slotData) => {
    setIsLoading(true);

    setTimeout(() => {
      try {
        const orderId = generateOrderId();
        const newOrder = createOrder(orderId, basket, slotData.timeSlot, userPhone);

        saveOrder(newOrder);
        setCreatedOrderId(orderId);
        setAllOrders(getOrdersByPhone(userPhone));
        setTimeSlotData(slotData);
        setStep(3);
        setIsLoading(false);
        window.scrollTo(0, 0);
      } catch (error) {
        console.error('Error creating order:', error);
        alert(`Error creating order: ${error.message}`);
        setIsLoading(false);
      }
    }, 350);
  };

  /**
   * Handle back navigation
   */
  const handleBackFromTimeSlot = () => {
    setStep(1);
    setTimeSlotData(null);
    window.scrollTo(0, 0);
  };

  /**
   * Handle creating another order
   */
  const handleCreateAnother = () => {
    setStep(1);
    setBasket([]);
    setTimeSlotData(null);
    setCreatedOrderId(null);
    setSearchQuery('');
    setSelectedCategory('All');
    window.scrollTo(0, 0);
  };

  const renderBasketSummary = () => (
    <aside className="preorder-basket-panel">
      <div className="preorder-basket-header">
        <div>
          <h3>Your Pre-Order</h3>
          <p>{basket.length} product{basket.length === 1 ? '' : 's'} selected</p>
        </div>
        <button type="button" className="preorder-ghost-btn" onClick={clearBasket} disabled={basket.length === 0}>
          Clear
        </button>
      </div>

      <div className="preorder-basket-totals">
        <div>
          <span className="preorder-total-label">Units</span>
          <strong>{basketTotals.itemCount.toFixed(2).replace(/\.00$/, '')}</strong>
        </div>
        <div>
          <span className="preorder-total-label">Estimated total</span>
          <strong>{formatMoney(basketTotals.totalAmount)}</strong>
        </div>
      </div>

      <div className="preorder-basket-items">
        {basket.length === 0 ? (
          <div className="preorder-empty-basket">
            Add items from the catalog to build your pre-order.
          </div>
        ) : (
          basket.map((item) => (
            <div key={item.product_id} className="preorder-basket-item">
              <img
                src={item.image || FALLBACK_PRODUCT_IMAGE}
                alt={item.name}
                className="preorder-basket-image"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                }}
              />
              <div className="preorder-basket-copy">
                <strong>{item.name}</strong>
                <span>{formatMoney(item.price_per_unit ?? item.price)} each</span>
                <span>
                  {item.quantity} {item.is_loose_item ? item.unit_type || 'unit' : 'item'}
                </span>
              </div>
              <div className="preorder-basket-actions">
                <button type="button" onClick={() => updateBasketQuantity(item.product_id, 'decrement')}>
                  −
                </button>
                <button type="button" onClick={() => updateBasketQuantity(item.product_id, 'increment')}>
                  +
                </button>
                <button type="button" onClick={() => removeFromBasket(item.product_id)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="preorder-primary-btn preorder-basket-continue"
        onClick={handleStartTimeSlotStep}
        disabled={basket.length === 0}
      >
        Continue to Time Slot
      </button>
    </aside>
  );

  const renderCatalog = () => (
    <div className="preorder-catalog-panel">
      <div className="preorder-toolbar">
        <input
          className="preorder-search-input"
          placeholder="Search products or categories"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <select
          className="preorder-category-select"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button type="button" className="preorder-secondary-btn" onClick={refreshProducts}>
          Refresh
        </button>
      </div>

      <div className="preorder-catalog-meta">
        <div>
          <strong>{filteredProducts.length}</strong> products available
        </div>
        <div>
          <strong>{basket.length}</strong> selected
        </div>
      </div>

      {productsError && <div className="error-message">{productsError}</div>}

      {productsLoading ? (
        <div className="preorder-loading-state">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="preorder-loading-state">No products match your search.</div>
      ) : (
        <div className="preorder-product-grid">
          {filteredProducts.map((product) => {
            const productId = normalizeProductId(product);
            const basketItem = basketById[String(productId)];
            const stockQuantity = Number(product.stock_quantity ?? product.stock ?? 0) || 0;
            const canAddMore = !basketItem || Number(basketItem.quantity || 0) < stockQuantity;

            return (
              <article key={productId || product.name} className="preorder-product-card">
                <div className="preorder-product-image-wrap">
                  <img
                    src={product.image || product.image_url || FALLBACK_PRODUCT_IMAGE}
                    alt={product.name}
                    className="preorder-product-image"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                </div>
                <div className="preorder-product-copy">
                  <div className="preorder-product-topline">
                    <h4>{product.name}</h4>
                    <StockStatusBadge product={product} compact />
                  </div>
                  <p className="preorder-product-description">
                    {product.description || 'Fresh grocery item available for pre-order.'}
                  </p>
                  <div className="preorder-product-meta-row">
                    <span>{product.category || 'General'}</span>
                    <span>
                      {product.is_loose_item
                        ? `${formatMoney(product.price_per_unit ?? product.price)} / ${product.unit_type || 'unit'}`
                        : formatMoney(product.price)}
                    </span>
                  </div>
                </div>
                <div className="preorder-product-actions">
                  <button
                    type="button"
                    className="preorder-primary-btn"
                    onClick={() => addProductToBasket(product)}
                    disabled={!canAddMore}
                    title={canAddMore ? 'Add to pre-order' : 'No more stock available'}
                  >
                    {basketItem ? 'Add Another' : 'Add to Pre-Order'}
                  </button>
                  {basketItem && (
                    <div className="preorder-product-quantity">
                      <button type="button" onClick={() => updateBasketQuantity(productId, 'decrement')}>
                        −
                      </button>
                      <span>{basketItem.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateBasketQuantity(productId, 'increment')}
                        disabled={!canAddMore}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  /**
   * Render confirmation page
   */
  const renderConfirmation = () => (
    <div className="confirmation-container">
      <div className="confirmation-card success">
        <div className="confirmation-icon">✓</div>
        <h2>Pre-Order Created Successfully!</h2>

        <div className="order-summary">
          <div className="summary-section">
            <h3>Order Details</h3>
            <div className="summary-row">
              <label>Order ID:</label>
              <span className="order-id-display">{createdOrderId}</span>
              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(createdOrderId);
                  alert('Order ID copied to clipboard!');
                }}
              >
                📋 Copy
              </button>
            </div>
            <div className="summary-row">
              <label>Time Slot:</label>
              <span>{timeSlotData?.timeSlotLabel}</span>
            </div>
            <div className="summary-row">
              <label>Items Count:</label>
              <span>{basketTotals.itemCount.toFixed(2).replace(/\.00$/, '')} units</span>
            </div>
            <div className="summary-row">
              <label>Status:</label>
              <span className="status-badge">Pending</span>
            </div>
          </div>

          <div className="summary-section items-section">
            <h3>Your Items</h3>
            <div className="confirmation-items">
              {basket.map((item, index) => (
                <div key={item.product_id || index} className="confirmation-item">
                  <span className="item-number">{index + 1}</span>
                  <span className="item-text">
                    {item.name} x {item.quantity} {item.is_loose_item ? item.unit_type || 'unit' : 'item'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section next-steps">
            <h3>Next Steps</h3>
            <ol>
              <li>Your order will be processed by our staff</li>
              <li>Status will be updated from "Pending" to "Processing"</li>
              <li>Once items are prepared, it will move to "Ready"</li>
              <li>You can then proceed with payment (via Admin Dashboard)</li>
              <li>Order will be marked as "Completed" after payment</li>
            </ol>
          </div>
        </div>

        <div className="confirmation-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              navigate('/history');
            }}
          >
            View Order History
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCreateAnother}
          >
            Create Another Order
          </button>
        </div>
      </div>

      <div className="orders-overview">
        <h3>📊 Your Orders ({allOrders.length})</h3>
        {allOrders.length > 0 ? (
          <div className="orders-preview">
            {allOrders.slice(0, 3).map((order) => (
              <div key={order.orderId} className="preview-order">
                <div className="preview-id">{order.orderId}</div>
                <div className="preview-slot">{order.timeSlot}</div>
                <div className="preview-amount">₹{Number(order.totalAmount || 0).toFixed(2)}</div>
                <div
                  className="preview-status"
                  style={{
                    backgroundColor:
                      order.status === 'Completed'
                        ? '#28a745'
                        : order.status === 'Ready'
                          ? '#17a2b8'
                          : order.status === 'Processing'
                            ? '#ffc107'
                            : '#6c757d',
                  }}
                >
                  {order.status}
                </div>
              </div>
            ))}
            {allOrders.length > 3 && (
              <p className="preview-more">+{allOrders.length - 3} more orders</p>
            )}
          </div>
        ) : (
          <p>No orders yet</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="grocery-preorder-shell">
      <MasterNavbar />
      <div className="grocery-preorder-page">
        <div className="page-header">
          <h1>🛒 Grocery Pre-Order System</h1>
          <p>Build a pre-order from the live catalog and reserve a pickup time</p>
        </div>

        <div className="preorder-status-board">
          <div className="preorder-status-header">
            <h2>Pre-Order Status</h2>
            <button className="status-link-btn" onClick={() => navigate('/history')}>
              Open History
            </button>
          </div>
          <div className="preorder-status-grid">
            <div className="status-card pending">
              <span className="status-label">Pending</span>
              <span className="status-value">{statusCounts.pending}</span>
            </div>
            <div className="status-card processing">
              <span className="status-label">Processing</span>
              <span className="status-value">{statusCounts.processing}</span>
            </div>
            <div className="status-card ready">
              <span className="status-label">Ready</span>
              <span className="status-value">{statusCounts.ready}</span>
            </div>
            <div className="status-card completed">
              <span className="status-label">Completed</span>
              <span className="status-value">{statusCounts.completed}</span>
            </div>
          </div>
        </div>

        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Browse Products</span>
          </div>
          <div className="progress-connector"></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Select Slot</span>
          </div>
          <div className="progress-connector"></div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Confirmation</span>
          </div>
        </div>

        <div className="step-content">
          {step === 1 && (
            <div className="preorder-builder">
              {renderCatalog()}
              {renderBasketSummary()}
            </div>
          )}
          {step === 2 && (
            <TimeSlotSelector
              items={basket}
              onSubmit={handleTimeSlotSubmit}
              onBack={handleBackFromTimeSlot}
              isLoading={isLoading}
            />
          )}
          {step === 3 && renderConfirmation()}
        </div>
      </div>
    </div>
  );
};

export default GroceryPreOrder;

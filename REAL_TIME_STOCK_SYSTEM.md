# Real-Time Stock Status System

## Overview
This document explains the new real-time stock availability system implemented in the Smart Retail Self-Billing application. The system ensures that users always see the current, live stock status from the database.

## Key Features

### 1. **Always Fresh Product Data** ✓
- Products are fetched from MongoDB every **5 seconds** automatically (configurable)
- No reliance on stale browser cache
- Fresh data is fetched on component mount
- Continuous polling ensures updates without page refresh

### 2. **Live Stock Status Display** 📦
The system shows:
- **In Stock**: Product available with quantity
- **Low Stock**: Warning when stock < 10 units
- **Out of Stock**: Clear "Out of Stock" message with visual indicator

### 3. **Disabled Add to Cart When Out of Stock** 🛒
- **Green Button**: "🛒 Add to Cart" when `stock_quantity > 0`
- **Gray Button**: "❌ Out of Stock" when `stock_quantity <= 0` (disabled/non-functional)
- **Tooltip** displays: "Product is out of stock"

### 4. **Visual Out-of-Stock Overlay** 🚫
- Out-of-stock products show a darkened overlay on the image
- Displays "📦 Out of Stock" message centered on image
- Clearly indicates unavailability at a glance

### 5. **Automatic Real-Time Updates** 🔄
- Default polling interval: **5 seconds**
- When admin updates stock from 0 → 120, users see update within 5 seconds
- Seamless refresh without user intervention

### 6. **Manual Refresh Option** 🔄
- **"Refresh"** button in the search bar
- Click to get immediate latest stock status
- Useful before adding to cart

## How It Works

### Architecture

```
React Component (Shop.jsx)
        ↓
useRealtimeProducts Hook (polls every 5 seconds)
        ↓
Fetch API → /api/mongo/products (latest from MongoDB)
        ↓
Transform & Update State
        ↓
Re-render with StockStatus Components
        ↓
Display to User
```

### Component Files

#### 1. **useRealtimeProducts Hook** (`src/hooks/useRealtimeProducts.js`)
```javascript
const { products, loading, error, refreshProducts } = useRealtimeProducts(5000);
```
- **Params**: 
  - `pollIntervalMs`: Polling interval in milliseconds (default: 5000ms = 5 seconds)
- **Returns**:
  - `products`: Array of fresh products from database
  - `loading`: Boolean for loading state
  - `error`: Error message if fetch fails
  - `refreshProducts`: Function to manually trigger refresh

#### 2. **StockStatus Components** (`src/components/StockStatus.jsx`)

**StockStatusBadge**
```javascript
<StockStatusBadge product={item} compact={false} />
```
- Displays color-coded stock status
- Green: In Stock
- Orange: Low Stock (< 10)
- Red: Out of Stock

**StockIndicator**
```javascript
<StockIndicator product={item} />
```
- Shows overlay on product image when out of stock
- Dark overlay with "📦 Out of Stock" message

**AddToCartButton**
```javascript
<AddToCartButton product={item} onClick={addToCart} />
```
- Automatically disabled when stock = 0
- Color changes from blue to gray when disabled
- Shows tooltip on hover explaining why it's disabled

**NotifyMeButton**
```javascript
<NotifyMeButton product={item} onClick={notify} />
```
- Only shows when product is out of stock
- Allows users to get notified when product is back in stock

### Stock Field Names
The system supports multiple stock field names:
- `stock_quantity` (primary - from MongoDB)
- `stock` (fallback - from SQLite)

## Usage Examples

### Using the Hook in Your Component
```javascript
import { useRealtimeProducts } from "../hooks/useRealtimeProducts";

function MyComponent() {
  // Auto-polling with 5-second interval
  const { products, loading, error, refreshProducts } = useRealtimeProducts(5000);

  // Manual refresh when needed
  const handleRefresh = () => {
    refreshProducts();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <button onClick={handleRefresh}>Refresh Now</button>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <StockStatusBadge product={product} />
          <AddToCartButton product={product} onClick={() => addToCart(product)} />
        </div>
      ))}
    </>
  );
}
```

### Checking Stock Status
```javascript
import { isProductInStock, getStockStatusText } from "../hooks/useRealtimeProducts";

// Check if product is available
if (isProductInStock(product)) {
  console.log("Product is available!");
}

// Get human-readable status
const status = getStockStatusText(product); // "In Stock (45)", "Low Stock", "Out of Stock"
```

## Configuration

### Change Polling Interval
Edit `src/pages/Shop.jsx`:
```javascript
// 10 seconds instead of 5
const { products, loading, error, refreshProducts } = useRealtimeProducts(10000);
```

### Polling Interval Recommendations
- **2000ms (2 sec)**: High-traffic products (real-time feel, more API calls)
- **5000ms (5 sec)**: Default (balanced)
- **10000ms (10 sec)**: Low-traffic products (fewer API calls)
- **30000ms (30 sec)**: Background update only

## Stock Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| In Stock | #16a34a (Green) | Product available, normal quantity |
| Low Stock | #f97316 (Orange) | Less than 10 units available |
| Out of Stock | #dc2626 (Red) | No units available, cannot purchase |

## Testing the System

### Test Scenario 1: Real-Time Update
1. Product admin updates stock from 0 → 50 in MongoDB
2. Wait max 5 seconds
3. User shop page shows "In Stock (50)" automatically
4. Add to Cart button becomes blue and clickable

### Test Scenario 2: Manual Refresh
1. Admin updates stock
2. Click "Refresh" button in shop
3. See updated stock immediately

### Test Scenario 3: Out of Stock Button
1. Product has `stock_quantity = 0`
2. Add to Cart button shows as gray "❌ Out of Stock"
3. Button is disabled (not clickable)
4. Hovering shows tooltip: "Product is out of stock"

## API Response Format
The system expects MongoDB API to return:
```json
{
  "success": true,
  "count": 50,
  "products": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Rice",
      "price": 250,
      "stock_quantity": 45,
      "image_url": "https://...",
      "category": "Grains",
      ...
    }
  ]
}
```

## Performance Considerations

### Polling Impact
- **5000ms interval** = 12 API calls per minute per user
- **Memory usage**: Minimal (~1-2MB per user)
- **Network**: ~5KB per poll request
- **Total**: Very lightweight for modern browsers

### Optimization Tips
1. Use appropriate interval for your traffic
2. Implement backend caching for API endpoint
3. Consider WebSocket for higher real-time requirements
4. Add request debouncing for manual refreshes

## Troubleshooting

### Products Not Updating
1. Check browser DevTools → Network tab
2. Verify API endpoint: `http://localhost:5000/api/mongo/products`
3. Ensure MongoDB is running with fresh product data
4. Check console for fetch errors

### Still Seeing Old Stock
1. Click "Refresh" button manually
2. Clear browser cache (Ctrl+Shift+Delete)
3. Check if polling interval is too high
4. Verify database actually has updated stock value

### Button Stays Disabled
1. Check product's `stock_quantity` field in MongoDB
2. Ensure value is > 0
3. Wait for polling cycle (max 5 seconds)
4. Click "Refresh" button to force update

## Future Enhancements

1. **WebSocket Real-Time**:  Replace polling with WebSocket for instant updates
2. **Stock Change Animations**: Add visual indicators when stock changes
3. **Low Stock Warnings**: Email notifications when stock drops below threshold
4. **Stock Level History**: Track and display stock trends
5. **Predictive Alerts**: Notify when product will likely go out of stock

## Migration from Old System

### Before (Old System)
- Fetched products once on page load
- Relied on localStorage cache
- Manual page refresh needed to see updates
- No real-time stock awareness

### After (New System)
- Auto-polling every 5 seconds
- Always fresh from database
- Automatic updates without page refresh
- Real-time stock awareness with visual feedback

## Support

For issues or questions about the stock system:
1. Check browser console (F12) for errors
2. Review network requests in DevTools
3. Verify MongoDB connectivity
4. Check API endpoint response format

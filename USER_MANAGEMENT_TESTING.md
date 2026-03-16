# User Management System - Testing Guide

## Complete End-to-End Testing

This guide will walk you through testing the entire user management system.

## Prerequisites

- MongoDB running: `mongod` in another terminal
- Backend running: `python backend/app.py`
- Frontend running: `npm run dev`
- Browser open to `http://localhost:5173`

## Test Scenario 1: User Registration & Login History

### Step 1: Register a New User
1. Go to Login page
2. Click "New User? Register here"
3. Fill in:
   ```
   Username:     john_doe
   Name:         John Doe
   Phone:        9988776655
   Email:        john@example.com
   Password:     secure123
   ```
4. Click Register button ✓

### Step 2: Test Login & Tracking
1. Login as john_doe with password secure123
2. Check admin panel Users tab
3. Should see john_doe in list
4. Click Details button
5. Verify login history shows:
   - Current timestamp
   - IP address (127.0.0.1 for local)
   - User agent (browser info)

### Step 3: Test Multiple Logins
1. Logout from john_doe account
2. Login again
3. Go back to Details
4. Login history should show 2 entries (newest first)
5. Both should have timestamps and IP addresses ✓

## Test Scenario 2: Order & Payment History

### Step 1: Make a Purchase as User
1. Login as john_doe (or any user)
2. Go to Shop page
3. Add 2-3 products to cart
4. Go to Cart
5. Enter details:
   ```
   Coupon: (leave empty)
   Total: (auto-calculated)
   Payment Mode: Online
   ```
6. Click "Pay Now"
7. Complete payment ✓

### Step 2: View in Admin Panel
1. Go to Admin Panel → Users tab
2. Find john_doe in list
3. Verify "Total Orders" shows "1"
4. Verify "Total Spent" shows order amount
5. Click Details button
6. Scroll to "Payment & Order History"
7. Should see:
   - Order ID
   - Items purchased (2-3 items)
   - Total amount paid (in ₹)
   - Payment method (Online)
   - Payment status (completed)
   - Order status (pending)
   - Shipping address section ✓

### Step 3: Create Multiple Orders
1. Repeat purchase 2 more times with different items
2. Check Details again
3. Should show 3 orders
4. Total Spent should be sum of all orders ✓

## Test Scenario 3: Admin-Only Features

### Step 1: Create Admin User
1. Register with username: admin
2. Go to MongoDB directly:
   ```bash
   mongosh
   use smart_retail
   db.users.updateOne(
     {username: "admin"},
     {$set: {is_admin: true}}
   )
   ```

### Step 2: View All Users from Admin
1. Login as admin
2. Admin Dashboard → Users tab
3. Should see all users in table
4. Stats should show accurate counts ✓

### Step 3: Test Filters
1. Try each filter button:
   - **All**: Shows total user count
   - **Admin**: Shows only admin users (should be just admin)
   - **Users**: Shows regular users (john_doe, etc.)
   - **Active**: Shows active users
   - **Inactive**: Should be empty
2. Each filter should update count correctly ✓

### Step 4: Test Search
1. Search for "john" → finds john_doe
2. Search for "9988776655" → finds john_doe by phone
3. Search for "john@example.com" → finds john_doe by email
4. Search for non-existent name → shows empty state ✓

## Test Scenario 4: Login History Audit

### Step 1: Multiple Logins from Different Scenarios
1. Regular login from same browser
2. Clear cookies and login again
3. Open different browser and login
4. Each should record separate login entry

### Step 2: Check Complete Audit Trail
1. Go to user Details modal
2. Click "Login History" section
3. Should show all login attempts with:
   - Latest login first
   - Timestamp of each login
   - IP address (might be same if local)
   - User agent showing browser info ✓

### Step 3: Suspicious Activity Detection
1. Check if logins from different IPs show different IP addresses
2. Check if logins from different browsers show different user agents
3. Admins can use this to identify:
   - Unauthorized access attempts
   - Account sharing
   - Unusual login patterns ✓

## Test Scenario 5: Statistics & Analytics

### Step 1: Check Dashboard Stats
1. Products tab shows:
   - Total Orders: sum of all order counts
   - Total Revenue: sum of all amounts spent
   - Total Products: count of products
2. Verify all stats are accurate ✓

### Step 2: Calculate User Metrics
1. Users tab stats show:
   - Total Users: count
   - Total Orders: sum across all users
   - Total Revenue: sum across all users
   - Avg Spent/User: total revenue / total users
2. Verify calculations ✓

### Step 3: Per-User Metrics
1. Click Details on individual users
2. Check:
   - Total Orders: count of orders
   - Total Spent: sum of order amounts
3. Verify calculations match overall stats ✓

## Test Scenario 6: Data Persistence

### Step 1: Refresh Page
1. View user details
2. Refresh browser (Ctrl+R)
3. All data should still be visible ✓

### Step 2: Close & Reopen Modal
1. View details modal
2. Close modal
3. Click Details on different user
4. Details should load correctly ✓
5. Click Details on previous user
6. Previous data should load again ✓

### Step 3: Browser Restart
1. Close entire browser
2. Restart browser
3. Go to Admin Users tab
4. All data should persist in MongoDB ✓

## Test Scenario 7: API Response Times

### Step 1: Monitor Network Performance
1. Open Developer Tools (F12)
2. Go to Network tab
3. Click Details on a user
4. Check:
   - GET /api/admin/users/<id> response time
   - Should be < 200ms for good performance
   - Size should be reasonable (< 500KB) ✓

### Step 2: Mass Data Test
1. Create 10+ users with orders
2. Load user list
3. Should still be responsive
4. Search should be instant
5. Filtering should be instant ✓

## Test Scenario 8: Error Handling

### Step 1: Test Invalid User ID
1. Open browser console
2. Try accessing non-existent user ID
3. Should show "User not found" error gracefully ✓

### Step 2: Test Without MongoDB
1. Stop MongoDB server
2. Try to load users
3. Should show error message in UI
4. User-friendly error displayed ✓

### Step 3: Test Network Error
1. Open DevTools and disable network
2. Click Details on user
3. Should show loading state
4. Then error message ✓
5. Enable network again
6. Refresh should work ✓

## Test Scenario 9: Mobile Responsiveness

### Step 1: Desktop View (1920px+)
1. View user list
2. Should show full table with all columns
3. Details modal should show grid layout ✓

### Step 2: Tablet View (768px-1024px)
1. Resize to tablet size (F12 → Device mode)
2. Table should be readable
3. Modal should adapt ✓

### Step 3: Mobile View (<768px)
1. Resize to mobile (375px)
2. Table should scroll horizontally
3. Modal should stack vertically ✓
4. Filter buttons should wrap nicely ✓

## Test Scenario 10: Data Accuracy

### Step 1: Verify User Data
1. Create user with specific data
2. View in admin Details
3. All fields should match exactly:
   - Username
   - Name
   - Phone
   - Email
   - is_admin flag
   - is_active flag ✓

### Step 2: Verify Order Data
1. Create order with specific items and amount
2. View in Details modal
3. Verify:
   - Item list matches
   - Total amount matches
   - Payment method matches ✓

### Step 3: Verify Timestamps
1. Note exact time before creating user
2. Create user
3. Check created_at timestamp
4. Should be within 1-2 seconds of actual time ✓

## Automated Test Cases

### API Tests (Terminal)

```bash
# Test: Get all users
curl http://localhost:5000/api/admin/users | jq

# Test: Get specific user
curl http://localhost:5000/api/admin/users/{user_id} | jq

# Test: Get login history
curl http://localhost:5000/api/admin/users/{user_id}/login-history | jq

# Test: Get orders
curl http://localhost:5000/api/admin/users/{user_id}/orders | jq

# Test: Dashboard stats
curl http://localhost:5000/api/admin/dashboard/stats | jq
```

### MongoDB Verification

```bash
mongosh
use smart_retail

# Check users
db.users.find().pretty()

# Check specific user
db.users.findOne({username: "john_doe"})

# Check login history
db.users.findOne({username: "john_doe"}, {login_history: 1})

# Check orders
db.orders.find({username: "john_doe"}).pretty()

# Count totals
db.users.countDocuments()
db.orders.countDocuments()
```

## Performance Benchmarks

Expected performance metrics:

| Operation | Expected Time | Status |
|-----------|---------------|--------|
| Load user list | < 200ms | ✓ |
| Load user details | < 300ms | ✓ |
| Search users | < 50ms | ✓ |
| Filter users | < 50ms | ✓ |
| API response | < 200ms | ✓ |
| Database query | < 100ms | ✓ |

## Success Criteria Checklist

- ✓ Users register and data persists
- ✓ Login attempts are tracked
- ✓ Login history shows timestamps and IPs
- ✓ Orders are linked to users
- ✓ Order history displays with correct amounts
- ✓ Admin can see all users
- ✓ Search works across all user fields
- ✓ Filters work correctly
- ✓ Statistics are accurate
- ✓ Data persists across refreshes
- ✓ Modal loads details correctly
- ✓ Error messages display gracefully
- ✓ Performance is acceptable
- ✓ Mobile view is responsive
- ✓ API endpoints return correct data

## Reporting Issues

If you find issues:

1. **Check Console**: F12 → Console for errors
2. **Check Network**: F12 → Network for API failures
3. **Check MongoDB**: Verify data exists in collections
4. **Check Backend Logs**: See what backend received/returned
5. **Check Database**: Use `mongosh` to verify data

## Clean Up Test Data

To remove test users and orders:

```bash
mongosh
use smart_retail

# Remove test users
db.users.deleteOne({username: "john_doe"})
db.users.deleteOne({username: "admin"})

# Remove test orders
db.orders.deleteMany({username: "john_doe"})

# Verify
db.users.count()
db.orders.count()
```

---

**All tests passing?** Your user management system is ready for production! 🚀

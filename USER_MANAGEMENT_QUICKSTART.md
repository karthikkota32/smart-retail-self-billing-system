# Quick Start: User Management System (5 Minutes)

## What's New?

You can now view **ALL user details** in your Admin Panel:
- User profiles (names, emails, phones)
- Login history (when they logged in, from where)
- Payment history (what they bought, how much they spent)

## Getting Started (2 Steps)

### 1. Start Your Backend Server
```bash
cd backend
python app.py
```

You should see:
```
✓ MongoDB Connected Successfully
 * Running on http://0.0.0.0:5000
```

### 2. Start Your Frontend Server
```bash
npm run dev
```

## Using User Management (3 clicks)

### View All Users
1. Open Admin Panel
2. Click the **👥 Users** tab (right side)
3. You'll see a table with all users:
   - Username, Name, Phone, Email
   - Total Orders & Total Money Spent
   - Quick Status indicators

### View User Details
1. Click **📋 Details** button on any user
2. A modal opens showing 3 sections:

   **📌 Profile Info** - Basic user data
   
   **🔐 Login History** - Every login with timestamp and IP
   
   **💳 Orders & Payments** - All purchases and payment details

3. Close modal by clicking X button

### Search & Filter
- **Search Box**: Type username, name, phone, or email
- **Filter Buttons**: 
  - All Users
  - Admin Users
  - Regular Users
  - Active Users
  - Inactive Users

## Data Tracked

### Per User:
- ✓ Full profile information
- ✓ All login timestamps and IP addresses
- ✓ Every order with amount and payment method
- ✓ Shipping addresses
- ✓ Order/Payment status

### Statistics:
- Total users count
- Total orders count
- Total revenue (₹)
- Average spent per user

## Test It Out

### 1. Create a Test User
Register at Login page with:
- Username: `testcustomer`
- Name: `Test Customer`
- Phone: `9876543210`
- Email: `test@example.com`
- Password: `password123`

### 2. Create a Test Order
- Go to Shop page
- Add product to cart
- Complete payment

### 3. View in Admin Panel
- Go to Admin → Users tab
- Search for "testcustomer"
- Click Details
- Scroll to "Payment & Order History"
- You'll see the order you just created!

### 4. Check Login History
- Still in user details modal
- Scroll to "Login History"
- You'll see login timestamps

## Backend Endpoints (For Developers)

All endpoints are already working:

```
GET  /api/admin/users
     → Get all users with summary stats

GET  /api/admin/users/<user_id>
     → Get complete user details with login history and orders

GET  /api/admin/users/<user_id>/login-history
     → Get all logins for a user (timestamps, IPs, devices)

GET  /api/admin/users/<user_id>/orders
     → Get all orders for a user (payment history)

GET  /api/admin/dashboard/stats
     → Get dashboard statistics
```

## MongoDB Collections

Data is stored in MongoDB:

**users** collection:
```javascript
{
  username,           // "testuser"
  name,              // "Test User"
  phone,             // "9876543210"
  email,             // "test@example.com"
  is_admin,          // false
  is_active,         // true
  last_login,        // timestamp
  login_history: [   // array of logins
    {
      timestamp,     // when logged in
      ip_address,    // from where
      user_agent     // what device/browser
    }
  ],
  orders: [          // array of orders
    {
      order_id,      // order ID
      date,          // when ordered
      amount         // how much spent
    }
  ]
}
```

**orders** collection:
```javascript
{
  user_id,           // reference to user
  items: [           // what they bought
    { name, quantity }
  ],
  total_amount,      // total price
  payment_method,    // credit card, upi, etc.
  payment_status,    // completed, pending, failed
  order_status,      // pending, shipped, delivered
  created_at,        // when ordered
  shipping_address   // delivery address
}
```

## Features Overview

### User List Features
- ✓ Search by any field (username, email, phone, name)
- ✓ Filter by role (admin/user)
- ✓ Filter by status (active/inactive)
- ✓ See total orders per user
- ✓ See total money spent
- ✓ See last login date
- ✓ Refresh button to reload data

### User Details Modal
- ✓ Complete profile information
- ✓ Account status and role
- ✓ Creation date and last update
- ✓ Full login audit trail with IP tracking
- ✓ All orders with items
- ✓ Payment status for each order
- ✓ Shipping addresses saved
- ✓ Total spending summary

### Dashboard Stats (visible in Products tab)
- ✓ Total users count
- ✓ Total orders count
- ✓ Total products count
- ✓ Total revenue (₹)

## Common Tasks

### Find Top Customers
1. Go to Admin → Users
2. Sort by clicking "Total Spent" column
3. Top spenders appear at top

### Check User Activity
1. Go to Admin → Users
2. Check "Last Login" column
3. Click Details → Login History
4. See when they were active and from where

### Review Purchase History
1. Go to Admin → Users
2. Click Details on any user
3. Scroll to "Payment & Order History"
4. See all their purchases

### Track Revenue
1. Look at "Total Spent" column in user list
2. Sum shows total revenue
3. Stat card at top shows total
4. Per-user statistics in details modal

## Troubleshooting

### Users Not Showing
```
✓ Check backend is running on port 5000
✓ Check MongoDB is running
✓ Refresh page (F5)
✓ Check browser console for errors (F12 → Console)
```

### Details Modal Not Loading
```
✓ Check network tab (F12 → Network)
✓ Verify /api/admin/users/<id> endpoint works
✓ Check if user_id is being passed correctly
```

### Login History Empty
```
✓ Make sure user logged in via login page
✓ Check MongoDB login_history field exists
✓ Try logging in again and refresh details
```

### Orders Not Showing
```
✓ Make sure order was created via Shop page payment
✓ Verify order exist in MongoDB orders collection
✓ Check order has matching user_id
```

## Next Steps

1. **Create test data**: Use Shop page to make purchases
2. **Invite users**: Have people register and make orders
3. **Check patterns**: View user behavior in admin panel
4. **Set alerts**: (Coming soon) Get notified on large orders
5. **Export data**: (Coming soon) Download user reports

## File Structure

```
src/
  components/
    UserManagement.jsx       ← Main user list component
  pages/
    Admin.jsx                ← Admin page with tabs
  services/
    api.js                   ← API calls (getAllUsers, etc.)
  styles/
    UserManagement.css       ← Styling

backend/
  app.py                     ← User management endpoints
  mongo_config.py            ← MongoDB connection
  mongo_models.py            ← Data schemas
```

## Support

### Check Logs
```bash
# Backend console shows:
# - MongoDB connection
# - API request logs
# - Error messages

# Frontend console (F12):
# Shows API responses and errors
```

### Verify Setup
```bash
# Check MongoDB running
mongosh
> db.users.find()

# Check API endpoints
curl http://localhost:5000/api/admin/users
```

## That's It! 🎉

You now have a complete user management system showing:
- All user profiles
- Complete login history
- Full payment history
- Real-time statistics

Go to Admin Panel → Users tab and explore!

---

**Questions?** Check `USER_MANAGEMENT_GUIDE.md` for detailed documentation.

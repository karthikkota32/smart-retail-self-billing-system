# 👥 User Management System - Complete Guide

## Overview

Your Smart Retail application now includes a **complete user management system** that allows admins to view and track all user details including:

- ✅ **User Profiles**: Complete user information (username, email, phone, role, status)
- ✅ **Login History**: Full audit trail of every user login with timestamp and IP address
- ✅ **Payment History**: Complete order and payment information for each user
- ✅ **Dashboard Statistics**: Real-time user, order, and revenue metrics

## Features

### 1. **User Management Dashboard**
Located in Admin Panel → **👥 Users Tab**

#### User List View
- **Search & Filter**: Find users by username, name, phone, or email
- **Filter Options**:
  - All Users
  - Admin Users
  - Regular Users
  - Active Users
  - Inactive Users
- **Quick Stats**:
  - Username & Name
  - Phone & Email
  - User Role (Admin/User)
  - Account Status (Active/Inactive)
  - Total Orders Count
  - Total Money Spent
  - Last Login Timestamp

#### User Details Modal
Click **📋 Details** button on any user to see comprehensive information:

**Profile Information Section**
- Username
- Full Name
- Phone Number
- Email Address
- User Role (Admin/Regular)
- Account Status (Active/Inactive)
- Account Created Date
- Last Profile Update

**Login History Section** 
Shows all login attempts with:
- Exact login timestamp
- IP address of login
- Browser/Device information (User Agent)
- Can audit suspicious login activities

**Payment & Order History Section**
Displays complete financial history:
- Total orders count
- Total amount spent (with currency formatting)
- Detailed order cards showing:
  - Order ID (shortened)
  - Item list with quantities
  - Payment amount
  - Payment method (Credit Card, Debit Card, UPI, etc.)
  - Payment status (Completed/Pending/Failed)
  - Order status (Pending/Shipped/Delivered/Cancelled)
  - Shipping address
  - Order date and time

### 2. **Backend API Endpoints**

All endpoints are RESTful and use MongoDB for data storage.

#### User Registration & Login (MongoDB)
```
POST /api/users/register-mongo
- Input: {username, name, phone, email, password}
- Returns: {ok, user_id, username, name, phone, email}

POST /api/users/login-mongo
- Input: {username, password}
- Returns: {ok, user_id, username, name, phone, email, is_admin}
- Tracks: Login timestamp, IP address, User Agent
```

#### Admin User Management Endpoints

**Get All Users**
```
GET /api/admin/users
- Returns: {success, users: [...], total}
- User objects contain: id, username, name, phone, email, is_admin, is_active, 
  created_at, last_login, total_orders, total_spent
```

**Get Specific User Details**
```
GET /api/admin/users/<user_id>
- Returns: {success, user: {...}}
- Complete user object with login_history and orders arrays
```

**Get User Login History**
```
GET /api/admin/users/<user_id>/login-history
- Returns: {success, username, login_history: [...], total_logins}
- Each login record contains: timestamp, ip_address, user_agent
```

**Get User Orders**
```
GET /api/admin/users/<user_id>/orders
- Returns: {success, orders: [...], total, total_spent}
- Each order contains: id, items, total_amount, payment_method, 
  payment_status, order_status, created_at, shipping_address
```

**Admin Dashboard Statistics**
```
GET /api/admin/dashboard/stats
- Returns: {success, stats: {...}}
- Contains: total_users, total_orders, total_products, total_revenue, recent_logins
```

#### MongoDB Collections Used

**Users Collection**
```javascript
{
  _id: ObjectId,
  username: String (unique),
  name: String,
  phone: String (10 digits, unique),
  email: String,
  password_hash: String,
  is_admin: Boolean,
  is_active: Boolean,
  created_at: DateTime,
  updated_at: DateTime,
  last_login: DateTime,
  login_history: [
    {
      timestamp: DateTime,
      ip_address: String,
      user_agent: String
    }
  ],
  orders: [
    {
      order_id: String,
      date: DateTime,
      amount: Number
    }
  ]
}
```

**Orders Collection**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref to users),
  username: String,
  phone: String,
  items: [
    {
      name: String,
      quantity: Number
    }
  ],
  total_amount: Number,
  payment_method: String,
  payment_status: String,
  order_status: String,
  created_at: DateTime,
  shipping_address: {
    street: String,
    city: String,
    state: String,
    zip_code: String,
    country: String
  }
}
```

### 3. **Frontend Components**

#### UserManagement.jsx
Main component managing the user list and detail modals.

**Key Props**: None (uses API calls directly)

**Key State**:
- `users`: Array of all users
- `userDetails`: Selected user's complete details
- `showDetailModal`: Boolean to show/hide details modal
- `filterActive`: Current filter setting
- `searchTerm`: Search input

**Key Functions**:
- `fetchUsers()`: Load all users from API
- `fetchUserDetails(userId)`: Load specific user's details
- `handleViewDetails(user)`: Initiate details fetch
- `formatDate()`: Format timestamps
- `formatCurrency()`: Format money with INR formatting

#### UserManagement.css
Professional styling with:
- Responsive grid layout
- Color-coded status badges
- Modal overlay with smooth interactions
- Detailed table views
- Mobile-friendly responsive design

### 4. **API Integration**

The following API functions are available in `src/services/api.js`:

```javascript
// User Management
getAllUsers() → Returns all users with summary
getUserDetails(userId) → Returns complete user details
getUserLoginHistory(userId) → Returns login audit trail
getUserOrders(userId) → Returns payment/order history
getAdminDashboardStats() → Returns dashboard statistics

// User Registration/Login (MongoDB)
registerUserMongo(username, name, phone, email, password)
loginUserMongo(username, password)

// Orders (MongoDB)
createOrderMongo(username, items, total, paymentMethod, shippingAddress)
```

## Usage Examples

### For Admin Users

#### Viewing All Users
1. Navigate to Admin Panel
2. Click **👥 Users** tab
3. View list of all users with quick stats
4. Use search bar to find specific users
5. Use filter buttons to filter by role/status

#### Viewing User Details
1. Click **📋 Details** button next to any user
2. Modal opens showing:
   - Full profile information
   - Complete login history
   - All orders and payments
3. Scroll through sections to view different data

#### Analyzing User Activity
1. Check "Last Login" column to see active users
2. Click Details and scroll to "Login History" to see:
   - When they logged in
   - From which IP addresses
   - What devices/browsers they used
3. Identify suspicious activity or duplicate logins

#### Tracking Revenue
1. View "Total Spent" column to see top customers
2. Click Details and scroll to "Payment History"
3. See individual order amounts and payment methods
4. Track order statuses (pending/shipped/delivered)

### For Developers

#### Adding User Tracking
Already integrated in backend:
1. Registration stores user in MongoDB with hashed password
2. Login records timestamp, IP, and user agent
3. Orders automatically linked to user_id

#### Extending the System
```javascript
// Add custom filters
const customFilter = users.filter(u => u.total_spent > 10000);

// Get user statistics
const totalRevenue = users.reduce((sum, u) => sum + u.total_spent, 0);

// Export user data
const userData = JSON.stringify(users);
```

## Data Security

### Password Security
- Passwords are **hashed** using werkzeug.security
- Original passwords are never stored
- Login validation uses secure password checking

### IP Address Tracking
- All logins record IP address for security audit
- Can identify unauthorized access attempts
- Timezone information preserved in timestamps

### Data Privacy
- Users can only see their own data
- Admin can see all user data
- Email addresses stored securely in MongoDB

## MongoDB Setup

The system automatically creates the required collections:
- `users` - User accounts and profiles
- `orders` - Order records linked to users

No manual schema creation needed - MongoDB handles it automatically.

## Testing the System

### Test User Registration
```bash
curl -X POST http://localhost:5000/api/users/register-mongo \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "name": "Test User",
    "phone": "9876543210",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test User Login
```bash
curl -X POST http://localhost:5000/api/users/login-mongo \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Get All Users (Admin)
```bash
curl http://localhost:5000/api/admin/users
```

### Get Specific User Details
```bash
curl http://localhost:5000/api/admin/users/<user_id>
```

## Troubleshooting

### User Not Appearing in List
- Check MongoDB is running: `mongod`
- Verify user was created with registration endpoint
- Check browser console for API errors

### Login History Empty
- Make sure user logged in via the login endpoint
- Check MongoDB connection is active
- Verify `login_history` array exists in user document

### Orders Not Showing
- Ensure orders were created via `/api/orders/mongo` endpoint
- Check order has valid `user_id` matching user
- Verify order documents exist in MongoDB `orders` collection

### Timestamps Not Displaying
- Ensure backend MongoDB has UTC timezone
- Check browser timezone settings
- Verify datetime formatting in frontend

## Performance Notes

- User list loads all users (suitable for < 10,000 users)
- Login history stored indefinitely (consider archiving old records)
- Order history stored indefinitely
- Modal loads details on demand (not all at once)
- Search/filter runs client-side (fast for typical user counts)

## Future Enhancement Ideas

1. **Add User Filtering**
   - Filter by account age
   - Filter by last login date
   - Filter by total spent range

2. **Export User Data**
   - Export selected users as CSV
   - Generate reports by date range
   - Create user activity reports

3. **User Management Actions**
   - Deactivate/reactivate user accounts
   - Reset user passwords
   - Add/remove admin privileges
   - Ban suspicious users

4. **Advanced Analytics**
   - User lifetime value
   - Purchase frequency analysis
   - Regional distribution
   - Device/browser analytics

5. **Notifications**
   - Alert on suspicious login patterns
   - Notify on large purchases
   - User activity summaries

## Summary

Your Smart Retail application now has a **complete user management system** with:
- ✅ Full user profile management
- ✅ Complete login audit trail
- ✅ Payment & order history tracking
- ✅ Real-time statistics dashboard
- ✅ MongoDB backed persistence
- ✅ Responsive admin interface
- ✅ Secure password storage
- ✅ Comprehensive API

Admin users can now view every detail about their customers, from login patterns to spending history, all in one easy-to-use dashboard!

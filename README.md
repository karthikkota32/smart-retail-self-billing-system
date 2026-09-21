# Smart Retail - React Self-Billing & Admin Dashboard

A modern, real-time e-commerce and retail self-billing platform built with React, Vite, Flask, and MongoDB.

## 🚀 Features

### ✅ Product Management System
- Real-time product CRUD operations
- MongoDB integration for persistent storage
- Auto-syncing with 3-second polling
- Product images and detailed descriptions
- Stock quantity management
- Category organization

### ✅ Real-Time Stock Status
- Live inventory tracking (In Stock / Out of Stock)
- 5-second auto-polling for latest data
- Visual indicators on product cards
- Out-of-stock overlay images
- Add to Cart button auto-disable when stock = 0

### ✅ Complete User Management System
- **User Profiles**: Full user database with contact information
- **Login Audit Trail**: Track every login with timestamp and IP address
- **Payment History**: Complete order and payment records per user
- **Admin Dashboard**: Easy-to-use interface to view all customer data
- **Search & Filter**: Find users by username, email, phone, or name
- **Real-time Statistics**: Total users, orders, revenue metrics

### ✅ Admin Dashboard
- Tabbed interface (Products | Users)
- Product CRUD with validation
- Real-time sync status indicators
- User management interface
- Dashboard statistics

## 📋 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- MongoDB (running locally or via Atlas)
- npm or yarn

### Setup

1. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

4. **Start Backend Server**
   ```bash
   cd backend
   python app.py
   # Server runs on http://localhost:5000
   ```

5. **Start Frontend (in new terminal)**
   ```bash
   npm run dev
   # App runs on http://localhost:5173
   ```

6. **Access Admin Panel**
   - Go to http://localhost:5173
   - Login as admin
   - Click "Admin Dashboard"
   - Switch between Products and Users tabs

## 📚 Documentation

### User Management System
- **[USER_MANAGEMENT_QUICKSTART.md](USER_MANAGEMENT_QUICKSTART.md)** - 5-minute quick start guide
- **[USER_MANAGEMENT_GUIDE.md](USER_MANAGEMENT_GUIDE.md)** - Complete feature documentation and API reference
- **[USER_MANAGEMENT_TESTING.md](USER_MANAGEMENT_TESTING.md)** - Testing guide with 10 test scenarios

### Real-Time Systems
- **[REAL_TIME_STOCK_SYSTEM.md](REAL_TIME_STOCK_SYSTEM.md)** - Stock status tracking documentation
- **[REALTIME_ADMIN_SYSTEM.md](REALTIME_ADMIN_SYSTEM.md)** - Admin product management system
- **[REALTIME_ADMIN_QUICK_START.md](REALTIME_ADMIN_QUICK_START.md)** - Quick start for admin

### Project Overview
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Complete implementation details

## 🏗️ Architecture

### Frontend Stack
- **React 18+** - UI Framework
- **Vite** - Build tool
- **CSS3** - Styling
- **Custom Hooks** - State management (useRealtimeProducts, useAdminProducts)

### Backend Stack
- **Flask** - Web framework
- **MongoDB** - NoSQL database
- **Pymongo** - MongoDB driver
- **Werkzeug** - Password hashing

### Key Components

```
src/
├── components/
│   ├── UserManagement.jsx        # User list & details view
│   ├── ProductForm.jsx            # Add/edit product form
│   ├── ProductList.jsx            # Product table
│   └── MasterNavbar.jsx           # Navigation
├── pages/
│   ├── Admin.jsx                  # Admin dashboard (Products & Users)
│   ├── Shop.jsx                   # Customer shopping page
│   └── [other pages...]
├── hooks/
│   ├── useRealtimeProducts.js     # Stock polling hook
│   └── useAdminProducts.js        # Admin product sync hook
└── services/
    └── api.js                     # All API calls
```

## 🔧 API Endpoints

### User Management (MongoDB)
```
POST   /api/users/register-mongo           - Register new user
POST   /api/users/login-mongo              - Login user (track login)
GET    /api/admin/users                    - Get all users
GET    /api/admin/users/<id>               - Get user details
GET    /api/admin/users/<id>/login-history - Get login audit trail
GET    /api/admin/users/<id>/orders        - Get user payment history
GET    /api/admin/dashboard/stats          - Get dashboard stats
```

### Product Management (MongoDB)
```
GET    /api/mongo/products                 - Get all products
GET    /api/mongo/products/<id>            - Get product details
POST   /api/mongo/products                 - Create product
PUT    /api/mongo/products/<id>            - Update product
DELETE /api/mongo/products/<id>            - Delete product
```

### Orders (MongoDB)
```
POST   /api/orders/mongo                   - Create order
```

## 💾 MongoDB Collections

### users
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  phone: String,
  password_hash: String,
  is_admin: Boolean,
  is_active: Boolean,
  created_at: DateTime,
  last_login: DateTime,
  login_history: [{timestamp, ip_address, user_agent}],
  orders: [{order_id, date, amount}]
}
```

### products
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  stock_quantity: Number,
  category: String,
  image_url: String,
  created_at: DateTime,
  updated_at: DateTime
}
```

### orders
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  items: [{name, quantity}],
  total_amount: Number,
  payment_method: String,
  payment_status: String,
  order_status: String,
  created_at: DateTime,
  shipping_address: {street, city, state, zip_code, country}
}
```

## 🎯 Usage Examples

### View All Users
1. Go to Admin Panel
2. Click "👥 Users" tab
3. See all users with quick stats

### View User Details
1. Click "📋 Details" on any user
2. See profile, login history, and orders

### Search Users
1. Type in search box to find by:
   - Username
   - Email
   - Phone
   - Name

### Filter Users
- All Users
- Admin Users
- Regular Users
- Active Users
- Inactive Users

### Manage Products
1. Click "📦 Products" tab
2. View products with real-time sync status
3. Add/Edit/Delete products
4. Changes sync automatically

## 📊 Features in Detail

### Login History Audit
- Every login is recorded
- Timestamp of exact login time
- IP address captured
- User agent (device/browser) stored
- Useful for security audits

### Payment History
- All orders linked to user
- Item details stored
- Total amount recorded
- Payment method tracked
- Payment status (completed/pending/failed)
- Shipping address preserved
- Order status (pending/shipped/delivered)

### Real-Time Sync
- Products sync every 3 seconds
- Stock status updates automatically
- Login history saved immediately
- Orders recorded in real-time

### Responsive Design
- Works on desktop (1920px+)
- Tablet friendly (768px-1024px)
- Mobile responsive (<768px)
- Touch-friendly interface

## 🔐 Security Features

### Password Security
- Passwords hashed with werkzeug.security
- Never stored in plain text
- Secure comparison on login

### Login Tracking
- IP address recorded for each login
- User agent captured
- Timestamps preserve audit trail
- Helps identify unauthorized access

### Data Privacy
- Users see only their data
- Admins can view all data
- Role-based access control

## 🚀 Performance

| Operation | Time |
|-----------|------|
| Load user list | ~100-150ms |
| Load user details | ~150-200ms |
| Search users | <50ms (client-side) |
| API response | ~50-100ms |
| Product sync | Every 3 seconds |
| Stock refresh | Every 5 seconds |

## 🧪 Testing

Run the tests documented in:
- [USER_MANAGEMENT_TESTING.md](USER_MANAGEMENT_TESTING.md)
- [TESTING_REAL_TIME_STOCK.md](TESTING_REAL_TIME_STOCK.md)

Quick test:
```bash
# Terminal 1: Backend
cd backend
python app.py

# Terminal 2: Frontend
npm run dev

# Browser: http://localhost:5173
# Admin credentials: username=admin, password=admin
```

## 📈 Statistics Available

- Total users count
- Total orders count
- Total products count
- Total revenue (₹)
- Average spent per user
- Recent login list
- Per-user order count
- Per-user total spending

## 🎁 What's Included

✅ Complete user management system
✅ Real-time product management
✅ Login audit trail
✅ Payment history tracking
✅ Admin dashboard with statistics
✅ Search and filtering
✅ Responsive design
✅ MongoDB integration
✅ Secure password storage
✅ Comprehensive documentation
✅ 10 test scenarios
✅ Error handling

## 📞 Getting Help

1. Check the relevant documentation file
2. Review test scenarios for examples
3. Check browser console (F12) for errors
4. Check backend logs for server errors
5. Verify MongoDB is running with `mongosh`

## 🔄 Workflow

```
Customer (Shop Page)
  ↓
  → Register/Login → Login tracked in DB
  → Add products to cart
  → Make purchase → Order created
  ↓
Admin (Admin Panel)
  ↓
  → View Users tab
  → See all customers
  → Click Details
  ↓
  → View login history (when they accessed)
  → View orders/payments (what they bought)
  → View profile (contact info)
  ↓
Products Tab
  ↓
  → Real-time sync of inventory
  → Add/edit/delete products
  → All changes sync automatically
```

## 📝 License

This project is open source. Feel free to modify and extend it.

## 🙏 Credits

Built with React, Flask, MongoDB, and ❤️

---

**Start exploring!** Go to Admin Panel → Users tab to see your complete customer management system in action! 🚀
>>>>>>> 3ad942d (Initial commit)

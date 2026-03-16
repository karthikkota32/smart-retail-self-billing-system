import { useState, useEffect } from "react";
import { getAllUsers, getUserDetails } from "../services/api";
import "../styles/UserManagement.css";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [filterActive, setFilterActive] = useState("all"); // all, admin, user, active, inactive

  // Fetch all users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.users);
      } else {
        setError(response.message || "Failed to fetch users");
      }
    } catch (err) {
      setError(err.message || "Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      setDetailsLoading(true);
      const response = await getUserDetails(userId);
      if (response.success) {
        setUserDetails(response.user);
        setShowDetailModal(true);
      } else {
        alert("Failed to fetch user details: " + response.message);
      }
    } catch (err) {
      alert("Error fetching user details: " + err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = (user) => {
    fetchUserDetails(user.id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Filter users based on search and filter
  const filteredUsers = users.filter((user) => {
    const matchSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterActive === "all") return matchSearch;
    if (filterActive === "admin") return matchSearch && user.is_admin;
    if (filterActive === "user") return matchSearch && !user.is_admin;
    if (filterActive === "active") return matchSearch && user.is_active;
    if (filterActive === "inactive") return matchSearch && !user.is_active;

    return matchSearch;
  });

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="um-header">
        <h2>👥 User Management</h2>
        <button onClick={fetchUsers} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {error && <div className="um-error">⚠️ {error}</div>}

      <div className="um-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by username, name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterActive === "all" ? "active" : ""}`}
            onClick={() => setFilterActive("all")}
          >
            All ({users.length})
          </button>
          <button
            className={`filter-btn ${filterActive === "admin" ? "active" : ""}`}
            onClick={() => setFilterActive("admin")}
          >
            Admin ({users.filter((u) => u.is_admin).length})
          </button>
          <button
            className={`filter-btn ${filterActive === "user" ? "active" : ""}`}
            onClick={() => setFilterActive("user")}
          >
            Users ({users.filter((u) => !u.is_admin).length})
          </button>
          <button
            className={`filter-btn ${filterActive === "active" ? "active" : ""}`}
            onClick={() => setFilterActive("active")}
          >
            Active ({users.filter((u) => u.is_active).length})
          </button>
        </div>
      </div>

      <div className="um-stats">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">
            {users.reduce((sum, u) => sum + u.total_orders, 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">
            {formatCurrency(users.reduce((sum, u) => sum + u.total_spent, 0))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Spent/User</div>
          <div className="stat-value">
            {users.length > 0
              ? formatCurrency(
                  users.reduce((sum, u) => sum + u.total_spent, 0) / users.length
                )
              : "₹0"}
          </div>
        </div>
      </div>

      <div className="um-table-wrapper">
        <table className="um-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className={!user.is_active ? "inactive-row" : ""}>
                  <td className="username-cell">
                    <strong>{user.username}</strong>
                  </td>
                  <td>{user.name}</td>
                  <td>{user.phone}</td>
                  <td>{user.email || "N/A"}</td>
                  <td>
                    <span className={`role-badge ${user.is_admin ? "admin" : "user"}`}>
                      {user.is_admin ? "👑 Admin" : "👤 User"}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.is_active ? "active" : "inactive"}`}>
                      {user.is_active ? "✅ Active" : "❌ Inactive"}
                    </span>
                  </td>
                  <td>
                    <span className="orders-count">{user.total_orders}</span>
                  </td>
                  <td>{formatCurrency(user.total_spent)}</td>
                  <td>{formatDate(user.last_login)}</td>
                  <td>
                    <button
                      className="view-details-btn"
                      onClick={() => handleViewDetails(user)}
                      title="View full details, login history, and orders"
                    >
                      📋 Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="empty-state">
                  No users found matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {showDetailModal && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content user-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 User Details</h3>
              <button
                className="close-btn"
                onClick={() => setShowDetailModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div className="modal-loading">Loading user details...</div>
            ) : !userDetails ? (
              <div className="modal-loading">⚠️ Failed to load user details</div>
            ) : (
              <div className="modal-body">
                {/* Profile Section */}
                <section className="detail-section">
                  <h4>📌 Profile Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Username</label>
                      <div className="detail-value">{userDetails.username}</div>
                    </div>
                    <div className="detail-item">
                      <label>Name</label>
                      <div className="detail-value">{userDetails.name}</div>
                    </div>
                    <div className="detail-item">
                      <label>Phone</label>
                      <div className="detail-value">{userDetails.phone}</div>
                    </div>
                    <div className="detail-item">
                      <label>Email</label>
                      <div className="detail-value">{userDetails.email || "Not provided"}</div>
                    </div>
                    <div className="detail-item">
                      <label>Role</label>
                      <div className="detail-value">
                        {userDetails.is_admin ? "👑 Admin" : "👤 Regular User"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <div className="detail-value">
                        {userDetails.is_active ? "✅ Active" : "❌ Inactive"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <label>Joined On</label>
                      <div className="detail-value">{formatDate(userDetails.created_at)}</div>
                    </div>
                    <div className="detail-item">
                      <label>Last Updated</label>
                      <div className="detail-value">{formatDate(userDetails.updated_at)}</div>
                    </div>
                  </div>
                </section>

                {/* Login History Section */}
                <section className="detail-section">
                  <h4>🔐 Login History ({userDetails.login_history.length} logins)</h4>
                  {userDetails.login_history.length > 0 ? (
                    <div className="login-history">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>IP Address</th>
                            <th>User Agent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userDetails.login_history.map((login, index) => (
                            <tr key={index}>
                              <td>{formatDate(login.timestamp)}</td>
                              <td>
                                <code className="ip-code">{login.ip_address}</code>
                              </td>
                              <td>
                                <small className="user-agent">{login.user_agent}</small>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">No login history found</div>
                  )}
                </section>

                {/* Payment/Orders History Section */}
                <section className="detail-section">
                  <h4>💳 Payment & Order History ({userDetails.orders.length} orders)</h4>
                  <div className="order-stats">
                    <div className="stat">
                      <label>Total Orders</label>
                      <div className="stat-val">{userDetails.total_orders}</div>
                    </div>
                    <div className="stat">
                      <label>Total Spent</label>
                      <div className="stat-val">{formatCurrency(userDetails.total_spent)}</div>
                    </div>
                  </div>

                  {userDetails.orders.length > 0 ? (
                    <div className="orders-list">
                      {userDetails.orders.map((order) => (
                        <div key={order.id} className="order-card">
                          <div className="order-header">
                            <div className="order-id">Order ID: {order.id.substring(0, 12)}...</div>
                            <div className="order-date">{formatDate(order.created_at)}</div>
                          </div>

                          <div className="order-details">
                            <div className="order-row">
                              <label>Amount Paid</label>
                              <span className="amount">{formatCurrency(order.total_amount)}</span>
                            </div>
                            <div className="order-row">
                              <label>Payment Method</label>
                              <span>{order.payment_method}</span>
                            </div>
                            <div className="order-row">
                              <label>Payment Status</label>
                              <span className={`payment-status ${order.payment_status}`}>
                                {order.payment_status === "completed"
                                  ? "✅ Completed"
                                  : order.payment_status === "pending"
                                    ? "⏳ Pending"
                                    : "❌ Failed"}
                              </span>
                            </div>
                            <div className="order-row">
                              <label>Order Status</label>
                              <span className={`order-status ${order.order_status}`}>
                                {order.order_status === "pending"
                                  ? "📦 Pending"
                                  : order.order_status === "shipped"
                                    ? "🚚 Shipped"
                                    : order.order_status === "delivered"
                                      ? "✓ Delivered"
                                      : "❌ Cancelled"}
                              </span>
                            </div>
                          </div>

                          {order.items.length > 0 && (
                            <div className="order-items">
                              <label>Items</label>
                              <ul>
                                {order.items.map((item, idx) => (
                                  <li key={idx}>
                                    {item.name} × {item.quantity}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
                            <div className="shipping-address">
                              <label>Shipping Address</label>
                              <address>
                                {order.shipping_address.street && (
                                  <>
                                    {order.shipping_address.street}
                                    <br />
                                  </>
                                )}
                                {order.shipping_address.city && order.shipping_address.state && (
                                  <>
                                    {order.shipping_address.city}, {order.shipping_address.state}
                                    <br />
                                  </>
                                )}
                                {order.shipping_address.zip_code && (
                                  <>
                                    {order.shipping_address.zip_code}
                                    <br />
                                  </>
                                )}
                                {order.shipping_address.country && order.shipping_address.country}
                              </address>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No orders found for this user</div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;

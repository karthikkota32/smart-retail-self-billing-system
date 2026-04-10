import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { readCartItems } from "../utils/cartUtils";
import "../styles/MasterNavbar.css";

function MasterNavbar(){

  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole");
  const [cartCount,setCartCount] = useState(()=>{
    const userPhone = localStorage.getItem("userPhone") || "guest";
    const cart = readCartItems(userPhone);
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  });

  const [showMenu, setShowMenu] = useState(false);
  const navRef = useRef(null);

  const loadCart = () => {
    const userPhone = localStorage.getItem("userPhone") || "guest";
    const cart = readCartItems(userPhone);
    setCartCount(cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0));
  };

  useEffect(()=>{
    window.addEventListener("appUpdate",loadCart);
    return ()=>window.removeEventListener("appUpdate",loadCart);
  },[]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showMenu && navRef.current && !navRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [showMenu]);

  const logout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      const userPhone = localStorage.getItem("userPhone") || "guest";
      localStorage.removeItem("role");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      localStorage.removeItem("userName");
      localStorage.removeItem("userPhone");
      localStorage.removeItem("phone");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      // Clear user-specific data
      localStorage.removeItem(`cart_${userPhone}`);
      localStorage.removeItem(`wishlist_${userPhone}`);
      localStorage.removeItem(`appliedCoupons_${userPhone}`);
      navigate("/");
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
    setShowMenu(false);
  };

  return(
    <nav className="master-navbar" ref={navRef}>
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => handleNavClick("/dashboard")}>
          <span className="logo">🛒 SmartRetail</span>
        </div>

        <button className="menu-toggle" onClick={() => setShowMenu(!showMenu)}>
          ☰
        </button>

        <div className={`navbar-menu ${showMenu ? "active" : ""}`}>
          <div className="nav-links">
            {userRole === "admin" && (
              <button 
                className="nav-link"
                onClick={() => handleNavClick("/admin")}
                title="Admin Dashboard"
              >
                📊 Admin
              </button>
            )}
            <button 
              className="nav-link"
              onClick={() => handleNavClick("/shop")}
              title="Browse and shop products"
            >
              🛍️ Shop
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/grocery-preorder")}
              title="Pre-order groceries with time slots"
            >
              🥕 Grocery Pre-Order
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/dashboard")}
              title="Dashboard"
            >
              📈 Dashboard
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/wishlist")}
              title="View your wishlist"
            >
              Wishlist
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/coupons")}
              title="View available coupons"
            >
              🎟️ Coupons
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/history")}
              title="View your purchase history"
            >
              📦 History
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/profile")}
              title="View and edit your profile"
            >
              👤 Profile
            </button>
          </div>

          <div className="navbar-actions">
            {userRole ? (
              <>
                <button 
                  className="nav-link"
                  onClick={() => handleNavClick("/cart")}
                  title="Shopping Cart"
                >
                  🛒 Cart ({cartCount})
                </button>

                <button 
                  className="nav-link logout-btn"
                  onClick={logout}
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <button 
                className="nav-link login-btn"
                onClick={() => handleNavClick("/")}
                title="Login to your account"
              >
                🔐 Login
              </button>
            )}
          </div>
        </div>

        <div className="navbar-right">
          <button 
            className="cart-btn"
            onClick={() => handleNavClick("/cart")}
            title="Shopping Cart"
          >
            🛒 {cartCount}
          </button>
          <span className="user-info">
            {localStorage.getItem("username")}
          </span>
        </div>
      </div>
    </nav>
  );
}
export default MasterNavbar;
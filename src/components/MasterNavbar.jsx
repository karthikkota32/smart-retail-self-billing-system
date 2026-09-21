import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { readCartItems } from "../utils/cartUtils";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "./LanguageSelector";
import "../styles/MasterNavbar.css";

function MasterNavbar(){

  const navigate = useNavigate();
  const { t } = useLanguage();
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
          <span className="logo">🛒 {t('nav.brand', 'SmartRetail')}</span>
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
                📊 {t('nav.admin', 'Admin')}
              </button>
            )}
            <button 
              className="nav-link"
              onClick={() => handleNavClick("/shop")}
              title="Browse and shop products"
            >
              🛍️ {t('nav.shop', 'Shop')}
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/grocery-preorder")}
              title="Pre-order groceries with time slots"
            >
              🥕 {t('nav.preorder', 'Grocery Pre-Order')}
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/dashboard")}
              title="Dashboard"
            >
              📈 {t('nav.dashboard', 'Dashboard')}
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/wishlist")}
              title="View your wishlist"
            >
              ❤️ {t('nav.wishlist', 'Wishlist')}
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/coupons")}
              title="View available coupons"
            >
              🎟️ {t('nav.coupons', 'Coupons')}
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/history")}
              title="View your purchase history"
            >
              📦 {t('nav.history', 'History')}
            </button>

            <button 
              className="nav-link"
              onClick={() => handleNavClick("/profile")}
              title="View and edit your profile"
            >
              👤 {t('nav.profile', 'Profile')}
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
                  🛒 {t('nav.cart', 'Cart')} ({cartCount})
                </button>

                <button 
                  className="nav-link logout-btn"
                  onClick={logout}
                >
                  🚪 {t('nav.logout', 'Logout')}
                </button>
              </>
            ) : (
              <button 
                className="nav-link login-btn"
                onClick={() => handleNavClick("/")}
                title="Login to your account"
              >
                🔐 {t('nav.login', 'Login')}
              </button>
            )}
          </div>
        </div>

        <div className="navbar-right">
          {userRole === "admin" && (
            <button
              onClick={() => handleNavClick("/admin")}
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "white",
                border: "none",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="Open Admin Dashboard"
            >
              👨‍💼 {t('nav.admin_panel', 'Admin Panel')}
            </button>
          )}

          <LanguageSelector variant="navbar" />

          <button 
            className="cart-btn"
            onClick={() => handleNavClick("/cart")}
            title="Shopping Cart"
          >
            🛒 {cartCount}
          </button>
          <span className="user-info">
            {localStorage.getItem("username")}
            {userRole === "admin" && " (Admin)"}
          </span>
        </div>
      </div>
    </nav>
  );
}
export default MasterNavbar;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterNavbar from "../components/MasterNavbar";
import { getCoupons } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Coupons.css";

function Coupons() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const userPhone = localStorage.getItem("userPhone");
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  const loadCoupons = async () => {
    try {
      const res = await getCoupons();
      if (res.ok && res.coupons) {
        setCoupons(res.coupons);
      } else {
        console.log("Failed to load coupons");
      }
    } catch (error) {
      console.error("Error loading coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userPhone) {
      navigate("/");
      return;
    }

    loadCoupons();
  }, [userPhone, navigate]);

  const copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isCouponValid = (coupon) => {
    const now = new Date();
    const expiryDate = coupon.expiryDate ? new Date(coupon.expiryDate) : null;
    return !expiryDate || expiryDate > now;
  };

  const activeCoupons = coupons.filter(c => isCouponValid(c));
  const expiredCoupons = coupons.filter(c => !isCouponValid(c));

  if (loading) {
    return (
      <div className="coupons-page">
        <MasterNavbar />
        <div className="loading-message">Loading coupons...</div>
      </div>
    );
  }

  return (
    <div className="coupons-page">
      <MasterNavbar />

      <div className="coupons-header">
        <h1>🎟️ {t("coupons.title", "Discount Coupons")}</h1>
        <p>{t("coupons.subtitle", "Save more with our exclusive offers")}</p>
      </div>

      <div className="coupons-container">
        {activeCoupons.length === 0 ? (
          <div className="empty-coupons">
            <h2>🎉 {t("coupons.expired_coupons", "No Active Coupons")}</h2>
            <p>{t("coupons.subtitle", "Check back later for exclusive discount offers")}</p>
          </div>
        ) : (
          <div className="coupons-grid">
            {activeCoupons.map((coupon) => (
              <div key={coupon.id} className="coupon-card">
                <div className="coupon-header">
                  <h3 className="coupon-code">{coupon.code}</h3>
                  <span className="discount-badge">{coupon.discountPercentage}% {t("coupons.off", "OFF")}</span>
                </div>

                <p className="coupon-description">
                  {coupon.description || `Get ${coupon.discountPercentage}% discount on your purchase`}
                </p>

                <div className="coupon-details">
                  {coupon.minPurchase && (
                    <div className="detail-item">
                      <span className="detail-label">{t("coupons.min_purchase", "Min Purchase")}:</span>
                      <span className="detail-value">₹{coupon.minPurchase}</span>
                    </div>
                  )}
                  {coupon.expiryDate && (
                    <div className="detail-item">
                      <span className="detail-label">{t("coupons.expiry_date", "Expires")}:</span>
                      <span className="detail-value">{new Date(coupon.expiryDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {coupon.usageCount !== undefined && (
                    <div className="detail-item">
                      <span className="detail-label">{t("coupons.usage_limit", "Uses")}:</span>
                      <span className="detail-value">{coupon.usageCount || 0}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => copyCouponCode(coupon.code)}
                  className={`btn-copy-code ${copiedCode === coupon.code ? "copied" : ""}`}
                >
                  {copiedCode === coupon.code ? `✅ ${t("coupons.copied", "Copied!")}` : `📋 ${t("coupons.copy_code", "Copy Code")}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {expiredCoupons.length > 0 && (
          <div className="expired-section">
            <h3 className="expired-title">⏰ Expired Coupons</h3>
            <div className="expired-coupons">
              {expiredCoupons.map((coupon) => (
                <div key={coupon.id} className="expired-coupon-card">
                  <div className="expired-header">
                    <h4>{coupon.code}</h4>
                    <span className="expired-badge">Expired</span>
                  </div>
                  <p className="expired-date">
                    Expired on {new Date(coupon.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {coupons.length === 0 && (
          <div className="info-message">
            <p>🔔 No coupons available at the moment. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Coupons;

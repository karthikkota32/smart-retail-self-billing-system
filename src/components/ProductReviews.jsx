import React, { useState, useEffect, useCallback } from "react";
import StarRating from "./StarRating";
import { getProductReviews } from "../services/api";
import "../styles/ProductReviews.css";

const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, 5, 4, 3, 2, 1

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductReviews(productId);
      if (data.success) {
        setReviews(data.reviews);
      } else {
        setError(data.message || "Failed to load reviews");
      }
    } catch (err) {
      setError("Failed to fetch reviews");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const getFilteredReviews = () => {
    if (filter === "all") return reviews;
    return reviews.filter((review) => review.rating === parseInt(filter));
  };

  const getRatingCounts = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      counts[review.rating]++;
    });
    return counts;
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return <div className="reviews-loading">Loading reviews...</div>;
  }

  if (error) {
    return <div className="reviews-error">⚠️ {error}</div>;
  }

  const filteredReviews = getFilteredReviews();
  const ratingCounts = getRatingCounts();
  const averageRating = getAverageRating();

  return (
    <div className="product-reviews">
      <div className="reviews-header">
        <h3>Customer Reviews</h3>
        <div className="reviews-summary">
          <div className="average-rating">
            <div className="rating-number">{averageRating}</div>
            <StarRating rating={parseFloat(averageRating)} readonly size="large" />
            <div className="total-reviews">{reviews.length} reviews</div>
          </div>
          <div className="rating-breakdown">
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                className={`rating-filter ${filter === star.toString() ? "active" : ""}`}
                onClick={() => setFilter(star.toString())}
              >
                <span className="star-label">{star} ★</span>
                <div className="rating-bar">
                  <div
                    className="rating-bar-fill"
                    style={{
                      width: `${reviews.length > 0 ? (ratingCounts[star] / reviews.length) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="rating-count">{ratingCounts[star]}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Show All
        </button>
      </div>

      <div className="reviews-list">
        {filteredReviews.length === 0 ? (
          <div className="no-reviews">
            {filter === "all"
              ? "No reviews yet. Be the first to review!"
              : `No ${filter}-star reviews yet.`}
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review._id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info">
                  <div className="reviewer-avatar">
                    {review.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="reviewer-name">{review.username}</div>
                    <div className="review-date">{formatDate(review.created_at)}</div>
                  </div>
                </div>
                <StarRating rating={review.rating} readonly size="small" />
              </div>
              {review.review_text && (
                <p className="review-text">{review.review_text}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews;

import React, { useState } from "react";
import StarRating from "./StarRating";
import { addProductReview } from "../services/api";
import "../styles/ReviewForm.css";

const ReviewForm = ({ productId, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    // Get user info from localStorage
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("userName");

    if (!userId || !username) {
      setError("Please log in to submit a review");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const data = await addProductReview(productId, userId, username, rating, reviewText);

      if (data.success) {
        setSuccess(true);
        setRating(0);
        setReviewText("");

        // Notify parent component to refresh reviews
        if (onReviewSubmitted) {
          onReviewSubmitted();
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.message || "Failed to submit review");
      }
    } catch (err) {
      setError("Failed to submit review. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-form">
      <h3>Write a Review</h3>

      {success && (
        <div className="review-success">
          ✓ Your review has been submitted successfully!
        </div>
      )}

      {error && <div className="review-error">⚠️ {error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Your Rating *</label>
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            size="large"
          />
        </div>

        <div className="form-group">
          <label htmlFor="review-text">Your Review (Optional)</label>
          <textarea
            id="review-text"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your thoughts about this product..."
            rows={5}
            maxLength={500}
          />
          <div className="character-count">
            {reviewText.length}/500 characters
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;

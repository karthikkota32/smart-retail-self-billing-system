import React from "react";
import "../styles/StarRating.css";

const StarRating = ({ rating, onRatingChange, readonly = false, size = "medium" }) => {
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (value) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleKeyPress = (e, value) => {
    if ((e.key === "Enter" || e.key === " ") && !readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className={`star-rating ${size} ${readonly ? "readonly" : "interactive"}`}>
      {stars.map((star) => (
        <span
          key={star}
          className={`star ${star <= rating ? "filled" : "empty"}`}
          onClick={() => handleClick(star)}
          onKeyPress={(e) => handleKeyPress(e, star)}
          role={readonly ? "img" : "button"}
          tabIndex={readonly ? -1 : 0}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          {star <= rating ? "★" : "☆"}
        </span>
      ))}
      {readonly && rating > 0 && (
        <span className="rating-value">({rating.toFixed(1)})</span>
      )}
    </div>
  );
};

export default StarRating;

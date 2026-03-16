import React, { useState } from "react";
import "../styles/AdvancedSearchFilters.css";

const AdvancedSearchFilters = ({ onSearch, categories = [] }) => {
  const [filters, setFilters] = useState({
    query: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
    sortBy: "newest",
    inStockOnly: false,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      query: "",
      category: "",
      minPrice: "",
      maxPrice: "",
      minRating: "",
      sortBy: "newest",
      inStockOnly: false,
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="advanced-search-filters">
      <div className="search-bar">
        <input
          type="text"
          name="query"
          value={filters.query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Search products..."
          className="search-input"
        />
        <button onClick={handleSearch} className="search-btn">
          🔍 Search
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="toggle-filters-btn"
        >
          {isExpanded ? "⬆ Hide Filters" : "⬇ More Filters"}
        </button>
      </div>

      {isExpanded && (
        <div className="filters-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Category</label>
              <select name="category" value={filters.category} onChange={handleInputChange}>
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Min Price ($)</label>
              <input
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="filter-group">
              <label>Max Price ($)</label>
              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleInputChange}
                placeholder="1000"
                min="0"
              />
            </div>

            <div className="filter-group">
              <label>Min Rating</label>
              <select name="minRating" value={filters.minRating} onChange={handleInputChange}>
                <option value="">Any Rating</option>
                <option value="4">4+ ★</option>
                <option value="3">3+ ★</option>
                <option value="2">2+ ★</option>
                <option value="1">1+ ★</option>
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Sort By</label>
              <select name="sortBy" value={filters.sortBy} onChange={handleInputChange}>
                <option value="newest">Newest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            <div className="filter-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="inStockOnly"
                  checked={filters.inStockOnly}
                  onChange={handleInputChange}
                />
                <span>In Stock Only</span>
              </label>
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={handleSearch} className="apply-btn">
              Apply Filters
            </button>
            <button onClick={handleReset} className="reset-btn">
              Reset All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilters;

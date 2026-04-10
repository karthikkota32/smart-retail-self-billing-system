import React, { useState } from 'react';
import '../../styles/GroceryPreOrder.css';

/**
 * UploadList Component
 * Allows users to input grocery items via:
 * - Text input (multi-line)
 * - File upload (.txt)
 */
const UploadList = ({ onSubmit, isLoading = false }) => {
  const [inputMethod, setInputMethod] = useState('text'); // 'text' or 'file'
  const [textInput, setTextInput] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  /**
   * Parse text input into items
   * Splits by newlines and removes empty lines
   */
  const parseItems = (text) => {
    return text
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  /**
   * Handle text input change
   */
  const handleTextChange = (e) => {
    const text = e.target.value;
    setTextInput(text);
    if (text) {
      const parsedItems = parseItems(text);
      setItems(parsedItems);
      setError('');
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsedItems = parseItems(text);

      if (parsedItems.length === 0) {
        setError('No items found in the file');
        return;
      }

      setItems(parsedItems);
      setTextInput(text);
      setError('');
      setInputMethod('file');
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  /**
   * Handle submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (items.length === 0) {
      setError('Please enter at least one item');
      return;
    }

    onSubmit(items);
  };

  /**
   * Remove an item from the list
   */
  const removeItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    setTextInput(parseItems(textInput).filter((_, i) => i !== index).join('\n'));
  };

  /**
   * Clear all items
   */
  const clearItems = () => {
    setItems([]);
    setTextInput('');
    setError('');
  };

  return (
    <div className="upload-list-container">
      <h2>Upload Your Grocery List</h2>
      <p className="subtitle">Choose how you want to add items to your order</p>

      {/* Input Method Selector */}
      <div className="input-method-selector">
        <button
          className={`method-btn ${inputMethod === 'text' ? 'active' : ''}`}
          onClick={() => setInputMethod('text')}
        >
          📝 Text Input
        </button>
        <button
          className={`method-btn ${inputMethod === 'file' ? 'active' : ''}`}
          onClick={() => setInputMethod('file')}
        >
          📄 Upload File
        </button>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        {/* Text Input Method */}
        {inputMethod === 'text' && (
          <div className="form-group">
            <label htmlFor="itemsInput">Enter Items (one per line):</label>
            <textarea
              id="itemsInput"
              value={textInput}
              onChange={handleTextChange}
              placeholder="Example:&#10;Milk&#10;Bread&#10;Eggs&#10;Tomatoes"
              rows="8"
              className="text-input"
            />
          </div>
        )}

        {/* File Upload Method */}
        {inputMethod === 'file' && (
          <div className="form-group">
            <label htmlFor="fileInput">Choose a .txt file:</label>
            <input
              id="fileInput"
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="file-input"
            />
            <p className="file-help-text">
              Upload a text file with one item per line
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Items Preview */}
        {items.length > 0 && (
          <div className="items-preview">
            <h3>Items ({items.length})</h3>
            <div className="items-list">
              {items.map((item, index) => (
                <div key={index} className="item-chip">
                  <span>{item}</span>
                  <button
                    type="button"
                    className="remove-item-btn"
                    onClick={() => removeItem(index)}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          {items.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearItems}
            >
              Clear All
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={items.length === 0 || isLoading}
          >
            {isLoading ? 'Processing...' : 'Continue to Next Step'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadList;

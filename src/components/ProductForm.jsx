import { useState, useEffect } from "react";
import { createMongoProduct, updateMongoProduct } from "../services/api";

function ProductForm({ product, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    price_per_unit: "",
    unit_type: "unit",
    is_loose_item: false,
    stock_quantity: "",
    category: "",
    image_url: "",
    location: "",
  });

  const [imageMethod, setImageMethod] = useState("url"); // 'url' or 'file'
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        price: product.price || "",
        price_per_unit: product.price_per_unit || product.price || "",
        unit_type: product.unit_type || "unit",
        is_loose_item: Boolean(product.is_loose_item),
        stock_quantity: product.stock_quantity || "",
        category: product.category || "",
        image_url: product.image_url || "",
        location: product.location || "",
      });
      setImagePreview(product.image_url || null);
      setImageMethod("url");
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Read file as data URL for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setFormData({
        ...formData,
        image_url: reader.result, // Store base64 encoded image
      });
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setFormData({
      ...formData,
      image_url: url,
    });
    if (url) {
      setImagePreview(url);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Product name is required");
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Price must be greater than 0");
      return false;
    }
    if (formData.is_loose_item && !["kg", "g", "litre"].includes(formData.unit_type)) {
      setError("Select a valid unit type for loose items");
      return false;
    }
    if (!formData.category.trim()) {
      setError("Category is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        price_per_unit: parseFloat(formData.price_per_unit || formData.price),
        unit_type: formData.is_loose_item ? formData.unit_type : "unit",
        is_loose_item: Boolean(formData.is_loose_item),
        stock_quantity: parseFloat(formData.stock_quantity) || 0,
      };

      if (product) {
        const res = await updateMongoProduct(product._id, payload);
        if (res.success) {
          setFormData({
            name: "",
            description: "",
            price: "",
            price_per_unit: "",
            unit_type: "unit",
            is_loose_item: false,
            stock_quantity: "",
            category: "",
            image_url: "",
            location: "",
          });
          onSubmit();
        } else {
          setError(res.message || "Failed to update product");
        }
      } else {
        const res = await createMongoProduct(payload);
        if (res.success) {
          setFormData({
            name: "",
            description: "",
            price: "",
            price_per_unit: "",
            unit_type: "unit",
            is_loose_item: false,
            stock_quantity: "",
            category: "",
            image_url: "",
            location: "",
          });
          onSubmit();
        } else {
          setError(res.message || "Failed to create product");
        }
      }
    } catch (err) {
      setError("Error processing product: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3>{product ? "Edit Product" : "Add New Product"}</h3>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label>Product Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter product name"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter product description"
            style={{ ...styles.input, minHeight: "100px" }}
          />
        </div>

        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label>Price (₹) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Enter price"
              step="0.01"
              min="0"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Price Per Unit (₹)</label>
            <input
              type="number"
              name="price_per_unit"
              value={formData.price_per_unit}
              onChange={handleChange}
              placeholder="Auto = Price"
              step="0.01"
              min="0"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Stock Quantity</label>
            <input
              type="number"
              name="stock_quantity"
              value={formData.stock_quantity}
              onChange={handleChange}
              placeholder="Enter stock"
              min="0"
              step={formData.is_loose_item ? "0.1" : "1"}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                name="is_loose_item"
                checked={formData.is_loose_item}
                onChange={handleChange}
              />
              Loose Item (quantity-based)
            </label>
          </div>

          <div style={styles.formGroup}>
            <label>Unit Type</label>
            <select
              name="unit_type"
              value={formData.unit_type}
              onChange={handleChange}
              style={styles.input}
              disabled={!formData.is_loose_item}
            >
              <option value="unit">unit</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="litre">litre</option>
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label>Category *</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Electronics"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Storage location"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label>Image Upload *</label>
          <div style={styles.imageMethodContainer}>
            <button
              type="button"
              onClick={() => setImageMethod("url")}
              style={{
                ...styles.methodButton,
                background: imageMethod === "url" ? "#667eea" : "#ddd",
                color: imageMethod === "url" ? "white" : "#333",
              }}
            >
              📎 Use URL
            </button>
            <button
              type="button"
              onClick={() => setImageMethod("file")}
              style={{
                ...styles.methodButton,
                background: imageMethod === "file" ? "#667eea" : "#ddd",
                color: imageMethod === "file" ? "white" : "#333",
              }}
            >
              📁 Upload File
            </button>
          </div>

          {imageMethod === "url" ? (
            <input
              type="url"
              value={formData.image_url}
              onChange={handleUrlChange}
              placeholder="https://example.com/image.jpg"
              style={styles.input}
            />
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={styles.input}
            />
          )}

          {imagePreview && (
            <div style={styles.previewContainer}>
              <img
                src={imagePreview}
                alt="Preview"
                style={styles.previewImage}
              />
              <p style={styles.previewText}>✅ Image selected</p>
            </div>
          )}
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Processing..." : product ? "Update Product" : "Add Product"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{ ...styles.button, ...styles.cancelButton }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    background: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
  },
  input: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  imageMethodContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  methodButton: {
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
    flex: 1,
    transition: "all 0.3s ease",
  },
  previewContainer: {
    marginTop: "10px",
    textAlign: "center",
    padding: "10px",
    background: "#f0f0f0",
    borderRadius: "4px",
  },
  previewImage: {
    maxWidth: "150px",
    maxHeight: "150px",
    borderRadius: "4px",
    border: "2px solid #667eea",
    objectFit: "cover",
  },
  previewText: {
    fontSize: "12px",
    color: "#27ae60",
    fontWeight: "bold",
    margin: "8px 0 0 0",
  },
  error: {
    background: "#fee",
    color: "#c33",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "15px",
    border: "1px solid #fcc",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
  },
  button: {
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
    flex: 1,
  },
  submitButton: {
    background: "#667eea",
    color: "white",
  },
  cancelButton: {
    background: "#ddd",
    color: "#333",
  },
};

export default ProductForm;

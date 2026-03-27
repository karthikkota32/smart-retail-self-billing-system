import { deleteMongoProduct } from "../services/api";

function ProductList({ products, onEdit, onDelete, loading }) {
  const handleDelete = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      try {
        const res = await deleteMongoProduct(productId);
        if (res.success) {
          alert("✓ Product deleted successfully");
          // Pass productId to parent so it can sync properly
          onDelete(productId);
        } else {
          alert("❌ " + (res.message || "Failed to delete product"));
        }
      } catch (err) {
        alert("❌ Error: " + err.message);
      }
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading products...</div>;
  }

  if (!products || products.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>📦 No products found. Add your first product!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3>All Products ({products.length})</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id} style={styles.row}>
                <td style={styles.imageCell}>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={styles.productImage}
                    />
                  ) : (
                    <div style={styles.placeholderImage}>No Image</div>
                  )}
                </td>
                <td>
                  <strong>{product.name}</strong>
                  {product.is_loose_item && (
                    <p style={styles.description}>Loose item: ₹{Number(product.price_per_unit ?? product.price).toFixed(2)}/{product.unit_type || "unit"}</p>
                  )}
                  {product.description && (
                    <p style={styles.description}>{product.description}</p>
                  )}
                </td>
                <td>{product.category}</td>
                <td style={styles.price}>₹{parseFloat(product.price).toFixed(2)}</td>
                <td style={styles.stock}>
                  <span
                    style={{
                      ...styles.stockBadge,
                      ...(product.stock_quantity > 0
                        ? styles.inStock
                        : styles.outOfStock),
                    }}
                  >
                    {product.stock_quantity}
                  </span>
                </td>
                <td style={styles.actions}>
                  <button
                    onClick={() => onEdit(product)}
                    style={{ ...styles.button, ...styles.editButton }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    style={{ ...styles.button, ...styles.deleteButton }}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    color: "#666",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    background: "#f9f9f9",
    borderRadius: "8px",
    color: "#666",
  },
  tableWrapper: {
    overflowX: "auto",
    marginTop: "15px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  row: {
    borderBottom: "1px solid #eee",
  },
  imageCell: {
    width: "80px",
    padding: "10px",
  },
  productImage: {
    width: "60px",
    height: "60px",
    objectFit: "cover",
    borderRadius: "4px",
  },
  placeholderImage: {
    width: "60px",
    height: "60px",
    background: "#eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    fontSize: "11px",
    color: "#999",
    textAlign: "center",
  },
  description: {
    fontSize: "12px",
    color: "#999",
    margin: "5px 0 0 0",
  },
  price: {
    fontWeight: "bold",
    color: "#667eea",
  },
  stock: {
    textAlign: "center",
  },
  stockBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-block",
  },
  inStock: {
    background: "#d4edda",
    color: "#155724",
  },
  outOfStock: {
    background: "#f8d7da",
    color: "#721c24",
  },
  actions: {
    display: "flex",
    gap: "5px",
    whiteSpace: "nowrap",
  },
  button: {
    padding: "6px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  editButton: {
    background: "#667eea",
    color: "white",
  },
  deleteButton: {
    background: "#dc3545",
    color: "white",
  },
};

export default ProductList;

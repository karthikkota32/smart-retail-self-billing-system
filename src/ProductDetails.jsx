import { useParams } from "react-router-dom";

function ProductDetails() {
  const { id } = useParams();

  return (
    <div style={{ padding: "40px", background: "#eaeded", minHeight: "100vh" }}>
      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "10px",
          maxWidth: "800px",
          margin: "auto",
        }}
      >
        <h2>Grocery Item {id}</h2>

        <img
          src={`https://source.unsplash.com/400x400/?grocery&sig=${id}`}
          alt="product"
          style={{ width: "300px", borderRadius: "8px" }}
        />

        {/* PRICE SECTION */}
        <div style={{ marginTop: "20px", fontSize: "20px" }}>
          <span style={{ color: "red", fontWeight: "bold" }}>₹199</span>
          <span
            style={{
              marginLeft: "10px",
              textDecoration: "line-through",
              color: "gray",
            }}
          >
            ₹299
          </span>
        </div>

        {/* RATING */}
        <p style={{ marginTop: "10px", fontSize: "18px" }}>
          ⭐ 4.5 (1200 reviews)
        </p>

        {/* DELIVERY */}
        <p style={{ color: "green", fontWeight: "bold" }}>Free Delivery</p>
      </div>
    </div>
  );
}

export default ProductDetails;
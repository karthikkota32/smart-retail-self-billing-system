import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function MasterNavbar(){

  const navigate = useNavigate();

  const [cartCount,setCartCount] = useState(0);

  const role = localStorage.getItem("role");

  // ⭐ LIVE CART SYNC
  const loadCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartCount(cart.length);
  };

  useEffect(()=>{

    loadCart();

    window.addEventListener("appUpdate",loadCart);

    return ()=>window.removeEventListener("appUpdate",loadCart);

  },[]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return(
    <div style={{
      width:"100%",
      background:"#131921",
      color:"white",
      padding:"15px 30px",
      display:"flex",
      alignItems:"center",
      justifyContent:"space-between",
      position:"sticky",
      top:0,
      zIndex:1000
    }}>

      {/* LEFT */}
      <h2 style={{cursor:"pointer"}} onClick={()=>navigate("/dashboard")}>
        Smart Retail
      </h2>

      {/* CENTER ROLE */}
      <div>
        {role==="admin" ? "👨‍💼 Admin Panel" : "👤 Customer"}
      </div>

      {/* RIGHT */}
      <div style={{display:"flex",gap:"20px",alignItems:"center"}}>

        <div
          onClick={()=>navigate("/cart")}
          style={{cursor:"pointer",fontWeight:"bold"}}
        >
          🛒 Cart ({cartCount})
        </div>

        <button
          onClick={logout}
          style={{
            background:"#ffd814",
            border:"none",
            padding:"8px 14px",
            borderRadius:"6px",
            cursor:"pointer",
            fontWeight:"bold"
          }}
        >
          Logout
        </button>

      </div>

    </div>
  );
}

export default MasterNavbar;

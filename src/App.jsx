import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Shop from "./pages/Shop";
import Dashboard from "./pages/Dashboard";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import History from "./pages/History";
import Payment from "./pages/Payment";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";
import Coupons from "./pages/Coupons";

function App() {
  console.log("App is rendering");
  
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <BrowserRouter>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/history" element={<History />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/coupons" element={<Coupons />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </div>
  );
}

export default App;

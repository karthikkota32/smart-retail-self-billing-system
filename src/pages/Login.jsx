import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { loginUserMongo, registerUserMongo } from "../services/api";

function Login() {

  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");

  const registerUser = async () => {
    setError("");
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim() || null;
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedName || !trimmedPhone || !trimmedPassword) {
      setError("Enter Username, Name, Phone, and Password");
      return;
    }

    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError("Enter a valid 10-digit phone number");
      return;
    }

    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const result = await registerUserMongo(
        trimmedUsername,
        trimmedName,
        trimmedPhone,
        trimmedEmail,
        trimmedPassword
      );

      if (!result.ok) {
        setError(result.message || "Registration failed");
        return;
      }

      setMode("login");
      setUsername("");
      setName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setError("Account created. Please log in.");
    } catch {
      setError("Unable to reach server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async () => {
    setError("");
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError("Enter Username and Password");
      return;
    }

    try {
      setLoading(true);
      const result = await loginUserMongo(trimmedUsername, trimmedPassword);
      if (!result.ok) {
        setError(result.message || "Invalid credentials");
        return;
      }

      const userRole = result.is_admin ? "admin" : "user";

      localStorage.setItem("role", userRole);
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userName", result.name || "User");
      localStorage.setItem("userPhone", result.phone);
      localStorage.setItem("phone", result.phone);
      localStorage.setItem("userEmail", result.email || "");
      localStorage.setItem("username", result.username);
      localStorage.setItem("userId", result.user_id || "");

      if (userRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/shop");
      }
    } catch {
      setError("Unable to reach server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
        overflowX: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "50px",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "550px",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.25)",
          animation: "slideUp 0.4s ease-out",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          input[type="text"],
          input[type="email"],
          input[type="password"] {
            width: 100%;
            padding: 18px 20px;
            border: 2px solid #e8e8e8;
            border-radius: 12px;
            font-size: 16px;
            font-family: inherit;
            transition: all 0.3s ease;
            box-sizing: border-box;
            margin-bottom: 20px;
            height: 54px;
          }
          
          input[type="text"]:focus,
          input[type="email"]:focus,
          input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
          }
          
          button {
            width: 100%;
            padding: 16px 20px;
            height: 52px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            font-size: 17px;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          button:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
          }
          
          button:active:not(:disabled) {
            transform: translateY(-1px);
          }
        `}</style>

        <div style={{ marginBottom: "48px" }}>
          <h2
            style={{
              fontSize: "42px",
              fontWeight: "700",
              margin: "0 0 14px 0",
              color: "#1a1a1a",
              letterSpacing: "-0.8px",
              lineHeight: "1.2",
            }}
          >
            {mode === "register" ? "Create Account" : "Smart Retail"}
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#666",
              margin: "0",
              fontWeight: "500",
              lineHeight: "1.6",
            }}
          >
            {mode === "register" ? "Join our community" : "Sign in to continue"}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
          />

          {mode === "register" && (
            <>
              <input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
              />

              <input
                placeholder="10-digit Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="text"
              />

              <input
                placeholder="Email (Optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </>
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div
              style={{
                color: error.startsWith("Account created") ? "#16a34a" : "#dc2626",
                background: error.startsWith("Account created") ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${error.startsWith("Account created") ? "#bbf7d0" : "#fecaca"}`,
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {error}
            </div>
          )}

          {mode === "register" ? (
            <button
              onClick={registerUser}
              disabled={loading}
              style={{
                background: loading ? "#999" : "#111827",
                color: "white",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          ) : (
            <button
              onClick={loginUser}
              disabled={loading}
              style={{
                background: loading ? "#999" : "#667eea",
                color: "white",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Signing In..." : "Login"}
            </button>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "36px",
            fontSize: "15px",
            color: "#666",
            lineHeight: "1.6",
          }}
        >
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setMode("register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#667eea",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "0",
                  fontSize: "14px",
                  textDecoration: "underline",
                  width: "auto",
                }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#667eea",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "0",
                  fontSize: "14px",
                  textDecoration: "underline",
                  width: "auto",
                }}
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;

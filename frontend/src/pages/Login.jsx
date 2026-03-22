import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { saveTokens } from "../utils/auth";
import { useCart } from "../context/CartContext";
import "./Login.css"; 

function Login() {
    const { fetchCart } = useCart();

    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
    const [form, setForm] = useState({ username: "", password: "" });
    const [msg, setMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const nav = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setIsLoading(true);

        try {
            const response = await fetch(`${BASE}/api/token/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });
            const data = await response.json();

            if (response.ok) {
                saveTokens(data);
                await fetchCart();
                setMsg("✅ Login Successful! Redirecting...");
                setTimeout(() => nav("/"), 1200);
            } else {
                setMsg(data.detail || "❌ Login Failed. Invalid credentials.");
            }
        } catch (error) {
            console.error(error);
            setMsg("⚠️ An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-box">
                
                {/* 🎂 Brand Header */}
                <div className="login-brand">
                    <span className="brand-emoji">🎂</span>
                    <h2>Welcome Back</h2>
                    <p>Log in to manage your cart and design cakes in 3D.</p>
                </div>

                {/* 📝 Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label>Username</label>
                        <input 
                            name="username" 
                            onChange={handleChange} 
                            value={form.username} 
                            placeholder="Type your username" 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input 
                            name="password" 
                            type="password" 
                            onChange={handleChange} 
                            value={form.password} 
                            placeholder="Type your password" 
                            required 
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className={`btn-login ${isLoading ? "loading" : ""}`}
                    >
                        {isLoading ? "Logging in..." : "Login to my Account"}
                    </button>
                </form>

                {/* 🚨 Alert Message Popup box */}
                {msg && (
                    <div className={`form-alert ${msg.startsWith('✅') ? 'success' : 'error'}`}>
                        {msg}
                    </div>
                )}

                {/* 🔗 Redirect Footer link */}
                <div className="login-footer-redirect">
                    Don't have an account yet?{" "}
                    <Link to="/signup" className="signup-link">
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
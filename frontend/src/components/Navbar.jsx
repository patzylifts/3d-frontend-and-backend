// src/components/Navbar.jsx
import { jwtDecode } from "jwt-decode";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { clearTokens, getAccessToken } from "../utils/auth";
import "./Navbar.css";

function Navbar() {
    const { cartItems, clearCart } = useCart();
    const navigate = useNavigate();
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const isLoggedIn = !!getAccessToken();

    let isAdmin = false;

    if (isLoggedIn) {
        try {
            const token = getAccessToken();
            const decoded = jwtDecode(token);
            isAdmin = decoded.is_staff;
        } catch (err) {
            console.error("Invalid token");
        }
    }

    const handleLogout = () => {
        clearTokens();
        clearCart();
        navigate("/login");
    };

    return (
        <nav className="minimal-nav">
            <div className="nav-container">

                {/* Left: Navigation Links */}
                <div className="nav-group left">
                    {!isAdmin ? (
                        <>
                            <Link to="/" className="nav-link">Home</Link>
                            <Link to="/products" className="nav-link">Menu</Link>
                            <Link to="/build" className="nav-link">Builder</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/admin" className="nav-link">Dashboard</Link>
                            <Link to="/admin/orders" className="nav-link">Orders</Link>
                            <Link to="/admin/products" className="nav-link">Products</Link>
                        </>
                    )}
                </div>

                <Link to="/" className="nav-logo-centered" style={{ textDecoration: 'none', textAlign: 'center' }}>
                    <div className="logo-top">SMILEY PAGE</div>
                    <div className="logo-bottom">CORNER</div>
                </Link>

                <div className="nav-group right">
                    {!isLoggedIn ? (
                        <Link to="/login" className="nav-link">Login</Link>
                    ) : isAdmin ? (
                        // 📍 ADMIN NAVBAR
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
                        </div>
                    ) : (
                        // 📍 CUSTOMER NAVBAR
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <Link to="/profile" className="nav-link">Profile</Link>
                            <Link to="/orders" className="nav-link">My Orders</Link>
                            <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
                        </div>
                    )}

                    {!isAdmin && (
                        <Link to="/cart" className="nav-cart-minimal" title="View Cart">
                            <div className="cart-icon-container">
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="cart-svg"
                                >
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                                </svg>

                                {cartCount > 0 && (
                                    <span className="cart-badge-minimal">{cartCount}</span>
                                )}
                            </div>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { clearTokens, getAccessToken } from "../utils/auth";
import "./Navbar.css";

function Navbar() {
    const { cartItems, clearCart } = useCart();
    const navigate = useNavigate();

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const isLoggedIn = !!getAccessToken();

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
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/products" className="nav-link">Menu</Link>
                    <Link to="/build" className="nav-link">Builder</Link>
                </div>

                {/* Center: Brand Logo */}
                <Link to="/" className="nav-logo-centered">
                    <span className="logo-top">SMILEY PAGE</span>
                    <span className="logo-bottom">CORNER</span>
                </Link>

                {/* Right: Cart & Auth */}
                <div className="nav-group right">
                    {!isLoggedIn ? (
                        <Link to="/login" className="nav-link auth-link">Login</Link>
                    ) : (
                        <div className="auth-group">
                            <Link to="/profile" className="nav-link">Profile</Link>
                            <Link to="/orders" className="nav-link">My Orders</Link>
                            <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
                        </div>
                    )}

                    <Link to="/cart" className="nav-cart-minimal" title="View Cart">
                        <div className="cart-icon-container">
                            {/* Modern Minimalist Shopping Bag Icon */}
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
                </div>

            </div>
        </nav>
    );
}

export default Navbar;
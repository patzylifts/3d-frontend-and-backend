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
        <nav className="modern-nav">
            <div className="nav-container">
                
                {/* 🏷️ Left: Logo & Direct Pages */}
                <div className="nav-left">
                    <Link to="/" className="nav-logo">
                        <span>🍰</span> Smiley Page Corner
                    </Link>
                    <div className="nav-links">
                        <Link to="/" className="nav-item">Home</Link>
                        <Link to="/products" className="nav-item">Products</Link>
                        <Link to="/build" className="nav-item">3D Builder</Link>
                    </div>
                </div>

                {/* 🛒 Right: Auth & Cart Actions */}
                <div className="nav-right">
                    {!isLoggedIn ? (
                        <>
                            <Link to="/login" className="nav-item">Login</Link>
                            <Link to="/signup" className="nav-btn-solid">Sign Up</Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link to="/profile" className="nav-item">
                                Profile
                            </Link>
                            <Link to="/orders" className="nav-item">
                                My Orders
                            </Link>
                            <button onClick={handleLogout} className="nav-item logout-btn">
                                Logout
                            </button>
                        </div>
                    )}

                    <Link to="/cart" className="nav-cart">
                        <span className="cart-icon">🛍️</span>
                        {cartCount > 0 && (
                            <span className="modern-cart-badge">{cartCount}</span>
                        )}
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
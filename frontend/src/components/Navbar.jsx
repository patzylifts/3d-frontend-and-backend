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
                <div className="nav-group left">
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/products" className="nav-link">Menu</Link>
                    <Link to="/build" className="nav-link">Builder</Link>
                </div>

                <Link to="/" className="nav-logo-centered" style={{textDecoration: 'none', textAlign: 'center'}}>
                    <div className="logo-top">SMILEY PAGE</div>
                    <div className="logo-bottom">CORNER</div>
                </Link>

                <div className="nav-group right">
                    {!isLoggedIn ? (
                        <Link to="/login" className="nav-link">Login</Link>
                    ) : (
                        <div style={{display: 'flex', gap: '20px'}}>
                            <Link to="/profile" className="nav-link">Profile</Link>
                            <button onClick={handleLogout} className="nav-link" style={{background:'none', border:'none'}}>Logout</button>
                        </div>
                    )}
                    
                    <Link to="/cart" className="nav-cart-minimal">
                        <div className="cart-icon-container" style={{position: 'relative'}}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cart-svg">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            {cartCount > 0 && <span className="cart-badge-minimal">{cartCount}</span>}
                        </div>
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
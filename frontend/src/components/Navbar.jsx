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
<<<<<<< HEAD
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
=======
        <nav className='bg-white shadow-md px-6 py-4 flex justify-between items-center fixed w-full top-0 z-50'>
            <Link to='/' className='text-2xl font-bold text-gray-800'>
                ☘️ Smiley Page Corner
            </Link>

            <div className='flex items-center gap-6'>
                {/* Login/SignUp or Logout */}
                {!isLoggedIn ? (
                    <>
                        <Link to='/login' className='text-gray-800 hover:text-gray-600 font-medium'>
                            Login
                        </Link>
                        <Link to='/signup' className='text-gray-800 hover:text-gray-600 font-medium'>
                            Sign Up
                        </Link>
                    </>
                ) : (
                    <div className="flex items-center gap-4">
                        <Link to="/profile" className='text-gray-800 hover:text-gray-600 font-medium cursor-pointer'>
                            Profile
                        </Link>
                        <Link
                            to="/orders"
                            className='text-gray-800 hover:text-gray-600 font-medium cursor-pointer'
                        >
                            My Orders
                        </Link>
                        <button onClick={handleLogout} className='text-gray-800 hover:text-gray-600 font-medium cursor-pointer'>
                            Logout
                        </button>
>>>>>>> 452583073334661d3e019492cf3f0bcf186d7571
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
                        <>
                            <Link to="/profile" className="nav-item">Profile</Link>
                            <button onClick={handleLogout} className="nav-item logout-btn">Logout</button>
                        </>
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
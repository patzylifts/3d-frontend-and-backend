import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { clearTokens, getAccessToken } from "../utils/auth";


function Navbar() {
    const { cartItems, clearCart } = useCart();
    const navigate = useNavigate();

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const isLoggedIn = !!getAccessToken();
    const handleLogout = () => {
        clearTokens();
        clearCart();
        navigate("/login");
    }

    return (
        <nav className='bg-white shadow-md px-6 py-4 flex justify-between items-center fixed w-full top-0 z-50'>
            <Link to='/' className='text-2xl font-bold text-gray-800'>
                ☘️ momojan
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
                    <button onClick={handleLogout} className='text-gray-800 hover:text-gray-600 font-medium'>
                        Logout
                    </button>
                )}
            </div>

            <Link to='/cart' className='relative text-gray-800 hover:text-gray-600 font-medium'>
                ☘️Cart
                {cartCount > 0 && (
                    <span className='absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold rounded-full px-2'>
                        {cartCount}
                    </span>
                )}
            </Link>
        </nav>
    )
}

export default Navbar;
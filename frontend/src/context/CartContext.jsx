import { createContext, useContext, useState, useEffect } from "react";
import { authFetch, getAccessToken } from "../utils/auth";

const CartContext = createContext({
    cartItems: [],
    total: 0,
    fetchCart: () => { },
    addToCart: () => { },
    addCustomCakeToCart: () => { },
    removeFromCart: () => { },
    updateQuantity: () => { },
    clearCart: () => { },
});

export const CartProvider = ({ children }) => {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);

    // Fetch Cart from backend
    const fetchCart = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/cart/`)
            const data = await res.json();
            setCartItems(data.items || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error("Error fetching cart: ", error)
        }
    }

    useEffect(() => {
        if (getAccessToken()) {
            fetchCart();
        }
    }, []);

    // Add Product to Cart
    const addToCart = async (productId) => {
        try {
            await authFetch(`${BASEURL}/api/cart/add/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ product_id: productId }),
            });
            fetchCart();
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    }

    // Remove Product from Cart
    const removeFromCart = async (itemId) => {
        try {
            await authFetch(`${BASEURL}/api/cart/remove/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ item_id: itemId }),
            });
            fetchCart();
        } catch (error) {
            console.error("Error removing from cart:", error)
        }
    }

    // Update Quantity
    const updateQuantity = async (itemId, quantity) => {
        if (quantity < 1) {
            await removeFromCart(itemId);
            return;
        }
        try {
            await authFetch(`${BASEURL}/api/cart/update/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ item_id: itemId, quantity }),
            });
            fetchCart();
        } catch (error) {
            console.log("Error updating quantity: ", error);
        }
    }

    const clearCart = () => {
        setCartItems([]);
        setTotal(0);
    }

    // Add Custom Cake to Cart (via Django backend)
    const addCustomCakeToCart = async (payload) => {
        try {
            const res = await authFetch(`${BASEURL}/api/cake-customization/`, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to add custom cake:", err);
                return { success: false, error: err };
            }

            const data = await res.json();
            await fetchCart();
            return { success: true, data };
        } catch (error) {
            console.error("Error adding custom cake to cart:", error);
            return { success: false, error };
        }
    };

    return (
        <CartContext.Provider value={{
            cartItems,
            total,
            fetchCart,
            addToCart,
            addCustomCakeToCart,
            removeFromCart,
            updateQuantity,
            clearCart
        }}>
            {children}
        </CartContext.Provider >
    )
};

export const useCart = () => {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error("useCart must be used inside CartProvider");
    }

    return context;
};
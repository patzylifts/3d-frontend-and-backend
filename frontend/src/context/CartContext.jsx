// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { authFetch, getAccessToken, clearTokens } from "../utils/auth";

const CartContext = createContext({
    cartItems: [],
    total: 0,
    fetchCart: () => {},
    addToCart: () => {},
    addCustomCakeToCart: () => {},
    removeFromCart: () => {},
    updateQuantity: () => {},
    clearCart: () => {},
});

export const CartProvider = ({ children }) => {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);

    /* ── Fetch Cart ── */
    const fetchCart = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/cart/`);

            if (res.status === 401) {
                // Token refresh also failed — clear cart silently
                clearCart();
                return;
            }

            if (!res.ok) {
                console.error("Unexpected error fetching cart:", res.status);
                return;
            }

            const data = await res.json();
            setCartItems(data.items || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error("Error fetching cart:", error);
        }
    };

    /* ── Load cart on mount if user is logged in ── */
    useEffect(() => {
        if (getAccessToken()) {
            fetchCart();
        }
    }, []);

    /* ── Listen for forced logout (both tokens expired) ── */
    useEffect(() => {
        const handleLogout = () => clearCart();
        window.addEventListener("auth:logout", handleLogout);
        return () => window.removeEventListener("auth:logout", handleLogout);
    }, []);

    /* ── Add Regular Product to Cart ── */
    const addToCart = async (productId) => {
        try {
            const res = await authFetch(`${BASEURL}/api/cart/add/`, {
                method: "POST",
                body: JSON.stringify({ product_id: productId }),
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to add product:", err);
                return { success: false, error: err };
            }

            await fetchCart();
            return { success: true };
        } catch (error) {
            console.error("Error adding to cart:", error);
            return { success: false, error };
        }
    };

    /* ── Remove Product from Cart ── */
    const removeFromCart = async (itemId) => {
        try {
            const res = await authFetch(`${BASEURL}/api/cart/remove/`, {
                method: "POST",
                body: JSON.stringify({ item_id: itemId }),
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to remove item:", err);
                return { success: false, error: err };
            }

            await fetchCart();
            return { success: true };
        } catch (error) {
            console.error("Error removing from cart:", error);
            return { success: false, error };
        }
    };

    /* ── Update Item Quantity ── */
    const updateQuantity = async (itemId, quantity) => {
        if (quantity < 1) {
            return await removeFromCart(itemId);
        }

        try {
            const res = await authFetch(`${BASEURL}/api/cart/update/`, {
                method: "POST",
                body: JSON.stringify({ item_id: itemId, quantity }),
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to update quantity:", err);
                return { success: false, error: err };
            }

            await fetchCart();
            return { success: true };
        } catch (error) {
            console.error("Error updating quantity:", error);
            return { success: false, error };
        }
    };

    /* ── Clear Cart (local state only) ── */
    const clearCart = () => {
        setCartItems([]);
        setTotal(0);
    };

    /* ── Add Custom Cake to Cart ── */
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
            console.error("Error adding custom cake:", error);
            return { success: false, error };
        }
    };

    return (
        <CartContext.Provider
            value={{
                cartItems,
                total,
                fetchCart,
                addToCart,
                addCustomCakeToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used inside CartProvider");
    }
    return context;
};
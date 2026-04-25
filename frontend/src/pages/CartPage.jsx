// src/pages/CartPage.jsx
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import "./CartPage.css";

function CartPage() {
    const { cartItems, total, removeFromCart, updateQuantity } = useCart();
    const navigate = useNavigate();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    const handleSingleCheckout = (item) => {
        navigate("/checkout", { state: { directBuyItem: item } });
    };

    return (
        <div className="cart-page-wrapper">
            <div className="container">
                <h1 className="cart-title">Your Sweet Bag</h1>

                {cartItems.length === 0 ? (
                    <div className="empty-cart-msg">
                        <p>Your bag is empty!</p>
                        <Link to="/products" className="btn-main-link">Browse Cakes</Link>
                    </div>
                ) : (
                    <div className="cart-flex-container">
                        <div className="cart-items-list">
                            {cartItems.map((item) => (
                                <div key={item.id} className="cart-item-card">

                                    <div className="cart-item-top">

                                        {item.is_custom_cake ? (
                                            <div className="cart-img-placeholder">🎂</div>
                                        ) : (
                                            <img
                                                src={`${BASEURL}${item.product_image}`}
                                                alt={item.item_name}
                                                className="cart-product-img"
                                            />
                                        )}

                                        <div className="cart-item-info">
                                            <h2 className="item-name">{item.item_name}</h2>

                                            <p className="item-price">
                                                ₱{Number(item.item_unit_price).toFixed(2)}
                                            </p>

                                            {item.is_custom_cake && (
                                                <div className="custom-details">

                                                    <span>
                                                        {item.customization_detail.shape} · {item.customization_detail.flavor}
                                                    </span>

                                                    <span
                                                        className="color-dot"
                                                        style={{ background: item.customization_detail.cake_color }}
                                                    ></span>

                                                    <div className="addon-list">
                                                        {item.customization_detail.has_candle && <span>+ Candle</span>}
                                                        {item.customization_detail.has_chocolate && <span>+ Chocolate</span>}
                                                        {item.customization_detail.has_balls && <span>+ Balls</span>}
                                                        {item.customization_detail.has_nuts && <span>+ Nuts</span>}
                                                    </div>

                                                </div>
                                            )}
                                        </div>

                                        <div className="cart-item-qty">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                        </div>

                                    </div>

                                    <div className="cart-item-actions">
                                        <button
                                            className="text-btn remove"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            Remove
                                        </button>

                                        <button
                                            className="btn-small-primary"
                                            onClick={() => handleSingleCheckout(item)}
                                        >
                                            Checkout This Cake Only
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>

                        <div className="cart-summary-sidebar">
                            <h3>Order Summary</h3>

                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span>₱{Number(total).toFixed(2)}</span>
                            </div>

                            <div className="summary-row total">
                                <span>Total</span>
                                <span>₱{Number(total).toFixed(2)}</span>
                            </div>

                            <button
                                className="btn-main checkout-all"
                                onClick={() => navigate("/checkout")}
                            >
                                Checkout All Items
                            </button>

                            <p className="summary-note">Prices include VAT</p>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );

}

export default CartPage;
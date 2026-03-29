import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";

function CartPage() {
    const { cartItems, total, removeFromCart, updateQuantity } = useCart();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    return (
        <div className="pt-20 min-h-screen bg-gray-100 p-8">
            <h1 className="text-3xl font-bold mb-6 text-center">Your Cart</h1>
            {cartItems.length === 0 ? (
                <p className="text-center text-gray-600">Your cart is empty</p>
            ) : (
                <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
                    {cartItems.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between mb-4 pb-4 border-b last:border-b-0"
                        >
                            <div className="flex items-center gap-4">
                                {/* Show product image for regular items, cake icon for custom cakes */}
                                {item.is_custom_cake ? (
                                    <div className="w-20 h-20 rounded bg-purple-100 flex items-center justify-center text-3xl">
                                        🎂
                                    </div>
                                ) : (
                                    item.product_image && (
                                        <img
                                            src={`${BASEURL}${item.product_image}`}
                                            alt={item.item_name}
                                            className="w-20 h-20 object-cover rounded"
                                        />
                                    )
                                )}
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {item.item_name}
                                    </h2>
                                    <p className="text-gray-600">
                                        ₱{parseFloat(item.item_unit_price).toFixed(2)}
                                    </p>
                                    {/* Show customization details for custom cakes */}
                                    {item.is_custom_cake && item.customization_detail && (
                                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                            <p>Shape: {item.customization_detail.shape} · Flavor: {item.customization_detail.flavor}</p>
                                            <p>Color: <span className="inline-block w-3 h-3 rounded-full align-middle" style={{ background: item.customization_detail.cake_color }}></span></p>
                                            <p>
                                                {item.customization_detail.has_candle && "🕯️ "}
                                                {item.customization_detail.has_chocolate && "🍫 "}
                                                {item.customization_detail.has_balls && "🔮 "}
                                                {item.customization_detail.has_nuts && "🥜 "}
                                                {!item.customization_detail.has_candle && !item.customization_detail.has_chocolate && !item.customization_detail.has_balls && !item.customization_detail.has_nuts && "No decorations"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="bg-gray-300 px-3 py-1 rounded"
                                    onClick={() =>
                                        updateQuantity(item.id, item.quantity - 1)
                                    }>
                                    -
                                </button>
                                <span>{item.quantity}</span>
                                <button className="bg-gray-300 px-3 py-1 rounded"
                                    onClick={() =>
                                        updateQuantity(item.id, item.quantity + 1)
                                    }>
                                    +
                                </button>
                                <button className="text-red-500"
                                    onClick={() => removeFromCart(item.id)}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="border-t pt-4 mt-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold">Total:</h2>
                        <p className="text-xl font-semibold">₱{total.toFixed(2)}</p>
                        <Link to="/checkout" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300">
                            Proceed to Checkout
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CartPage;
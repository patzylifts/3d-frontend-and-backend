// src/pages/CartPage.jsx
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";

function CartPage() {
    const { cartItems, total, removeFromCart, updateQuantity } = useCart();
    const navigate = useNavigate();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    const handleSingleCheckout = (item) => {
        navigate("/checkout", { state: { directBuyItem: item } });
    };

    return (
        <div className="min-h-screen bg-[#fffdf9] py-12 px-4 sm:px-6 lg:px-8 text-stone-800">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-extrabold text-[#844414] tracking-tight mb-8 border-b border-[#f3e1c6] pb-4">
                    Your Sweet Bag
                </h1>

                {cartItems.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-[#f3e1c6] rounded-2xl shadow-sm p-8 max-w-md mx-auto">
                        <div className="text-6xl mb-4">🛍️</div>
                        <p className="text-xl font-medium text-stone-600 mb-6">Your bag is empty!</p>
                        <Link 
                            to="/products" 
                            className="inline-block bg-[#d67b27] hover:bg-[#b56219] text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
                        >
                            Browse Cakes
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Cart Items List */}
                        <div className="lg:col-span-2 space-y-6">
                            {cartItems.map((item) => (
                                <div key={item.id} className="bg-white border border-[#f3e1c6] shadow-sm rounded-2xl p-5 hover:shadow-md transition-all duration-300">

                                    <div className="flex flex-col sm:flex-row gap-5 items-start pb-5 border-b border-stone-100">

                                        {/* Image wrapper */}
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-[#fffbf4] border border-[#f5e9d6] rounded-xl flex items-center justify-center overflow-hidden">
                                            {item.is_custom_cake ? (
                                                <div className="text-4xl animate-bounce">🎂</div>
                                            ) : (
                                                <img
                                                    src={`${BASEURL}${item.product_image}`}
                                                    alt={item.item_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>

                                        {/* Item info */}
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-lg font-bold text-[#844414] truncate">{item.item_name}</h2>

                                            <p className="text-base font-semibold text-[#d67b27] mt-0.5">
                                                ₱{Number(item.item_unit_price).toFixed(2)}
                                            </p>

                                            {item.is_custom_cake && (() => {
                                                const d = item.customization_detail;
                                                const tierFlavors = Object.entries(d.tier_flavors || {});
                                                const addons = [
                                                    d.has_candle    && { label: "🕯️ Candle" },
                                                    d.has_chocolate && { label: "🍫 Chocolate" },
                                                    d.has_balls     && { label: "🔮 Balls" },
                                                    d.has_nuts      && { label: "🥜 Nuts" },
                                                ].filter(Boolean);

                                                return (
                                                    <div className="mt-3 bg-[#fffbf4] border border-[#fdf3e3] rounded-xl p-3 space-y-2 text-xs text-stone-600">
                                                        {/* Tier & Size */}
                                                        {(d.tier || d.size) && (
                                                            <div className="flex justify-between border-b border-dashed border-stone-200/60 pb-1">
                                                                <span className="font-medium text-stone-400">📐 Size</span>
                                                                <span className="font-semibold text-stone-700">
                                                                    {d.tier}{d.tier && d.size ? " — " : ""}{d.size}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Shape */}
                                                        <div className="flex justify-between border-b border-dashed border-stone-200/60 pb-1">
                                                            <span className="font-medium text-stone-400">🎂 Shape</span>
                                                            <span className="font-semibold text-stone-700 capitalize">{d.shape}</span>
                                                        </div>

                                                        {/* Flavor */}
                                                        <div className="flex justify-between border-b border-dashed border-stone-200/60 pb-1">
                                                            <span className="font-medium text-stone-400">🍰 Flavor</span>
                                                            <span className="font-semibold text-[#844414]">{d.flavor}</span>
                                                        </div>

                                                        {tierFlavors.length > 0 && (
                                                            <div className="flex flex-col gap-1 pt-1">
                                                                <span className="font-medium text-stone-400">Tier Flavors</span>
                                                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                                    {tierFlavors.map(([tierName, tierFlavor]) => (
                                                                        <span key={tierName} className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium text-[11px]">
                                                                            {tierName}: {tierFlavor}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {d.inscription_text && (
                                                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 mt-1 italic text-stone-700">
                                                                <span className="font-bold not-italic text-amber-800 mr-1">💬 Message:</span> "{d.inscription_text}"
                                                            </div>
                                                        )}

                                                        {/* Cake Color */}
                                                        <div className="flex justify-between items-center pt-1">
                                                            <span className="font-medium text-stone-400">🎨 Color</span>
                                                            <span className="flex items-center">
                                                                <span
                                                                    className="w-4 h-4 rounded-full border border-stone-300 shadow-sm"
                                                                    style={{ background: d.cake_color }}
                                                                />
                                                            </span>
                                                        </div>

                                                        {/* Add-ons */}
                                                        <div className="flex flex-col gap-1 pt-2 border-t border-stone-200/60">
                                                            <span className="font-medium text-stone-400">✨ Add-ons</span>
                                                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                                {addons.length > 0
                                                                    ? addons.map(a => (
                                                                        <span key={a.label} className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-medium text-[11px] border border-stone-200">{a.label}</span>
                                                                    ))
                                                                    : <span className="text-stone-400 italic">None</span>
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                        </div>

                                        {/* Quantity Selector */}
                                        <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl self-end sm:self-start">
                                            <button 
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="w-8 h-8 flex items-center justify-center font-bold text-stone-600 hover:bg-white rounded-lg transition-colors"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-semibold text-sm text-stone-800">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-8 h-8 flex items-center justify-center font-bold text-stone-600 hover:bg-white rounded-lg transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>

                                    </div>

                                    {/* Action Footers */}
                                    <div className="flex justify-between items-center mt-4 pt-1">
                                        <button
                                            className="text-sm font-medium text-stone-400 hover:text-rose-600 transition-colors"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            Remove Item
                                        </button>

                                        <button
                                            className="text-xs bg-amber-50 hover:bg-[#d67b27] text-[#d67b27] hover:text-white font-semibold px-3 py-2 rounded-lg border border-[#f3e1c6] transition-all duration-200"
                                            onClick={() => handleSingleCheckout(item)}
                                        >
                                            Checkout This Cake Only
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>

                        {/* Order Summary Sidebar */}
                        <div className="bg-white border border-[#f3e1c6] shadow-sm rounded-2xl p-6 sticky top-6">
                            <h3 className="text-lg font-bold text-[#844414] mb-4 border-b border-stone-100 pb-2">Order Summary</h3>

                            <div className="space-y-3 mb-6 text-sm">
                                <div className="flex justify-between text-stone-500">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-stone-800">₱{Number(total).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-stone-500">
                                    <span>Estimated Delivery</span>
                                    <span className="text-emerald-600 font-medium">Calculated at next step</span>
                                </div>
                                <div className="border-t border-dashed border-stone-200 pt-3 flex justify-between items-baseline">
                                    <span className="text-base font-bold text-stone-800">Total</span>
                                    <span className="text-2xl font-black text-[#844414]">₱{Number(total).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                className="w-full bg-[#d67b27] hover:bg-[#b56219] text-white font-bold py-3.5 rounded-xl transition-colors duration-200 shadow-sm hover:shadow text-center text-sm tracking-wide"
                                onClick={() => navigate("/checkout")}
                            >
                                Checkout All Items
                            </button>

                            <p className="text-center text-[11px] text-stone-400 mt-3">Prices include localized VAT taxes</p>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}

export default CartPage;
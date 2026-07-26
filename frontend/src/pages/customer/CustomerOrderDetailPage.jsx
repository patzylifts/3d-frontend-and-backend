// src/pages/customer/CustomerOrderDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import Logistics from "../../components/Logistics";
import AddPaymentModal from "../../components/customer/AddPaymentModal";
import Navbar from "../../components/Navbar";
import OrderFeedback from "../../components/customer/OrderFeedback";
import ChatBox from "../../components/chat/ChatBox";
import { CustomizationProvider } from "../../contexts/Customization";
import { CustomCakeModal } from "../../components/admin/CustomCakeModal";

export default function CustomerOrderDetailPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [payAmount, setPayAmount] = useState(0);
    const [tipAmount, setTipAmount] = useState(0);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [agreeNoRefund, setAgreeNoRefund] = useState(false);
    const [showCakeModal, setShowCakeModal] = useState(false);
    const [selectedCake, setSelectedCake] = useState(null);

    const fetchOrder = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/customer/orders/${id}/`);
            if (!res.ok) throw new Error("Failed to fetch order");
            const data = await res.json();
            setOrder(data);
            const min = Math.max(Math.round(data.total_amount * 0.2) - Number(data.total_paid), 0);
            setPayAmount(min);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrder(); }, [id]);

    const parsedPay = payAmount === "" ? 0 : Number(payAmount);
    const parsedTip = tipAmount === "" ? 0 : Number(tipAmount);
    const totalToCharge = parsedPay + parsedTip;
    const remainingBalance = order ? Number(order.remaining_balance) : 0;
    const minAmount = order ? Math.max(Math.round(order.total_amount * 0.2) - Number(order.total_paid), 1) : 0;
    const maxAmount = order ? remainingBalance : 0;

    const isTipInvalid = tipAmount !== "" && parsedTip < 0;
    const isInvalid = payAmount === "" || parsedPay < minAmount || parsedPay > maxAmount || parsedPay === 0;

    const handlePayNow = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/payments/${id}/checkout/`, {
                method: "POST",
                body: JSON.stringify({ amount: payAmount, tip: tipAmount })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to initiate payment");
                return;
            }
            localStorage.setItem("last_payment_amount", payAmount);
            localStorage.setItem("last_tip_amount", tipAmount);
            window.location.href = data.checkout_url;
        } catch (err) { console.error(err); }
    };

    // Loading layout match
    if (loading) {
        return (
            <div className="min-h-screen bg-[#fffdf9] flex items-center justify-center text-stone-600 font-bold text-sm">
                Loading your cake details...
            </div>
        );
    }

    // Error layout match
    if (error) {
        return (
            <div className="min-h-screen bg-[#fffdf9] flex items-center justify-center text-rose-600 font-bold text-sm p-4 text-center">
                {error}
            </div>
        );
    }

    if (!order) return null;

    const isPayable = !["delivered", "completed", "cancelled", "rejected"].includes(order.status);

    const showPaymentCard =
        isPayable &&
        (order.status === "awaiting_downpayment" || order.payment_status === "partial") &&
        remainingBalance > 0;

    // Mapping background classes for custom badging variables
    const getStatusColor = (status) => {
        switch (status) {
            case "completed": case "delivered": return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "pending_review": case "awaiting_downpayment": return "bg-amber-50 text-amber-700 border-amber-200";
            case "cancelled": case "rejected": return "bg-rose-50 text-rose-700 border-rose-200";
            default: return "bg-stone-50 text-stone-700 border-stone-200";
        }
    };

    const getPaymentColor = (status) => {
        if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (status === "partial") return "bg-sky-50 text-sky-700 border-sky-200";
        return "bg-rose-50 text-rose-700 border-rose-200";
    };

    return (
        <div className="min-h-screen bg-[#fffdf9] text-stone-800 antialiased pb-16">
            <Navbar />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">

                {/* Header Back Navigation Section */}
                <header className="bg-white border border-[#f3e1c6] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <button
                            className="text-xs font-bold text-[#d67b27] hover:text-[#b56219] transition-colors mb-2 block cursor-pointer"
                            onClick={() => navigate("/orders")}
                        >
                            ← Back to My Orders
                        </button>
                        <h1 className="text-2xl font-black text-[#844414] tracking-tight">
                            Order <span className="text-[#d67b27]">#{order.id}</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className={`text-xs uppercase font-black tracking-wider px-3 py-1.5 border rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.replace("_", " ")}
                        </span>
                        <span className={`text-xs uppercase font-black tracking-wider px-3 py-1.5 border rounded-full ${getPaymentColor(order.payment_status)}`}>
                            {order.payment_status}
                        </span>
                    </div>
                </header>

                {/* Two-Column Bento Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* LEFT COLUMN: Summary & Payment Inputs (Spans 2 cols on wide viewports) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Order Calculation Card */}
                        <div className="bg-white border border-[#f3e1c6] rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="text-lg font-bold text-[#844414] border-b border-stone-100 pb-2">Order Summary</h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-500 font-medium">Total Amount:</span>
                                    <span className="text-base font-black text-[#844414]">₱{Number(order.total_amount).toLocaleString()}</span>
                                </div>

                                {order.status !== "rejected" && order.status !== "pending_review" && (
                                    <div className="flex justify-between items-center p-3 bg-[#fdf2e2]/40 rounded-xl border border-[#fdf2e2]">
                                        <span className="text-stone-700 font-bold">Remaining Balance:</span>
                                        <span className="text-base font-black text-[#d67b27]">₱{remainingBalance.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-xs text-stone-400 pt-2 border-t border-stone-50">
                                    <span>Placed At:</span>
                                    <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {order.order_notes && (
                                <div className="rounded-xl bg-[#fff7eb] border border-[#f3e1c6] p-4">
                                    <p className="text-xs uppercase font-bold text-stone-500 mb-1">
                                        Your Notes
                                    </p>
                                    <p className="text-sm text-stone-700 whitespace-pre-wrap">
                                        {order.order_notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Interactive Secure Payment Gate Card */}
                        {showPaymentCard && (
                            <div className="bg-white border-2 border-[#d67b27]/80 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#d67b27]" />
                                <h3 className="text-lg font-bold text-[#844414]">
                                    {order.total_paid == 0 ? "Complete Downpayment" : "Complete Remaining Balance"}
                                </h3>
                                <p className="text-xs font-semibold text-stone-500 bg-stone-50 px-3 py-1.5 rounded-lg inline-block">
                                    {order.total_paid == 0
                                        ? `Minimum required: ₱${minAmount.toLocaleString()}`
                                        : `Remaining balance: ₱${remainingBalance.toLocaleString()}`}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Amount to Pay</label>
                                        <input
                                            type="number"
                                            value={payAmount || ""}
                                            disabled={!isPayable}
                                            onChange={(e) =>
                                                isPayable && setPayAmount(e.target.value === "" ? "" : Number(e.target.value))
                                            }
                                            className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all disabled:bg-stone-50"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Add a Tip (Optional)</label>
                                        <input
                                            type="number"
                                            value={tipAmount || ""}
                                            disabled={!isPayable}
                                            onChange={(e) =>
                                                isPayable && setTipAmount(e.target.value === "" ? "" : Number(e.target.value))
                                            }
                                            className="w-full bg-white border border-stone-200 focus:border-[#d67b27] focus:ring-1 focus:ring-[#d67b27] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all disabled:bg-stone-50"
                                        />
                                    </div>
                                </div>

                                {isInvalid && payAmount !== "" && (
                                    <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">
                                        ⚠️ Please enter an amount between ₱{minAmount} and ₱{maxAmount}
                                    </p>
                                )}

                                <div className="flex justify-between items-center p-4 bg-[#fffdf9] border border-[#f3e1c6] rounded-xl">
                                    <span className="text-sm font-bold text-stone-600">Total to Charge:</span>
                                    <strong className="text-xl font-black text-[#844414]">₱{totalToCharge.toLocaleString()}</strong>
                                </div>


                                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <input
                                        id="no-refund-agreement"
                                        type="checkbox"
                                        checked={agreeNoRefund}
                                        onChange={(e) => setAgreeNoRefund(e.target.checked)}
                                        className="mt-1 h-4 w-4 accent-[#d67b27] cursor-pointer"
                                    />

                                    <label
                                        htmlFor="no-refund-agreement"
                                        className="text-sm text-stone-700 leading-relaxed cursor-pointer"
                                    >
                                        I understand that once my payment is successfully processed, it is
                                        <span className="font-bold text-rose-600"> non-refundable</span>. I have reviewed my order details and agree to proceed.
                                    </label>
                                </div>

                                <button
                                    onClick={handlePayNow}
                                    disabled={!isPayable || isInvalid || isTipInvalid || !agreeNoRefund}
                                    className="w-full bg-[#d67b27] hover:bg-[#b56219] disabled:bg-stone-300 text-white font-black py-3.5 px-6 rounded-full transition-colors duration-200 text-sm uppercase tracking-wider shadow-sm text-center cursor-pointer disabled:cursor-not-allowed"
                                >
                                    Proceed to Secure Checkout
                                </button>
                                {(order.status === "pending_review" ||
                                    (order.status === "awaiting_downpayment" &&
                                        Number(order.total_paid) === 0)) && (
                                        <button
                                            onClick={async () => {
                                                if (!confirm("Cancel this order?")) return;

                                                const res = await authFetch(
                                                    `${BASEURL}/api/orders/${id}/cancel/`,
                                                    {
                                                        method: "POST",
                                                    }
                                                );

                                                if (res.ok) {
                                                    alert("Order cancelled");
                                                    fetchOrder();
                                                }
                                            }}
                                            className="w-full mt-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 font-bold py-3 rounded-full transition-all cursor-pointer"
                                        >
                                            Cancel Order
                                        </button>
                                    )}
                            </div>
                        )}

                        {/* Store Rejection Banner Alert */}
                        {order.status === "rejected" && order.rejection_reason && (
                            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-1">
                                <h4 className="text-sm font-black text-rose-800 uppercase tracking-wider">Update from Bakery</h4>
                                <p className="text-sm text-rose-700 font-medium">{order.rejection_reason}</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Items & Dynamic Logistics Pipeline (Spans 1 col) */}
                    <div className="space-y-6">

                        {/* Items Breakdown Card */}
                        <div className="bg-white border border-[#f3e1c6] rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="text-lg font-bold text-[#844414] border-b border-stone-100 pb-2">Items Ordered</h3>

                            <div className="divide-y divide-stone-100 max-h-[320px] overflow-y-auto pr-1">
                                {order.items.map((item) => (
                                    <div key={item.id} className="py-3 flex justify-between items-start gap-4 text-sm first:pt-0 last:pb-0">
                                        <div className="space-y-0.5 flex-1">
                                            <p className="font-bold text-stone-800 leading-tight">{item.product_name}</p>
                                            {item.customization && (
                                                <button
                                                    className="text-xs text-[#d67b27] font-semibold underline mt-1 hover:text-[#b56219]"
                                                    onClick={() => {
                                                        setSelectedCake(item.customization);
                                                        setShowCakeModal(true);
                                                    }}
                                                >
                                                    View Customization
                                                </button>
                                            )}
                                            <p className="text-xs text-stone-400 font-semibold">Qty: {item.quantity} × ₱{item.price}</p>
                                        </div>
                                        <div className="font-extrabold text-[#844414] text-right">₱{item.subtotal}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Delivery Metadata & Logistics Section */}
                        <div className="bg-white border border-[#f3e1c6] rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="text-lg font-bold text-[#844414] border-b border-stone-100 pb-2">Delivery Details</h3>

                            <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-3 rounded-xl border border-stone-100 font-bold text-stone-600">
                                <div>
                                    <span className="block text-stone-400 uppercase tracking-wider mb-0.5">Date</span>
                                    <span className="text-stone-800">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "TBD"}</span>
                                </div>
                                <div>
                                    <span className="block text-stone-400 uppercase tracking-wider mb-0.5">Time</span>
                                    <span className="text-stone-800">{order.delivery_time || "TBD"}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Logistics order={order} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feedback Injection Module */}
                <div className="bg-white border border-[#f3e1c6] rounded-2xl p-2 shadow-sm">
                    <OrderFeedback order={order} onFeedbackSubmitted={fetchOrder} />
                </div>
            </div>
            <ChatBox orderId={id} isAdmin={false} />
            <CustomizationProvider>
                <CustomCakeModal
                    isOpen={showCakeModal}
                    onClose={() => {
                        setShowCakeModal(false);
                        setSelectedCake(null);
                    }}
                    customization={selectedCake}
                />
            </CustomizationProvider>
        </div>
    );
}
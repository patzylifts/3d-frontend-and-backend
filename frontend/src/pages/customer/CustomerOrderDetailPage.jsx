// src/pages/customer/CustomerOrderDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";

export default function CustomerOrderDetailPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [payAmount, setPayAmount] = useState(0);
    const [tipAmount, setTipAmount] = useState(0);

    // FETCH ORDER
    const fetchOrder = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/customer/orders/${id}/`);
            if (!res.ok) throw new Error("Failed to fetch order");

            const data = await res.json();
            setOrder(data);

            // ✅ AUTO SET 20% AFTER FETCH
            const min = Math.max(
                Math.round(data.total_amount * 0.2) - Number(data.total_paid),
                0
            );
            setPayAmount(min);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const isPaid = urlParams.get("payment");

        if (isPaid === "success") {
            // just clean URL and refresh
            window.history.replaceState({}, document.title, `/orders/${id}`);

            // 🔁 give webhook time to process
            setTimeout(() => {
                fetchOrder();
            }, 2000);
        }
    }, [id]);

    const parsedPay = payAmount === "" ? 0 : Number(payAmount);
    const parsedTip = tipAmount === "" ? 0 : Number(tipAmount);
    const totalToCharge = parsedPay + parsedTip;
    // REMAINING BALANCE
    const remainingBalance = order ? Number(order.remaining_balance) : 0;
    // VALIDATIONS
    const minAmount = order
        ? Math.max(
            Math.round(order.total_amount * 0.2) - Number(order.total_paid),
            0
        )
        : 0;
    const maxAmount = order ? Number(order.total_amount) : 0;
    const isTipInvalid = tipAmount !== "" && parsedTip < 0;
    const isInvalid =
        payAmount === "" ||
        parsedPay < minAmount ||
        parsedPay > maxAmount;


    // 🔥 PAY NOW
    const handlePayNow = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/payments/${id}/checkout/`, {
                method: "POST",
                body: JSON.stringify({
                    amount: payAmount,
                    tip: tipAmount
                })
            });

            if (!res.ok) {
                const err = await res.text();
                console.error("Payment error:", err);
                return;
            }

            const data = await res.json();

            // 🔥 REDIRECT TO PAYMONGO CHECKOUT
            localStorage.setItem("last_payment_amount", payAmount);
            localStorage.setItem("last_tip_amount", tipAmount);
            window.location.href = data.checkout_url;

        } catch (err) {
            console.error("Error in handlePayNow:", err);
        }
    };

    if (loading) return <p className="text-center mt-10">Loading order...</p>;
    if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
    if (!order) return null;

    return (
        <div className="min-h-screen p-6 bg-gray-100">
            <h1 className="text-3xl font-bold mb-6 text-center">
                Order #{order.id}
            </h1>

            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Payment Status:</strong> {order.payment_status}</p>
                <p><strong>Total Amount:</strong> ₱{order.total_amount}</p>
                {order.status !== "rejected" && order.status !== "pending_review" && (
                    <p className="mt-2 font-semibold text-blue-600">
                        Remaining Balance: ₱{remainingBalance.toFixed(2)}
                    </p>
                )}
                <p><strong>Placed At:</strong> {new Date(order.created_at).toLocaleString()}</p>

                <p>
                    <strong>Delivery Schedule:</strong>{" "}
                    {order.delivery_date
                        ? new Date(order.delivery_date).toLocaleDateString()
                        : "N/A"}{" "}
                    {order.delivery_time
                        ? new Date(`1970-01-01T${order.delivery_time}`).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                        : ""}
                </p>

                {/* ❌ REJECTED */}
                {order.status === "rejected" && order.rejection_reason && (
                    <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500">
                        <strong>Reason for rejection:</strong>
                        <p>{order.rejection_reason}</p>
                    </div>
                )}

                {/* 💳 PAYMENT SECTION */}
                {order.status === "awaiting_downpayment" && (
                    <div className="mt-6">
                        <p className="mb-2 text-gray-700">
                            Minimum payment: ₱{minAmount}
                        </p>

                        {/* PAYMENT INPUT */}
                        <input
                            type="number"
                            value={payAmount === 0 ? "" : payAmount}
                            onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                            className="border px-3 py-2 rounded w-1/3"
                        />

                        {/* TIP INPUT */}
                        <p className="mt-4 text-gray-700">Tip (optional):</p>
                        <input
                            type="number"
                            value={tipAmount === 0 ? "" : tipAmount}
                            onChange={(e) => setTipAmount(e.target.value === "" ? "" : Number(e.target.value))}
                            className="border px-3 py-2 rounded w-1/3"
                        />

                        {tipAmount < 0 && (
                            <p className="text-red-600 text-sm mt-1">
                                Tip cannot be negative
                            </p>
                        )}
                        {/* VALIDATION MESSAGES */}
                        {payAmount < minAmount && (
                            <p className="text-red-600 text-sm mt-1">
                                Amount must be at least ₱{minAmount}
                            </p>
                        )}

                        {payAmount > maxAmount && (
                            <p className="text-red-600 text-sm mt-1">
                                Amount cannot exceed ₱{maxAmount}
                            </p>
                        )}

                        {/* TOTAL DISPLAY */}
                        <p className="mt-3 font-semibold">
                            Total to charge: ₱{totalToCharge}
                        </p>

                        {/* PAY BUTTON */}
                        <button
                            onClick={handlePayNow}
                            disabled={isInvalid || isTipInvalid}
                            className={`mt-3 px-4 py-2 rounded text-white ${(isInvalid || isTipInvalid)
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-green-500 hover:bg-green-600"
                                }`}
                        >
                            Pay Now
                        </button>
                    </div>
                )}

                {/* BACK BUTTON */}
                <button
                    onClick={() => navigate("/orders")}
                    className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Back to My Orders
                </button>
            </div>

            {/* 🧾 ORDER ITEMS */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Items</h2>
                <table className="min-w-full border">
                    <thead>
                        <tr>
                            <th className="border p-2">Product</th>
                            <th className="border p-2">Qty</th>
                            <th className="border p-2">Price</th>
                            <th className="border p-2">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item) => (
                            <tr key={item.id} className="text-center">
                                <td className="border p-2">{item.product_name}</td>
                                <td className="border p-2">{item.quantity}</td>
                                <td className="border p-2">₱{item.price}</td>
                                <td className="border p-2">₱{item.subtotal}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
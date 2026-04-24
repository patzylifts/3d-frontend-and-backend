// src/pages/customer/CustomerOrderDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import Logistics from "../../components/Logistics";
import AddPaymentModal from "../../components/customer/AddPaymentModal";
import Navbar from "../../components/Navbar";
import "./CustomerOrderDetailPage.css";

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
    const minAmount = order ? Math.max(Math.round(order.total_amount * 0.2) - Number(order.total_paid), 0) : 0;
    const maxAmount = order ? Number(order.total_amount) : 0;

    const isTipInvalid = tipAmount !== "" && parsedTip < 0;
    const isInvalid = payAmount === "" || parsedPay < minAmount || parsedPay > maxAmount;

    const handlePayNow = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/payments/${id}/checkout/`, {
                method: "POST",
                body: JSON.stringify({ amount: payAmount, tip: tipAmount })
            });
            if (!res.ok) return;
            const data = await res.json();
            localStorage.setItem("last_payment_amount", payAmount);
            localStorage.setItem("last_tip_amount", tipAmount);
            window.location.href = data.checkout_url;
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="order-loader">Loading your cake details...</div>;
    if (error) return <div className="order-error">{error}</div>;
    if (!order) return null;

    return (
        <div className="order-detail-page">
            <Navbar />
            <div className="order-detail-container">

                <header className="order-detail-header">
                    <button className="btn-back-text" onClick={() => navigate("/orders")}>
                        ← Back to My Orders
                    </button>
                    <h1>Order <span className="text-berry">#{order.id}</span></h1>
                    <div className="order-meta-badges">
                        <span className={`status-badge ${order.status}`}>{order.status.replace("_", " ")}</span>
                        <span className={`payment-badge ${order.payment_status}`}>{order.payment_status}</span>
                    </div>
                </header>

                <div className="order-grid">
                    {/* LEFT COLUMN: Summary & Payment */}
                    <div className="order-main-info">
                        <div className="bento-card summary-card">
                            <h3>Order Summary</h3>
                            <div className="summary-row">
                                <span>Total Amount:</span>
                                <span className="price-text">₱{Number(order.total_amount).toLocaleString()}</span>
                            </div>
                            {order.status !== "rejected" && order.status !== "pending_review" && (
                                <div className="summary-row balance-highlight">
                                    <span>Remaining Balance:</span>
                                    <span>₱{remainingBalance.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="summary-row sub-text">
                                <span>Placed At:</span>
                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Payment Section */}
                        {order.status === "awaiting_downpayment" && (
                            <div className="bento-card payment-card highlight-card">
                                <h3>Complete Downpayment</h3>
                                <p className="hint">Minimum required: ₱{minAmount}</p>

                                <div className="payment-inputs">
                                    <div className="input-group">
                                        <label>Amount to Pay</label>
                                        <input
                                            type="number"
                                            value={payAmount || ""}
                                            onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Add a Tip (Optional)</label>
                                        <input
                                            type="number"
                                            value={tipAmount || ""}
                                            onChange={(e) => setTipAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                {isInvalid && <p className="error-msg">Please enter an amount between ₱{minAmount} and ₱{maxAmount}</p>}

                                <div className="total-charge-box">
                                    <span>Total to Charge:</span>
                                    <strong>₱{totalToCharge.toLocaleString()}</strong>
                                </div>

                                <button
                                    onClick={handlePayNow}
                                    disabled={isInvalid || isTipInvalid}
                                    className="btn-pay-now"
                                >
                                    Proceed to Secure Checkout
                                </button>
                            </div>
                        )}

                        {/* Rejection Reason */}
                        {order.status === "rejected" && order.rejection_reason && (
                            <div className="bento-card rejection-card">
                                <h4>Update from Bakery</h4>
                                <p>{order.rejection_reason}</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Items & Logistics */}
                    <div className="order-side-info">
                        <div className="bento-card items-card">
                            <h3>Items Ordered</h3>
                            <div className="order-items-list">
                                {order.items.map((item) => (
                                    <div key={item.id} className="item-row">
                                        <div className="item-info">
                                            <p className="item-name">{item.product_name}</p>
                                            <p className="item-qty">Qty: {item.quantity} × ₱{item.price}</p>
                                        </div>
                                        <div className="item-subtotal">₱{item.subtotal}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bento-card logistics-card">
                            <h3>Delivery Details</h3>
                            <div className="delivery-info">
                                <p><strong>Date:</strong> {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "TBD"}</p>
                                <p><strong>Time:</strong> {order.delivery_time || "TBD"}</p>
                            </div>
                            <Logistics order={order} />
                        </div>
                    </div>
                </div>

                <div className="order-actions-footer">
                    {order.payment_status === "partial" && order.status === "processing" && (
                        <button onClick={() => setShowAddPayment(true)} className="btn-secondary">
                            Add Another Payment
                        </button>
                    )}

                    {(order.status === "pending_review" || (order.status === "awaiting_downpayment" && Number(order.total_paid) === 0)) && (
                        <button className="btn-outline-danger" onClick={async () => {
                            if (!confirm("Cancel this order?")) return;
                            const res = await authFetch(`${BASEURL}/api/orders/${id}/cancel/`, { method: "POST" });
                            if (res.ok) { alert("Order cancelled"); fetchOrder(); }
                        }}>
                            Cancel Order
                        </button>
                    )}
                </div>
            </div>

            {showAddPayment && (
                <AddPaymentModal
                    order={order}
                    onClose={() => setShowAddPayment(false)}
                    onSuccess={fetchOrder}
                />
            )}
        </div>
    );
}
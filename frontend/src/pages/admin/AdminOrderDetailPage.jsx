// src/pages/admin/AdminOrderDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import RejectModal from "../../components/admin/RejectModal";
import Navbar from "../../components/Navbar";
import "./AdminOrderDetailPage.css";

export default function AdminOrderDetailPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);

    const updateStatus = async (status) => {
        const res = await authFetch(`${BASEURL}/api/orders/admin/orders/${id}/update-status/`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        const data = await res.json();

        if (!res.ok) return alert(data.error);

        setOrder(data.order);

        if (data.allow_rating) {
            console.log("⭐ TODO: Enable customer rating");
        }

        alert("Status updated!");
    };

    const fetchOrder = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/admin/orders/${id}/`);
            if (!res.ok) throw new Error("Failed to fetch order");
            const data = await res.json();
            setOrder(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    if (loading) return <div className="admin-status-screen"><div className="loader"></div></div>;
    if (error) return <div className="admin-status-screen"><p className="error-text">{error}</p></div>;
    if (!order) return null;

    return (
        <div className="order-detail-page">
            <Navbar />
            <div className="order-detail-container">

                <header className="order-detail-header">
                    <button className="back-link" onClick={() => navigate("/admin/orders")}>
                        ← Back to Orders
                    </button>
                    <h1>Order <span className="text-berry">#{order.id}</span></h1>
                    <div className={`status-badge ${order.status}`}>
                        {order.status.replace('_', ' ')}
                    </div>
                </header>

                <div className="order-grid">
                    {/* LEFT COLUMN: Customer Info */}
                    <div className="order-card info-card">
                        <h3>Customer Details</h3>
                        <div className="info-row">
                            <span>Name:</span> <strong>{order.user_name}</strong>
                        </div>
                        <div className="info-row">
                            <span>Email:</span> <strong>{order.customer_email || "N/A"}</strong>
                        </div>
                        <div className="info-row">
                            <span>Phone:</span> <strong>{order.formatted_phone || order.phone || "N/A"}</strong>
                        </div>
                        <div className="info-row">
                            <span>Address:</span> <strong>{order.full_address || "N/A"}</strong>
                        </div>
                        <div className="info-row">
                            <span>Placed At:</span> <strong>{new Date(order.created_at).toLocaleString()}</strong>
                        </div>
                        <div className="info-row">
                            <span>Delivery Date:</span>
                            <strong>
                                {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "N/A"}
                            </strong>
                        </div>
                        <div className="info-row">
                            <span>Delivery Time:</span>
                            <strong>
                                {order.delivery_time ? new Date(`1970-01-01T${order.delivery_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                            </strong>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Actions & Summary */}
                    <div className="order-card summary-card">
                        <h3>Order Summary</h3>
                        <div className="total-row">
                            <span>Total Amount:</span>
                            <span className="price-tag">₱{Number(order.total_amount).toLocaleString()}</span>
                        </div>

                        {order.status === "pending_review" && (
                            <div className="admin-actions">
                                <button
                                    className="btn-accept"
                                    onClick={async () => {
                                        if (!confirm("Accept this order?")) return;
                                        const res = await authFetch(`${BASEURL}/api/orders/admin/orders/${id}/review/`, {
                                            method: "PATCH",
                                            body: JSON.stringify({ status: "awaiting_downpayment" }),
                                        });
                                        const data = await res.json();
                                        if (!res.ok) return alert(data.error);
                                        setOrder(data.order);
                                        alert("Order accepted!");
                                    }}
                                >
                                    Accept Order
                                </button>

                                <button className="btn-reject" onClick={() => setShowRejectModal(true)}>
                                    Reject
                                </button>
                            </div>
                        )}
                        {/* STATUS PROGRESSION */}
                        {order.status !== "pending_review" && order.status !== "rejected" && order.status !== "completed" && (
                            <div className="admin-actions">
                                <h4>Update Order Status</h4>

                                {order.status === "awaiting_downpayment" && (
                                    <button
                                        className="btn-accept"
                                        onClick={() => updateStatus("processing")}
                                    >
                                        Start Processing
                                    </button>
                                )}

                                {order.status === "processing" && (
                                    <button
                                        className="btn-accept"
                                        onClick={() => updateStatus("ready_for_delivery")}
                                    >
                                        Mark as Ready
                                    </button>
                                )}

                                {order.status === "ready_for_delivery" && (
                                    <button
                                        className="btn-accept"
                                        onClick={() => updateStatus("out_for_delivery")}
                                    >
                                        Out for Delivery
                                    </button>
                                )}

                                {order.status === "out_for_delivery" && (
                                    <button
                                        className="btn-accept"
                                        onClick={() => updateStatus("delivered")}
                                    >
                                        Mark as Delivered
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="order-card table-card">
                    <h3>Items Ordered</h3>
                    <div className="table-responsive">
                        <table className="boutique-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th className="text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div style={{ fontWeight: "700" }}>{item.product_name}</div>
                                            {item.customization && (
                                                <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                                    {(item.customization.tier || item.customization.size) && (
                                                        <div><strong>Size:</strong> {item.customization.tier}{item.customization.tier && item.customization.size ? " — " : ""}{item.customization.size}</div>
                                                    )}
                                                    <div style={{ textTransform: "capitalize" }}><strong>Shape:</strong> {item.customization.shape}</div>
                                                    <div><strong>Flavor:</strong> {item.customization.flavor}</div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <strong>Color:</strong>
                                                        <span style={{ display: "inline-block", width: "14px", height: "14px", borderRadius: "50%", background: item.customization.cake_color, border: "1px solid #ccc" }}></span>
                                                    </div>
                                                    <div>
                                                        <strong>Add-ons:</strong> {[
                                                            item.customization.has_candle && "Candle",
                                                            item.customization.has_chocolate && "Chocolate",
                                                            item.customization.has_balls && "Balls",
                                                            item.customization.has_nuts && "Nuts"
                                                        ].filter(Boolean).join(", ") || "None"}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td>{item.quantity}</td>
                                        <td>₱{Number(item.price).toLocaleString()}</td>
                                        <td className="text-right font-bold">₱{Number(item.subtotal).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <RejectModal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                onSubmit={async (reason) => {
                    const res = await authFetch(`${BASEURL}/api/orders/admin/orders/${id}/review/`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "rejected", rejection_reason: reason }),
                    });
                    const data = await res.json();
                    if (!res.ok) return alert(data.error);
                    setOrder(data.order);
                    setShowRejectModal(false);
                    alert("Order rejected!");
                }}
            />
        </div>
    );
}
// src/pages/admin/AdminOrderDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import RejectModal from "../../components/admin/RejectModal";
import Navbar from "../../components/Navbar";
import Logistics from "../../components/Logistics";
import AdminOrderFeedback from "../../components/admin/AdminOrderFeedback";
import { CustomCakeModal } from "../../components/admin/CustomCakeModal";
import ChatBox from "../../components/chat/ChatBox";
import { CustomizationProvider } from "../../contexts/Customization";

export default function AdminOrderDetailPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showCakeModal, setShowCakeModal] = useState(false);
    const [selectedCake, setSelectedCake] = useState(null);

    const updateStatus = async (status) => {
        const confirmUpdate = window.confirm(
            `Are you sure you want to update this order to "${status.replaceAll("_", " ")}"?`
        );
        if (!confirmUpdate) return;

        const res = await authFetch(`${BASEURL}/api/orders/admin/orders/${id}/update-status/`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.error || "Failed to update status");

        setOrder(data.order);
        await fetchOrder();
        alert(`Order updated to "${status.replaceAll("_", " ")}"`);
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

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-[#6E473B]">Loading...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
    if (!order) return null;

    return (
        <div className="min-h-screen bg-[#FCF8EE] pb-10">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8 space-y-6">

                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button className="text-[#A07060] hover:text-[#6E473B] font-bold" onClick={() => navigate("/admin/orders")}>
                        ← Back to Orders
                    </button>
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-black text-[#6E473B]">Order <span className="text-[#C05A11]">#{order.id}</span></h1>
                        <span className={`px-3 py-1 text-xs font-black rounded-full uppercase border ${order.status}`}>{order.status.replace('_', ' ')}</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Customer Info */}
                    <div className="bg-white p-6 rounded-2xl border border-[#E6CCA2] space-y-4">
                        <h3 className="font-black text-[#6E473B] border-b border-[#E6CCA2]/30 pb-2">Customer Details</h3>
                        {[
                            { label: "Name", val: order.user_name },
                            { label: "Email", val: order.customer_email },
                            { label: "Phone", val: order.formatted_phone || order.phone },
                            { label: "Address", val: order.full_address },
                            { label: "Placed At", val: new Date(order.created_at).toLocaleString() },
                            { label: "Delivery Date", val: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "N/A" },
                            { label: "Delivery Time", val: order.delivery_time }
                        ].map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-[#A07060]">{item.label}:</span>
                                <strong className="text-[#6E473B]">{item.val || "N/A"}</strong>
                            </div>
                        ))}
                        {order.order_notes && (
                            <>
                                <div className="border-t border-[#E6CCA2]/30 pt-4 mt-2">
                                    <p className="text-xs font-bold uppercase tracking-wide text-[#A07060] mb-2">
                                        Special Instructions
                                    </p>

                                    <div className="bg-[#FCF8EE] border border-[#E6CCA2] rounded-xl p-3 text-sm text-[#6E473B] whitespace-pre-wrap break-words">
                                        {order.order_notes}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions & Summary */}
                    <div className="bg-white p-6 rounded-2xl border border-[#E6CCA2] space-y-6">
                        <h3 className="font-black text-[#6E473B]">Order Summary</h3>
                        <div className="flex justify-between text-xl font-black text-[#6E473B]">
                            <span>Total:</span> <span>₱{Number(order.total_amount).toLocaleString()}</span>
                        </div>

                        {order.status === "pending_review" && (
                            <div className="flex gap-3">
                                <button className="flex-1 bg-[#6E473B] text-white py-2 rounded-lg font-bold" onClick={async () => {
                                    if (!confirm("Accept this order?")) return;
                                    const res = await authFetch(`${BASEURL}/api/orders/admin/orders/${id}/review/`, { method: "PATCH", body: JSON.stringify({ status: "awaiting_downpayment" }) });
                                    if (!res.ok) return alert("Error");
                                    await fetchOrder();
                                }}>Accept</button>
                                <button className="flex-1 border border-[#C05A11] text-[#C05A11] py-2 rounded-lg font-bold" onClick={() => setShowRejectModal(true)}>Reject</button>
                            </div>
                        )}

                        {/* Status Progression */}
                        {order.status !== "pending_review" && !["rejected", "delivered"].includes(order.status) && (
                            <div className="space-y-3">
                                <h4 className="font-bold text-[#6E473B]">Update Status</h4>
                                {order.status === "awaiting_downpayment" && <button className="w-full bg-[#E6CCA2] py-2 rounded-lg font-bold" onClick={() => updateStatus("processing")}>Start Processing</button>}
                                {order.status === "processing" && <button className="w-full bg-[#E6CCA2] py-2 rounded-lg font-bold" onClick={() => updateStatus("ready_for_delivery")}>Mark as Ready</button>}
                                {order.status === "ready_for_delivery" && <button className="w-full bg-[#E6CCA2] py-2 rounded-lg font-bold" onClick={() => updateStatus("out_for_delivery")}>Out for Delivery</button>}
                                {order.status === "out_for_delivery" && <button className="w-full bg-[#6E473B] text-white py-2 rounded-lg font-bold" onClick={() => updateStatus("delivered")}>Mark as Delivered</button>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-white p-6 rounded-2xl border border-[#E6CCA2]">
                    <h3 className="font-black text-[#6E473B] mb-4">Items Ordered</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="text-[#A07060] text-xs uppercase"><th>Product</th><th>Qty</th><th>Price</th><th className="text-right">Subtotal</th></tr></thead>
                            <tbody className="divide-y divide-[#E6CCA2]/20">
                                {order.items.map((item) => (
                                    <tr key={item.id} className="text-[#6E473B]">
                                        <td className="py-4">
                                            <div className="font-bold">{item.product_name}</div>
                                            {item.customization && (
                                                <button className="text-xs text-[#C05A11] underline mt-1" onClick={() => { setSelectedCake(item.customization); setShowCakeModal(true); }}>View Customization</button>
                                            )}
                                        </td>
                                        <td>{item.quantity}</td>
                                        <td>₱{Number(item.price).toLocaleString()}</td>
                                        <td className="text-right font-black">₱{Number(item.subtotal).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Order Timeline */}
                <div className="bg-white p-6 rounded-2xl border border-[#E6CCA2]">
                    <Logistics order={order} embedded />
                </div>
                <AdminOrderFeedback feedback={order.feedback} />
            </div>
            <ChatBox orderId={id} isAdmin={true} />

            <RejectModal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} onSubmit={async (reason) => {
                const res = await authFetch(`${BASEURL}/api/orders/admin/orders/${id}/review/`, { method: "PATCH", body: JSON.stringify({ status: "rejected", rejection_reason: reason }) });
                if (!res.ok) return alert("Error");
                setShowRejectModal(false);
                await fetchOrder();
            }} />

            <CustomizationProvider>
                <CustomCakeModal isOpen={showCakeModal} onClose={() => { setShowCakeModal(false); setSelectedCake(null); }} customization={selectedCake} />
            </CustomizationProvider>
        </div>
    );
}
// src/pages/customer/CustomerOrdersPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import OrderCard from "../../components/OrderCard";

export default function CustomerOrdersPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [unreadOrders, setUnreadOrders] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUnreadOrders = async () => {
        try {
            const res = await authFetch(
                `${BASEURL}/api/chat/unread/orders/`
            );

            if (!res.ok) return;

            const data = await res.json();

            const map = {};

            data.forEach(item => {
                map[item.order] = item.unread;
            });

            setUnreadOrders(map);

        } catch (err) {
            console.error(err);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/customer/orders/`);
            if (!res.ok) throw new Error("Failed to fetch orders");
            const data = await res.json();
            setOrders(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchUnreadOrders();
    }, []);

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center text-[#A07060] font-bold">
            <div className="animate-pulse">Loading your orders...</div>
        </div>
    );

    if (error) return (
        <div className="min-h-[60vh] flex items-center justify-center text-rose-600 font-bold p-6 text-center">
            {error}
        </div>
    );

    return (
        <div className="min-h-screen p-6 md:p-10 bg-[#FCF8EE]">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-black mb-8 text-[#6E473B] text-center">My Orders</h1>

                {orders.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-[#E6CCA2] rounded-2xl bg-white/50">
                        <p className="text-[#A07060] font-medium">No orders found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                unreadCount={unreadOrders[order.id] || 0}
                                onView={(id) => navigate(`/orders/${id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
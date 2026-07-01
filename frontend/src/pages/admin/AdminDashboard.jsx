// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { authFetch } from "../../utils/auth";
import Navbar from "../../components/Navbar";


export default function AdminDashboard() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [data, setData] = useState(null);
    const [queuePage, setQueuePage] = useState(1);

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [queuePage]);

    const fetchDashboard = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/admin/dashboard/?page=${queuePage}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
        }
    };

    if (!data) return (
        <div className="min-h-screen flex items-center justify-center bg-[#FCF8EE] text-[#6E473B]">
            <p className="font-bold text-lg animate-pulse">Loading management console...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FCF8EE] pb-10">
            <Navbar />

            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8 flex flex-col gap-8">
                <header className="mb-2">
                    <h1 className="text-3xl font-black text-[#6E473B]">Business Overview</h1>
                    <p className="text-[#A07060] mt-1">Welcome back, Chef! Here's what's happening today.</p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card title="Total Orders" value={data.total_orders} />
                    <Card title="Pending Review" value={data.pending_review} />
                    <Card title="Awaiting Payment" value={data.awaiting_downpayment} />
                    <Card title="Completed" value={data.completed} />
                    <Card title="Total Revenue" value={`₱${Number(data.total_revenue).toLocaleString()}`} isHighlight={true} />
                </div>

                <div className="bg-white border border-[#E6CCA2] rounded-2xl p-6 shadow-sm">
                    <h2 className="text-xl font-black text-[#6E473B] mb-5">Upcoming Deliveries (Next 7 Days)</h2>
                    {data.upcoming_orders.length === 0 ? (
                        <p className="text-[#A07060] italic">No urgent deliveries 🎉</p>
                    ) : (
                        <div className="space-y-3">
                            {data.upcoming_orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-4 bg-[#FCF8EE] hover:bg-[#F5EEDD] border border-[#E6CCA2] rounded-xl cursor-pointer transition-all"
                                    onClick={() => window.location.href = `/admin/orders/${order.id}/`}
                                >
                                    <div>
                                        <p className="font-bold text-[#6E473B]">{order.full_name}</p>
                                        <p className="text-xs text-[#A07060] font-medium">📅 {order.delivery_date} • 🕒 {order.delivery_time || "No time set"}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-[10px] font-black rounded-full border border-[#E6CCA2] uppercase ${order.status}`}>
                                        {order.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white border border-[#E6CCA2] rounded-2xl p-6 shadow-sm">
                    <h2 className="text-xl font-black text-[#6E473B] mb-5">All Scheduled Orders (Queue)</h2>
                    {data.all_upcoming_orders.length === 0 ? (
                        <p className="text-[#A07060] italic">No scheduled orders 🎉</p>
                    ) : (
                        <div className="space-y-3">
                            {data.all_upcoming_orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-4 bg-[#FCF8EE] hover:bg-[#F5EEDD] border border-[#E6CCA2] rounded-xl cursor-pointer transition-all"
                                    onClick={() => window.location.href = `/admin/orders/${order.id}/`}
                                >
                                    <div>
                                        <p className="font-bold text-[#6E473B]">{order.full_name}</p>
                                        <p className="text-xs text-[#A07060] font-medium">📅 {order.delivery_date} • 🕒 {order.delivery_time || "No time set"}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-[10px] font-black rounded-full border border-[#E6CCA2] uppercase ${order.status}`}>
                                        {order.status}
                                    </span>
                                </div>
                            ))}

                            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-[#E6CCA2]/30">
                                <button 
                                    disabled={!data.all_upcoming_has_prev} 
                                    onClick={() => setQueuePage(prev => prev - 1)}
                                    className="px-5 py-2 bg-[#E6CCA2] hover:bg-[#D9B88A] text-[#6E473B] font-black rounded-lg transition-colors disabled:opacity-50"
                                >
                                    ← Back
                                </button>
                                <span className="font-black text-[#6E473B]">Page {data.all_upcoming_page}</span>
                                <button 
                                    disabled={!data.all_upcoming_has_next} 
                                    onClick={() => setQueuePage(prev => prev + 1)}
                                    className="px-5 py-2 bg-[#E6CCA2] hover:bg-[#D9B88A] text-[#6E473B] font-black rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Card({ title, value, isHighlight }) {
    return (
        <div className={`p-5 rounded-2xl border ${isHighlight ? "bg-[#C05A11] text-white border-[#C05A11]" : "bg-white text-[#6E473B] border-[#E6CCA2]"}`}>
            <h2 className="text-xs font-black uppercase tracking-wider opacity-80">{title}</h2>
            <p className="text-2xl font-black mt-1">{value}</p>
        </div>
    );
}
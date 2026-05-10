// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { authFetch } from "../../utils/auth";
import Navbar from "../../components/Navbar";
import "./AdminDashboard.css";

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
        <div className="admin-page">
            <p className="loading-text">Loading management console...</p>
        </div>
    );

    return (
        <div className="admin-page">
            <Navbar />

            <div className="admin-container">
                <header className="admin-header">
                    <h1>Business Overview</h1>
                    <p>Welcome back, Chef! Here's what's happening today.</p>
                </header>

                <div className="stats-grid">
                    <Card title="Total Orders" value={data.total_orders} />
                    <Card title="Pending Review" value={data.pending_review} />
                    <Card title="Awaiting Payment" value={data.awaiting_downpayment} />
                    <Card title="Completed" value={data.completed} />
                    <Card
                        title="Total Revenue"
                        value={`₱${Number(data.total_revenue).toLocaleString()}`}
                        isHighlight={true}
                    />
                </div>


                <div className="todo-section">
                    <h2 className="todo-title">Upcoming Deliveries (Next 7 Days)</h2>

                    {data.upcoming_orders.length === 0 ? (
                        <p className="todo-empty">No urgent deliveries 🎉</p>
                    ) : (
                        <div className="todo-list">
                            {data.upcoming_orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="todo-card clickable"
                                    onClick={() => window.location.href = `/admin/orders/${order.id}/`}
                                >
                                    <div className="todo-left">
                                        <p className="todo-name">{order.full_name}</p>
                                        <p className="todo-meta">
                                            📅 {order.delivery_date} • 🕒 {order.delivery_time || "No time set"}
                                        </p>
                                    </div>

                                    <div className="todo-right">
                                        <span className={`todo-status ${order.status}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="all-orders-section">
                    <div className="all-orders-section">
                        <h2 className="todo-title">All Scheduled Orders (Queue)</h2>

                        {data.all_upcoming_orders.length === 0 ? (
                            <p className="todo-empty">No scheduled orders 🎉</p>
                        ) : (
                            <>
                                <div className="todo-list">
                                    {data.all_upcoming_orders.map((order) => (
                                        <div
                                            key={order.id}
                                            className="todo-card clickable"
                                            onClick={() => window.location.href = `/admin/orders/${order.id}/`}
                                        >
                                            <div className="todo-left">
                                                <p className="todo-name">{order.full_name}</p>
                                                <p className="todo-meta">
                                                    📅 {order.delivery_date} • 🕒 {order.delivery_time || "No time set"}
                                                </p>
                                            </div>

                                            <div className="todo-right">
                                                <span className={`todo-status ${order.status}`}>
                                                    {order.status}
                                                </span>
                                            </div>

                                        </div>
                                    ))}
                                </div>

                                {/* ================= PAGINATION CONTROLS ================= */}
                                <div className="pagination-controls">

                                    <button
                                        disabled={!data.all_upcoming_has_prev}
                                        onClick={() => setQueuePage(prev => prev - 1)}
                                    >
                                        ← Back
                                    </button>

                                    <span>
                                        Page {data.all_upcoming_page}
                                    </span>

                                    <button
                                        disabled={!data.all_upcoming_has_next}
                                        onClick={() => setQueuePage(prev => prev + 1)}
                                    >
                                        Next →
                                    </button>

                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function Card({ title, value, isHighlight }) {
    return (
        <div className={`stat-card ${isHighlight ? "highlight" : ""}`}>
            <h2 className="stat-title">{title}</h2>
            <p className="stat-value">{value}</p>
        </div>
    );
}
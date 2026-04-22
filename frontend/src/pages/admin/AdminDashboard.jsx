import { useEffect, useState } from "react";
import { authFetch } from "../../utils/auth";
import Navbar from "../../components/Navbar";
import "./AdminDashboard.css";

export default function AdminDashboard() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/admin/dashboard/`);
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
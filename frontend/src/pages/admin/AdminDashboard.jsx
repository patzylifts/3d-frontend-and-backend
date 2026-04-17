import { useEffect, useState } from "react";
import { authFetch } from "../../utils/auth";

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

    if (!data) return <p className="text-center mt-10">Loading dashboard...</p>;

    return (
        <div className="min-h-screen p-6 bg-gray-100">
            <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card title="Total Orders" value={data.total_orders} />
                <Card title="Pending Review" value={data.pending_review} />
                <Card title="Awaiting Payment" value={data.awaiting_downpayment} />
                <Card title="Completed" value={data.completed} />
                <Card title="Revenue" value={`₱${data.total_revenue}`} />
            </div>
        </div>
    );
}

function Card({ title, value }) {
    return (
        <div className="bg-white p-6 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
    );
}
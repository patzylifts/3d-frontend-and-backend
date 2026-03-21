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

    const fetchOrder = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/customer/orders/${id}/`);
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

    if (loading) return <p className="text-center mt-10">Loading order...</p>;
    if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
    if (!order) return null;

    return (
        <div className="min-h-screen p-6 bg-gray-100">
            <h1 className="text-3xl font-bold mb-6 text-center">Order #{order.id}</h1>

            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Payment Status:</strong> {order.payment_status}</p>
                <p><strong>Total Amount:</strong> ${order.total_amount}</p>
                <p><strong>Placed At:</strong> {new Date(order.created_at).toLocaleString()}</p>

                {order.status === "rejected" && order.rejection_reason && (
                    <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500">
                        <strong>Reason for rejection:</strong>
                        <p>{order.rejection_reason}</p>
                    </div>
                )}

                {order.status === "awaiting_downpayment" && (
                    <button
                        onClick={() => alert("Redirect to payment gateway here")}
                        className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                        Pay Now
                    </button>
                )}

                <button
                    onClick={() => navigate("/orders")}
                    className="mt-4 ml-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Back to My Orders
                </button>
            </div>

            {/* Order Items */}
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
                                <td className="border p-2">${item.price}</td>
                                <td className="border p-2">${item.subtotal}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
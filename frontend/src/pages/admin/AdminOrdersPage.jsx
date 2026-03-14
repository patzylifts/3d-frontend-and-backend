import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";

export default function AdminOrdersPage() {
  const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all orders (admin)
  const fetchOrders = async () => {
    try {
      const res = await authFetch(`${BASEURL}/api/orders/admin/orders/`);
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
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
  }, []);

  if (loading) {
    return <p className="text-center mt-10">Loading orders...</p>;
  }

  if (error) {
    return <p className="text-center mt-10 text-red-600">{error}</p>;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Orders</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-200 text-left">
            <tr>
              <th className="p-3 border">Order ID</th>
              <th className="p-3 border">Customer ID</th>
              <th className="p-3 border">Total</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Payment</th>
              <th className="p-3 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4">
                  No orders found.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="text-center border-t">
                <td className="p-3 border">{order.id}</td>
                <td className="p-3 border">{order.user}</td>
                <td className="p-3 border">${order.total_amount}</td>
                <td className="p-3 border capitalize">{order.status}</td>
                <td className="p-3 border capitalize">{order.payment_status}</td>
                <td className="p-3 border">
                  <button
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition duration-200"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
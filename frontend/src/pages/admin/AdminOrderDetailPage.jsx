import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";

export default function AdminOrderDetailPage() {
  const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
  const { id } = useParams(); // order ID from URL
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  // Fetch order details
  const fetchOrder = async () => {
    try {
      const res = await authFetch(`${BASEURL}/api/orders/admin/orders/${id}/`);
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      setOrder(data);
      setStatus(data.status);
      setPaymentStatus(data.payment_status);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Update order status / payment status
  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await authFetch(`${BASEURL}/api/orders/${id}/update/`, {
        method: "POST", // matches your backend admin update
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, payment_status: paymentStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");
      setOrder(data.order);
      alert("Order updated successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p className="text-center mt-10">Loading order...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
  if (!order) return null;

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">Order #{order.id}</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <p><strong>Customer ID:</strong> {order.user}</p>
        <p><strong>Total Amount:</strong> ${order.total_amount}</p>
        <p><strong>Created At:</strong> {new Date(order.created_at).toLocaleString()}</p>

        <div className="flex gap-4 mt-4">
          <div>
            <label className="block font-semibold mb-1">Order Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleUpdate}
          disabled={updating}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200"
        >
          {updating ? "Updating..." : "Update Order"}
        </button>

        <button
          onClick={() => navigate("/admin/orders")}
          className="mt-4 ml-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200"
        >
          Back
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Order Items</h2>
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Product Name</th>
              <th className="p-2 border">Quantity</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="text-center">
                <td className="p-2 border">{item.product_name}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">${item.price}</td>
                <td className="p-2 border">${item.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
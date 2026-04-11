// src/pages/admin/AdminOrderDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import RejectModal from "../../components/admin/RejectModal";

export default function AdminOrderDetailPage() {
  const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

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

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
  if (!order) return null;

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Order #{order.id}
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <p><strong>Customer:</strong> {order.user_name}</p>
        <p><strong>Total:</strong> ${order.total_amount}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Placed At:</strong> {new Date(order.created_at).toLocaleString()}</p>
        <p>
          <strong>Delivery Schedule:</strong>{" "}
          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "N/A"}{" "}
          {order.delivery_time ? new Date(`1970-01-01T${order.delivery_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
        </p>
        {/* ✅ REVIEW ACTIONS ONLY */}
        {order.status === "pending_review" && (
          <div className="flex gap-4 mt-4">
            <button
              onClick={async () => {
                if (!confirm("Accept this order?")) return;

                const res = await authFetch(
                  `${BASEURL}/api/orders/admin/orders/${id}/review/`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({
                      status: "awaiting_downpayment",
                    }),
                  }
                );

                const data = await res.json();
                if (!res.ok) return alert(data.error);

                setOrder(data.order);
                alert("Order accepted!");
              }}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Accept Order
            </button>

            <button
              onClick={() => setShowRejectModal(true)}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Reject Order
            </button>
          </div>
        )}

        {/* Back */}
        <button
          onClick={() => navigate("/admin/orders")}
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
        >
          Back
        </button>
      </div>

      {/* ITEMS */}
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

      {/* ✅ REJECT MODAL */}
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onSubmit={async (reason) => {
          const res = await authFetch(
            `${BASEURL}/api/orders/admin/orders/${id}/review/`,
            {
              method: "PATCH",
              body: JSON.stringify({
                status: "rejected",
                rejection_reason: reason,
              }),
            }
          );

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
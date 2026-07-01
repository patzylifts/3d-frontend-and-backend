// src/pages/admin/AdminOrdersPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import Navbar from "../../components/Navbar";

export default function AdminOrdersPage() {
  const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await authFetch(`${BASEURL}/api/orders/admin/orders/`);
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
  }, []);

  const getStatusClass = (status) => {
    if (status === "pending_review") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "completed") return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCF8EE] text-[#6E473B] font-black">
      <p>Loading order vault...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCF8EE] pb-10">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-[#6E473B]">Customer Orders</h1>
          <p className="text-[#A07060]">Manage incoming requests and cake statuses.</p>
        </header>

        <div className="bg-white rounded-2xl border border-[#E6CCA2] shadow-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-[#A07060]">
              <span className="text-4xl block mb-4">📦</span>
              <h3 className="font-black text-[#6E473B] text-lg">No orders found</h3>
              <p>When customers start ordering, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#FCF8EE] text-[#A07060] uppercase text-xs font-bold">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Address</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6CCA2]/20">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#FCF8EE]/50 transition-colors">
                      <td className="p-4 font-black text-[#6E473B]">#{order.id}</td>
                      <td className="p-4 text-sm font-bold text-[#6E473B]">{order.user_name}</td>
                      <td className="p-4 text-sm text-[#A07060]">
                        {order.formatted_phone || order.phone || "—"}<br/>
                        <span className="text-xs">{order.customer_email || ""}</span>
                      </td>
                      <td className="p-4 text-sm text-[#A07060]">{order.full_address || `${order.street || ''} ${order.city || ''}` || "—"}</td>
                      <td className="p-4 font-black text-[#6E473B]">₱{Number(order.total_amount).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-black rounded-full border uppercase ${getStatusClass(order.status)}`}>
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 text-[10px] font-black rounded-full border bg-gray-50 text-gray-600 border-gray-200 uppercase">
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className="px-4 py-2 bg-[#6E473B] hover:bg-[#5a3a30] text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
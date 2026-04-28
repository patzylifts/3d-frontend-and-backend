import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import Navbar from "../../components/Navbar";
import "./AdminOrdersPage.css";

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
    if (status === "pending_review") return "badge-pending";
    if (status === "completed") return "badge-completed";
    return "badge-default";
  };

  if (loading) return (
    <div className="orders-page-status">
      <p>Loading order vault...</p>
    </div>
  );

  return (
    <div className="orders-page">
      <Navbar />
      <div className="orders-container">
        <header className="orders-header">
          <h1>Customer Orders</h1>
          <p>Manage incoming requests and cake statuses.</p>
        </header>

        <div className="table-wrapper">
          {orders.length === 0 ? (
            <div className="empty-state-card">
              <span className="empty-icon">📦</span>
              <h3>No orders found</h3>
              <p>When customers start ordering, they will appear here.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Order ID" className="font-bold">#{order.id}</td>
                    <td data-label="Customer">{order.user_name}</td>
                    <td data-label="Contact">{order.formatted_phone || order.phone || "—"}<br/>{order.customer_email || ""}</td>
                    <td data-label="Address">{order.full_address || `${order.street || ''} ${order.city || ''}` || "—"}</td>
                    <td data-label="Total" className="font-bold">₱{Number(order.total_amount).toLocaleString()}</td>
                    <td data-label="Status">
                      <span className={`badge ${getStatusClass(order.status)}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td data-label="Payment">
                      <span className="badge badge-default">
                        {order.payment_status}
                      </span>
                    </td>
                    <td data-label="Action">
                      <button
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        className="btn-view"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
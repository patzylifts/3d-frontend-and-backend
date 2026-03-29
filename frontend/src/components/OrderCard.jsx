export default function OrderCard({ order, onView }) {
  // Convert total_amount to number safely
  const total = Number(order.total_amount);

  // Status color mapping
  const statusColors = {
    pending_review: "bg-yellow-200 text-yellow-800",
    awaiting_downpayment: "bg-blue-200 text-blue-800",
    processing: "bg-purple-200 text-purple-800",
    completed: "bg-green-200 text-green-800",
    rejected: "bg-red-200 text-red-800",
    cancelled: "bg-gray-200 text-gray-800",
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">Order #{order.id}</p>
          <p className="text-lg font-semibold mt-1">
            Total: ₱{isNaN(total) ? order.total_amount : total.toFixed(2)}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Placed: {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <div>
          <span
            className={`px-2 py-1 rounded text-sm font-semibold ${
              statusColors[order.status] || "bg-gray-200 text-gray-800"
            }`}
          >
            {order.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <button
        onClick={() => onView(order.id)}
        className="mt-4 w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
      >
        View Details
      </button>
    </div>
  );
}
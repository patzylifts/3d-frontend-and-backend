// src/components/OrderCard.jsx
export default function OrderCard({ order, unreadCount, onView }) {
  const total = Number(order.total_amount);
  const statusColors = {
    pending_review: "bg-amber-100 text-amber-800 border border-amber-200",
    awaiting_downpayment: "bg-orange-100 text-orange-800 border border-orange-200",
    processing: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    completed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border border-rose-200",
    cancelled: "bg-stone-100 text-stone-600 border border-stone-200",
  };

  return (
    <div className="relative mt-5">
      {unreadCount > 0 && (
        <div className="absolute -top-3 right-4 z-10">
          <div className="bg-[#d67b27] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white">
            {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
          </div>
        </div>
      )}

      <div className="bg-[#fffdf9] border border-[#f3e1c6] shadow-sm rounded-xl p-5 mb-4 hover:shadow-md transition-all duration-300">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-stone-400 tracking-wider">ORDER #{order.id}</p>
            <p className="text-xl font-bold mt-1 text-[#844414]">
              Total: ₱{isNaN(total) ? order.total_amount : total.toFixed(2)}
            </p>
            <p className="text-stone-500 text-xs mt-1">
              Placed: {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[order.status] || "bg-stone-100 text-stone-600"
                }`}
            >
              {order.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <button
          onClick={() => onView(order.id)}
          className="mt-5 w-full bg-[#d67b27] hover:bg-[#b56219] text-white font-medium px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-colors duration-200 text-sm"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
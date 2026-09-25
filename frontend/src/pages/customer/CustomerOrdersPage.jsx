// src/pages/customer/CustomerOrdersPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import { getOrderStatusLabel } from "../../utils/orderStatus";

const ACTIVE_STATUSES = new Set([
    "pending_review",
    "processing",
    "awaiting_downpayment",
    "ready_for_delivery",
]);

const FINISHED_STATUSES = new Set(["delivered", "completed"]);
const ORDERS_PER_PAGE = 5;

const formatDate = (value, fallback = "Date unavailable") => {
    if (!value) return fallback;

    return new Date(value).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const formatTotal = (value) => `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

function OrderItems({ items = [] }) {
    if (items.length === 0) return <p className="text-sm text-stone-500">No items listed</p>;

    return (
        <ul className="space-y-1">
            {items.map((item) => (
                <li key={item.id} className="text-sm text-stone-700">
                    <span className="font-medium">{item.quantity} x</span> {item.product_name}
                </li>
            ))}
        </ul>
    );
}

function ReorderModal({ order, onClose, onReorder }) {
    if (!order) return null;

    const reorderItem = order.items?.find((item) => item.customization?.shape);
    const itemSummary = order.items?.map((item) => `${item.quantity} x ${item.product_name}`).join(", ");

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" role="presentation">
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reorder-title"
            >
                <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
                    <h2 id="reorder-title" className="text-sm font-black text-stone-800">
                        Reorder this custom cake?
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-lg leading-none text-stone-400 transition-colors hover:text-stone-700"
                        aria-label="Close reorder dialog"
                    >
                        ×
                    </button>
                </div>

                <div className="px-5 py-5">
                    <p className="text-xs leading-relaxed text-stone-500">
                        You can check out with the exact design from your past order, or edit the flavor and message before placing it again.
                    </p>
                    <div className="mt-4 rounded-xl bg-[#fff8ef] px-4 py-3 text-xs text-stone-600">
                        <p className="font-bold text-[#844414]">Order #{order.id}</p>
                        <p className="mt-1">{itemSummary || "No items listed"}</p>
                    </div>
                    {!reorderItem && (
                        <p className="mt-3 text-xs font-semibold text-amber-700">
                            This order does not contain a saved 3D cake design to edit.
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-50"
                    >
                        Maybe later
                    </button>
                    <button
                        type="button"
                        onClick={() => onReorder(reorderItem)}
                        disabled={!reorderItem}
                        className="rounded-lg bg-[#d67b27] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#b56219] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Edit and reorder
                    </button>
                </div>
            </div>
        </div>
    );
}

function ActiveOrderCard({ order, unreadCount, onView }) {
    return (
        <article className="rounded-2xl border border-[#f3e1c6] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Order #{order.id}</p>
                    <h3 className="mt-1 text-lg font-black text-[#844414]">{formatTotal(order.total_amount)}</h3>
                    <p className="mt-1 text-sm text-stone-500">Placed {formatDate(order.created_at)}</p>
                </div>
                <span className="self-start rounded-full border border-[#f3e1c6] bg-[#fff8ef] px-3 py-1 text-xs font-bold text-[#d67b27]">
                    {getOrderStatusLabel(order.status)}
                </span>
            </div>

            <div className="mt-4 border-t border-stone-100 pt-4">
                <OrderItems items={order.items} />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {unreadCount > 0 ? (
                    <span className="text-xs font-bold text-[#d67b27]">
                        {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
                    </span>
                ) : <span />}
                <button
                    onClick={() => onView(order.id)}
                    className="rounded-lg bg-[#d67b27] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#b56219]"
                >
                    View order
                </button>
            </div>
        </article>
    );
}

function PastOrderCard({ order, onReorder }) {
    return (
        <article className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h3 className="text-lg font-black text-[#844414]">
                        {order.items?.map((item) => item.product_name).join(", ") || "Order items"}
                    </h3>
                    <p className="mt-2 text-sm text-stone-600">
                        Delivered on {formatDate(order.delivery_date || order.created_at)}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">Order #{order.id}</p>
                </div>
                <p className="shrink-0 text-lg font-black text-[#844414]">{formatTotal(order.total_amount)}</p>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <OrderItems items={order.items} />
                <button
                    onClick={() => onReorder(order)}
                    className="shrink-0 rounded-lg bg-[#d67b27] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#b56219]"
                >
                    Select items to reorder
                </button>
            </div>
        </article>
    );
}

function OrderPagination({ page, totalItems, onPageChange }) {
    const totalPages = Math.ceil(totalItems / ORDERS_PER_PAGE);

    if (totalPages <= 1) return null;

    return (
        <div className="mt-6 flex items-center justify-center gap-4 sm:gap-12">
            <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-xl bg-[#f1e4cf] px-5 py-3 text-sm font-bold text-[#6E473B] transition-colors hover:bg-[#ead6b7] disabled:cursor-not-allowed disabled:opacity-50"
            >
                ← Back
            </button>
            <span className="text-base font-black text-[#6E473B]">Page {page}</span>
            <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-xl bg-[#ead0a4] px-5 py-3 text-sm font-bold text-[#6E473B] transition-colors hover:bg-[#e2c38c] disabled:cursor-not-allowed disabled:opacity-50"
            >
                Next →
            </button>
        </div>
    );
}

export default function CustomerOrdersPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [unreadOrders, setUnreadOrders] = useState({});
    const [reorderOrder, setReorderOrder] = useState(null);
    const [activePage, setActivePage] = useState(1);
    const [pastPage, setPastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUnreadOrders = async () => {
        try {
            const res = await authFetch(
                `${BASEURL}/api/chat/unread/orders/`
            );

            if (!res.ok) return;

            const data = await res.json();

            const map = {};

            data.forEach(item => {
                map[item.order] = item.unread;
            });

            setUnreadOrders(map);

        } catch (err) {
            console.error(err);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/orders/customer/orders/`);
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
        fetchUnreadOrders();
    }, []);

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center text-[#A07060] font-bold">
            <div className="animate-pulse">Loading your orders...</div>
        </div>
    );

    if (error) return (
        <div className="min-h-[60vh] flex items-center justify-center text-rose-600 font-bold p-6 text-center">
            {error}
        </div>
    );

    const sortedOrders = [...orders].sort(
        (first, second) => new Date(second.created_at) - new Date(first.created_at)
    );
    const activeOrders = sortedOrders.filter((order) => ACTIVE_STATUSES.has(order.status));
    const pastOrders = sortedOrders.filter((order) => FINISHED_STATUSES.has(order.status));
    const activePageCount = Math.max(1, Math.ceil(activeOrders.length / ORDERS_PER_PAGE));
    const pastPageCount = Math.max(1, Math.ceil(pastOrders.length / ORDERS_PER_PAGE));
    const currentActivePage = Math.min(activePage, activePageCount);
    const currentPastPage = Math.min(pastPage, pastPageCount);
    const visibleActiveOrders = activeOrders.slice(
        (currentActivePage - 1) * ORDERS_PER_PAGE,
        currentActivePage * ORDERS_PER_PAGE
    );
    const visiblePastOrders = pastOrders.slice(
        (currentPastPage - 1) * ORDERS_PER_PAGE,
        currentPastPage * ORDERS_PER_PAGE
    );

    return (
        <div className="min-h-screen p-6 md:p-10 bg-[#FCF8EE]">
            <div className="mx-auto max-w-5xl space-y-12">
                <section>
                    <h1 className="text-3xl font-black text-[#6E473B]">Active orders</h1>
                    {activeOrders.length === 0 ? (
                        <p className="mt-5 text-lg text-stone-600">You have no active orders.</p>
                    ) : (
                        <div className="mt-5 grid grid-cols-1 gap-5">
                            {visibleActiveOrders.map((order) => (
                                <ActiveOrderCard
                                    key={order.id}
                                    order={order}
                                    unreadCount={unreadOrders[order.id] || 0}
                                    onView={(id) => navigate(`/orders/${id}`)}
                                />
                            ))}
                        </div>
                    )}
                    <OrderPagination
                        page={currentActivePage}
                        totalItems={activeOrders.length}
                        onPageChange={setActivePage}
                    />
                </section>

                <section>
                    <h2 className="text-3xl font-black text-[#6E473B]">Past orders</h2>
                    {pastOrders.length === 0 ? (
                        <p className="mt-5 text-lg text-stone-600">You have no past orders.</p>
                    ) : (
                        <div className="mt-5 grid grid-cols-1 gap-5">
                            {visiblePastOrders.map((order) => (
                                <PastOrderCard
                                    key={order.id}
                                    order={order}
                                    onReorder={setReorderOrder}
                                />
                            ))}
                        </div>
                    )}
                    <OrderPagination
                        page={currentPastPage}
                        totalItems={pastOrders.length}
                        onPageChange={setPastPage}
                    />
                </section>
            </div>
            <ReorderModal
                order={reorderOrder}
                onClose={() => setReorderOrder(null)}
                onReorder={(item) => {
                    setReorderOrder(null);
                    navigate("/build", {
                        state: {
                            reorderCustomization: item.customization,
                            reorderOrderId: reorderOrder.id,
                        },
                    });
                }}
            />
        </div>
    );
}
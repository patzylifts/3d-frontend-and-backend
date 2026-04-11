// src/components/Logistics.jsx
import { useMemo } from "react";

export default function Logistics({ order }) {
    if (!order) return null;

    const timeline = useMemo(() => {
        const events = [];

        // 1. Order placed
        events.push({
            title: "Order Placed",
            time: order.created_at,
            type: "system",
            status: "done",
        });

        // 2. Payments
        if (order.payments?.length > 0) {
            let runningTotal = 0;

            order.payments.forEach((p, index) => {
                runningTotal += Number(p.amount) + Number(p.tip || 0);

                events.push({
                    title: `Payment Received #${index + 1}`,
                    time: p.created_at,
                    type: "payment",
                    status: p.status,
                    amount: Number(p.amount),
                    tip: Number(p.tip || 0),
                    totalPaidSoFar: runningTotal,
                });
            });
        }

        // 3. Status flow progression
        const statusFlow = [
            "pending_review",
            "awaiting_downpayment",
            "processing",
            "completed",
        ];

        const currentIndex = statusFlow.indexOf(order.status);

        statusFlow.forEach((status, idx) => {
            if (currentIndex >= idx) {
                events.push({
                    title: `Status: ${status.replaceAll("_", " ")}`,
                    time: order.updated_at || order.created_at,
                    type: "status",
                    status: "done",
                });
            }
        });

        // 4. Cancel / reject
        if (order.status === "rejected" || order.status === "cancelled") {
            events.push({
                title: `Order ${order.status}`,
                time: order.updated_at || order.created_at,
                type: "status",
                status: "failed",
            });
        }

        return events.sort((a, b) => new Date(a.time) - new Date(b.time));
    }, [order]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
            <h2 className="text-xl font-bold mb-4">Order Timeline</h2>

            <div className="relative border-l-2 border-gray-300 ml-3">
                {timeline.map((event, idx) => (
                    <div key={idx} className="mb-6 ml-6 relative">

                        {/* DOT */}
                        <div
                            className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full ${event.status === "failed"
                                    ? "bg-red-500"
                                    : event.status === "done"
                                        ? "bg-green-500"
                                        : "bg-gray-400"
                                }`}
                        />

                        {/* TITLE */}
                        <div className="text-sm font-semibold">
                            {event.title}
                        </div>

                        {/* PAYMENT DETAILS (UPGRADED) */}
                        {event.type === "payment" && (
                            <div className="text-xs text-gray-600 mt-1">
                                <div>
                                    ₱{event.amount}
                                    {event.tip > 0 && (
                                        <span className="text-green-600">
                                            {" "} + ₱{event.tip} tip
                                        </span>
                                    )}
                                </div>

                                <div className="text-blue-600 font-semibold mt-1">
                                    Total Paid So Far: ₱{event.totalPaidSoFar}
                                </div>
                            </div>
                        )}

                        {/* STATUS EVENTS */}
                        {event.type === "status" && (
                            <div className="text-xs text-gray-500 mt-1">
                                System update
                            </div>
                        )}

                        {/* TIME */}
                        <div className="text-xs text-gray-400 mt-1">
                            {event.time
                                ? new Date(event.time).toLocaleString()
                                : "N/A"}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
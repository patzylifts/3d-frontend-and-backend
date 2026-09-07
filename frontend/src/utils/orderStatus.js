export function getOrderStatusLabel(status, compact = false) {
    const labels = {
        pending_review: "Pending Review",
        awaiting_customer_response: compact
            ? "Awaiting Response"
            : "Awaiting Customer Response",
        awaiting_downpayment: "Awaiting Downpayment",
        processing: "Processing",
        ready_for_delivery: "Ready for Delivery",
        out_for_delivery: "Out for Delivery",
        delivered: "Delivered",
        completed: "Completed",
        cancelled: "Cancelled",
        rejected: "Rejected",
    };

    return labels[status] || status?.replaceAll("_", " ") || "";
}
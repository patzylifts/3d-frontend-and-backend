// src/components/chat/QuotationCard.jsx
import { authFetch } from "../../utils/auth";

export default function QuotationCard({
    quotation,
    previousQuotation,
    isAdmin,
    onAccepted,
}) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const isPending = quotation.status === "pending";

    const formatPrice = (amount) =>
        `₱${Number(amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const handleAccept = async () => {
        if (
            !confirm(
                `Accept this quotation for ${formatPrice(quotation.amount)}?`
            )
        ) {
            return;
        }

        try {
            const res = await authFetch(
                `${BASEURL}/api/orders/${quotation.order}/accept-quotation/`,
                {
                    method: "POST",
                }
            );

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to accept quotation.");
                return;
            }

            alert("Quotation accepted successfully.");
            await onAccepted?.(data);
        } catch (err) {
            console.error(err);
            alert("Something went wrong.");
        }
    };

    return (
        <div className="shrink-0 border-b border-orange-200 bg-[#fffaf3] px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">
                        Current Quotation
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        {previousQuotation && (
                            <>
                                <span className="text-sm font-bold text-stone-400 line-through">
                                    {formatPrice(previousQuotation.amount)}
                                </span>

                                <span className="text-sm font-black text-orange-400">
                                    →
                                </span>
                            </>
                        )}

                        <span className="text-xl font-black text-[#844414]">
                            {formatPrice(quotation.amount)}
                        </span>
                    </div>

                    <p className="mt-1 text-xs font-semibold text-stone-500">
                        {quotation.status === "pending" &&
                            "Waiting for customer approval"}

                        {quotation.status === "accepted" &&
                            "Quotation accepted"}

                        {quotation.status === "replaced" &&
                            "Quotation replaced"}
                    </p>
                </div>

                {!isAdmin && isPending && (
                    <button
                        onClick={handleAccept}
                        className="w-full shrink-0 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-orange-600 sm:w-auto"
                    >
                        Accept
                    </button>
                )}
            </div>
        </div>
    );
}
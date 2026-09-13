// src/components/customer/ExistingCheckoutModal.jsx
export default function ExistingCheckoutModal({
    isOpen,
    checkout,
    onResume,
    onReplace,
    onClose,
    isReplacing = false,
}) {
    if (!isOpen || !checkout) return null;

    const existingAmount = Number(
        checkout.existingAmount || 0
    );

    const existingTip = Number(
        checkout.existingTip || 0
    );

    const requestedAmount = Number(
        checkout.requestedAmount || 0
    );

    const requestedTip = Number(
        checkout.requestedTip || 0
    );

    const existingTotal =
        existingAmount + existingTip;

    const requestedTotal =
        requestedAmount + requestedTip;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E6CCA2] bg-white shadow-2xl">

                <div className="border-b border-[#f3e1c6] bg-[#fffaf3] px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-[#844414]">
                                Unfinished Checkout
                            </h2>

                            <p className="mt-1 text-sm text-stone-500">
                                You already have an active
                                PayMongo checkout for this order.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isReplacing}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="space-y-5 p-6">

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="mb-3 text-xs font-black uppercase tracking-wider text-amber-700">
                            Existing Checkout
                        </p>

                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-stone-500">
                                    Payment
                                </span>

                                <span className="font-bold text-stone-700">
                                    ₱{existingAmount.toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }
                                    )}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-stone-500">
                                    Tip
                                </span>

                                <span className="font-bold text-stone-700">
                                    ₱{existingTip.toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }
                                    )}
                                </span>
                            </div>

                            <div className="mt-2 flex justify-between border-t border-amber-200 pt-2">
                                <span className="font-bold text-stone-600">
                                    Total
                                </span>

                                <span className="font-black text-[#844414]">
                                    ₱{existingTotal.toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-wider text-stone-500">
                            New Checkout Requested
                        </p>

                        <p className="text-sm font-bold text-stone-700">
                            ₱{requestedTotal.toLocaleString(
                                undefined,
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                }
                            )}
                        </p>

                        <p className="mt-1 text-xs text-stone-500">
                            Payment ₱
                            {requestedAmount.toFixed(2)}
                            {" + "}
                            Tip ₱
                            {requestedTip.toFixed(2)}
                        </p>
                    </div>

                    <p className="text-xs leading-relaxed text-stone-500">
                        You can continue your existing checkout,
                        or close it and create a new checkout
                        using your current payment amount.
                    </p>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={onReplace}
                            disabled={isReplacing}
                            className="flex-1 rounded-xl border border-[#d67b27] bg-white px-4 py-3 text-sm font-black text-[#d67b27] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isReplacing
                                ? "Replacing..."
                                : "Replace Checkout"}
                        </button>

                        <button
                            type="button"
                            onClick={onResume}
                            disabled={isReplacing}
                            className="flex-1 rounded-xl bg-[#d67b27] px-4 py-3 text-sm font-black text-white transition hover:bg-[#b56219] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Resume Checkout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
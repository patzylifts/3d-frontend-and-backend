// src/components/customer/PrintablePaymentReceipt.jsx
import spcLogo from "../../assets/images/spc.png";

export default function PrintablePaymentReceipt({ isOpen, payment, order, onClose }) {
    if (!isOpen || !payment || !order) {
        return null;
    }

    const money = (value) =>
        Number(value || 0).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const paymentAmount = Number(payment.amount || 0);
    const tipAmount = Number(payment.tip || 0);
    const totalCharged = paymentAmount + tipAmount;

    const paymentDate = new Date(
        payment.processed_at ||
        payment.updated_at ||
        payment.created_at
    );

    // Successful payments arranged from first payment to latest payment.
    const successfulPayments = [...(order.payments || [])]
        .filter((item) =>
            ["partial", "paid"].includes(item.status)
        )
        .sort((a, b) => {
            const dateA = new Date(
                a.processed_at ||
                a.updated_at ||
                a.created_at
            );

            const dateB = new Date(
                b.processed_at ||
                b.updated_at ||
                b.created_at
            );

            if (dateA.getTime() === dateB.getTime()) {
                return a.id - b.id;
            }

            return dateA - dateB;
        });

    const paymentNumber =
        successfulPayments.findIndex(
            (item) => item.id === payment.id
        ) + 1;

    const receiptNumber =
        `SPC-ORD-${String(order.id).padStart(4, "0")}-PAY-${String(paymentNumber).padStart(2, "0")}`;

    let totalPaidAfter = 0;

    for (const item of successfulPayments) {
        totalPaidAfter += Number(item.amount || 0);

        if (item.id === payment.id) {
            break;
        }
    }

    const orderTotal = Number(order.total_amount || 0);

    const remainingAfter = Math.max(
        orderTotal - totalPaidAfter,
        0
    );

    const paymentLabel =
        payment.status === "paid"
            ? "Fully Paid"
            : "Partial Payment";

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }

                        #spc-printable-receipt,
                        #spc-printable-receipt * {
                            visibility: visible !important;
                        }

                        #spc-printable-receipt {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: none !important;
                            margin: 0 !important;
                            padding: 20px !important;
                            border: none !important;
                            box-shadow: none !important;
                            border-radius: 0 !important;
                            background: white !important;

                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }

                        .spc-receipt-no-print {
                            display: none !important;
                        }

                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                    }
                `}
            </style>

            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
                <div id="spc-printable-receipt" className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto" onClick={(e) => e.stopPropagation()}>

                    {/* ACTION BAR */}
                    <div className="spc-receipt-no-print flex items-center justify-between border-b border-stone-200 px-5 py-3 bg-stone-50">
                        <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                            Printable Receipt
                        </span>

                        <button type="button" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-stone-200 text-stone-500 font-black cursor-pointer">
                            ×
                        </button>
                    </div>

                    {/* RECEIPT */}
                    <div className="p-6 sm:p-8">

                        {/* HEADER */}
                        <div className="text-center border-b-2 border-[#E6CCA2] pb-6">
                            <img src={spcLogo} alt="Smiley Page Corner Logo" className="w-20 h-20 object-contain mx-auto mb-3" />

                            <h1 className="text-2xl font-black text-[#844414]">
                                Smiley Page Corner
                            </h1>

                            <p className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-[#d67b27]">
                                Payment Receipt
                            </p>
                        </div>

                        {/* RECEIPT INFORMATION */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-stone-200 text-sm">
                            <div>
                                <p className="text-xs uppercase font-bold text-stone-400">
                                    Receipt Number
                                </p>

                                <p className="mt-1 font-black text-stone-800">
                                    {receiptNumber}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase font-bold text-stone-400">
                                    Order Number
                                </p>

                                <p className="mt-1 font-black text-stone-800">
                                    #{order.id}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase font-bold text-stone-400">
                                    Payment Number
                                </p>

                                <p className="mt-1 font-black text-stone-800">
                                    Payment #{paymentNumber}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase font-bold text-stone-400">
                                    Customer
                                </p>

                                <p className="mt-1 font-bold text-stone-700">
                                    {order.full_name || "Customer"}
                                </p>
                            </div>

                            <div className="sm:col-span-2">
                                <p className="text-xs uppercase font-bold text-stone-400">
                                    Payment Date
                                </p>

                                <p className="mt-1 font-bold text-stone-700">
                                    {paymentDate.toLocaleString("en-PH", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* PAYMENT DETAILS */}
                        <div className="py-6">
                            <h2 className="text-sm font-black uppercase tracking-wider text-[#844414] mb-4">
                                Payment Details
                            </h2>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between gap-4">
                                    <span className="text-stone-500">
                                        Payment Amount
                                    </span>

                                    <span className="font-bold text-stone-800">
                                        ₱{money(paymentAmount)}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-4">
                                    <span className="text-stone-500">
                                        Tip
                                    </span>

                                    <span className="font-bold text-stone-800">
                                        ₱{money(tipAmount)}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-4 border-t border-stone-200 pt-3">
                                    <span className="font-black text-[#844414]">
                                        Total Charged
                                    </span>

                                    <span className="text-xl font-black text-[#d67b27]">
                                        ₱{money(totalCharged)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ORDER SUMMARY */}
                        <div className="rounded-xl bg-[#fffaf3] border border-[#f3e1c6] p-5">
                            <h2 className="text-xs font-black uppercase tracking-wider text-[#844414] mb-4">
                                Order Payment Summary
                            </h2>

                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-stone-500">
                                        Order Total
                                    </span>

                                    <span className="font-bold text-stone-700">
                                        ₱{money(orderTotal)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-stone-500">
                                        Total Paid After This Payment
                                    </span>

                                    <span className="font-bold text-stone-700">
                                        ₱{money(totalPaidAfter)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-stone-500">
                                        Remaining Balance
                                    </span>

                                    <span className="font-black text-[#844414]">
                                        ₱{money(remainingAfter)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* PAYMENT STATUS */}
                        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase font-bold text-stone-400">
                                    Payment Method
                                </p>

                                <p className="mt-1 font-black text-stone-700">
                                    GCash via PayMongo
                                </p>
                            </div>

                            <span className={`inline-flex self-start rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider ${payment.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-sky-50 text-sky-700 border-sky-200"}`}>
                                {paymentLabel}
                            </span>
                        </div>

                        {/* PAYMONGO REFERENCE */}
                        {payment.paymongo_payment_id && (
                            <div className="mt-5 rounded-xl bg-stone-50 border border-stone-200 p-4">
                                <p className="text-[10px] uppercase font-black tracking-wider text-stone-400">
                                    PayMongo Payment Reference
                                </p>

                                <p className="mt-1 break-all font-mono text-xs text-stone-600">
                                    {payment.paymongo_payment_id}
                                </p>
                            </div>
                        )}

                        {/* FOOTER */}
                        <div className="mt-8 border-t border-stone-200 pt-5 text-center">
                            <p className="text-xs font-bold text-stone-500">
                                Thank you for choosing Smiley Page Corner!
                            </p>

                            <p className="mt-1 text-[11px] text-stone-400">
                                This receipt was generated from a payment confirmed by PayMongo.
                            </p>
                        </div>

                        {/* PRINT BUTTON */}
                        <div className="spc-receipt-no-print mt-6">
                            <button type="button" onClick={handlePrint} className="w-full rounded-full bg-[#d67b27] hover:bg-[#b56219] text-white font-black py-3 px-6 uppercase tracking-wider text-sm transition-colors cursor-pointer">
                                Print / Save as PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
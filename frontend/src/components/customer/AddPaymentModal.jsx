// src/components/customer/AddPaymentModal.jsx
import { useState } from "react";
import { authFetch } from "../../utils/auth";

export default function AddPaymentModal({ order, onClose, onSuccess }) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [amount, setAmount] = useState("");
    const [tip, setTip] = useState("");

    const parsedAmount = amount === "" ? 0 : Number(amount);
    const parsedTip = tip === "" ? 0 : Number(tip);
    const remaining = Number(order.remaining_balance);

    const isInvalid =
        amount === "" ||
        parsedAmount <= 0 ||
        parsedAmount > remaining ||
        parsedTip < 0;

    const handleSubmit = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/payments/${order.id}/checkout/`, {
                method: "POST",
                body: JSON.stringify({
                    amount: parsedAmount,
                    tip: parsedTip
                })
            });

            if (!res.ok) {
                const err = await res.text();
                console.error(err);
                return;
            }

            const data = await res.json();
            localStorage.setItem("last_payment_amount", parsedAmount);
            localStorage.setItem("last_tip_amount", parsedTip);
            window.location.href = data.checkout_url;
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[#E6CCA2]">
                <h2 className="text-xl font-black text-[#6E473B] mb-4">Add Payment</h2>

                <p className="text-sm text-[#A07060] mb-4">
                    Remaining Balance: <span className="font-bold">₱{remaining.toFixed(2)}</span>
                </p>

                <div className="space-y-3 mb-4">
                    <input
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 bg-[#FCF8EE] border border-[#E6CCA2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E6CCA2]"
                    />

                    <input
                        type="number"
                        placeholder="Tip (optional)"
                        value={tip}
                        onChange={(e) => setTip(e.target.value)}
                        className="w-full p-3 bg-[#FCF8EE] border border-[#E6CCA2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E6CCA2]"
                    />
                </div>

                {parsedAmount > remaining && (
                    <p className="text-red-500 text-xs mb-4 font-bold">
                        Cannot exceed remaining balance
                    </p>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-[#6E473B] font-bold hover:bg-[#F5EEDD] rounded-lg transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={isInvalid}
                        className={`px-6 py-2 rounded-lg text-white font-bold transition-colors ${
                            isInvalid
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-[#6E473B] hover:bg-[#5a3a30]"
                        }`}
                    >
                        Pay
                    </button>
                </div>
            </div>
        </div>
    );
}
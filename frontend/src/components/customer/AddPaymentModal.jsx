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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-[400px] shadow-lg">
                <h2 className="text-xl font-bold mb-4">Add Payment</h2>

                <p className="text-sm text-gray-600 mb-2">
                    Remaining Balance: ₱{remaining.toFixed(2)}
                </p>

                <input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border px-3 py-2 rounded w-full mb-3"
                />

                <input
                    type="number"
                    placeholder="Tip (optional)"
                    value={tip}
                    onChange={(e) => setTip(e.target.value)}
                    className="border px-3 py-2 rounded w-full mb-3"
                />

                {parsedAmount > remaining && (
                    <p className="text-red-500 text-sm mb-2">
                        Cannot exceed remaining balance
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-400 text-white rounded"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={isInvalid}
                        className={`px-4 py-2 rounded text-white ${isInvalid
                                ? "bg-gray-400"
                                : "bg-green-500 hover:bg-green-600"
                            }`}
                    >
                        Pay
                    </button>
                </div>
            </div>
        </div>
    );
}
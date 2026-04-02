import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/auth";

export default function PaymentCheckoutPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const simulatePayment = async () => {
            try {
                // wait 2 seconds to simulate processing
                await new Promise(res => setTimeout(res, 2000));

                // call backend to confirm payment
                const res = await authFetch(`${import.meta.env.VITE_DJANGO_BASE_URL}/api/orders/${id}/confirm-payment/`,
                    {
                        method: "POST"
                    });

                if (!res.ok) {
                    const text = await res.text();
                    console.error("Payment confirmation failed:", text);
                    return;
                }

                // redirect back to order detail
                navigate(`/orders/${id}`);

            } catch (err) {
                console.error("Error in simulatePayment:", err);
            }
        };

        simulatePayment();
    }, [id, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="bg-white p-8 rounded shadow-lg text-center">
                <h1 className="text-2xl font-bold mb-4">Processing Payment...</h1>
                <p className="text-gray-600">Please wait while we process your transaction.</p>
            </div>
        </div>
    );
}
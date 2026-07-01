// src/components/customer/OrderFeedback.jsx
import { useState } from "react";
import { authFetch } from "../../utils/auth";

export default function OrderFeedback({ order, onFeedbackSubmitted }) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    const canReview = order.status === "delivered";

    // Already reviewed
    if (order.feedback) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-[#E6CCA2] shadow-sm">
                <h3 className="font-black text-[#6E473B] mb-2">Your Feedback</h3>
                <div className="text-2xl text-[#E6CCA2] mb-3">
                    {"★".repeat(order.feedback.rating)}
                    {"☆".repeat(5 - order.feedback.rating)}
                </div>
                <p className="text-[#6E473B] italic">
                    {order.feedback.comment || "No comment provided."}
                </p>
            </div>
        );
    }

    // Cannot review yet
    if (!canReview) return null;

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const res = await authFetch(
                `${BASEURL}/api/orders/${order.id}/feedback/`,
                {
                    method: "POST",
                    body: JSON.stringify({ rating, comment })
                }
            );

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to submit feedback");
                return;
            }

            alert("Feedback submitted successfully");
            if (onFeedbackSubmitted) onFeedbackSubmitted();
        } catch (err) {
            console.error(err);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-[#E6CCA2] shadow-sm">
            <h3 className="font-black text-[#6E473B] mb-4">Rate Your Experience</h3>

            <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        className={`text-2xl transition-colors ${rating >= star ? "text-[#D85C7B]" : "text-gray-300"}`}
                        onClick={() => setRating(star)}
                    >
                        ★
                    </button>
                ))}
            </div>

            <textarea
                placeholder="Tell us about your cake experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 bg-[#FCF8EE] border border-[#E6CCA2] rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#E6CCA2]"
                rows="3"
            />

            <button
                className="w-full py-3 bg-[#6E473B] text-white font-bold rounded-lg hover:bg-[#5a3a30] transition-colors disabled:opacity-50"
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? "Submitting..." : "Submit Feedback"}
            </button>
        </div>
    );
}
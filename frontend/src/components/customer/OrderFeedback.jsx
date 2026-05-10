// src/components/customer/OrderFeedback.jsx
import { useState } from "react";
import { authFetch } from "../../utils/auth";
import "./OrderFeedback.css";

export default function OrderFeedback({ order, onFeedbackSubmitted }) {

    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");

    const [loading, setLoading] = useState(false);

    const canReview =
        order.status === "delivered" ||
        order.status === "completed";

    // already reviewed
    if (order.feedback) {
        return (
            <div className="feedback-card">
                <h3>Your Feedback</h3>

                <div className="feedback-stars">
                    {"★".repeat(order.feedback.rating)}
                    {"☆".repeat(5 - order.feedback.rating)}
                </div>

                <p className="feedback-comment">
                    {order.feedback.comment || "No comment provided."}
                </p>
            </div>
        );
    }

    // cannot review yet
    if (!canReview) return null;

    const handleSubmit = async () => {

        try {

            setLoading(true);

            const res = await authFetch(
                `${BASEURL}/api/orders/${order.id}/feedback/`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        rating,
                        comment
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to submit feedback");
                return;
            }

            alert("Feedback submitted successfully");

            if (onFeedbackSubmitted) {
                onFeedbackSubmitted();
            }

        } catch (err) {
            console.error(err);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="feedback-card">

            <h3>Rate Your Experience</h3>

            <div className="rating-buttons">

                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        className={rating >= star ? "star active" : "star"}
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
            />

            <button
                className="submit-feedback-btn"
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? "Submitting..." : "Submit Feedback"}
            </button>

        </div>
    );
}
// src/components/admin/AdminOrderFeedback.jsx
import "./AdminOrderFeedback.css";

export default function AdminOrderFeedback({ feedback }) {

    if (!feedback) return null;

    return (
        <div className="admin-feedback-card">

            <h3>Customer Feedback</h3>

            <div className="admin-feedback-stars">
                {"★".repeat(feedback.rating)}
                {"☆".repeat(5 - feedback.rating)}
            </div>

            <p className="admin-feedback-comment">
                {feedback.comment || "No comment provided."}
            </p>

            <div className="admin-feedback-date">
                Submitted on{" "}
                {new Date(feedback.created_at).toLocaleString()}
            </div>

        </div>
    );
}
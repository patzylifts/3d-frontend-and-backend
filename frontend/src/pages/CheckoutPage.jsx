import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { authFetch } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import "./CheckoutPage.css"; // Ensure this import is here

function CheckoutPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const [useProfileAddress, setUseProfileAddress] = useState(true);
    const [profileAddress, setProfileAddress] = useState({
        street: "",
        city: "",
        province: "",
        postal_code: "",
        full_name: "",
        phone: "",
    });

    const [customAddress, setCustomAddress] = useState({
        street: "",
        city: "",
        province: "",
        postal_code: "",
    });

    const [deliveryDate, setDeliveryDate] = useState("");
    const [deliveryTime, setDeliveryTime] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function fetchProfile() {
            const res = await authFetch(`${BASEURL}/api/profile/`);
            const data = await res.json();
            setProfileAddress({
                street: data.street,
                city: data.city,
                province: data.province,
                postal_code: data.postal_code,
                full_name: data.user.first_name + " " + data.user.last_name,
                phone: data.phone,
            });
        }
        fetchProfile();
    }, [BASEURL]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const payload = {
            ...(useProfileAddress ? profileAddress : customAddress),
            delivery_date: deliveryDate,
            delivery_time: deliveryTime,
            notes,
        };

        try {
            const res = await authFetch(`${BASEURL}/api/orders/create/`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok) {
                setMessage("Sweet! Order submitted for review! 🎂");
                clearCart();
                const orderId = data.order_id;
                setTimeout(() => {
                    navigate(`/orders/${orderId}`);
                }, 2000);
            } else {
                setMessage(data.error || "Failed to place order.");
            }
        } catch (err) {
            setMessage("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkout-page-wrapper">
            <div className="container">
                <form onSubmit={handleSubmit} className="checkout-form-card">
                    <h1 className="checkout-title">Finalize Your Order</h1>

                    {/* Delivery Address Section */}
                    <div className="checkout-section">
                        <h2 className="section-heading">📍 Delivery Address</h2>
                        
                        <div className="radio-group">
                            <label className={`radio-label ${useProfileAddress ? "active" : ""}`}>
                                <input
                                    type="radio"
                                    checked={useProfileAddress}
                                    onChange={() => setUseProfileAddress(true)}
                                />
                                <span>Use Saved Profile Address</span>
                            </label>

                            <div className={`address-preview ${useProfileAddress ? "visible" : "hidden"}`}>
                                <strong>{profileAddress.full_name}</strong>
                                <p>{profileAddress.street}, {profileAddress.city}, {profileAddress.province}</p>
                                <p>{profileAddress.postal_code}</p>
                                <p className="phone-text">📞 {profileAddress.phone}</p>
                            </div>

                            <label className={`radio-label ${!useProfileAddress ? "active" : ""}`}>
                                <input
                                    type="radio"
                                    checked={!useProfileAddress}
                                    onChange={() => setUseProfileAddress(false)}
                                />
                                <span>Deliver to a New Address</span>
                            </label>
                        </div>

                        {!useProfileAddress && (
                            <div className="custom-address-inputs">
                                <input
                                    type="text"
                                    placeholder="Street Address"
                                    value={customAddress.street}
                                    onChange={(e) => setCustomAddress({ ...customAddress, street: e.target.value })}
                                    required={!useProfileAddress}
                                />
                                <div className="input-grid">
                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={customAddress.city}
                                        onChange={(e) => setCustomAddress({ ...customAddress, city: e.target.value })}
                                        required={!useProfileAddress}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Province"
                                        value={customAddress.province}
                                        onChange={(e) => setCustomAddress({ ...customAddress, province: e.target.value })}
                                        required={!useProfileAddress}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Postal Code"
                                    value={customAddress.postal_code}
                                    onChange={(e) => setCustomAddress({ ...customAddress, postal_code: e.target.value })}
                                    required={!useProfileAddress}
                                />
                            </div>
                        )}
                    </div>

                    {/* Schedule Section */}
                    <div className="checkout-section">
                        <h2 className="section-heading">⏰ Schedule Delivery</h2>
                        <div className="input-grid">
                            <div className="field-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="field-group">
                                <label>Preferred Time</label>
                                <input
                                    type="time"
                                    value={deliveryTime}
                                    onChange={(e) => setDeliveryTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="checkout-section">
                        <h2 className="section-heading">📝 Special Instructions</h2>
                        <textarea
                            placeholder="Add a message for the baker or delivery rider..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <button type="submit" disabled={loading} className="btn-main checkout-submit-btn">
                        {loading ? "Sending Order..." : "Confirm & Place Order"}
                    </button>

                    {message && (
                        <div className={`status-msg ${message.includes("Sweet") ? "success" : "error"}`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default CheckoutPage;
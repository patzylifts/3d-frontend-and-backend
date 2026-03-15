import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { authFetch } from "../utils/auth";

function CheckoutPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
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
    }, []);

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
                setMessage("Order submitted for review!");
                clearCart();
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
        <div className="min-h-screen bg-gray-100 flex justify-center items-start pt-16 px-4 md:px-0">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg space-y-6"
            >
                <h1 className="text-3xl font-bold text-center mb-4">Checkout</h1>

                {/* Delivery Address */}
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Delivery Address</h2>

                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            checked={useProfileAddress}
                            onChange={() => setUseProfileAddress(true)}
                            className="w-4 h-4"
                        />
                        Use Profile Address
                    </label>

                    <div
                        className={`border rounded p-3 text-gray-700 ${useProfileAddress ? "block" : "hidden"
                            }`}
                    >
                        <p className="font-medium">{profileAddress.full_name}</p>
                        <p>
                            {profileAddress.street}, {profileAddress.city},{" "}
                            {profileAddress.province}
                        </p>
                        <p>{profileAddress.postal_code}</p>
                        <p>{profileAddress.phone}</p>
                    </div>

                    <label className="flex items-center gap-2 mt-2">
                        <input
                            type="radio"
                            checked={!useProfileAddress}
                            onChange={() => setUseProfileAddress(false)}
                            className="w-4 h-4"
                        />
                        Use Custom Address
                    </label>

                    <div
                        className={`border rounded p-3 space-y-2 ${!useProfileAddress ? "block" : "hidden"
                            }`}
                    >
                        <input
                            type="text"
                            placeholder="Street"
                            value={customAddress.street}
                            onChange={(e) =>
                                setCustomAddress({ ...customAddress, street: e.target.value })
                            }
                            className="w-full p-2 border rounded"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="City"
                                value={customAddress.city}
                                onChange={(e) =>
                                    setCustomAddress({ ...customAddress, city: e.target.value })
                                }
                                className="w-full p-2 border rounded"
                            />
                            <input
                                type="text"
                                placeholder="Province"
                                value={customAddress.province}
                                onChange={(e) =>
                                    setCustomAddress({ ...customAddress, province: e.target.value })
                                }
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Postal Code"
                            value={customAddress.postal_code}
                            onChange={(e) =>
                                setCustomAddress({ ...customAddress, postal_code: e.target.value })
                            }
                            className="w-full p-2 border rounded"
                        />
                    </div>
                </div>

                {/* Delivery Date & Time */}
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Delivery Date & Time</h2>
                    <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <input
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Order Notes (Optional)</h2>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-2 border rounded"
                        rows={3}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300"
                >
                    {loading ? "Processing..." : "Place Order"}
                </button>

                {message && <p className="text-center text-green-700 font-semibold">{message}</p>}
            </form>
        </div>
    );
}

export default CheckoutPage;